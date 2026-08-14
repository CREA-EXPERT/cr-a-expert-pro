ALTER TABLE public.associes
  ADD COLUMN IF NOT EXISTS conjoint_nom text,
  ADD COLUMN IF NOT EXISTS date_pacs date,
  ADD COLUMN IF NOT EXISTS regime_etranger_communautaire text,
  ADD COLUMN IF NOT EXISTS beneficiaires_indirects text;

ALTER TABLE public.dossiers
  ADD COLUMN IF NOT EXISTS bien_commun_apport text,
  ADD COLUMN IF NOT EXISTS bien_commun_designation text,
  ADD COLUMN IF NOT EXISTS date_consentements date;