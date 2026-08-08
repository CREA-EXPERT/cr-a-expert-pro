
CREATE POLICY "docs_owner_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND (public.owns_dossier(((storage.foldername(name))[1])::uuid) OR public.is_staff(auth.uid())));
CREATE POLICY "docs_owner_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND public.owns_dossier(((storage.foldername(name))[1])::uuid));
CREATE POLICY "docs_owner_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documents' AND public.owns_dossier(((storage.foldername(name))[1])::uuid))
  WITH CHECK (bucket_id = 'documents' AND public.owns_dossier(((storage.foldername(name))[1])::uuid));
CREATE POLICY "docs_owner_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND public.owns_dossier(((storage.foldername(name))[1])::uuid));
