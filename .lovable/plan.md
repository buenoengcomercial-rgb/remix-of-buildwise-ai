## Objetivo

Adicionar um bloco "PREVISÃO" na aba Medição (e info correspondente na EAP/Tarefas e exportações), calculado a partir das datas planejadas do Gantt e da produtividade prevista. Não altera a medição real, que continua vindo apenas dos `dailyLogs`.

## Arquitetura proposta

### 1. Novo módulo `src/lib/measurementForecast.ts`

Função pura, isolada e testável:

```ts
computeTaskForecast(task, periodStart, periodEnd, calendar?) => {
  plannedDailyProduction: number;
  plannedDaysInPeriod: number;
  qtyForecast: number;          // truncado em 2 casas, não excede qtyContracted
  subtotalForecastNoBDI: number;
  subtotalForecast: number;     // qty * unitPriceWithBDI, trunc2
}
```

Regras:
- Período planejado: `start = task.startDate`, `end = task.startDate + duration - 1`.
- Calendário: tenta usar helper de dias úteis já existente; se não existir, fallback por dias corridos, isolado em função separada (`countWorkingDays`) para evolução futura.
- `plannedDaily`: `task.baseline?.plannedDailyProduction` → senão `quantity / duration` → senão `0`.
- `qtyForecast = min(plannedDaily * diasSobrepostos, qtyContracted)`.
- Truncagem com `trunc2` já existente em `measurementCalculations`.

### 2. Estender `Row` em `src/components/measurement/types.ts`

Campos novos (somente leitura):
- `qtyForecast`
- `valueForecastNoBDI`
- `valueForecast`
- `diffForecastVsReal` (= `valuePeriod - valueForecast`)

E em `GroupTotals`: `forecast`, `forecastNoBDI`, `diffForecast`.

### 3. `src/hooks/useMeasurementRows.ts`

Em ambos os caminhos (snapshot e live), chamar `computeTaskForecast(task, effStart, effEnd)` e preencher os novos campos. Acumular nos totais por grupo e nos totais gerais.

### 4. UI Medição

#### `MeasurementTable.tsx`
Adicionar grupo de cabeçalho "PREVISÃO" após "Medição Atual", com 3 colunas:
- Quant. Prevista
- Subtotal Previsto
- Dif. Real x Previsto

Tokens de cor (em `tailwind.config.ts` ou via classes existentes):
- Header/fundo previsão: `bg-info/10` (lilás/azul claro já no design system, mesma família usada para "Contrato"; criar variante `bg-accent/10` se preferir distinguir).
- Diferença positiva: `text-success`. Diferença negativa: `text-destructive`.

`COLSPAN` passa de 15 para 18; ajustar `colgroup` e linha de TOTAL GERAL.

#### `MeasurementItemRow.tsx`
Renderizar 3 novas células (somente leitura, com formatação `fmtBRL`/`fmtNum`).

#### `MeasurementGroupRow.tsx`
Subtotais por grupo nas novas colunas.

#### `MeasurementSummaryCards.tsx`
3 novos cards no topo:
- Previsto no período
- Realizado no período
- Diferença Real x Previsto (verde/vermelho)

### 5. EAP / Tarefas (`TaskList.tsx`)

Adicionar exibição inline e/ou coluna leve:
- "Previsto: X un/dia" (a partir de `plannedDailyProduction` ou `quantity/duration`).
- Quando houver período ativo no contexto (ex.: medição atual), mostrar "Previsto no período: Y un".

Implementação mínima: badge/texto auxiliar abaixo do nome da tarefa. Sem mudança estrutural.

### 6. Exportações

#### `additiveReports.ts` não muda — escopo é apenas Medição.

Localizar exportadores de Medição (provavelmente `useMeasurementExports.ts` + helpers em `lib/`). Adicionar 3 colunas no Excel e PDF da medição com os mesmos nomes da tela. Reusar a função `computeTaskForecast`.

### 7. Testes

Adicionar `src/lib/measurementForecast.test.ts`:
- Tarefa totalmente dentro do período.
- Tarefa parcialmente sobreposta.
- Tarefa fora do período → 0.
- `plannedDailyProduction` definido tem prioridade sobre `quantity/duration`.
- Limite por `qtyContracted`.
- Truncagem em 2 casas.

## Não altera

- Cálculo de `qtyPeriod`/`valuePeriod` reais.
- `dailyLogs`, Diário de Obra, Aditivo.
- Estrutura contratual da Task.
- Geração de medição (snapshot continua salvando os mesmos campos atuais; previsão é derivada em runtime).

## Critério de validação

- Tarefa planejada dentro do período da medição → aparece `Quant. Prevista > 0`.
- Sem `dailyLogs` → `Quant. Medição = 0`, `Quant. Prevista` pode ser > 0.
- Com apontamento real → tela mostra ambos e a diferença.
- Mexer em `startDate`/`duration` no Gantt recalcula a previsão automaticamente (próximo render da Medição).
- Medição real só muda com lançamento em Tarefas/EAP/Diário.
