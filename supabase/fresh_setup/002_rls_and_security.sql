-- ==============================================================================
-- KANTİNCEP SIFIRDAN TEMİZ ÇOK OKULLU RLS VE GÜVENLİK KURALLARI (FRESH SETUP)
-- Dosya: supabase/fresh_setup/002_rls_and_security.sql
-- ==============================================================================
-- Bu dosya, yeni Supabase projesinde 001_complete_schema.sql çalıştırıldıktan
-- hemen sonra çalıştırılmak üzere hazırlanmıştır.
-- 1. 'school_id IS NULL' açığı içermez.
-- 2. RLS özyineleme (infinite recursion) hatası oluşturmaz.
-- 3. JWT Postgres rolü (authenticated, anon, service_role) ile KantinCep uygulama
--    rollerini ('admin', 'manager', 'teacher', 'canteen', 'parent') net olarak ayırır.
-- 4. Tüm SECURITY DEFINER fonksiyonları 'SET search_path = pg_catalog, public, pg_temp;'
--    ile güvenceye alınmıştır.
-- 5. Hassas öğrenci ihtiyaçları ve denetim logları için rol bazlı ayrıntılı RLS kuralları uygular.
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- 1. GÜVENLİ OKUL KODU DOĞRULAMA FONKSİYONU (RPC)
-- ==============================================================================
-- Veliler kayıt olurken okulun hassas verilerini (bütçe, müdür vb.) görmeden,
-- yalnızca okulun adını ve aktiflik durumunu doğrular.
CREATE OR REPLACE FUNCTION public.verify_school_code(p_code TEXT)
RETURNS TABLE (
  school_id TEXT,
  school_name TEXT,
  address TEXT,
  is_active BOOLEAN
) 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT 
    s.id AS school_id,
    s.name AS school_name,
    s.address,
    s.active_status AS is_active
  FROM public.schools s
  WHERE UPPER(TRIM(s.code)) = UPPER(TRIM(p_code))
    AND s.active_status = true
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.verify_school_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_school_code(TEXT) TO anon, authenticated, service_role;


-- ==============================================================================
-- 2. RLS GÜVENLİK VE ROL YARDIMCI FONKSİYONLARI (RECURSION-PROOF)
-- ==============================================================================

-- 2.1. İstek Yapan Kullanıcı Kimliği (User ID)
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS TEXT 
LANGUAGE sql 
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', ''),
    NULLIF(current_setting('request.jwt.claim.sub', true), ''),
    NULLIF(current_setting('app.current_user_id', true), ''),
    auth.uid()::text,
    ''
  );
$$;

-- 2.2. KantinCep Uygulama Rolü (Postgres Rolünden Ayrı!)
-- users tablosundan doğrudan okur; SECURITY DEFINER sayesinde users üzerindeki
-- RLS politikasını tetiklemez ve sonsuz özyinelemeyi (infinite recursion) engeller.
CREATE OR REPLACE FUNCTION public.get_current_user_app_role()
RETURNS TEXT 
LANGUAGE sql 
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT role 
  FROM public.users 
  WHERE id = public.get_current_user_id() 
  LIMIT 1;
$$;

-- 2.3. Doğrulanmış Okul Kimliği (School ID)
-- İstemcinin manipulasyonuna açık JWT metadata yerine doğrulanmış veritabanı kaydını döner.
CREATE OR REPLACE FUNCTION public.get_current_user_school_id()
RETURNS TEXT 
LANGUAGE sql 
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT school_id 
  FROM public.users 
  WHERE id = public.get_current_user_id() 
  LIMIT 1;
$$;

-- 2.4. Merkezi Sistem Yöneticisi mi? (Admin Kontrolü)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN 
LANGUAGE sql 
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT (
    -- Supabase service_role anahtarı tam yetkilidir
    COALESCE(current_setting('request.jwt.claims', true)::json->>'role', '') = 'service_role'
    OR auth.role() = 'service_role'
    -- Veya KantinCep'in 'admin' rolüne sahip kullanıcısıdır
    OR EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = public.get_current_user_id() 
        AND role = 'admin' 
        AND account_status = 'active'
    )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.get_current_user_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_current_user_app_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_current_user_school_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_current_user_id() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_current_user_app_role() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_current_user_school_id() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;


-- ==============================================================================
-- 3. ROL VE OKUL BAZLI RLS POLİTİKALARI (23 TABLO)
-- ==============================================================================

-- 3.1. OKULLAR (schools)
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "schools_read_policy" ON public.schools;
DROP POLICY IF EXISTS "schools_admin_write_policy" ON public.schools;

CREATE POLICY "schools_read_policy" 
ON public.schools FOR SELECT 
USING (active_status = true OR public.is_admin());

