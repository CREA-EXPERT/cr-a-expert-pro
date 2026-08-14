ALTER TABLE public.associes
  ADD COLUMN IF NOT EXISTS conjoint_prenom text,
  ADD COLUMN IF NOT EXISTS conjoint_date_naissance date,
  ADD COLUMN IF NOT EXISTS conjoint_lieu_naissance text,
  ADD COLUMN IF NOT EXISTS conjoint_revendique boolean NOT NULL DEFAULT false;