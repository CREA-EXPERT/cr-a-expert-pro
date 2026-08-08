ALTER TABLE public.dossiers
  ADD COLUMN IF NOT EXISTS pour_qui text NOT NULL DEFAULT 'moi',
  ADD COLUMN IF NOT EXISTS role_demandeur text,
  ADD COLUMN IF NOT EXISTS valeur_part numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS cloture_mois integer NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS exercice_etendu boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS periodicite_tva text,
  ADD COLUMN IF NOT EXISTS relecture_options boolean NOT NULL DEFAULT false;

ALTER TABLE public.associes
  ADD COLUMN IF NOT EXISTS prenoms text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS adresse_code_postal text,
  ADD COLUMN IF NOT EXISTS adresse_ville text,
  ADD COLUMN IF NOT EXISTS adresse_pays text DEFAULT 'France';

INSERT INTO public.params_tarifs (cle, libelle, montant_ht, montant_ttc)
SELECT 'relecture_options', 'Relecture des choix par l''expert-comptable', 150, 180
WHERE NOT EXISTS (SELECT 1 FROM public.params_tarifs WHERE cle = 'relecture_options');