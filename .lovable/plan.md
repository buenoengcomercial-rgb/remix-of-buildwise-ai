
## Diagnóstico

### Bug 1 — Barra fica fixa ao arrastar
A barra cheia renderizada usa `barLeft`/`barWidth` calculados a partir de `task.baseline` (planejado), mas o drag/resize só atualiza `currentLeft`/`currentWidth` (current). Como `handleMouseDown` está na barra cheia (baseline), o mouse "agarra" a barra mas ela não acompanha o cursor — apenas o **label à direita** (linha 1613, `currentLeft + currentWidth + 4`) se move.

### Bug 2 — "Linha vermelha" sem função
Trata-se do `ring-1 ring-destructive/60` (linhas 1503–1504), aplicado quando `isLate` ou `bar.isCritical`. Visualmente parece uma borda/linha vermelha sobreposta. Sem função analítica clara — o atraso já é informado pelos marcadores diários e tooltip.

### Falta: linha pontilhada grossa = real/previsto
Hoje só temos a barra cheia (planejado) + marcadores diários (apontamento). Falta o elemento que represente o intervalo **real/previsto** (data atual de início → data prevista de fim), sobre o eixo central da barra.

## Mudanças (apenas em `src/components/GanttChart.tsx`)

### A) Corrigir o drag — barra cheia segue o cursor
A barra cheia passa a representar **o que está sendo arrastado** (current/planejado corrente), pois é o plano editável. A baseline (snapshot original) será exibida separadamente como **moldura fina cinza** atrás, sem interatividade.

- Linhas 1492–1499: trocar para `barLeft = currentLeft` e `barWidth = currentWidth` (a barra cheia volta a ser o atual editável).
- Adicionar **antes** da barra cheia uma faixa fina cinza (3px, `top: 26`, `bg-muted-foreground/30`, `rounded`, sem eventos) usando as datas de `task.baseline` (se existir), com tooltip "Baseline: dd/mm→dd/mm". Isso preserva a referência visual do baseline sem confundir o drag.

### B) Remover a "linha vermelha" sem função
- Linhas 1503–1504: remover as classes `ring-1 ring-destructive/40` (crítica) e `ring-1 ring-destructive/60` (late). Manter apenas `animate-pulse ring-2 ring-destructive` quando `hasViolation` (violação real de dependência) e `ring-2 ring-warning` para `noWorkDays` — esses têm função analítica.

### C) Adicionar linha pontilhada grossa = real/previsto
Sobre o centro vertical da barra cheia, renderizar uma linha:
- `borderTop: 3px dashed hsl(var(--foreground))` (grossa, neutra para não conflitar com cor da equipe)
- `left = diffDays(projectStart, parseISODateLocal(task.current?.startDate || task.startDate)) * dayWidth`
- `width = (task.current?.duration || task.duration) * dayWidth`
- `top: 18` (centro vertical da barra de 20px que começa em `top: 9`)
- `zIndex: 11` (acima da barra cheia, abaixo do tooltip)
- `pointerEvents: 'none'` (não interfere no drag)
- Tooltip nativo: `Real/Previsto: dd/mm → dd/mm (Xd)`

Quando real/previsto extrapola a baseline, a pontilhada visualmente "estoura" a barra cheia → atraso fica óbvio sem precisar de ring vermelho.

### D) Atualizar legenda
- Remover item antigo "ring vermelho = atraso" se existir.
- Adicionar: **┅** Linha pontilhada grossa = Real / Previsto (apontamento diário)
- Manter: **▬** Barra cheia = Planejado corrente · **■** Marcadores = meta vs realizado por dia · faixa cinza fina = baseline original.

## Resultado
- Arrastar a barra agora **move a barra inteira** acompanhando o cursor (não só o texto).
- Sem mais "linha vermelha" decorativa.
- Linha pontilhada grossa central mostra real/previsto, extrapolando a barra quando há atraso.
- Baseline preservada como faixa fina cinza de referência.

## Arquivo
`src/components/GanttChart.tsx` (apenas)
