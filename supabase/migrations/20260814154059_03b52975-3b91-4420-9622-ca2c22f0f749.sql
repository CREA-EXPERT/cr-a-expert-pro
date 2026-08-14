CREATE INDEX IF NOT EXISTS events_dossier_dossier_type_date_idx
  ON public.events_dossier (dossier_id, type_event, created_at DESC);

CREATE TABLE public.notifications_cabinet (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dossier_id uuid NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  denomination text NOT NULL DEFAULT '',
  type_event text NOT NULL,
  motif_principal text,
  message text NOT NULL,
  lu boolean NOT NULL DEFAULT false,
  email_envoye_le timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.notifications_cabinet TO authenticated;
GRANT ALL ON public.notifications_cabinet TO service_role;

ALTER TABLE public.notifications_cabinet ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Le cabinet consulte les notifications"
  ON public.notifications_cabinet FOR SELECT TO authenticated
  USING (private.is_staff(auth.uid()));

CREATE POLICY "Le cabinet marque les notifications comme lues"
  ON public.notifications_cabinet FOR UPDATE TO authenticated
  USING (private.is_staff(auth.uid()))
  WITH CHECK (private.is_staff(auth.uid()));

CREATE INDEX notifications_cabinet_dossier_date_idx
  ON public.notifications_cabinet (dossier_id, created_at DESC);

CREATE TRIGGER notifications_cabinet_updated
  BEFORE UPDATE ON public.notifications_cabinet
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();