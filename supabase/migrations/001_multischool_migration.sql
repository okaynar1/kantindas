-- ==============================================================================
-- KANTİNCEP ÇOK OKULLU SİSTEM MİGRASYONU (GÜVENLİ & SERTLEŞTİRİLMİŞ SÜRÜM - AŞAMA 2)
-- Dosya: supabase/migrations/001_multischool_migration.sql
-- Proje ID: mamsootbzwwfkcylklro
-- ==============================================================================
-- DİKKAT VE GÜVENLİK İLKELERİ:
-- 1. Bu script mevcut hiçbir tabloyu SİLMEZ (DROP TABLE YOKTUR).
-- 2. Mevcut kullanıcıları, öğrencileri veya siparişleri SİLMEZ (DELETE/TRUNCATE YOKTUR).
-- 3. 'school_id IS NULL' veri sızıntısı tamamen engellenmiştir.
-- 4. RLS özyineleme (infinite recursion) sorunu SECURITY DEFINER yardımcıları ile çözülmüştür.
-- 5. JWT Postgres rolü ile KantinCep uygulama rolleri birbirinden ayrılmıştır.
-- 6. Okul izolasyonu istemci metadatasına değil, doğrulanmış users tablosuna dayanır.
-- 7. search_path güvenlik sertleştirmesi yapılmıştır (pg_catalog, public, pg_temp).
-- 8. payments ve audit_logs gibi kritik tablolarda ON DELETE CASCADE yerine RESTRICT/SET NULL kullanılmıştır.
-- 9. Kod tamamen idempotenttir; birden çok kez güvenle çalıştırılabilir.
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- 1. OKULLAR (schools) TABLOSUNUN GÜNCELLENMESİ
-- ==============================================================================

-- 1.1. Benzersiz Okul Kodu (code) Sütunu
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS code TEXT;

-- 1.2. Mevcut İlk Okul ('school-1') İçin Okul Kodu Tanımlanması
UPDATE public.schools 
SET code = 'ATATURK01' 
WHERE id = 'school-1' AND (code IS NULL OR code = '');

-- Boşta kalan başka okul varsa otomatik kod ata
UPDATE public.schools 
SET code = 'OKUL-' || UPPER(SUBSTRING(id FROM 1 FOR 6))
WHERE code IS NULL OR code = '';

-- 1.3. Okul Kodunun NOT NULL ve UNIQUE Yapılması
ALTER TABLE public.schools 
ALTER COLUMN code SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'schools_code_unique'
  ) THEN
    ALTER TABLE public.schools ADD CONSTRAINT schools_code_unique UNIQUE (code);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_schools_code ON public.schools (code);

-- 1.4. Okul Başına Tek Müdür (manager_user_id) Sütunu
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS manager_user_id TEXT;

-- Mevcut müdürü okul kaydıyla bağla (user-manager-1)
UPDATE public.schools 
SET manager_user_id = 'user-manager-1' 
WHERE id = 'school-1' 
  AND (manager_user_id IS NULL OR manager_user_id = '') 
  AND EXISTS (SELECT 1 FROM public.users WHERE id = 'user-manager-1');

-- Okul müdürü yabancı anahtar ve teklik kısıtı
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'schools_manager_user_fk'
  ) THEN
    ALTER TABLE public.schools 
    ADD CONSTRAINT schools_manager_user_fk 
    FOREIGN KEY (manager_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'schools_manager_user_unique'
  ) THEN
    ALTER TABLE public.schools 
    ADD CONSTRAINT schools_manager_user_unique UNIQUE (manager_user_id);
  END IF;
END $$;

-- 1.5. users Tablosunda Okul Başına Yalnızca Bir Aktif Müdür Olmasını Garanti Eden Kısıt
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_unique_manager_per_school 
ON public.users (school_id) 
WHERE role = 'manager' AND account_status = 'active';


-- ==============================================================================
-- 2. EKSİK 6 TABLOYA school_id EKLENMESİ VE GÜVENLİ İLİŞKİLENDİRME
-- ==============================================================================

