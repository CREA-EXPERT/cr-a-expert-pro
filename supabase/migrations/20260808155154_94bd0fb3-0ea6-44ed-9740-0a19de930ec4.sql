ALTER TABLE public.dossiers
  ADD COLUMN IF NOT EXISTS apport_immeuble boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fonds_commerce text NOT NULL DEFAULT 'aucun',
  ADD COLUMN IF NOT EXISTS dispense_commissaire_apports boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS activite_artisanale boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS siege_heberge boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dirigeant_deja_immatricule boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS siren_existant text,
  ADD COLUMN IF NOT EXISTS dirigeant_nomme_statuts boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sans_interdiction_gerer boolean NOT NULL DEFAULT false;

ALTER TABLE public.associes
  ADD COLUMN IF NOT EXISTS mineur_emancipe boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mesure_protection text NOT NULL DEFAULT 'aucune',
  ADD COLUMN IF NOT EXISTS zone_nationalite text NOT NULL DEFAULT 'france',
  ADD COLUMN IF NOT EXISTS reside_en_france boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS conjoint_travaille boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS conjoint_statut text;