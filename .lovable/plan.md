
## Objetivo
Separar **linha de base (fixa)** e **cronograma variável (recalculado pela execução)** em cada tarefa, permitindo comparar planejado vs previsto no Gantt e na EAP.

## Modelagem (`src/types/project.ts`)

Adicionar dois sub-objetos opcionais em `Task`:

```ts
export interface TaskBaseline {
  startDate: string;
  duration: number;
  endDate: string;
  plannedDailyProduction?: number;
  quantity?: number;
  capturedAt: string; // ISO timestamp
}

export interface TaskCurrent {
  startDate: string;
  duration: number;
  endDate: string;
  forecastEndDate?: string;
  executedQuantityTotal?: number;
  remainingQuantity?: number;
  accumulatedDelayQuantity?: number;
  physicalProgress?: number;
}

// em Task:
baseline?: TaskBaseline;
current?: TaskCurrent;
```

Os campos atuais (`startDate`, `duration`, `dailyLogs`, etc.) continuam — `baseline` e `current` são camadas derivadas/snapshot.

## Lógica (`src/lib/calculations.ts`)

**1. `captureBaseline(project)`** (novo): para toda tarefa sem `baseline`, grava snapshot com `startDate`, `duration`, `endDate = start + duration`, `plannedDailyProduction = quantity/duration`, `quantity`, `capturedAt = now`. Roda **uma vez** na primeira carga (e via botão "Salvar Linha de Base" futuramente).

**2. Refatorar `applyDailyLogsToProject`**:
- Calcula como hoje, mas, em vez de só sobrescrever `task.duration`, popula também `task.current`:
  - `current.startDate = baseline.startDate` (não muda por enquanto)
  - `current.duration = recalculatedDuration`
  - `current.endDate = startDate + recalculatedDuration` (dias úteis)
  - `current.forecastEndDate`, `executedQuantityTotal`, `remainingQuantity`, `accumulatedDelayQuantity`, `physicalProgress`
- Mantém `task.duration = recalculatedDuration` para CPM continuar propagando dependências no cronograma variável.

**3. CPM** (`calculateCPM`): inalterado — opera sobre `duration`/`startDate` atuais (= cronograma variável). Como `baseline` é snapshot estático, não interfere.

**4. Pipeline** (`src/pages/Index.tsx`):
```
calculateCPM(applyDailyLogsToProject(applyRupToProject(captureBaseline(rawProject))))
```

## UI — Gantt (`src/components/GanttChart.tsx`)

Para cada tarefa com `baseline`:
- **Sombra de fundo** (faixa cinza-clara translúcida) renderizada de `baseline.startDate` por `baseline.duration` dias — atrás da barra principal.
- **Barra principal** continua usando `current` (= `task.duration` atual).
- Tooltip ganha linhas: **Base:** `baseline.startDate → baseline.endDate` · **Previsto:** `current.startDate → current.forecastEndDate` · **Desvio:** `current.duration − baseline.duration` dias.

Implementação: na função que renderiza barras, adicionar antes do `<div>` da barra um `<div className="absolute bg-muted/40 border border-dashed">` posicionado pelo `baseline`.

## UI — EAP (`src/components/TaskList.tsx`)

Adicionar (apenas quando `baseline` existir e divergir de `current`):
- Tooltip/popover na coluna de duração mostrando:
  - **Início base** / **Fim base**
  - **Fim previsto**
  - **Desvio** (dias, com cor: verde ≤0, amarelo ≤2, vermelho >2)
  - **Saldo acumulado** (un)
  - **Executado acumulado** (un)
- Indicador compacto inline: pequeno badge `Δ +Nd` ao lado da duração quando `current.duration ≠ baseline.duration`.

Painel `DailyLogsPanel` (`src/components/DailyLogsPanel.tsx`): cabeçalho ganha resumo "Base: Xd · Previsto: Yd · Desvio: ±Zd".

## Garantias
- `baseline` é gravada **uma vez** e nunca alterada por logs / drag / resize / RUP.
- Drag/resize do Gantt continuam editando `startDate`/`duration` (cronograma variável). Para "redefinir base", ficará disponível futuramente um botão dedicado (fora deste escopo).
- Tarefas sem `quantity` ou sem logs: `current` espelha `baseline` (sem desvio).
- `isManual`, RUP, CPM, dependências, drag e setas permanecem intactos.
- Persistência via `localStorage` cobre `baseline` e `current` automaticamente.

## Resultado
No Gantt: barra colorida (previsto) sobre faixa cinza pontilhada (base) — comparação visual imediata. Na EAP: tooltip e badge mostrando desvio, executado e saldo. A baseline congela o plano original; o cronograma variável evolui com o apontamento diário.
