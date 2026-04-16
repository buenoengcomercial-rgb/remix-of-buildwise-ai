
## Objetivo
Mostrar apenas as 4 primeiras palavras do nome da tarefa na EAP, com o nome completo aparecendo num tooltip ao passar o mouse, eliminando linhas muito altas e mantendo a leitura limpa.

## Situação atual
Após o último ajuste, `src/components/TaskList.tsx` está com `whitespace-normal break-words` no botão do nome (linha ~534), permitindo que descrições longas (SINAPI) ocupem 2-3 linhas. Isso polui a EAP. Já existe `title={task.name}` nativo, mas queremos um tooltip mais robusto via Radix (`@/components/ui/tooltip`), que já está disponível no projeto.

## Mudança proposta

### 1. Helper de truncagem por palavras
Em `src/components/TaskList.tsx`, criar:
```ts
const truncateWords = (text: string, maxWords = 4) => {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ") + "…";
};
```

### 2. Reverter wrap → linha única
No botão do nome (linha ~534): trocar `whitespace-normal break-words leading-tight` por `truncate` novamente, garantindo altura compacta da linha.

### 3. Reverter alinhamento ao centro
- Linha do grid (~500): voltar `items-start` → `items-center` e remover `py-2` extra.
- Container do nome (~524): voltar `items-start` → `items-center`.
- Remover `mt-0.5` / `mt-1.5` do `GripVertical` e do indicador de crítico (volta ao alinhamento padrão).

### 4. Tooltip Radix com nome completo
Envolver o botão do nome com `Tooltip` / `TooltipTrigger` / `TooltipContent` de `@/components/ui/tooltip`:
- Trigger: o botão exibindo `truncateWords(task.name, 4)`.
- Content: `task.name` completo, com `max-w-md` e `whitespace-normal break-words` para quebrar nomes longos legivelmente.
- Manter `TooltipProvider` no topo (verificar se já existe globalmente em `App.tsx`; se sim, basta usar `Tooltip` direto; se não, envolver o componente).

### 5. Modo edição preservado
Quando `isEditing` for true, `InlineInput` continua recebendo `task.name` completo — sem truncagem, sem tooltip.

## Garantias
- Altura das linhas volta ao compacto original.
- Nome completo continua acessível via hover (tooltip Radix, mais visível que `title` nativo).
- Edição inline, drag-and-drop, cores de equipe, CPM, RUP, status (crítico/atrasado/concluído) e demais colunas permanecem intactos.

## Resultado esperado
Cada tarefa exibe no máximo 4 palavras + "…" na coluna Nome. Ao passar o mouse, o tooltip mostra o nome completo (ex.: "FURO MECANIZADO EM CONCRETO ARMADO PARA DIÂMETROS MENORES OU IGUAIS A 40 MM. AF_09/2023"), preservando a identificação sem poluir a EAP.
