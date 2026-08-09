CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION private.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('cabinet','admin'))
$$;

CREATE OR REPLACE FUNCTION private.owns_dossier(_dossier_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.dossiers d WHERE d.id = _dossier_id AND d.user_id = auth.uid())
$$;

GRANT USAGE ON SCHEMA private TO authenticated, service_role;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_staff(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.owns_dossier(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_staff(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.owns_dossier(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS associes_owner_all ON public.associes;
CREATE POLICY associes_owner_all ON public.associes FOR ALL TO authenticated
  USING (private.owns_dossier(dossier_id)) WITH CHECK (private.owns_dossier(dossier_id));
DROP POLICY IF EXISTS associes_staff_read ON public.associes;
CREATE POLICY associes_staff_read ON public.associes FOR SELECT TO authenticated
  USING (private.is_staff(auth.uid()));

DROP POLICY IF EXISTS callbacks_select_own_or_staff ON public.callbacks;
CREATE POLICY callbacks_select_own_or_staff ON public.callbacks FOR SELECT TO authenticated
  USING ((user_id = auth.uid()) OR private.is_staff(auth.uid()));
DROP POLICY IF EXISTS callbacks_staff_update ON public.callbacks;
CREATE POLICY callbacks_staff_update ON public.callbacks FOR UPDATE TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

DROP POLICY IF EXISTS rules_admin_write ON public.document_rules;
CREATE POLICY rules_admin_write ON public.document_rules FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS documents_owner_all ON public.documents;
CREATE POLICY documents_owner_all ON public.documents FOR ALL TO authenticated
  USING (private.owns_dossier(dossier_id)) WITH CHECK (private.owns_dossier(dossier_id));
DROP POLICY IF EXISTS documents_staff_read ON public.documents;
CREATE POLICY documents_staff_read ON public.documents FOR SELECT TO authenticated
  USING (private.is_staff(auth.uid()));
DROP POLICY IF EXISTS documents_staff_update ON public.documents;
CREATE POLICY documents_staff_update ON public.documents FOR UPDATE TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

DROP POLICY IF EXISTS dossiers_staff_read ON public.dossiers;
CREATE POLICY dossiers_staff_read ON public.dossiers FOR SELECT TO authenticated
  USING (private.is_staff(auth.uid()));
DROP POLICY IF EXISTS dossiers_staff_update ON public.dossiers;
CREATE POLICY dossiers_staff_update ON public.dossiers FOR UPDATE TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

DROP POLICY IF EXISTS events_insert ON public.events_dossier;
CREATE POLICY events_insert ON public.events_dossier FOR INSERT TO authenticated
  WITH CHECK (private.owns_dossier(dossier_id) OR private.is_staff(auth.uid()));
DROP POLICY IF EXISTS events_owner_read ON public.events_dossier;
CREATE POLICY events_owner_read ON public.events_dossier FOR SELECT TO authenticated
  USING (private.owns_dossier(dossier_id) OR private.is_staff(auth.uid()));

DROP POLICY IF EXISTS tarifs_admin_write ON public.params_tarifs;
CREATE POLICY tarifs_admin_write ON public.params_tarifs FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS profiles_select_self_or_staff ON public.profiles;
CREATE POLICY profiles_select_self_or_staff ON public.profiles FOR SELECT TO authenticated
  USING ((id = auth.uid()) OR private.is_staff(auth.uid()));

DROP POLICY IF EXISTS recommandations_select_own_or_staff ON public.recommandations;
CREATE POLICY recommandations_select_own_or_staff ON public.recommandations FOR SELECT TO authenticated
  USING ((user_id = auth.uid()) OR private.is_staff(auth.uid()));
DROP POLICY IF EXISTS recommandations_staff_update ON public.recommandations;
CREATE POLICY recommandations_staff_update ON public.recommandations FOR UPDATE TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

DROP POLICY IF EXISTS signatures_owner_all ON public.signatures_electroniques;
CREATE POLICY signatures_owner_all ON public.signatures_electroniques FOR ALL TO authenticated
  USING (private.owns_dossier(dossier_id)) WITH CHECK (private.owns_dossier(dossier_id));
DROP POLICY IF EXISTS signatures_staff_read ON public.signatures_electroniques;
CREATE POLICY signatures_staff_read ON public.signatures_electroniques FOR SELECT TO authenticated
  USING (private.is_staff(auth.uid()));
DROP POLICY IF EXISTS signatures_staff_update ON public.signatures_electroniques;
CREATE POLICY signatures_staff_update ON public.signatures_electroniques FOR UPDATE TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

DROP POLICY IF EXISTS simulations_staff_read ON public.simulations;
CREATE POLICY simulations_staff_read ON public.simulations FOR SELECT TO authenticated
  USING (private.is_staff(auth.uid()));

DROP POLICY IF EXISTS user_roles_admin_all ON public.user_roles;
CREATE POLICY user_roles_admin_all ON public.user_roles FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS user_roles_select_self_or_staff ON public.user_roles;
CREATE POLICY user_roles_select_self_or_staff ON public.user_roles FOR SELECT TO authenticated
  USING ((user_id = auth.uid()) OR private.is_staff(auth.uid()));

DROP POLICY IF EXISTS docs_owner_select ON storage.objects;
CREATE POLICY docs_owner_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND (private.owns_dossier(((storage.foldername(name))[1])::uuid) OR private.is_staff(auth.uid())));
DROP POLICY IF EXISTS docs_owner_insert ON storage.objects;
CREATE POLICY docs_owner_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND private.owns_dossier(((storage.foldername(name))[1])::uuid));
DROP POLICY IF EXISTS docs_owner_update ON storage.objects;
CREATE POLICY docs_owner_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documents' AND private.owns_dossier(((storage.foldername(name))[1])::uuid))
  WITH CHECK (bucket_id = 'documents' AND private.owns_dossier(((storage.foldername(name))[1])::uuid));
DROP POLICY IF EXISTS docs_owner_delete ON storage.objects;
CREATE POLICY docs_owner_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND private.owns_dossier(((storage.foldername(name))[1])::uuid));

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.is_staff(uuid);
DROP FUNCTION IF EXISTS public.owns_dossier(uuid);