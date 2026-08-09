CREATE TABLE public.journal_rgpd (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('export','suppression')),
  resultat text NOT NULL CHECK (resultat IN ('succes','echec')),
  code_erreur text,
  nb_elements integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.journal_rgpd TO authenticated;
GRANT ALL ON public.journal_rgpd TO service_role;

ALTER TABLE public.journal_rgpd ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chacun consulte son propre journal RGPD"
ON public.journal_rgpd FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX journal_rgpd_user_idx ON public.journal_rgpd (user_id, created_at DESC);