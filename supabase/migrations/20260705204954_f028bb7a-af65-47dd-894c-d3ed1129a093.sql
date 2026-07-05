CREATE OR REPLACE FUNCTION public.setup_new_user(_full_name TEXT, _university TEXT, _faculty TEXT, _study_year TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'student')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.subscriptions (user_id, plan, status)
  VALUES (auth.uid(), 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;