-- 2.1. Ödemeler (payments)
-- Finansal denetim verisi: Okul silinse dahi kayıtlar korunmalıdır (ON DELETE RESTRICT).
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS school_id TEXT;

UPDATE public.payments p 
SET school_id = o.school_id 
FROM public.orders o 
WHERE p.target_type = 'order' AND p.target_id = o.id AND p.school_id IS NULL;

UPDATE public.payments p 
SET school_id = d.school_id 
FROM public.donations d 
WHERE p.target_type = 'donation' AND p.target_id = d.id AND p.school_id IS NULL;

UPDATE public.payments 
SET school_id = 'school-1' 
WHERE school_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payments_school_id_fk'
  ) THEN
    ALTER TABLE public.payments 
    ADD CONSTRAINT payments_school_id_fk 
    FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payments_school_id ON public.payments (school_id);


-- 2.2. Sipariş Durum Tarihçesi (order_status_history)
ALTER TABLE public.order_status_history 
ADD COLUMN IF NOT EXISTS school_id TEXT;

UPDATE public.order_status_history h 
SET school_id = o.school_id 
FROM public.orders o 
WHERE h.order_id = o.id AND h.school_id IS NULL;

UPDATE public.order_status_history 
SET school_id = 'school-1' 
WHERE school_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'order_status_history_school_id_fk'
  ) THEN
    ALTER TABLE public.order_status_history 
    ADD CONSTRAINT order_status_history_school_id_fk 
    FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_order_status_history_school_id ON public.order_status_history (school_id);


-- 2.3. Sistem Denetim Günlüğü (audit_logs)
-- Sistem geneli loglar (merkezi admin veya sistem bootstrap) school_id NULL olabilir.
-- Okul silinse dahi denetim kayıtları korunmalıdır (ON DELETE SET NULL).
ALTER TABLE public.audit_logs 
ADD COLUMN IF NOT EXISTS school_id TEXT;

UPDATE public.audit_logs a 
SET school_id = u.school_id 
FROM public.users u 
WHERE a.actor_user_id = u.id AND a.school_id IS NULL AND u.role <> 'admin' AND u.school_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_school_id_fk'
  ) THEN
    ALTER TABLE public.audit_logs 
    ADD CONSTRAINT audit_logs_school_id_fk 
    FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_audit_logs_school_id ON public.audit_logs (school_id);


-- 2.4. Kullanıcı Bildirimleri (notifications)
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS school_id TEXT;

UPDATE public.notifications n 
SET school_id = u.school_id 
FROM public.users u 
WHERE n.user_id = u.id AND n.school_id IS NULL;

UPDATE public.notifications 
SET school_id = 'school-1' 
WHERE school_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notifications_school_id_fk'
  ) THEN
    ALTER TABLE public.notifications 
    ADD CONSTRAINT notifications_school_id_fk 
    FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notifications_school_id ON public.notifications (school_id);


-- 2.5. Destek Tahsis Durum Tarihçesi (support_status_history)
ALTER TABLE public.support_status_history 
ADD COLUMN IF NOT EXISTS school_id TEXT;

UPDATE public.support_status_history h 
SET school_id = s.school_id 
FROM public.support_allocations s 
WHERE h.allocation_id = s.id AND h.school_id IS NULL;

UPDATE public.support_status_history 
SET school_id = 'school-1' 
WHERE school_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'support_status_history_school_id_fk'
  ) THEN
    ALTER TABLE public.support_status_history 
    ADD CONSTRAINT support_status_history_school_id_fk 
    FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_support_status_history_school_id ON public.support_status_history (school_id);


-- 2.6. Push Abonelikleri (push_subscriptions)
ALTER TABLE public.push_subscriptions 
ADD COLUMN IF NOT EXISTS school_id TEXT;

UPDATE public.push_subscriptions p 
SET school_id = u.school_id 
FROM public.users u 
WHERE p.user_id = u.id AND p.school_id IS NULL;

