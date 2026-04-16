
## Objetivo
Acrescentar no Gantt **marcadores diários de execução real** (a partir de `dailyLogs` com `actualQuantity > 0`) e enriquecer o tooltip com base, previsão, executado, restante e dias trabalhados — preservando a baseline (sombra atrás) e a barra atual já existentes.

## Arquivo único alterado
`src/components/GanttChart.tsx`

## Mudanças

### 1. Marcadores diários de execução
Logo após a renderização da sombra de baseline (~linha 1311) e antes da barra atual (~linha 1313), adicionar um bloco que itera `task.dailyLogs`:
- Para cada log com `actualQuantity > 0`:
  - Calcular `dayOffset = diffDays(projectStart, new Date(log.date))`
  - Renderizar um quadradinho colorido com:
    - `left: dayOffset * dayWidth + 1`
    - `width: dayWidth - 2`
    - `top: ROW_HEIGHT - 6` (logo abaixo da barra principal, na faixa inferior da linha)
    - `height: 4`
    - Cor baseada em `dailyDelta = plannedQuantity − actualQuantity`:
      - `≤ 0` → verde (`hsl(var(--success))` ou `bg-emerald-500`)
      - `≤ 20% da meta` → amarelo (`bg-amber-500`)
      - `> 20%` → vermelho (`bg-red-500`)
    - `title` com `dd/mm — Realizado X / Meta Y` para tooltip nativo no marcador
    - `zIndex: 8` (acima da sombra de baseline, abaixo da barra principal `zIndex 10`)
- `pointer-events-auto` apenas no marcador, para não atrapalhar drag da barra.

### 2. Tooltip enriquecido
No tooltip da barra (~linha 1380-1400), adicionar quando há `dailyLogs`:
- `Executado: {executedQuantityTotal} {unit}`
- `Restante: {remainingQuantity} {unit}`
- `Dias trabalhados: {datas formatadas dd/MM separadas por vírgula, máx 5 + "…"}`

Trocar o `whitespace-nowrap` do tooltip por `whitespace-pre-line` e juntar partes com `\n` quando `task.baseline || task.dailyLogs?.length` para legibilidade multilinha (mantendo single-line para tarefas simples).

## Garantias
- Marcadores são puramente visuais (camada extra) — não afetam drag, resize, dependências, CPM ou propagação.
- Sem mudança em `types.ts`, `calculations.ts` ou `Index.tsx` (os campos `dailyLogs`, `executedQuantityTotal`, `remainingQuantity` já existem).
- Tarefas sem `dailyLogs` continuam idênticas ao comportamento atual.
- Baseline shadow (já existente) permanece atrás; barra atual permanece principal.

## Resultado
Cada tarefa exibirá: faixa pontilhada (base) ▪ barra colorida (atual/reprogramada) ▪ pequenos blocos coloridos abaixo nos dias com apontamento real. Tooltip mostrará Base, Previsto, Executado, Restante e lista de dias trabalhados.
