-- 1. Champs de cycle de vie sur les dossiers
ALTER TABLE public.dossiers
  ADD COLUMN IF NOT EXISTS cabinet_engage boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS date_statut timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS date_derniere_activite timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS date_fin_relation timestamptz,
  ADD COLUMN IF NOT EXISTS date_archivage_kyc timestamptz;

CREATE INDEX IF NOT EXISTS dossiers_cycle_idx
  ON public.dossiers (statut, cabinet_engage, date_statut);

-- 2. Archive KYC réservée au cabinet
CREATE TABLE IF NOT EXISTS public.dossier_kyc (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dossier_id uuid NOT NULL REFERENCES public.dossiers(id) ON DELETE SET NULL,
  document_id uuid,
  associe_id uuid,
  categorie text NOT NULL CHECK (categorie IN ('piece_identite_client','piece_identite_be','vigilance','trace_verification')),
  type_document text NOT NULL,
  libelle text NOT NULL,
  chemin_archive text,
  metadonnees jsonb NOT NULL DEFAULT '{}'::jsonb,
  date_fin_relation timestamptz,
  conserver_jusqu_au date,
  archive_le timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS dossier_kyc_unicite_idx
  ON public.dossier_kyc (dossier_id, categorie, type_document, COALESCE(document_id, '00000000-0000-0000-0000-000000000000'::uuid));

GRANT SELECT ON public.dossier_kyc TO authenticated;
GRANT ALL ON public.dossier_kyc TO service_role;
ALTER TABLE public.dossier_kyc ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dossier_kyc_cabinet_read" ON public.dossier_kyc
  FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));

-- 3. Trace de vérification non identifiante
CREATE TABLE IF NOT EXISTS public.traces_verification_identite (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dossier_id uuid NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  piece_verifiee boolean NOT NULL DEFAULT true,
  type_piece text NOT NULL,
  date_verification timestamptz,
  date_suppression timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.traces_verification_identite TO authenticated;
GRANT ALL ON public.traces_verification_identite TO service_role;
ALTER TABLE public.traces_verification_identite ENABLE ROW LEVEL SECURITY;

CREATE POLICY "traces_owner_read" ON public.traces_verification_identite
  FOR SELECT TO authenticated USING (private.owns_dossier(dossier_id));
CREATE POLICY "traces_staff_read" ON public.traces_verification_identite
  FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));

-- 4. Journal des purges (aucune donnée personnelle)
CREATE TABLE IF NOT EXISTS public.journal_purge (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id uuid NOT NULL,
  date_execution timestamptz NOT NULL DEFAULT now(),
  dry_run boolean NOT NULL DEFAULT false,
  type_donnee text NOT NULL,
  nombre_elements_supprimes integer NOT NULL DEFAULT 0,
  details_techniques jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS journal_purge_execution_idx
  ON public.journal_purge (date_execution DESC);

GRANT SELECT ON public.journal_purge TO authenticated;
GRANT ALL ON public.journal_purge TO service_role;
ALTER TABLE public.journal_purge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "journal_purge_admin_read" ON public.journal_purge
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));

-- 5. Accès au bucket privé d'archive KYC : lecture cabinet, écriture service interne
CREATE POLICY "kyc_odeon_cabinet_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'kyc-odeon' AND private.is_staff(auth.uid()));