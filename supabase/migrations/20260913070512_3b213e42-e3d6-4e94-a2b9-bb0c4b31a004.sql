
CREATE TYPE public.app_role AS ENUM ('admin','contractor','worker');
CREATE TYPE public.worker_role AS ENUM ('Mason','Labourer','Electrician','Plumber','Painter','Carpenter','Welder','Other');
CREATE TYPE public.attendance_status AS ENUM ('Present','Half Day','Absent');
CREATE TYPE public.payment_method AS ENUM ('Cash','UPI','Bank Transfer','Other');

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT,
  role public.app_role NOT NULL DEFAULT 'contractor',
  status TEXT NOT NULL DEFAULT 'Active',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE TABLE public.sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_name TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  description TEXT,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sites TO authenticated;
GRANT ALL ON public.sites TO service_role;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  role public.worker_role NOT NULL DEFAULT 'Labourer',
  daily_wage NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (daily_wage >= 0),
  address TEXT,
  joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workers TO authenticated;
GRANT ALL ON public.workers TO service_role;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.worker_site_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.worker_site_assignments TO authenticated;
GRANT ALL ON public.worker_site_assignments TO service_role;
ALTER TABLE public.worker_site_assignments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status public.attendance_status NOT NULL,
  wage_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  marked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (worker_id, attendance_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_method public.payment_method NOT NULL DEFAULT 'Cash',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- auto wage on attendance
CREATE OR REPLACE FUNCTION public.set_attendance_wage() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w NUMERIC;
BEGIN
  SELECT daily_wage INTO w FROM public.workers WHERE id = NEW.worker_id;
  NEW.wage_amount := CASE NEW.status WHEN 'Present' THEN COALESCE(w,0) WHEN 'Half Day' THEN COALESCE(w,0)*0.5 ELSE 0 END;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_attendance_wage BEFORE INSERT OR UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.set_attendance_wage();

CREATE TRIGGER trg_profiles_upd BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sites_upd BEFORE UPDATE ON public.sites FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_workers_upd BEFORE UPDATE ON public.workers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_attendance_upd BEFORE UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_payments_upd BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- new user handler
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.app_role;
BEGIN
  r := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'contractor');
  INSERT INTO public.profiles (id, full_name, email, phone, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), COALESCE(NEW.email,''), NEW.raw_user_meta_data->>'phone', r)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, r) ON CONFLICT DO NOTHING;
  IF r = 'worker' AND NEW.email IS NOT NULL THEN
    UPDATE public.workers SET user_id = NEW.id WHERE lower(email) = lower(NEW.email) AND user_id IS NULL;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- helper: is current user linked to worker row
CREATE OR REPLACE FUNCTION public.owns_worker(_worker_id UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.workers WHERE id = _worker_id AND user_id = auth.uid());
$$;

-- POLICIES
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "roles_select" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "sites_contractor_all" ON public.sites FOR ALL TO authenticated USING (contractor_id = auth.uid()) WITH CHECK (contractor_id = auth.uid());
CREATE POLICY "sites_admin_select" ON public.sites FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "sites_worker_select" ON public.sites FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.workers w WHERE w.user_id = auth.uid() AND w.site_id = sites.id));

CREATE POLICY "workers_contractor_all" ON public.workers FOR ALL TO authenticated USING (contractor_id = auth.uid()) WITH CHECK (contractor_id = auth.uid());
CREATE POLICY "workers_admin_select" ON public.workers FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "workers_self_select" ON public.workers FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "assign_contractor_all" ON public.worker_site_assignments FOR ALL TO authenticated USING (contractor_id = auth.uid()) WITH CHECK (contractor_id = auth.uid());
CREATE POLICY "assign_admin_select" ON public.worker_site_assignments FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "assign_self_select" ON public.worker_site_assignments FOR SELECT TO authenticated USING (public.owns_worker(worker_id));

CREATE POLICY "att_contractor_all" ON public.attendance FOR ALL TO authenticated USING (contractor_id = auth.uid()) WITH CHECK (contractor_id = auth.uid());
CREATE POLICY "att_admin_select" ON public.attendance FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "att_self_select" ON public.attendance FOR SELECT TO authenticated USING (public.owns_worker(worker_id));

CREATE POLICY "pay_contractor_all" ON public.payments FOR ALL TO authenticated USING (contractor_id = auth.uid()) WITH CHECK (contractor_id = auth.uid());
CREATE POLICY "pay_admin_select" ON public.payments FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "pay_self_select" ON public.payments FOR SELECT TO authenticated USING (public.owns_worker(worker_id));

CREATE INDEX idx_workers_contractor ON public.workers(contractor_id);
CREATE INDEX idx_att_contractor_date ON public.attendance(contractor_id, attendance_date);
CREATE INDEX idx_pay_contractor ON public.payments(contractor_id);