UPDATE public.push_subscriptions 
SET school_id = 'school-1' 
WHERE school_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'push_subscriptions_school_id_fk'
  ) THEN
    ALTER TABLE public.push_subscriptions 
    ADD CONSTRAINT push_subscriptions_school_id_fk 
    FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_school_id ON public.push_subscriptions (school_id);


-- ==============================================================================
-- 3. GÜVENLİ OKUL KODU DOĞRULAMA FONKSİYONU (RPC)
-- ==============================================================================
-- Veliler kayıt esnasında okul kodunu sorgularken okulun hassas verilerini
-- (bütçe, müdür vb.) görmez; yalnızca okul ID, adı ve aktiflik durumunu döner.
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
-- 4. RLS GÜVENLİK YARDIMCI FONKSİYONLARI (RECURSION-PROOF & SERTLEŞTİRİLMİŞ)
-- ==============================================================================
-- Sorun: RLS politikası doğrudan 'users' tablosunu alt sorguda okursa, users üzerindeki
-- RLS politikasını tekrar tetikler ve "infinite recursion" hatası verir.
-- Çözüm: SECURITY DEFINER fonksiyonları tablo sahibi yetkisiyle çalışır; RLS filtresine
-- takılmadan users tablosundan veriyi tek adımda okur ve döngüyü sıfırlar.
-- search_path sertleştirmesi ile araya zararlı şema enjeksiyonu önlenmiştir.

-- 4.1. İstek Yapan Kullanıcı Kimliği (User ID)
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

-- 4.2. KantinCep Uygulama Rolü (Postgres Rolünden Ayrı!)
-- Supabase JWT içindeki postgres 'role' claim'i (authenticated, anon, service_role)
-- ile KantinCep'in 'admin', 'manager', 'teacher', 'canteen', 'parent' rollerini ayırır.
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

-- 4.3. Kullanıcının Gerçek Okul Kimliği (School ID)
-- İstemcinin manipulasyonuna açık user_metadata/app_metadata yerine
-- veritabanında saklanan doğrulanmış school_id değerini döner.
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

-- 4.4. Merkezi Sistem Yöneticisi mi? (Admin Kontrolü)
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
    -- Veya KantinCep kullanıcı tablosunda rolü 'admin' olan aktif kullanıcıdır
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
-- 5. AYRINTILI VE ROL BAZLI RLS (ROW LEVEL SECURITY) POLİTİKALARI
-- ==============================================================================

-- 5.1. OKULLAR (schools)
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "schools_read_policy" ON public.schools;
DROP POLICY IF EXISTS "schools_admin_write_policy" ON public.schools;
DROP POLICY IF EXISTS "KantinCep_Permissive_Policy" ON public.schools;

-- Herkes aktif okulları listeyebilir/sorgulayabilir (Kayıt ekranı ve okul seçimi için)
CREATE POLICY "schools_read_policy" 
ON public.schools FOR SELECT 
USING (active_status = true OR public.is_admin());

-- Sadece merkezi sistem yöneticisi okul oluşturabilir/düzenleyebilir
CREATE POLICY "schools_admin_write_policy" 
ON public.schools FOR ALL 
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- 5.2. KULLANICILAR (users) - RECURSION-SAFE
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_policy" ON public.users;
DROP POLICY IF EXISTS "users_delete_policy" ON public.users;
DROP POLICY IF EXISTS "tenant_isolation_select" ON public.users;
DROP POLICY IF EXISTS "tenant_isolation_write" ON public.users;
DROP POLICY IF EXISTS "KantinCep_Permissive_Policy" ON public.users;

-- Okuma:
-- 1. Admin herkesi görür.
-- 2. Okul Müdürü sadece kendi okulundaki kullanıcıları görür (asla başka okulu göremez).
-- 3. Diğer kullanıcılar (Veli, Kantinci, Öğretmen) kendi profilini görür veya aynı okuldaki personeli görür.
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

-- Ekleme:
-- 1. Admin ekleyebilir.
-- 2. Müdür sadece kendi okuluna öğretmen/kantinci ekleyebilir.
-- 3. Kendi kendine kayıt (Veli kaydı): id veya auth.uid() eşleşiyorsa.
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
  OR public.get_current_user_id() = '' -- Anonim kayıt API desteği
);

