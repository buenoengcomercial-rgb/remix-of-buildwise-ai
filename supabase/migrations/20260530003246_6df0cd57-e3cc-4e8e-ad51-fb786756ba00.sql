
-- =====================================================================
-- ETAPA 1: Normalize warehouse & daily report data out of projects.data_json
-- Strategy: one row per entity, full payload kept in JSONB `data` column.
-- =====================================================================

-- ---------- WAREHOUSE MOVEMENTS ----------
CREATE TABLE public.warehouse_movements (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX warehouse_movements_project_idx ON public.warehouse_movements(project_id, occurred_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.warehouse_movements TO authenticated;
GRANT ALL ON public.warehouse_movements TO service_role;

ALTER TABLE public.warehouse_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY wm_select ON public.warehouse_movements FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p
                 WHERE p.id = warehouse_movements.project_id
                   AND public.is_org_member(auth.uid(), p.organization_id)));

CREATE POLICY wm_insert ON public.warehouse_movements FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p
                      WHERE p.id = warehouse_movements.project_id
                        AND public.has_org_role(auth.uid(), p.organization_id,
                            ARRAY['owner','admin','engineer']::org_role[])));

CREATE POLICY wm_update ON public.warehouse_movements FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p
                 WHERE p.id = warehouse_movements.project_id
                   AND public.has_org_role(auth.uid(), p.organization_id,
                       ARRAY['owner','admin','engineer']::org_role[])));

CREATE POLICY wm_delete ON public.warehouse_movements FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p
                 WHERE p.id = warehouse_movements.project_id
                   AND public.has_org_role(auth.uid(), p.organization_id,
                       ARRAY['owner','admin','engineer']::org_role[])));

CREATE TRIGGER warehouse_movements_set_updated_at BEFORE UPDATE ON public.warehouse_movements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ---------- WAREHOUSE REQUISITIONS ----------
CREATE TABLE public.warehouse_requisitions (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX warehouse_requisitions_project_idx ON public.warehouse_requisitions(project_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.warehouse_requisitions TO authenticated;
GRANT ALL ON public.warehouse_requisitions TO service_role;

ALTER TABLE public.warehouse_requisitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY wr_select ON public.warehouse_requisitions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p
                 WHERE p.id = warehouse_requisitions.project_id
                   AND public.is_org_member(auth.uid(), p.organization_id)));
CREATE POLICY wr_insert ON public.warehouse_requisitions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p
                      WHERE p.id = warehouse_requisitions.project_id
                        AND public.has_org_role(auth.uid(), p.organization_id,
                            ARRAY['owner','admin','engineer']::org_role[])));
CREATE POLICY wr_update ON public.warehouse_requisitions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p
                 WHERE p.id = warehouse_requisitions.project_id
                   AND public.has_org_role(auth.uid(), p.organization_id,
                       ARRAY['owner','admin','engineer']::org_role[])));
CREATE POLICY wr_delete ON public.warehouse_requisitions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p
                 WHERE p.id = warehouse_requisitions.project_id
                   AND public.has_org_role(auth.uid(), p.organization_id,
                       ARRAY['owner','admin','engineer']::org_role[])));

CREATE TRIGGER warehouse_requisitions_set_updated_at BEFORE UPDATE ON public.warehouse_requisitions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ---------- WAREHOUSE CUSTODY ----------
CREATE TABLE public.warehouse_custody (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX warehouse_custody_project_idx ON public.warehouse_custody(project_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.warehouse_custody TO authenticated;
GRANT ALL ON public.warehouse_custody TO service_role;

ALTER TABLE public.warehouse_custody ENABLE ROW LEVEL SECURITY;

CREATE POLICY wc_select ON public.warehouse_custody FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p
                 WHERE p.id = warehouse_custody.project_id
                   AND public.is_org_member(auth.uid(), p.organization_id)));
CREATE POLICY wc_insert ON public.warehouse_custody FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p
                      WHERE p.id = warehouse_custody.project_id
                        AND public.has_org_role(auth.uid(), p.organization_id,
                            ARRAY['owner','admin','engineer']::org_role[])));
CREATE POLICY wc_update ON public.warehouse_custody FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p
                 WHERE p.id = warehouse_custody.project_id
                   AND public.has_org_role(auth.uid(), p.organization_id,
                       ARRAY['owner','admin','engineer']::org_role[])));
CREATE POLICY wc_delete ON public.warehouse_custody FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p
                 WHERE p.id = warehouse_custody.project_id
                   AND public.has_org_role(auth.uid(), p.organization_id,
                       ARRAY['owner','admin','engineer']::org_role[])));

CREATE TRIGGER warehouse_custody_set_updated_at BEFORE UPDATE ON public.warehouse_custody
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ---------- DAILY REPORTS ----------
CREATE TABLE public.daily_reports (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  report_date date NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (project_id, report_date)
);
CREATE INDEX daily_reports_project_idx ON public.daily_reports(project_id, report_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_reports TO authenticated;
GRANT ALL ON public.daily_reports TO service_role;

ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY dr_select ON public.daily_reports FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p
                 WHERE p.id = daily_reports.project_id
                   AND public.is_org_member(auth.uid(), p.organization_id)));
CREATE POLICY dr_insert ON public.daily_reports FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p
                      WHERE p.id = daily_reports.project_id
                        AND public.has_org_role(auth.uid(), p.organization_id,
                            ARRAY['owner','admin','engineer']::org_role[])));
CREATE POLICY dr_update ON public.daily_reports FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p
                 WHERE p.id = daily_reports.project_id
                   AND public.has_org_role(auth.uid(), p.organization_id,
                       ARRAY['owner','admin','engineer']::org_role[])));
CREATE POLICY dr_delete ON public.daily_reports FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p
                 WHERE p.id = daily_reports.project_id
                   AND public.has_org_role(auth.uid(), p.organization_id,
                       ARRAY['owner','admin','engineer']::org_role[])));

CREATE TRIGGER daily_reports_set_updated_at BEFORE UPDATE ON public.daily_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ---------- TASK DAILY LOGS (apontamentos da EAP) ----------
CREATE TABLE public.task_daily_logs (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id text NOT NULL,
  log_date date NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX task_daily_logs_project_task_idx ON public.task_daily_logs(project_id, task_id, log_date DESC);
CREATE INDEX task_daily_logs_project_date_idx ON public.task_daily_logs(project_id, log_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_daily_logs TO authenticated;
GRANT ALL ON public.task_daily_logs TO service_role;

ALTER TABLE public.task_daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tdl_select ON public.task_daily_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p
                 WHERE p.id = task_daily_logs.project_id
                   AND public.is_org_member(auth.uid(), p.organization_id)));
CREATE POLICY tdl_insert ON public.task_daily_logs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p
                      WHERE p.id = task_daily_logs.project_id
                        AND public.has_org_role(auth.uid(), p.organization_id,
                            ARRAY['owner','admin','engineer']::org_role[])));
CREATE POLICY tdl_update ON public.task_daily_logs FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p
                 WHERE p.id = task_daily_logs.project_id
                   AND public.has_org_role(auth.uid(), p.organization_id,
                       ARRAY['owner','admin','engineer']::org_role[])));
CREATE POLICY tdl_delete ON public.task_daily_logs FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p
                 WHERE p.id = task_daily_logs.project_id
                   AND public.has_org_role(auth.uid(), p.organization_id,
                       ARRAY['owner','admin','engineer']::org_role[])));

CREATE TRIGGER task_daily_logs_set_updated_at BEFORE UPDATE ON public.task_daily_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
