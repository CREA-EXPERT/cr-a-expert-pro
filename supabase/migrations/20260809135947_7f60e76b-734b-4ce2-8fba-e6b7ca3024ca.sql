CREATE TABLE public.signatures_signataires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_id uuid NOT NULL REFERENCES public.signatures_electroniques(id) ON DELETE CASCADE,
  associe_id uuid REFERENCES public.associes(id) ON DELETE SET NULL,
  signataire_nom text NOT NULL,
  signataire_email text,
  methode text CHECK (methode IN ('trace','saisie')),
  horodatage timestamptz,
  adresse_ip text,
  user_agent text,
  hash_document text,
  consentement boolean NOT NULL DEFAULT false,
  jeton_hash text,
  jeton_expire_le timestamptz,
  envoye_le timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX signatures_signataires_unique
  ON public.signatures_signataires (signature_id, associe_id) NULLS NOT DISTINCT;
CREATE INDEX signatures_signataires_jeton ON public.signatures_signataires (jeton_hash);
CREATE INDEX signatures_signataires_signature ON public.signatures_signataires (signature_id);

GRANT SELECT ON public.signatures_signataires TO authenticated;
GRANT ALL ON public.signatures_signataires TO service_role;

ALTER TABLE public.signatures_signataires ENABLE ROW LEVEL SECURITY;

CREATE POLICY signataires_select_owner_or_staff
ON public.signatures_signataires
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.signatures_electroniques s
    WHERE s.id = signature_id
      AND (private.owns_dossier(s.dossier_id) OR private.is_staff(auth.uid()))
  )
);

ALTER TABLE public.signatures_electroniques
  ADD COLUMN IF NOT EXISTS fichier_signe text,
  ADD COLUMN IF NOT EXISTS hash_document text;