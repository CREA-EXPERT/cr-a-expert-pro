ALTER TABLE public.dossiers
  ADD COLUMN IF NOT EXISTS code_naf text,
  ADD COLUMN IF NOT EXISTS code_naf_libelle text,
  ADD COLUMN IF NOT EXISTS apport_industrie boolean NOT NULL DEFAULT false;

INSERT INTO public.document_rules (type_document, libelle_client, aide_client, obligatoire, origine, ordre, condition_champ, condition_valeur)
SELECT 'autorisation_activite_reglementee',
       'Justificatif d''exercice de l''activité réglementée',
       'Diplôme, carte professionnelle, agrément, autorisation administrative, attestation d''inscription à un ordre ou attestation d''assurance responsabilité civile professionnelle, selon l''activité exercée. Le cabinet vous indique la pièce attendue après examen de votre dossier.',
       true, 'client', 95, 'activite_reglementee', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.document_rules WHERE type_document = 'autorisation_activite_reglementee'
);