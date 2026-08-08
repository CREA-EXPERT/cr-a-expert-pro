ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS depose_le timestamptz,
  ADD COLUMN IF NOT EXISTS atteste_conforme boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS atteste_le timestamptz,
  ADD COLUMN IF NOT EXISTS valide_le timestamptz;

CREATE TABLE IF NOT EXISTS public.signatures_electroniques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  type_document text NOT NULL,
  libelle text NOT NULL,
  aide_client text,
  ordre integer NOT NULL DEFAULT 100,
  statut text NOT NULL DEFAULT 'a_preparer',
  envoye_le timestamptz,
  signe_le timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dossier_id, type_document)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.signatures_electroniques TO authenticated;
GRANT ALL ON public.signatures_electroniques TO service_role;

ALTER TABLE public.signatures_electroniques ENABLE ROW LEVEL SECURITY;

CREATE POLICY "signatures_owner_all" ON public.signatures_electroniques
  FOR ALL TO authenticated
  USING (public.owns_dossier(dossier_id))
  WITH CHECK (public.owns_dossier(dossier_id));

CREATE POLICY "signatures_staff_read" ON public.signatures_electroniques
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "signatures_staff_update" ON public.signatures_electroniques
  FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER signatures_updated
  BEFORE UPDATE ON public.signatures_electroniques
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();