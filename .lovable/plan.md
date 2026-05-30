# Etapa 1 — Tirar Almoxarifado e Diário do `data_json`

## Objetivo

Parar de reenviar o projeto inteiro (hoje ~15 MB) toda vez que o usuário registra uma movimentação ou salva o diário. Isso elimina o erro "Erro ao salvar na nuvem" de uma vez e prepara o caminho para os próximos módulos.

A EAP, orçamento, equipes, configurações etc. **continuam em `data_json`** por enquanto — só os dois módulos de alto volume saem.

## Escopo desta etapa

**Entra:**
- Movimentações de almoxarifado (entradas, retiradas, devoluções, ajustes).
- Requisições e termos de cautela.
- Diário de obra (registros diários + equipes presentes + equipamentos + fotos/anexos já estão no Storage).
- Apontamentos diários da EAP (`task.dailyLogs`) — fonte da medição.

**Não entra (fica para etapas futuras):**
- Medição, Aditivo, Custo Real, Materiais (lista), Equipes, EAP/Tarefas.
- Refatoração do `project_history`.

## Modelo de dados proposto

```text
warehouse_movements
  id, project_id (FK), kind (entrada|retirada|devolucao|ajuste),
  occurred_at, item_ref (id do item dentro do data_json), quantity,
  unit, location_id, requisition_id, custody_id, notes,
  attachments (jsonb com {storagePath, mimeType}[]),
  created_by, created_at, updated_at

warehouse_requisitions
  id, project_id, number, status, requested_by, requested_at,
  approved_by, approved_at, items (jsonb), notes

warehouse_custody
  id, project_id, employee, equipment_ref, signed_at,
  returned_at, signature_storage_path, items (jsonb)

daily_reports
  id, project_id, date (date), general_info (jsonb),
  text_areas (jsonb), photos (jsonb), teams_present (jsonb),
  equipment (jsonb), created_by, created_at, updated_at
  UNIQUE(project_id, date)

task_daily_logs
  id, project_id, task_id (text — referencia o id da tarefa no data_json),
  date, executed_quantity, notes, team_code,
  created_by, created_at
  INDEX(project_id, date)
  INDEX(project_id, task_id)
```

Todos com RLS por `is_org_member(auth.uid(), (SELECT organization_id FROM projects WHERE id = project_id))`.

## Plano de migração (sem perda de dados)

1. **Criar as 4 tabelas** + GRANTs + RLS + índices.
2. **Migração one-shot**: ler `data_json` de cada projeto existente e copiar:
   - `warehouse.movements[]` → `warehouse_movements`
   - `warehouse.requisitions[]` → `warehouse_requisitions`
   - `warehouse.custodyTerms[]` → `warehouse_custody`
   - `dailyReports[]` → `daily_reports`
   - `phases[].tasks[].dailyLogs[]` → `task_daily_logs`
3. **NÃO apagar** os campos do `data_json` ainda — manter como fallback de leitura por 1 release.
4. Refatorar **escrita**: hooks de almoxarifado/diário gravam direto nas novas tabelas (CRUD por linha, ~KB).
5. Refatorar **leitura**: hidratar o objeto `Project` em memória lendo das novas tabelas + JSON, para o resto da UI continuar funcionando sem mudanças.
6. Numa etapa futura (não agora), remover os campos do `data_json`.

## Arquivos a criar/alterar (estimado)

**Novos:**
- `supabase/migrations/<ts>_normalize_warehouse_and_daily.sql`
- `src/lib/cloudWarehouse.ts` — CRUD das 3 tabelas de almoxarifado
- `src/lib/cloudDailyReports.ts` — CRUD de daily_reports + task_daily_logs
- `src/lib/projectHydration.ts` — monta o Project a partir do JSON + tabelas

**Alterados:**
- `src/lib/warehouse.ts` — operações passam a chamar `cloudWarehouse`
- `src/components/warehouse/*` — handlers async, sem reescrever o projeto inteiro
- `src/hooks/useDailyReportState.ts` — `persist` grava em `daily_reports`
- `src/components/DailyProductionWorkspace.tsx` (e similares) — `dailyLogs` via `cloudDailyReports`
- `src/lib/cloudProjects.ts` — `loadCloudProject` chama `projectHydration`

## Compatibilidade

- Projetos antigos continuam abrindo (fallback lê do JSON).
- Salvamento novo escreve só na tabela específica.
- Conflito de edição passa a ser **por linha**, não pelo projeto inteiro.
- `localStorage` continua como cache offline.

## Riscos

- Migração de projetos grandes (15 MB) pode ser lenta — rodar uma vez, idempotente, com `ON CONFLICT DO NOTHING`.
- Hidratação adiciona N queries ao abrir projeto — mitigar com SELECTs paralelos.

## Como vou validar

- Abrir projeto existente: dados aparecem iguais.
- Adicionar movimentação no Almoxarifado: salva em <1 s, sem o toast de erro.
- Recarregar página: movimentação persiste.
- Diário do dia: salvar não dispara PATCH em `projects`.

---

Aprovo este escopo? Posso começar pela migração SQL.
