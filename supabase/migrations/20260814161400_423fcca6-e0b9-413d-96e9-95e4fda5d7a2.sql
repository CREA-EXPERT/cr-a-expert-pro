ALTER TABLE public.dossiers
  ADD COLUMN IF NOT EXISTS denomination_risque text,
  ADD COLUMN IF NOT EXISTS mention_depot_capital text;