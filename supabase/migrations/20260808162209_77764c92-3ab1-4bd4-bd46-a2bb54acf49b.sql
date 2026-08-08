ALTER TABLE public.params_tarifs ADD COLUMN IF NOT EXISTS source text, ADD COLUMN IF NOT EXISTS verifie_le date;

ALTER TABLE public.simulations ADD COLUMN IF NOT EXISTS email_envoye_le timestamptz, ADD COLUMN IF NOT EXISTS email_erreur text;

ALTER TABLE public.dossiers
  ADD COLUMN IF NOT EXISTS renonciation_retractation_le timestamptz,
  ADD COLUMN IF NOT EXISTS objets_confirmes_le timestamptz,
  ADD COLUMN IF NOT EXISTS reglementee_source text,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_method_id text,
  ADD COLUMN IF NOT EXISTS moyen_de_paiement_enregistre_le timestamptz;

ALTER TABLE public.dossiers DROP COLUMN IF EXISTS relecture_options;

ALTER TABLE public.dossiers ADD CONSTRAINT dossiers_reglementee_source_chk
  CHECK (reglementee_source IS NULL OR reglementee_source IN ('naf','verification_ia','declaration_utilisateur'));

ALTER TABLE public.signatures_electroniques
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS provider_ref text;

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cle text NOT NULL,
  ip text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rate_limits_lookup ON public.rate_limits (cle, ip, created_at DESC);

GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rate_limits_service_only" ON public.rate_limits FOR ALL TO service_role USING (true) WITH CHECK (true);