
## Diagnóstico

Hoje na coluna "Início" e "Fim" do Gantt:
- **Plan:** mostra `task.baseline.startDate / endDate` mas o popover de calendário edita `task.startDate` (cronograma corrente), não a baseline. Resultado: o usuário clica em "Plan: 19/05/2026" esperando editar a linha planejada, mas edita outra coisa.
- **Real / Prev:** A "Prev" ainda aplica `Math.max(baselineEnd, lastLog+remaining, lastLog)` em `applyDailyLogsToProject`, então quando o último apontamento é, por exemplo, 25/05/2026 (1h só), a previsão **não** vira 25/05 — ela vira `max(19/05_baseline, 25/05+saldo, 25/05)` = data depois de 25/05. O usuário quer que a Previsão seja **literalmente o último log** quando saldo = 0, ou **último log + dias restantes** quando há saldo, **sem clamp pela baseline**.

## Mudanças

### 1) `src/lib/calculations.ts` — `applyDailyLogsToProject`
Remover o `Math.max(baselineEndTime, …)` na resolução do `forecastEndDate`. Lógica nova:
```ts
const projectedForecastEnd = new Date(lastLogDate);
if (remainingQuantity > 0) {
  projectedForecastEnd.setDate(projectedForecastEnd.getDate() + remainingDuration);
}
// Previsão = exatamente último log (se concluído) ou último log + saldo
const forecastEnd = projectedForecastEnd;
```
A cor verde/vermelha no Gantt já compara com `baseline.endDate` separadamente — isso continua funcionando.
Idem ajustar `previewEndDate` em `DailyLogsPanel.tsx` (mesma fórmula, sem clamp).

### 2) `src/components/GanttChart.tsx` — coluna Início/Fim editáveis para a **baseline (Plan)**

Atualmente o popover sempre edita `task.startDate / duration`. Mudar para:
- **Linha "Plan:"** (clique nela) → abre calendário que edita `task.baseline.startDate` (ou `endDate`), **mantendo `baseline.duration` quando edita início** (shift) ou **recalculando duration quando edita fim**, mas sempre **vinculado à RUP**:
  - Se `task.durationMode === 'rup'`, a duração da baseline = `calculateRupDuration(task).duration` (não permite alterar duração arrastando a data; mover início desloca o fim mantendo dias RUP; mover fim **não altera duração**, apenas desloca o início para trás para terminar nessa data).
  - Se modo `manual`, comportamento livre (start mantém duração, end recalcula duration).
- **Linha "Real:" / "Prev:"** (clique nela) → continua editando `task.startDate / duration` (cronograma corrente). Quando há `dailyLogs`, esses campos são **read-only** (calendário desabilitado com tooltip "Datas reais vêm do apontamento diário").

Para isso:
- Separar os 2 spans em 2 popovers distintos por linha (4 popovers no total na célula: Plan-Início, Real-Início, Plan-Fim, Prev-Fim).
- Adicionar handler `handleBaselineDateChange(taskId, field, date)` que muta `task.baseline` respeitando `durationMode`.
- Desabilitar popover de Real/Prev quando `(task.dailyLogs?.length ?? 0) > 0`.

### 3) Vínculo RUP ↔ baseline
Quando o usuário muda a data Plan-Início e o modo é RUP, manter `baseline.duration = calculateRupDuration(task).duration` e recalcular `baseline.endDate = startDate + duration`. Quando muda Plan-Fim em modo RUP, ajustar `baseline.startDate = endDate - rupDuration`.

## Garantias
- Apontamento diário continua sendo a única fonte para Real/Prev.
- Previsão = última data lançada (idêntica), respeitando saldo restante quando > 0.
- Baseline editável só pelo clique na linha "Plan:".
- RUP permanece como driver de duração quando ativada.
- Cores verde/vermelho continuam comparando Prev vs baseline.
- Sem mudanças em CPM, dependências, painel de tarefas (EAP) além do já existente.

## Resultado
- Clicar em **"Plan: 19/05/2026"** abre calendário e edita a linha planejada (respeitando RUP).
- Clicar em **"Real: 16/05/2026"** ou **"Prev: 24/05/2026"**: bloqueado quando há apontamento (tooltip explicando), editável quando não há.
- "Suporte de Fixação" com último log em 25/05/2026 e saldo 0 → Prev = **25/05/2026** (idêntico).
- Com saldo > 0 → Prev = 25/05 + dias_restantes (sem clamp da baseline).
