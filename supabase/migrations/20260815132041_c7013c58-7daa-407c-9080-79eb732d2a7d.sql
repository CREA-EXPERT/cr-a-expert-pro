CREATE TABLE public.emails_test (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dossier_id uuid REFERENCES public.dossiers(id) ON DELETE CASCADE,
  destinataire text NOT NULL,
  sujet text NOT NULL,
  corps text NOT NULL DEFAULT '',
  tag text NOT NULL DEFAULT 'generique',
  pour_cabinet boolean NOT NULL DEFAULT false,
  ordre bigserial NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_emails_test_dossier ON public.emails_test(dossier_id, ordre);
CREATE INDEX idx_emails_test_tag ON public.emails_test(tag);

GRANT SELECT ON public.emails_test TO authenticated;
GRANT ALL ON public.emails_test TO service_role;

ALTER TABLE public.emails_test ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture des emails de test de ses dossiers"
ON public.emails_test FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.dossiers d
    WHERE d.id = emails_test.dossier_id
      AND d.user_id = auth.uid()
      AND d.est_test = true
  )
  OR private.is_staff(auth.uid())
);

CREATE POLICY "Le cabinet purge la boite de test"
ON public.emails_test FOR DELETE TO authenticated
USING (private.is_staff(auth.uid()));

INSERT INTO public.emails_test (dossier_id, destinataire, sujet, corps, tag, pour_cabinet)
VALUES
  (NULL, 'demo+test@crea-expert.fr', '[TEST] Votre dossier est ouvert', '<p>Exemple de message d''étape intercepté en environnement de test.</p>', 'dossier_ouvert', false),
  (NULL, 'demo+test@crea-expert.fr', '[TEST] Dossier complet et transmis au cabinet', '<p>Exemple de message de transmission intercepté en environnement de test.</p>', 'dossier_transmis', false);