CREATE POLICY "schools_admin_write_policy" 
ON public.schools FOR ALL 
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- 3.2. KULLANICILAR (users) - RECURSION-FREE
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_policy" ON public.users;
DROP POLICY IF EXISTS "users_delete_policy" ON public.users;

-- Okuma Kuralı
CREATE POLICY "users_select_policy" 
ON public.users FOR SELECT 
USING (
  public.is_admin()
  OR id = public.get_current_user_id()
  OR (
    school_id IS NOT NULL 
    AND school_id = public.get_current_user_school_id()
    AND (
      public.get_current_user_app_role() = 'manager'
      OR role IN ('canteen', 'teacher', 'manager')
    )
  )
);

-- Ekleme Kuralı: Admin, Müdür (öğretmen/kantinci için) veya Yeni Veli Kaydı
CREATE POLICY "users_insert_policy" 
ON public.users FOR INSERT 
WITH CHECK (
  public.is_admin()
  OR (
    public.get_current_user_app_role() = 'manager' 
    AND school_id = public.get_current_user_school_id()
    AND role IN ('teacher', 'canteen')
  )
  OR (
    id = public.get_current_user_id()
    AND role = 'parent'
  )
  OR public.get_current_user_id() = '' -- Kayıt API desteği
);

-- Güncelleme Kuralı
CREATE POLICY "users_update_policy" 
ON public.users FOR UPDATE 
USING (
  public.is_admin()
  OR id = public.get_current_user_id()
  OR (
    public.get_current_user_app_role() = 'manager'
    AND school_id = public.get_current_user_school_id()
    AND role <> 'admin'
  )
)
WITH CHECK (
  public.is_admin()
  OR id = public.get_current_user_id()
  OR (
    public.get_current_user_app_role() = 'manager'
    AND school_id = public.get_current_user_school_id()
    AND role <> 'admin'
  )
);

-- Silme Kuralı
CREATE POLICY "users_delete_policy" 
ON public.users FOR DELETE 
USING (
  public.is_admin()
  OR (
    public.get_current_user_app_role() = 'manager'
    AND school_id = public.get_current_user_school_id()
    AND role NOT IN ('admin', 'manager')
  )
);


-- 3.3. ÖĞRENCİLER (students)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "students_select_policy" ON public.students;
DROP POLICY IF EXISTS "students_write_policy" ON public.students;

CREATE POLICY "students_select_policy" 
ON public.students FOR SELECT 
USING (
  public.is_admin()
  OR (
    school_id = public.get_current_user_school_id()
    AND (
      public.get_current_user_app_role() IN ('manager', 'teacher', 'canteen')
      OR parent_user_id = public.get_current_user_id()
    )
  )
);

CREATE POLICY "students_write_policy" 
ON public.students FOR ALL 
USING (
  public.is_admin()
  OR (
    school_id = public.get_current_user_school_id()
    AND (
      public.get_current_user_app_role() = 'manager'
      OR parent_user_id = public.get_current_user_id()
    )
  )
)
WITH CHECK (
  public.is_admin()
  OR (
    school_id = public.get_current_user_school_id()
    AND (
      public.get_current_user_app_role() = 'manager'
      OR parent_user_id = public.get_current_user_id()
    )
  )
);


-- 3.4. OKUL KATALOĞU (categories, breaks, products)
DO $$
DECLARE
  t text;
  catalog_tables text[] := ARRAY['categories', 'breaks', 'products'];
BEGIN
  FOREACH t IN ARRAY catalog_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "%I_select_policy" ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%I_write_policy" ON public.%I;', t, t);

    -- Okuma kuralı: Yalnızca aynı okulun aktif kayıtları
    EXECUTE format(
      'CREATE POLICY "%I_select_policy" ON public.%I FOR SELECT USING (
        public.is_admin()
        OR (school_id = public.get_current_user_school_id() AND active_status = true)
        OR (school_id = public.get_current_user_school_id() AND public.get_current_user_app_role() IN (''manager'', ''canteen''))
      );',
      t, t
    );

    -- Yazma kuralı: Admin, Müdür veya Kantinci
    EXECUTE format(
      'CREATE POLICY "%I_write_policy" ON public.%I FOR ALL USING (
        public.is_admin()
        OR (school_id = public.get_current_user_school_id() AND public.get_current_user_app_role() IN (''manager'', ''canteen''))
      ) WITH CHECK (
        public.is_admin()
        OR (school_id = public.get_current_user_school_id() AND public.get_current_user_app_role() IN (''manager'', ''canteen''))
      );',
      t, t
    );
  END LOOP;
END $$;


-- 3.5. SİPARİŞLER VE SİPARİŞ GEÇMİŞİ (orders, order_status_history)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orders_select_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_update_policy" ON public.orders;

