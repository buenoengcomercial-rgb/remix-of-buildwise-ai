
## Objetivo

Reorganizar as 3 representações visuais da barra do Gantt para refletir claramente:
1. **Barra cheia** = datas **planejadas (baseline)** com a cor da equipe
2. **Linha pontilhada no meio** = **dias trabalhados** (apontamento diário), na cor da equipe
3. **Marcadores diários** abaixo permanecem como hoje (verde/âmbar/vermelho conforme meta vs realizado)

## Estado atual em `src/components/GanttChart.tsx`

- Linha 1453 (baseline): faixa fina cinza pontilhada no topo (4px)
- Linha 1503 (bar principal): barra cheia colorida pela equipe usando `task.startDate/duration` (real/previsto)
- Linha 1473 (marcadores): pequenos retângulos de 3px abaixo, um por log

Isso confunde porque a barra cheia segue o real/previsto, não o planejamento.

## Mudanças

### 1) Inverter o papel da barra cheia (linha 1500–1609)
Trocar `currentLeft / currentWidth` (que vêm de `task.startDate/duration`) por:
- `baseLeft = diffDays(projectStart, baseline.startDate) * dayWidth`
- `baseWidth = baseline.duration * dayWidth`

A barra cheia passa a representar o **planejado**. Cor de fundo continua = `teamDef.bgColor`.  
Quando a tarefa não tem `baseline` (ainda não capturada), cair no comportamento atual (usar `task.startDate/duration`) para não quebrar.

Manter:
- Drag/resize, tooltip, ring de violação, progress fill interno (overlay branco com `percentComplete`).
- O drag/resize ainda altera `task.startDate/duration` (planejado), pois a baseline é o plano corrente exibido.

### 2) Substituir os marcadores diários por uma linha pontilhada contínua (linha 1472–1498)
Em vez de N retângulos individuais, renderizar **uma única linha pontilhada** representando o intervalo trabalhado:

- `firstLog = min(dailyLogs.date)` → `lastLog = max(dailyLogs.date)`
- `left = diffDays(projectStart, firstLog) * dayWidth`
- `width = (diffDays(firstLog, lastLog) + 1) * dayWidth`
- Posicionada no **meio vertical** da barra cheia (ex.: `top: 18`, altura 0)
- `borderTop: 2px dashed ${teamDef.borderColor}` (cor da equipe)
- `zIndex: 12` (acima da barra cheia)

Manter os pequenos marcadores coloridos (verde/âmbar/vermelho) por log abaixo da barra, pois indicam meta vs realizado por dia — informação distinta. Eles descem para `top: 28` (já estão).

### 3) Remover a faixa fina de baseline antiga (linha 1453–1471)
Como a barra cheia agora é o próprio baseline, esta faixa duplicada pode ser removida. O título/tooltip já mostra "Base: …→… (Xd)".

### 4) Ajustar tooltip (linha 1580–1586)
- "Base: 12/05→17/05 (5d)" → continua, agora corresponde à própria barra
- "Previsto/Real: 14/05→22/05 (9d)" → continua, agora corresponde à linha pontilhada
- "Desvio: +Xd" → mantido

## Arquivo
`src/components/GanttChart.tsx` (apenas)

## Resultado esperado em "Suporte de Fixação"
- Barra cheia azul-Charlie cobrindo **12/05 → 17/05** (5 dias planejados)
- Linha pontilhada azul-Charlie atravessando o meio de **14/05 → 22/05** (9 dias trabalhados), extrapolando à direita da barra cheia, deixando visível o atraso
- Marcadores coloridos por dia permanecem abaixo
