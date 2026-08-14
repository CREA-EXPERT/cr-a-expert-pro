ALTER TABLE public.dossiers
  ADD COLUMN IF NOT EXISTS banque_depot text,
  ADD COLUMN IF NOT EXISTS ville_signature text,
  ADD COLUMN IF NOT EXISTS date_cloture_premier_exercice date;

ALTER TABLE public.associes
  ADD COLUMN IF NOT EXISTS date_mariage date,
  ADD COLUMN IF NOT EXISTS lieu_mariage text,
  ADD COLUMN IF NOT EXISTS conjoint_civilite text;