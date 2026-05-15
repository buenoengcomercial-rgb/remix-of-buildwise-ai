# Integração do Aditivo Aprovado ao Projeto

## Princípio

Enquanto o aditivo estiver em **rascunho**, **em análise** ou apenas **aprovado**, ele permanece **isolado** na aba Aditivo. Somente ao clicar em **"Integrar ao Projeto"** (status `aditivo_contratado` / `isContracted=true`) os efeitos são propagados para Tarefas, Cronograma, Medição e Diário de Obra.

## Estado atual (relevante)

- `Additive.status`: `rascunho | em_analise | aprovado | reprovado | aditivo_contratado` + flag `isContracted`.
- `contractAdditive()` em `src/lib/additiveImport.ts` já existe e:
  - cria tarefas dos **novos serviços** dentro do `phaseId` correto (id `add-{addId}-{compId}`);
  - marca o aditivo como `aditivo_contratado`.
- `getApprovedAdditiveBudgetItems()` hoje inclui itens com status **`aprovado`** — **fere a regra**: aprovado não pode mexer na Medição antes de integrar.
- Acréscimo/supressão hoje gera apenas um `BudgetItem` separado (source `aditivo`); **não atualiza** a quantidade contratual da composição/tarefa original e não gera histórico estruturado.

## Mudanças

### 1. Tipos (`src/types/project.ts`)

- `Task`: adicionar campos opcionais
  - `originAdditiveId?: string`, `originAdditiveName?: string`, `originAdditiveVersion?: number` (quando criada por aditivo)
  - `additiveHistory?: Array<{ additiveId; additiveName; version; at; addedQuantity; suppressedQuantity; previousQuantity; newQuantity }>` (acréscimos/supressões aplicados a tarefas existentes)
- `BudgetItem`: garantir `additiveId`, `originAdditiveName`, `additiveHistory` (similar) para itens contratuais sintéticos.
- `AdditiveComposition`: novo `linkedTaskId?: string` (tarefa criada/atualizada pela integração) e `integratedAt?: string`.

### 2. Regra de visibilidade (não-integrado fica isolado)

Em `src/lib/additiveImport.ts` → `getApprovedAdditiveBudgetItems`:
- Trocar o filtro para **somente** aditivos com `isContracted === true` (ou `status === 'aditivo_contratado'`).
- Remover o ramo `status === 'aprovado'` que vaza para Medição/budget antes de integrar.

Auditoria de outros consumidores (`src/lib/financialEngine.ts`, `useMeasurementRows`, `Dashboard`, `Measurement`, `DailyReport`, Gantt) para confirmar que tudo passa por `budgetItems` derivados, então essa única mudança neutraliza vazamentos. Caso encontre acesso direto a `project.additives` que considere `aprovado`, ajustar para exigir `isContracted`.

### 3. `contractAdditive()` — integração completa e idempotente

Reescrita do fluxo em `src/lib/additiveImport.ts`:

```text
para cada composition c do aditivo:
  se c.isNewService:
    se já existe task com id `add-{addId}-{c.id}` → pular (idempotência)
    senão criar Task no phase c.phaseId com:
      quantity = c.addedQuantity, unitPrice/unitPriceNoBDI calculados (atual),
      originAdditiveId, originAdditiveName, originAdditiveVersion,
      durationMode='manual', startDate sugerida = project.startDate, sem dependências
    setar c.linkedTaskId = task.id
  senão (composição existente):
    localizar Task alvo via c.taskId (preferencial) ou itemNumber/code
    se não achar → registrar issue 'info' e pular (não cria duplicado)
    se já existe entry em task.additiveHistory com (additiveId, version) → pular (idempotência)
    delta = (c.addedQuantity ?? 0) - (c.suppressedQuantity ?? 0)
    previousQuantity = task.quantity
    newQuantity = max(0, previousQuantity + delta)
    push em task.additiveHistory: { additiveId, additiveName, version, at, addedQuantity, suppressedQuantity, previousQuantity, newQuantity }
    task.quantity = newQuantity
    se newQuantity === 0 → marcar task como suprimida (flag suppressed=true) mas NÃO remover

aditivo.status = 'aditivo_contratado'
aditivo.isContracted = true
aditivo.contractedAt = now
recalcular budgetItems source='aditivo' via getApprovedAdditiveBudgetItems (já filtrando isContracted)
```

