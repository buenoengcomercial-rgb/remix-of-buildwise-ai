
## Diagnóstico
A "Previsão" não acompanha o último apontamento porque `applyDailyLogsToProject` em `src/lib/calculations.ts` calcula:
```
forecastEndDate = task.startDate + recalculatedDuration
```
Onde `recalculatedDuration = daysConsumed + remainingDuration`. Isso usa **número de logs** (não a data real do último log), então se há gaps entre lançamentos, ou se o usuário lançou produção fora da janela base, a previsão fica descolada da realidade.

Para "Suporte de Fixação" com apontamentos 16/04→25/04 e baseline 14/05→19/05, a previsão atual não considera a data 25/04 como âncora — ela apenas conta quantos logs existem.

## Mudança (arquivo único)
**`src/lib/calculations.ts`** — função `applyDailyLogsToProject`, bloco de cálculo do forecast (linhas ~120-160):

1. **Ancorar no último apontamento real**:
   ```ts
   const sortedLogs = [...logs].sort((a,b) => a.date.localeCompare(b.date));
   const lastLogDate = new Date(sortedLogs[sortedLogs.length - 1].date);
   ```

2. **Calcular forecast a partir dessa âncora**:
   ```ts
   const remainingDuration = plannedDailyProduction > 0
     ? Math.ceil(remainingQuantity / plannedDailyProduction)
     : 0;
   const forecastEnd = new Date(lastLogDate);
   if (remainingQuantity > 0) {
     forecastEnd.setDate(forecastEnd.getDate() + remainingDuration);
   }
   const forecastEndDate = forecastEnd.toISOString().split('T')[0];
   ```

3. **Recalcular `recalculatedDuration`** como dias entre `startDate` e `forecastEnd`:
   ```ts
   const recalculatedDuration = Math.max(1, Math.ceil(
     (forecastEnd.getTime() - new Date(t.startDate).getTime()) / 86400000
   ));
   ```

4. **Sincronizar `current.endDate` com `forecastEndDate`** quando há logs, para Gantt e painel mostrarem a mesma data.

## Garantias
- Baseline imutável (linha 14/05–19/05 permanece como referência fixa).
- Sem mudanças em types, Gantt, painel, RUP, CPM, dependências.
- Atividade concluída (`remaining = 0`) → previsão = data do último apontamento.
- Cor vermelha/verde no Gantt (já existente) passa a refletir corretamente o desvio real.

## Resultado
"Suporte de Fixação" com apontamentos até 25/04 e saldo restante:
- Previsão = 25/04 + dias restantes calculados
- Coluna Fim do Gantt e bloco Cronograma do painel mostram a mesma data
- Se ultrapassar 19/05 (baseline) → vermelho automático
