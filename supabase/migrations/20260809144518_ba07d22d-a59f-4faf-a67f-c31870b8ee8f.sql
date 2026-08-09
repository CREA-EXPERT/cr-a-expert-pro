ALTER TABLE public.signatures_signataires
  ADD COLUMN IF NOT EXISTS tentatives_envoi integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dernier_essai_le timestamptz,
  ADD COLUMN IF NOT EXISTS dernier_resultat text,
  ADD COLUMN IF NOT EXISTS derniere_cause text;

CREATE TABLE IF NOT EXISTS public.journal_emails_signature (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  signature_id uuid NOT NULL REFERENCES public.signatures_electroniques(id) ON DELETE CASCADE,
  signataire_id uuid REFERENCES public.signatures_signataires(id) ON DELETE SET NULL,
  destinataire_masque text NOT NULL,
  tentative integer NOT NULL DEFAULT 1,
  declencheur text NOT NULL DEFAULT 'manuel',
  resultat text NOT NULL,
  cause text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.journal_emails_signature TO authenticated;
GRANT ALL ON public.journal_emails_signature TO service_role;

ALTER TABLE public.journal_emails_signature ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS journal_emails_signature_staff_read ON public.journal_emails_signature;
CREATE POLICY journal_emails_signature_staff_read
  ON public.journal_emails_signature FOR SELECT TO authenticated
  USING (private.is_staff(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_journal_emails_signature_signature
  ON public.journal_emails_signature (signature_id, created_at DESC);