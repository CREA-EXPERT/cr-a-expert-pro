CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, prenom, nom, email, telephone, consent_marketing)
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'prenom',''),
    COALESCE(NEW.raw_user_meta_data->>'nom',''),
    COALESCE(NEW.email,''),
    NEW.raw_user_meta_data->>'telephone',
    COALESCE((NEW.raw_user_meta_data->>'consent_marketing')::boolean,false))
  ON CONFLICT (id) DO NOTHING;

  IF EXISTS (SELECT 1 FROM public.user_roles) THEN
    v_role := 'client';
  ELSE
    v_role := 'admin';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.protect_last_admin()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.role = 'admin' AND NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'admin' AND id <> OLD.id
  ) THEN
    RAISE EXCEPTION 'Impossible de retirer le dernier administrateur';
  END IF;
  RETURN OLD;
END; $function$;

DROP TRIGGER IF EXISTS user_roles_protect_last_admin ON public.user_roles;
CREATE TRIGGER user_roles_protect_last_admin
BEFORE DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.protect_last_admin();

DROP POLICY IF EXISTS profiles_select_self_or_staff ON public.profiles;
CREATE POLICY profiles_select_self_or_staff ON public.profiles
FOR SELECT TO authenticated
USING (id = auth.uid() OR public.is_staff(auth.uid()));