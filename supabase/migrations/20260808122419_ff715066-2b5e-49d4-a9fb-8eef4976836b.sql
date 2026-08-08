INSERT INTO public.params_tarifs (cle, libelle, montant_ht, montant_ttc) VALUES
  ('annonce_EI', 'Annonce légale — entreprise individuelle (non requise)', 0, 0),
  ('greffe_EI', 'Frais de greffe — entreprise individuelle', NULL, 22.88),
  ('relecture_cabinet', 'Relecture des documents par un expert-comptable', 149, NULL),
  ('penalite_creation', 'Honoraires de création exigibles en cas de non-respect de l''engagement', 399, NULL)
ON CONFLICT DO NOTHING;

ALTER TABLE public.dossiers
  ADD COLUMN IF NOT EXISTS voie_validation text,
  ADD COLUMN IF NOT EXISTS autovalidation_le timestamptz,
  ADD COLUMN IF NOT EXISTS relecture_statut text NOT NULL DEFAULT 'non_demandee',
  ADD COLUMN IF NOT EXISTS lettre_mission_nom text,
  ADD COLUMN IF NOT EXISTS lettre_mission_acceptee_le timestamptz,
  ADD COLUMN IF NOT EXISTS moyen_de_paiement_enregistre boolean NOT NULL DEFAULT false;

ALTER TABLE public.simulations
  ADD COLUMN IF NOT EXISTS prenom text,
  ADD COLUMN IF NOT EXISTS corps_email text;

INSERT INTO public.document_rules (condition_champ, condition_valeur, type_document, libelle_client, aide_client, origine, obligatoire, ordre) VALUES
  ('forme_EI', NULL, 'declaration_ei', 'Déclaration de début d''activité — entreprise individuelle', 'Document généré à partir de vos réponses, à signer puis à déposer auprès du guichet des formalités des entreprises.', 'genere', true, 70)
ON CONFLICT DO NOTHING;