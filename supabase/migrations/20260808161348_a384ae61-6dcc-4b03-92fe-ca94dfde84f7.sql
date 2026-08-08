ALTER TABLE public.dossiers
  ADD COLUMN IF NOT EXISTS siege_voie text,
  ADD COLUMN IF NOT EXISTS siege_complement text,
  ADD COLUMN IF NOT EXISTS siege_code_postal text,
  ADD COLUMN IF NOT EXISTS siege_ville text,
  ADD COLUMN IF NOT EXISTS siege_pays text NOT NULL DEFAULT 'France',
  ADD COLUMN IF NOT EXISTS siege_adresse_verifiee boolean NOT NULL DEFAULT false;