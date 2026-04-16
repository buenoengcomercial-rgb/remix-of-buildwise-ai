
## Diagnóstico

3 problemas distintos no exemplo:

1. **Previsto começa 13/05** (1 dia antes do primeiro log 14/05) e mostra 21/05 quando o último log é 22/05.  
   Causa: `previewStartDate` em `DailyLogsPanel.tsx` e `current.startDate` em `calculations.ts` ainda usam `task.startDate` como fallback ou somam saldo restante à última data, deslocando o resultado.

2. **Previsão ainda projeta saldo** (`lastLogDate + remainingDuration`) em vez de fixar exatamente o último log.  
   Causa: `applyDailyLogsToProject` em `src/lib/calculations.ts` ainda faz `forecastEnd.setDate(... + remainingDuration)`.

3. **Timezone shift** em `new Date('2026-05-22').toLocaleDateString('pt-BR')` exibe 21/05 no fuso local (UTC interpretation).

## Regra de negócio confirmada

- **Plan (baseline):** fixa, definida no planejamento (14/05 → 19/05).
- **Real:** começa **exatamente** na primeira data do diário.
- **Previsto:** termina **exatamente** na última data do diário, sem somar saldo, sem shift de timezone.
  - Se último log < baseline end → previsto = último log (atividade adiantada).
  - Se último log > baseline end → previsto = último log (atrasada, registrada).

## Mudanças

### 1) `src/components/gantt/utils.ts`
Adicionar helpers timezone-safe:
```ts
parseISODateLocal(iso) // "2026-05-22" → Date local 22/05 00:00
formatISODateBR(iso)   // "2026-05-22" → "22/05/2026"
toISODateLocal(date)   // Date → "YYYY-MM-DD" sem UTC shift
```

### 2) `src/lib/calculations.ts` — `applyDailyLogsToProject`
- `current.startDate = firstLogDate` (já está, manter)
- `forecastEnd = parseISODateLocal(lastLogDate)` — **sem somar `remainingDuration`**
- `current.endDate = lastLogDate` (string ISO)
- `current.duration = diffDays(firstLogDate, lastLogDate) + 1`
- Trocar todos os `new Date(iso).toISOString().split('T')[0]` por `toISODateLocal` para evitar drift.

### 3) `src/components/DailyLogsPanel.tsx`
- `previewStartDate = sortedLogs[0].date` (sem fallback para `task.startDate` quando há logs).
- `previewEndDate = lastLogDate` literal (remover `+ previewRemainingDuration`).
- `previewDuration = diffDays(first, last) + 1` usando `parseISODateLocal`.
- Trocar `new Date(x).toLocaleDateString('pt-BR')` por `formatISODateBR(x)` nos 4 spans do bloco "Cronograma" e no badge "Previsão".

### 4) `src/components/GanttChart.tsx`
- Trocar exibições de `Plan: / Real: / Prev:` para `formatISODateBR` (eliminar shift 1 dia).

### 5) `src/components/TaskList.tsx`
- Mesma troca para tooltips/colunas de data.

## Resultado esperado no exemplo
- Plan: **14/05 → 19/05** (5d) — inalterado
- Real: **14/05** (primeiro log) — corrigido (era 13/05)
- Prev: **22/05** (último log, exato) — corrigido (era 21/05)
- Duração prevista: **9d** (14 a 22, inclusive)
- Cor vermelha mantida (22/05 > 19/05 baseline)

## Arquivos
`src/components/gantt/utils.ts`, `src/lib/calculations.ts`, `src/components/DailyLogsPanel.tsx`, `src/components/GanttChart.tsx`, `src/components/TaskList.tsx`
