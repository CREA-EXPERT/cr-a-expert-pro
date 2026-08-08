ALTER TABLE public.associes
  ADD COLUMN IF NOT EXISTS contrat_mariage boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS contrat_mariage_detail text;

ALTER TABLE public.dossiers
  ADD COLUMN IF NOT EXISTS objets_social text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS telephone_contact text;

CREATE TABLE IF NOT EXISTS public.recommandations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  page text NOT NULL DEFAULT '',
  message text NOT NULL,
  email text,
  traite boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.recommandations TO anon;
GRANT SELECT, INSERT, UPDATE ON public.recommandations TO authenticated;
GRANT ALL ON public.recommandations TO service_role;

ALTER TABLE public.recommandations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recommandations_insert_any" ON public.recommandations
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "recommandations_select_own_or_staff" ON public.recommandations
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE POLICY "recommandations_staff_update" ON public.recommandations
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER recommandations_updated BEFORE UPDATE ON public.recommandations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();