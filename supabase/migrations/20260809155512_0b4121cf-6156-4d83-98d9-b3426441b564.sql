ALTER TABLE public.dossiers
  ADD COLUMN IF NOT EXISTS activites jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.dossiers d
SET activites = sub.liste
FROM (
  SELECT d2.id,
         COALESCE(
           jsonb_agg(
             jsonb_build_object(
               'id', gen_random_uuid()::text,
               'source', 'libre',
               'naf_code', NULL,
               'naf_libelle', NULL,
               'texte', t.texte,
               'reglementee', d2.activite_reglementee,
               'justificatif_type', d2.justificatif_type,
               'justificatif_detail', d2.justificatif_detail
             )
             ORDER BY t.ord
           ) FILTER (WHERE btrim(t.texte) <> ''),
           '[]'::jsonb
         ) AS liste
  FROM public.dossiers d2
  CROSS JOIN LATERAL unnest(d2.objets_social) WITH ORDINALITY AS t(texte, ord)
  WHERE d2.activites = '[]'::jsonb
    AND array_length(d2.objets_social, 1) > 0
  GROUP BY d2.id
) sub
WHERE d.id = sub.id;