A idempotência é garantida por (a) id determinístico de tarefa nova e (b) chave `(additiveId, version)` no histórico.

### 4. Medição respeita novo saldo

- A Medição já lê `budgetItems` (source `original` + `aditivo`). Após integrar, a `quantity` da composição original muda via `additiveHistory` aplicado ao `BudgetItem` correspondente.
  - Em `getApprovedAdditiveBudgetItems`, para `changeKind` acrescido/suprimido, gerar **um BudgetItem único de ajuste** (já existe), e adicionalmente expor utilitário `getEffectiveContractQuantity(itemNumber|taskId)` que soma original + somatório de aditivos integrados.
- Em `src/lib/measurementValidation.ts` (ou local equivalente) acrescentar regra: medição acumulada não pode exceder `effectiveContractQuantity`. Se exceder por causa de supressão posterior, gerar `MeasurementValidationIssue` `level: 'error'` com texto "Medição acumulada (X) excede saldo contratual após Aditivo Y (Z)".

### 5. Cronograma / Tarefas / Diário

- Como tarefas são criadas/atualizadas dentro de `project.phases`, automaticamente aparecem em `TaskList`, `GanttChart` e `DailyReport` (que iteram phases).
- `TaskList` e `GanttChart`: exibir badge "Aditivo Nº X" quando `task.originAdditiveId` ou `task.additiveHistory?.length`. Tooltip com histórico (qtd original → qtd final).
- `DailyReport` produção: nada muda (lista phases.tasks). Apenas adicionar badge de origem na linha.

### 6. UI do Aditivo

`src/components/additive/AdditiveApprovalBanner.tsx` e `AdditiveHeader.tsx`:
- Renomear ação de **"Marcar como Contratado"** para **"Integrar ao Projeto"**.
- Antes de executar, abrir `AlertDialog` de confirmação com o texto:
  > "Após integrar, este aditivo passará a compor o contrato da obra e será vinculado às abas Tarefas, Cronograma, Medição e Diário de Obra. Esta ação não pode ser desfeita."
- Status badge ganha rótulo final **"Integrado ao projeto"** (mantém enum `aditivo_contratado` por compatibilidade).
- Após integrado, a tela de edição do aditivo já fica `isLocked` (regra existente). Confirmar que todas as ações de edição respeitam.

### 7. Auditoria (`audit.ts`)

Em `handleContractAdditive` registrar log com:
- contagem de novos serviços criados
- composições existentes acrescidas/suprimidas
- lista resumida de tarefas afetadas (id + delta)

## Arquivos afetados

- `src/types/project.ts` — novos campos opcionais em `Task`, `AdditiveComposition`.
- `src/lib/additiveImport.ts` — reescrever `contractAdditive`, ajustar `getApprovedAdditiveBudgetItems`, adicionar `getEffectiveContractQuantity`.
- `src/lib/measurementValidation.ts` — regra de saldo após supressão.
- `src/hooks/useAdditiveActions.ts` — abrir confirmação, mensagens, métricas para o log.
- `src/components/additive/AdditiveHeader.tsx` e `AdditiveApprovalBanner.tsx` — renomear botão, adicionar `AlertDialog`.
- `src/components/additive/types.ts` — novo `STATUS_LABEL.aditivo_contratado = 'Integrado ao projeto'`.
- `src/components/TaskList.tsx` e `src/components/GanttChart.tsx` — badge "Aditivo Nº X" e tooltip de histórico.
- `src/components/DailyReport.tsx` (ou `dailyReport/ProductionTable.tsx`) — badge de origem.

## Critérios de aceite cobertos

- Rascunho/Em análise/Aprovado: zero impacto fora da aba Aditivo (validado pelo filtro `isContracted` em `getApprovedAdditiveBudgetItems`).
- Novo serviço integrado: aparece em Tarefas, Gantt, Medição e Diário com badge de origem.
- Acréscimo: tarefa existente recebe nova `quantity`, sem duplicação, com `additiveHistory` preservado.
- Supressão: tarefa existente reduzida (mantida visível mesmo com qty 0), Medição alerta se acumulado excede.
- Idempotência: clicar duas vezes em "Integrar" não duplica (id determinístico + chave `additiveId+version`).
- Aditivo integrado: edição bloqueada (regra `isAdditiveReplacementBlocked` já cobre).
- Exportações continuam funcionando (não tocadas).
- Typecheck/build executados pelo harness ao final.
