CREATE TABLE public.preferences_encadres (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cle text NOT NULL,
  ouvert boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, cle)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.preferences_encadres TO authenticated;
GRANT ALL ON public.preferences_encadres TO service_role;

ALTER TABLE public.preferences_encadres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chacun gere ses preferences d affichage"
ON public.preferences_encadres
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER preferences_encadres_updated
BEFORE UPDATE ON public.preferences_encadres
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();