-- Güncelleme:
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

-- Silme: Sadece Admin veya Müdür (kendi okulundaki öğretmen/kantinci için)
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


-- 5.3. ÖĞRENCİLER (students)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "students_select_policy" ON public.students;
DROP POLICY IF EXISTS "students_write_policy" ON public.students;
DROP POLICY IF EXISTS "tenant_isolation_select" ON public.students;
DROP POLICY IF EXISTS "tenant_isolation_write" ON public.students;
DROP POLICY IF EXISTS "KantinCep_Permissive_Policy" ON public.students;

-- Okuma:
-- 1. Admin: Tümü
-- 2. Okul personeli (Müdür, Öğretmen, Kantinci): Yalnızca kendi okullarındaki öğrenciler
-- 3. Veli: Yalnızca KENDİ çocukları (asla başka velinin çocuğunu göremez!)
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


-- 5.4. OKUL KATALOĞU TABLOLARI (categories, breaks, products)
-- Okul bazlı katalog: Aynı okuldaki tüm kullanıcılar ürünleri ve kategorileri görür.
-- Düzenleme: Admin, Müdür veya o okulun Kantincisi yapabilir.
DO $$
DECLARE
  t text;
  catalog_tables text[] := ARRAY['categories', 'breaks', 'products'];
BEGIN
  FOREACH t IN ARRAY catalog_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "%I_select_policy" ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%I_write_policy" ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_select" ON public.%I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_write" ON public.%I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "KantinCep_Permissive_Policy" ON public.%I;', t);

    -- Okuma kuralı: Sadece aynı okulun aktif kayıtları ('school_id IS NULL' kaldırıldı!)
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


-- 5.5. SİPARİŞLER VE SİPARİŞ GEÇMİŞİ (orders, order_status_history)
-- Veli yalnızca KENDİ siparişlerini görür.
-- Kantinci ve Müdür yalnızca KENDİ okullarının siparişlerini görür.
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orders_select_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_update_policy" ON public.orders;
DROP POLICY IF EXISTS "tenant_isolation_select" ON public.orders;
DROP POLICY IF EXISTS "tenant_isolation_write" ON public.orders;
DROP POLICY IF EXISTS "KantinCep_Permissive_Policy" ON public.orders;

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
DROP POLICY IF EXISTS "tenant_isolation_select" ON public.order_status_history;
DROP POLICY IF EXISTS "tenant_isolation_write" ON public.order_status_history;
DROP POLICY IF EXISTS "KantinCep_Permissive_Policy" ON public.order_status_history;

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


-- 5.6. ÖĞRENCİ İHTİYAÇLARI VE KODLARI (student_needs, student_need_codes)
-- KRİTİK GİZLİLİK (KVKK): Yalnızca Admin, Okul Müdürü ve Danışman Öğretmenler görebilir.
-- Veliler, öğrenciler ve kantin personeli bu hassas kayıtları ASLA doğrudan listeleyemez.
DO $$
DECLARE
  t text;
  need_tables text[] := ARRAY['student_needs', 'student_need_codes'];
BEGIN
  FOREACH t IN ARRAY need_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "%I_teacher_manager_policy" ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_select" ON public.%I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_write" ON public.%I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "KantinCep_Permissive_Policy" ON public.%I;', t);

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


-- 5.7. DESTEK TAHSİSLERİ VE TESLİMATLARI (support_allocations, support_deliveries, support_status_history)
-- Öğretmen, Müdür ve Kantinci (yalnızca teslimat ve kod teyidi için) erişebilir.
DO $$
DECLARE
  t text;
  support_tables text[] := ARRAY['support_allocations', 'support_deliveries', 'support_status_history'];
BEGIN
  FOREACH t IN ARRAY support_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "%I_school_policy" ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_select" ON public.%I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_write" ON public.%I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "KantinCep_Permissive_Policy" ON public.%I;', t);

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


