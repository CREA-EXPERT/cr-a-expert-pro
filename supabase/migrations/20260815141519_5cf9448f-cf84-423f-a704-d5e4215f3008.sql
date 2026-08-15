ALTER TABLE public.associes
  ADD COLUMN IF NOT EXISTS contrat_mariage_etude text,
  ADD COLUMN IF NOT EXISTS contrat_mariage_notaire text,
  ADD COLUMN IF NOT EXISTS contrat_mariage_date date;