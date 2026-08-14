ALTER TABLE public.dossiers
  ADD COLUMN IF NOT EXISTS regime_fiscal_eurl text,
  ADD COLUMN IF NOT EXISTS gerant_est_associe_unique boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS regime_fiscal_sci text,
  ADD COLUMN IF NOT EXISTS location_meublee boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS greffe_ville text;