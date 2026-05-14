
-- 1. Restringir UPDATE/DELETE de fotos a membros da organização dona do projeto
DROP POLICY IF EXISTS "Authenticated update daily-report-photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete daily-report-photos" ON storage.objects;

CREATE POLICY "Org members update daily-report-photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'daily-report-photos'
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id::text = (storage.foldername(name))[1]
      AND public.is_org_member(auth.uid(), p.organization_id)
  )
)
WITH CHECK (
  bucket_id = 'daily-report-photos'
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id::text = (storage.foldername(name))[1]
      AND public.is_org_member(auth.uid(), p.organization_id)
  )
);

CREATE POLICY "Org members delete daily-report-photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'daily-report-photos'
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id::text = (storage.foldername(name))[1]
      AND public.is_org_member(auth.uid(), p.organization_id)
  )
);

-- Restringir INSERT também à pasta de uma obra do usuário
DROP POLICY IF EXISTS "Authenticated upload daily-report-photos" ON storage.objects;
CREATE POLICY "Org members upload daily-report-photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'daily-report-photos'
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id::text = (storage.foldername(name))[1]
      AND public.is_org_member(auth.uid(), p.organization_id)
  )
);

-- 2. Bloquear escalonamento de privilégios em organization_members
DROP POLICY IF EXISTS "members_update_admin" ON public.organization_members;
CREATE POLICY "members_update_admin"
ON public.organization_members FOR UPDATE
TO authenticated
USING (
  has_org_role(auth.uid(), organization_id, ARRAY['owner'::org_role, 'admin'::org_role])
  AND user_id <> auth.uid()
)
WITH CHECK (
  has_org_role(auth.uid(), organization_id, ARRAY['owner'::org_role, 'admin'::org_role])
  AND user_id <> auth.uid()
);
