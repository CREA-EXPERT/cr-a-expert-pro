CREATE TABLE public.archives_facturation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_ref uuid NOT NULL,
  denomination text NOT NULL DEFAULT '',
  forme_juridique text NOT NULL DEFAULT '',
  relecture_statut text,
  moyen_de_paiement_enregistre boolean NOT NULL DEFAULT false,
  lettre_mission_acceptee_le timestamptz,
  dossier_cree_le timestamptz,
  anonymise_le timestamptz NOT NULL DEFAULT now(),
  conserver_jusqu_au date NOT NULL DEFAULT (now() + interval '10 years')::date,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.archives_facturation TO service_role;

ALTER TABLE public.archives_facturation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "archives_facturation_service_only"
ON public.archives_facturation
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);