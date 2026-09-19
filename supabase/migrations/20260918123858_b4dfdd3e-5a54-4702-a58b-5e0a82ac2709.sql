CREATE TABLE public.worker_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text,
  status text NOT NULL DEFAULT 'Pending',
  contractor_id uuid REFERENCES auth.users(id),
  worker_id uuid REFERENCES public.workers(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

GRANT SELECT, INSERT, UPDATE ON public.worker_requests TO authenticated;
GRANT ALL ON public.worker_requests TO service_role;

ALTER TABLE public.worker_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY wr_select_own ON public.worker_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY wr_select_pending ON public.worker_requests FOR SELECT TO authenticated
  USING (status = 'Pending' OR contractor_id = auth.uid());
CREATE POLICY wr_select_admin ON public.worker_requests FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY wr_insert_own ON public.worker_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY wr_update_contractor ON public.worker_requests FOR UPDATE TO authenticated
  USING (status = 'Pending' OR contractor_id = auth.uid())
  WITH CHECK (contractor_id = auth.uid());

CREATE TRIGGER update_worker_requests_updated_at
  BEFORE UPDATE ON public.worker_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_worker_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'contractor') = 'worker' THEN
    INSERT INTO public.worker_requests (user_id, full_name, email, phone)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      COALESCE(NEW.email, ''),
      NULLIF(NEW.raw_user_meta_data->>'phone', '')
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_worker_request() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created_worker_request
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_worker_request();
