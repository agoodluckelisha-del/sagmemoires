-- 1) setup_new_user accepte désormais un rôle choisi à l'inscription (déposant/visiteur)
CREATE OR REPLACE FUNCTION public.setup_new_user(
  _full_name text,
  _university text,
  _faculty text,
  _study_year text,
  _role text DEFAULT 'student'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _safe_role app_role;
BEGIN
  -- On n'autorise que 'student' (déposant) ou 'visitor'. Jamais 'admin' via cette fonction.
  _safe_role := CASE
    WHEN _role = 'visitor' THEN 'visitor'::app_role
    ELSE 'student'::app_role
  END;

  INSERT INTO public.profiles (id, full_name, university, faculty, study_year)
  VALUES (
    auth.uid(),
    NULLIF(TRIM(COALESCE(_full_name, '')), ''),
    NULLIF(TRIM(COALESCE(_university, '')), ''),
    NULLIF(TRIM(COALESCE(_faculty, '')), ''),
    NULLIF(TRIM(COALESCE(_study_year, '')), '')
  )
  ON CONFLICT (id) DO UPDATE
    SET full_name = COALESCE(NULLIF(TRIM(COALESCE(EXCLUDED.full_name, '')), ''), public.profiles.full_name),
        university = COALESCE(NULLIF(TRIM(COALESCE(EXCLUDED.university, '')), ''), public.profiles.university),
        faculty = COALESCE(NULLIF(TRIM(COALESCE(EXCLUDED.faculty, '')), ''), public.profiles.faculty),
        study_year = COALESCE(NULLIF(TRIM(COALESCE(EXCLUDED.study_year, '')), ''), public.profiles.study_year);

  -- Ne crée le rôle que si l'utilisateur n'a pas déjà un rôle défini (évite d'écraser un admin)
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (auth.uid(), _safe_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  INSERT INTO public.subscriptions (user_id, plan, status)
  VALUES (auth.uid(), 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;
END;
$function$;

-- 2) Désigner le compte principal comme administrateur
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'luckgoodelishaagboguin@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;