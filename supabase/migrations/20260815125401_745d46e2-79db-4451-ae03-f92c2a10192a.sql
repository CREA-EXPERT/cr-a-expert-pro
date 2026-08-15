ALTER TABLE public.dossiers ADD COLUMN IF NOT EXISTS est_test boolean NOT NULL DEFAULT false;

CREATE TABLE public.demandes_contact (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  categorie text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  objet text,
  dossier_id uuid REFERENCES public.dossiers(id) ON DELETE SET NULL,
  user_id uuid,
  envoye boolean NOT NULL DEFAULT false,
  test boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.demandes_contact TO authenticated;
GRANT ALL ON public.demandes_contact TO service_role;

ALTER TABLE public.demandes_contact ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cabinet et admin consultent les demandes de contact"
ON public.demandes_contact FOR SELECT TO authenticated
USING (private.is_staff(auth.uid()));

CREATE INDEX idx_demandes_contact_created_at ON public.demandes_contact (created_at DESC);

CREATE TABLE public.journal_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid REFERENCES public.dossiers(id) ON DELETE CASCADE,
  destinataire text NOT NULL,
  sujet text NOT NULL,
  statut text NOT NULL DEFAULT 'envoye',
  detail text,
  test boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.journal_emails TO authenticated;
GRANT ALL ON public.journal_emails TO service_role;

ALTER TABLE public.journal_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Proprietaire, cabinet et admin consultent le journal des emails"
ON public.journal_emails FOR SELECT TO authenticated
USING (
  private.is_staff(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.dossiers d
    WHERE d.id = journal_emails.dossier_id AND d.user_id = auth.uid()
  )
);

CREATE INDEX idx_journal_emails_dossier ON public.journal_emails (dossier_id, created_at DESC);