CREATE POLICY "orders_select_policy" 
ON public.orders FOR SELECT 
USING (
  public.is_admin()
  OR (
    school_id = public.get_current_user_school_id()
    AND (
      parent_user_id = public.get_current_user_id()
      OR public.get_current_user_app_role() IN ('manager', 'canteen')
    )
  )
);

CREATE POLICY "orders_insert_policy" 
ON public.orders FOR INSERT 
WITH CHECK (
  public.is_admin()
  OR (
    school_id = public.get_current_user_school_id()
    AND (
      parent_user_id = public.get_current_user_id()
      OR public.get_current_user_app_role() IN ('manager', 'canteen')
    )
  )
);

CREATE POLICY "orders_update_policy" 
ON public.orders FOR UPDATE 
USING (
  public.is_admin()
  OR (
    school_id = public.get_current_user_school_id()
    AND (
      parent_user_id = public.get_current_user_id()
      OR public.get_current_user_app_role() IN ('manager', 'canteen')
    )
  )
)
WITH CHECK (
  public.is_admin()
  OR (
    school_id = public.get_current_user_school_id()
    AND (
      parent_user_id = public.get_current_user_id()
      OR public.get_current_user_app_role() IN ('manager', 'canteen')
    )
  )
);

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "order_status_history_policy" ON public.order_status_history;

CREATE POLICY "order_status_history_policy" 
ON public.order_status_history FOR ALL 
USING (
  public.is_admin()
  OR (
    school_id = public.get_current_user_school_id()
    AND (
      changed_by_user_id = public.get_current_user_id()
      OR public.get_current_user_app_role() IN ('manager', 'canteen')
      OR EXISTS (
        SELECT 1 FROM public.orders o 
        WHERE o.id = order_status_history.order_id 
          AND o.parent_user_id = public.get_current_user_id()
      )
    )
  )
)
WITH CHECK (
  public.is_admin()
  OR (
    school_id = public.get_current_user_school_id()
    AND (
      changed_by_user_id = public.get_current_user_id()
      OR public.get_current_user_app_role() IN ('manager', 'canteen')
    )
  )
);


-- 3.6. ÖĞRENCİ İHTİYAÇLARI VE KODLARI (student_needs, student_need_codes)
-- KRİTİK GİZLİLİK (KVKK): Yalnızca Admin, Okul Müdürü ve Danışman Öğretmenler erişebilir.
DO $$
DECLARE
  t text;
  need_tables text[] := ARRAY['student_needs', 'student_need_codes'];
BEGIN
  FOREACH t IN ARRAY need_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "%I_teacher_manager_policy" ON public.%I;', t, t);

    EXECUTE format(
      'CREATE POLICY "%I_teacher_manager_policy" ON public.%I FOR ALL USING (
        public.is_admin()
        OR (
          school_id = public.get_current_user_school_id()
          AND public.get_current_user_app_role() IN (''manager'', ''teacher'')
        )
      ) WITH CHECK (
        public.is_admin()
        OR (
          school_id = public.get_current_user_school_id()
          AND public.get_current_user_app_role() IN (''manager'', ''teacher'')
        )
      );',
      t, t
    );
  END LOOP;
END $$;


-- 3.7. DESTEK TAHSİSLERİ VE TESLİMATLARI (support_allocations, support_deliveries, support_status_history)
DO $$
DECLARE
  t text;
  support_tables text[] := ARRAY['support_allocations', 'support_deliveries', 'support_status_history'];
BEGIN
  FOREACH t IN ARRAY support_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "%I_school_policy" ON public.%I;', t, t);

    EXECUTE format(
      'CREATE POLICY "%I_school_policy" ON public.%I FOR ALL USING (
        public.is_admin()
        OR (
          school_id = public.get_current_user_school_id()
          AND public.get_current_user_app_role() IN (''manager'', ''teacher'', ''canteen'')
        )
      ) WITH CHECK (
        public.is_admin()
        OR (
          school_id = public.get_current_user_school_id()
          AND public.get_current_user_app_role() IN (''manager'', ''teacher'', ''canteen'')
        )
      );',
      t, t
    );
  END LOOP;
END $$;


-- 3.8. BAĞIŞLAR, ÖDEMELER, DAĞITIMLAR VE ENVANTER
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "donations_policy" ON public.donations;

