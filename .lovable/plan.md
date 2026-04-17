
## Objetivo

Corrigir a propagação de dependências para que sucessoras se movam **em tempo real** junto com a predecessora arrastada — tanto para frente quanto para trás — independente de violação.

## Diagnóstico

### `lib/calculations.ts` — `propagateAllDependencies`
Hoje só recalcula a sucessora **quando há violação** (`if (succStart < predEnd)` etc). Isso significa:
- Arrastar predecessora **para frente** → empurra sucessora ✅
- Arrastar predecessora **para trás** → sucessora fica parada ❌ (gera gap)
- Arrastar sucessora para perto da predecessora → não "cola" ❌

### `GanttChart.tsx` — `computeDragPropagation`
Já existe e é chamada durante o drag, populando `dragTempTasks`. Funciona em conjunto com `propagateAllDependencies`, então herda o mesmo bug: como a função interna só propaga em violação, as sucessoras só "andam" no preview quando empurradas para frente.

### `handleUp` (commit do drag)
Chama `runPropagation` que persiste o resultado de `propagateAllDependencies` — herda o mesmo bug.

## Mudanças

### A) `src/lib/calculations.ts` — propagação **sempre** (vínculo rígido)

Reescrever o `switch` dentro de `propagate()`:

```ts
switch (type) {
  case 'TI': newStartDate = predEnd; break;                           // Início = Fim do pred
  case 'II': newStartDate = predStart; break;                         // Início = Início do pred
  case 'TT': newStartDate = addDaysCalc(predEnd, -succ.duration); break;  // Fim = Fim do pred
  case 'IT': newStartDate = addDaysCalc(predStart, -succ.duration); break; // Fim = Início do pred
}
```

Remover todas as condições `if (succStart < predEnd)`. A propagação passa a ser **incondicional** (FS rígido / SS rígido / FF rígido / SF rígido), o que dá o comportamento "sucessoras seguem a predecessora em tempo real para frente E para trás".

E o teste de mudança fica:

```ts
if (newStartDate !== null) {
  const newISO = dateToISO(newStartDate);
  if (newISO !== succ.startDate) {
    taskMap.set(successorId, { ...succ, startDate: newISO });
    anyChanged = true;
    adjustedTypes.add(type);
    propagate(successorId, depth + 1);
  }
}
```

Isso evita loop infinito (só recursa quando a data realmente mudou) mas garante cascata em ambas as direções.

### B) `checkDependencyViolation` — manter

Continua válida para o caso "usuário arrasta a **sucessora** para uma posição inválida em relação à predecessora não arrastada" (toast de aviso). Não mexer.

### C) `GanttChart.tsx` — `computeDragPropagation`

A versão atual já está correta no formato; só precisa ajustar para incluir **todas** as tarefas modificadas (não filtrar por "diferente da original"):

```ts
const computeDragPropagation = useCallback((taskId: string, newStartDate: string) => {
  const allTasks = getAllTasks(project).map(t =>
    t.id === taskId ? { ...t, startDate: newStartDate } : t
  );
  const result = propagateAllDependencies(allTasks, taskId);
  const tempMap = new Map<string, { startDate: string }>();
  result.tasks.forEach(t => {
    if (t.id !== taskId) tempMap.set(t.id, { startDate: t.startDate });
  });
  return tempMap;
}, [project]);
```

### D) Renderização — `currentLeft` quando `isDragPropagated`

Já existe um bloco `else if (isDragPropagated)`. Confirmar (e corrigir se necessário) que usa `parseISODateLocal` em vez de `new Date()` para evitar shift de fuso, e que mantém a largura original:

```ts
} else if (isDragPropagated) {
  const tempData = dragTempTasks.get(task.id)!;
  const tempStart = diffDays(projectStart, parseISODateLocal(tempData.startDate));
  currentLeft = tempStart * dayWidth;
  // currentWidth permanece (duração não muda na propagação)
}
```

### E) `handleUp` — commit final

Verificar que após o drag, `runPropagation` (ou equivalente) é chamado e **todas** as tarefas alteradas em `result.tasks` são persistidas no `project` — não só as que violaram. Como `propagateAllDependencies` agora sempre retorna o conjunto correto, basta gravar `result.tasks` inteiro de volta no estado.

## Arquivos
- `src/lib/calculations.ts` — reescrever switch em `propagateAllDependencies`
- `src/components/GanttChart.tsx` — confirmar `computeDragPropagation`, render de `isDragPropagated` e `handleUp`

## Resultado
- Arrastar predecessora **para frente**: sucessoras avançam em tempo real
- Arrastar predecessora **para trás**: sucessoras recuam em tempo real (sem gap)
- Cascata multi-nível mantida (limite de profundidade 50 preservado)
- `checkDependencyViolation` continua avisando quando o usuário arrasta sucessora para posição inválida
