CREATE TABLE public.params_signature (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  max_tentatives integer NOT NULL DEFAULT 3,
  intervalle_relance_heures integer NOT NULL DEFAULT 6,
  relance_auto_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT params_signature_singleton_chk CHECK (singleton),
  CONSTRAINT params_signature_max_chk CHECK (max_tentatives BETWEEN 1 AND 10),
  CONSTRAINT params_signature_intervalle_chk CHECK (intervalle_relance_heures BETWEEN 1 AND 168)
);

GRANT SELECT, INSERT, UPDATE ON public.params_signature TO authenticated;
GRANT ALL ON public.params_signature TO service_role;

ALTER TABLE public.params_signature ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cabinet et admin consultent les reglages de relance"
ON public.params_signature FOR SELECT TO authenticated
USING (private.is_staff(auth.uid()));

CREATE POLICY "Admin modifie les reglages de relance"
ON public.params_signature FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'))
WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin cree les reglages de relance"
ON public.params_signature FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE TRIGGER params_signature_updated
BEFORE UPDATE ON public.params_signature
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.params_signature (singleton) VALUES (true);