CREATE POLICY "donations_policy" 
ON public.donations FOR ALL 
USING (
  public.is_admin()
  OR (
    school_id = public.get_current_user_school_id()
    AND (
      donor_user_id = public.get_current_user_id()
      OR public.get_current_user_app_role() IN ('manager', 'teacher', 'canteen')
    )
  )
)
WITH CHECK (
  public.is_admin()
  OR (
    school_id = public.get_current_user_school_id()
    AND (
      donor_user_id = public.get_current_user_id()
      OR public.get_current_user_app_role() IN ('manager', 'teacher')
    )
  )
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payments_policy" ON public.payments;

CREATE POLICY "payments_policy" 
ON public.payments FOR ALL 
USING (
  public.is_admin()
  OR (
    school_id = public.get_current_user_school_id()
    AND (
      public.get_current_user_app_role() IN ('manager', 'canteen')
      OR EXISTS (
        SELECT 1 FROM public.orders o 
        WHERE payments.target_type = 'order' 
          AND payments.target_id = o.id 
          AND o.parent_user_id = public.get_current_user_id()
      )
      OR EXISTS (
        SELECT 1 FROM public.donations d 
        WHERE payments.target_type = 'donation' 
          AND payments.target_id = d.id 
          AND d.donor_user_id = public.get_current_user_id()
      )
    )
  )
)
WITH CHECK (
  public.is_admin()
  OR school_id = public.get_current_user_school_id()
);

ALTER TABLE public.donation_distributions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "donation_distributions_policy" ON public.donation_distributions;

CREATE POLICY "donation_distributions_policy" 
ON public.donation_distributions FOR ALL 
USING (
  public.is_admin()
  OR (
    school_id = public.get_current_user_school_id()
    AND public.get_current_user_app_role() IN ('manager', 'teacher', 'canteen')
  )
)
WITH CHECK (
  public.is_admin()
  OR (
    school_id = public.get_current_user_school_id()
    AND public.get_current_user_app_role() IN ('manager', 'teacher')
  )
);

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inventory_movements_policy" ON public.inventory_movements;

CREATE POLICY "inventory_movements_policy" 
ON public.inventory_movements FOR ALL 
USING (
  public.is_admin()
  OR (
    school_id = public.get_current_user_school_id()
    AND public.get_current_user_app_role() IN ('manager', 'canteen')
  )
)
WITH CHECK (
  public.is_admin()
  OR (
    school_id = public.get_current_user_school_id()
    AND public.get_current_user_app_role() IN ('manager', 'canteen')
  )
);


-- 3.9. PROFİLLER (teacher_profiles, canteen_profiles, manager_profiles)
DO $$
DECLARE
  t text;
  profile_tables text[] := ARRAY['teacher_profiles', 'canteen_profiles', 'manager_profiles'];
BEGIN
  FOREACH t IN ARRAY profile_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "%I_policy" ON public.%I;', t, t);

    EXECUTE format(
      'CREATE POLICY "%I_policy" ON public.%I FOR ALL USING (
        public.is_admin()
        OR auth_user_id = public.get_current_user_id()
        OR (
          school_id = public.get_current_user_school_id()
          AND public.get_current_user_app_role() = ''manager''
        )
      ) WITH CHECK (
        public.is_admin()
        OR auth_user_id = public.get_current_user_id()
        OR (
          school_id = public.get_current_user_school_id()
          AND public.get_current_user_app_role() = ''manager''
        )
      );',
      t, t
    );
  END LOOP;
END $$;


-- 3.10. KULLANICIYA ÖZEL GİZLİ VERİLER (notifications, push_subscriptions)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_policy" ON public.notifications;

CREATE POLICY "notifications_policy" 
ON public.notifications FOR ALL 
USING (
  public.is_admin()
  OR user_id = public.get_current_user_id()
)
WITH CHECK (
  public.is_admin()
  OR user_id = public.get_current_user_id()
  OR (
    school_id = public.get_current_user_school_id() 
    AND public.get_current_user_app_role() IN ('manager', 'teacher', 'canteen')
  )
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "push_subscriptions_policy" ON public.push_subscriptions;

CREATE POLICY "push_subscriptions_policy" 
ON public.push_subscriptions FOR ALL 
USING (
  public.is_admin()
  OR user_id = public.get_current_user_id()
)
WITH CHECK (
  public.is_admin()
  OR user_id = public.get_current_user_id()
);


-- 3.11. SİSTEM DENETİM GÜNLÜĞÜ (audit_logs)
-- Sistem Yöneticisi tüm logları görür.
-- Okul Müdürü YALNIZCA kendi okulunun loglarını görür.
-- Diğer roller (Veli, Kantinci, Öğretmen) denetim günlüğüne erişemez.
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_logs_select_policy" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_policy" ON public.audit_logs;

CREATE POLICY "audit_logs_select_policy" 
ON public.audit_logs FOR SELECT 
USING (
  public.is_admin()
  OR (
    school_id IS NOT NULL 
    AND school_id = public.get_current_user_school_id()
    AND public.get_current_user_app_role() = 'manager'
  )
);

CREATE POLICY "audit_logs_insert_policy" 
ON public.audit_logs FOR INSERT 
WITH CHECK (true);

COMMIT;

-- ==============================================================================
-- RLS VE GÜVENLİK KURALLARI BAŞARIYLA YÜKLENDİ
-- Sırada: 003_verification.sql testini çalıştırınız.
-- ==============================================================================