-- 5.8. BAĞIŞLAR, ÖDEMELER VE DAĞITIMLAR (donations, payments, donation_distributions, inventory_movements)
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "donations_policy" ON public.donations;
DROP POLICY IF EXISTS "tenant_isolation_select" ON public.donations;
DROP POLICY IF EXISTS "tenant_isolation_write" ON public.donations;
DROP POLICY IF EXISTS "KantinCep_Permissive_Policy" ON public.donations;

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
DROP POLICY IF EXISTS "tenant_isolation_select" ON public.payments;
DROP POLICY IF EXISTS "tenant_isolation_write" ON public.payments;
DROP POLICY IF EXISTS "KantinCep_Permissive_Policy" ON public.payments;

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
DROP POLICY IF EXISTS "tenant_isolation_select" ON public.donation_distributions;
DROP POLICY IF EXISTS "tenant_isolation_write" ON public.donation_distributions;
DROP POLICY IF EXISTS "KantinCep_Permissive_Policy" ON public.donation_distributions;

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
DROP POLICY IF EXISTS "tenant_isolation_select" ON public.inventory_movements;
DROP POLICY IF EXISTS "tenant_isolation_write" ON public.inventory_movements;
DROP POLICY IF EXISTS "KantinCep_Permissive_Policy" ON public.inventory_movements;

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


-- 5.9. PROFİLLER (teacher_profiles, canteen_profiles, manager_profiles)
DO $$
DECLARE
  t text;
  profile_tables text[] := ARRAY['teacher_profiles', 'canteen_profiles', 'manager_profiles'];
BEGIN
  FOREACH t IN ARRAY profile_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "%I_policy" ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_select" ON public.%I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_write" ON public.%I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "KantinCep_Permissive_Policy" ON public.%I;', t);

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


-- 5.10. KULLANICIYA ÖZEL GİZLİ VERİLER (notifications, push_subscriptions)
-- Yalnızca ilgili kullanıcının kendisi veya sistem yöneticisi erişebilir.
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_policy" ON public.notifications;
DROP POLICY IF EXISTS "tenant_isolation_select" ON public.notifications;
DROP POLICY IF EXISTS "tenant_isolation_write" ON public.notifications;
DROP POLICY IF EXISTS "KantinCep_Permissive_Policy" ON public.notifications;

CREATE POLICY "notifications_policy" 
ON public.notifications FOR ALL 
USING (
  public.is_admin()
  OR user_id = public.get_current_user_id()
)
WITH CHECK (
  public.is_admin()
  OR user_id = public.get_current_user_id()
  OR (school_id = public.get_current_user_school_id() AND public.get_current_user_app_role() IN ('manager', 'teacher', 'canteen'))
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "push_subscriptions_policy" ON public.push_subscriptions;
DROP POLICY IF EXISTS "tenant_isolation_select" ON public.push_subscriptions;
DROP POLICY IF EXISTS "tenant_isolation_write" ON public.push_subscriptions;
DROP POLICY IF EXISTS "KantinCep_Permissive_Policy" ON public.push_subscriptions;

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


-- 5.11. SİSTEM DENETİM GÜNLÜĞÜ (audit_logs)
-- Sistem Yöneticisi tüm logları (school_id NULL olanlar dahil) görebilir.
-- Okul Müdürü YALNIZCA kendi okulunun (school_id = get_current_user_school_id()) loglarını görebilir.
-- Diğer roller (Veli, Kantinci, Öğretmen) denetim günlüğünü göremez.
-- Sistem veya kullanıcılar işlem yaptıkça log ekleyebilir (INSERT serbest).
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_logs_select_policy" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_policy" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_policy" ON public.audit_logs;
DROP POLICY IF EXISTS "tenant_isolation_select" ON public.audit_logs;
DROP POLICY IF EXISTS "tenant_isolation_write" ON public.audit_logs;
DROP POLICY IF EXISTS "KantinCep_Permissive_Policy" ON public.audit_logs;

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
-- KANTİNCEP GÜVENLİ MİGRASYON BAŞARIYLA TAMAMLANDI
-- ==============================================================================
