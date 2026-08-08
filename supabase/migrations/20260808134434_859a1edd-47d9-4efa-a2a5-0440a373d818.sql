ALTER TABLE public.dossiers
  ADD COLUMN IF NOT EXISTS justificatif_type text,
  ADD COLUMN IF NOT EXISTS justificatif_detail text;