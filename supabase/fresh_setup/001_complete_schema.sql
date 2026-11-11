-- ==============================================================================
-- KANTİNCEP SIFIRDAN TEMİZ ÇOK OKULLU VERİTABANI ŞEMASI (FRESH SETUP)
-- Dosya: supabase/fresh_setup/001_complete_schema.sql
-- ==============================================================================
-- Bu dosya, yeni ve boş bir Supabase projesinde doğrudan çalıştırılmak üzere
-- sıfırdan çok okullu mimari prensiplerine göre tasarlanmıştır.
-- İçerisinde hiçbir test kaydı, yapay sipariş veya geçici kullanıcı YOKTUR.
-- Tüm kiracı tabloları ilk günden itibaren school_id kısıtları ve
-- uygun yabancı anahtarlarla (FOREIGN KEY) yapılandırılmıştır.
-- ==============================================================================

BEGIN;

-- Güvenli şifreleme ve UUID üretim fonksiyonları için pgcrypto eklentisi
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. OKULLAR (Schools)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.schools (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,                       -- Benzersiz Okul Kodu (Örn: ATATURK01)
  name TEXT NOT NULL,                             -- Okul Tam Adı
  address TEXT,                                   -- Okul Adresi
  timezone TEXT DEFAULT 'Europe/Istanbul',
  manager_user_id TEXT UNIQUE,                    -- Okulun Tek Yetkili Müdürü (One manager per school)
  active_status BOOLEAN DEFAULT true,             -- Okul Aktif/Pasif Durumu
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schools_code ON public.schools (code);
CREATE INDEX IF NOT EXISTS idx_schools_active ON public.schools (active_status);


-- ==============================================================================
-- 2. KULLANICILAR (Users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('parent', 'canteen', 'admin', 'manager', 'teacher')),
  school_id TEXT REFERENCES public.schools(id) ON DELETE SET NULL, -- Merkezi sistem admini için NULL olabilir
  account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'suspended')),
  phone TEXT,
  must_change_password BOOLEAN DEFAULT false,
  title_or_branch TEXT,                           -- Öğretmen branşı veya unvanı
  canteen_unit TEXT,                              -- Kantin birimi veya işletme adı
  created_by_manager_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  password_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users (role);
CREATE INDEX IF NOT EXISTS idx_users_school ON public.users (school_id);

-- Okul Başına Yalnızca Tek Aktif Müdür Kısıtı
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_unique_manager_per_school 
ON public.users (school_id) 
WHERE role = 'manager' AND account_status = 'active';

-- schools.manager_user_id ile users(id) arasındaki yabancı anahtar ilişkisi
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'schools_manager_user_fk'
  ) THEN
    ALTER TABLE public.schools 
    ADD CONSTRAINT schools_manager_user_fk 
    FOREIGN KEY (manager_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;


-- ==============================================================================
-- 3. ÖĞRENCİLER (Students)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.students (
  id TEXT PRIMARY KEY,
  parent_user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  grade TEXT NOT NULL,                            -- Sınıf düzeyi (Örn: "4. Sınıf")
  classroom TEXT NOT NULL,                        -- Şube (Örn: "4-B")
  active_status BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_school ON public.students (school_id);
CREATE INDEX IF NOT EXISTS idx_students_parent ON public.students (parent_user_id);


-- ==============================================================================
-- 4. KATEGORİLER (Categories)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  product_type TEXT NOT NULL CHECK (product_type IN ('food', 'stationery')),
  active_status BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_school ON public.categories (school_id);


-- ==============================================================================
-- 5. TENEFFÜSLER & DAĞITIM ZAMANLARI (Breaks)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.breaks (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                             -- Örn: "1. Teneffüs", "Öğle Arası"
  start_time TEXT NOT NULL,                       -- "09:40"
  end_time TEXT NOT NULL,                         -- "09:55"
  order_deadline_minutes_before INT DEFAULT 15,
  active_status BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_breaks_school ON public.breaks (school_id);


-- ==============================================================================
-- 6. ÜRÜNLER (Products)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  product_type TEXT NOT NULL CHECK (product_type IN ('food', 'stationery')),
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock_quantity INT NOT NULL DEFAULT 0,
  image_url TEXT,
  allergens JSONB DEFAULT '[]'::jsonb,
  active_status BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_school ON public.products (school_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category_id);


-- ==============================================================================
-- 7. SİPARİŞLER (Orders)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL,                     -- Örn: "KC-20261106-001"
  parent_user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  student_id TEXT REFERENCES public.students(id) ON DELETE SET NULL,
  student_name_snapshot TEXT,
  student_class_snapshot TEXT,
  school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  order_date TEXT NOT NULL,
  break_id TEXT REFERENCES public.breaks(id) ON DELETE SET NULL,
  break_name_snapshot TEXT,
  order_type TEXT DEFAULT 'canteen',
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
  order_status TEXT DEFAULT 'pending_payment',
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  note TEXT,
  delivery_code TEXT,
  is_verified_delivery BOOLEAN DEFAULT false,
  cancelled_reason TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_school ON public.orders (school_id);
CREATE INDEX IF NOT EXISTS idx_orders_parent ON public.orders (parent_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (order_status);


-- ==============================================================================
-- 8. BAĞIŞLAR & DAYANIŞMA HAVUZU (Donations)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.donations (
  id TEXT PRIMARY KEY,
  donation_number TEXT NOT NULL,                  -- Örn: "DY-20261106-001"
  donor_user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  donor_name_snapshot TEXT,
  school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  donation_type TEXT NOT NULL CHECK (donation_type IN ('food_pool', 'education_support')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  note TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_donations_school ON public.donations (school_id);
CREATE INDEX IF NOT EXISTS idx_donations_donor ON public.donations (donor_user_id);


-- ==============================================================================
-- 9. ÖDEME KAYITLARI (Payments)
-- Finansal/muhasebe verisi: Okul silinse dahi muhasebe denetim izi korunur (RESTRICT).
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
  target_id TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('order', 'donation')),
  payment_provider TEXT DEFAULT 'simulation',
  provider_reference TEXT,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'TRY',
  payment_status TEXT DEFAULT 'pending',
  raw_response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_school ON public.payments (school_id);
CREATE INDEX IF NOT EXISTS idx_payments_target ON public.payments (target_id, target_type);


-- ==============================================================================
-- 10. SİPARİŞ DURUM GEÇMİŞİ (OrderStatusHistory)
-- Tarihsel geçmiş kaydı: Denetim izi için silinmeye karşı korunur (RESTRICT).
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by_user_id TEXT,
  changed_by_name TEXT,
  changed_by_role TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_order_history_school ON public.order_status_history (school_id);
CREATE INDEX IF NOT EXISTS idx_order_history_order ON public.order_status_history (order_id);


-- ==============================================================================
-- 11. BAĞIŞ DAĞITIMLARI (DonationDistributions)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.donation_distributions (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  donation_item_id TEXT,
  product_id TEXT REFERENCES public.products(id) ON DELETE SET NULL,
  product_name_snapshot TEXT,
  donation_type TEXT,
  quantity INT NOT NULL DEFAULT 1,
  authorized_staff_id TEXT,
  authorized_staff_name TEXT,
  notes TEXT,
  distributed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_donation_dist_school ON public.donation_distributions (school_id);


-- ==============================================================================
-- 12. SİSTEM DENETİM GÜNLÜĞÜ (AuditLogs)
-- Denetim izi asla silinmez; okul silinirse school_id SET NULL olur.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  school_id TEXT REFERENCES public.schools(id) ON DELETE SET NULL,
  actor_user_id TEXT,
  actor_name TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_school ON public.audit_logs (school_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs (timestamp DESC);


-- ==============================================================================
-- 13. KULLANICI BİLDİRİMLERİ (Notifications)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  link_url TEXT,
  order_id TEXT,
  allocation_id TEXT,
  student_need_id TEXT,
  support_type TEXT,
  items_summary TEXT,
  delivery_event_id TEXT,
  student_name_snapshot TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_school ON public.notifications (school_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications (user_id);


-- ==============================================================================
-- 14. DANIŞMAN ÖĞRETMEN PROFİLLERİ (TeacherProfiles)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.teacher_profiles (
  id TEXT PRIMARY KEY,
  auth_user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  branch TEXT,
  account_status TEXT DEFAULT 'active',
  must_change_password BOOLEAN DEFAULT false,
  created_by_manager_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_profiles_school ON public.teacher_profiles (school_id);


-- ==============================================================================
-- 15. KANTİNCİ PROFİLLERİ (CanteenProfiles)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.canteen_profiles (
  id TEXT PRIMARY KEY,
  auth_user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  canteen_unit TEXT,
  account_status TEXT DEFAULT 'active',
  must_change_password BOOLEAN DEFAULT false,
  created_by_manager_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_canteen_profiles_school ON public.canteen_profiles (school_id);


-- ==============================================================================
-- 16. KURUM MÜDÜRÜ PROFİLLERİ (ManagerProfiles)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.manager_profiles (
  id TEXT PRIMARY KEY,
  auth_user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  account_status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manager_profiles_school ON public.manager_profiles (school_id);


-- ==============================================================================
-- 17. ÖĞRENCİ İHTİYAÇ KAYITLARI (StudentNeeds)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.student_needs (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_reference_id TEXT NOT NULL,             -- Anonimleştirilmiş öğrenci referansı (KVKK)
  student_name TEXT NOT NULL,
  grade TEXT NOT NULL,
  classroom TEXT NOT NULL,
  need_code_reference TEXT NOT NULL,
  need_type TEXT NOT NULL CHECK (need_type IN ('food', 'stationery', 'both', 'other')),
  need_description TEXT,
  created_by_teacher_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_by_teacher_name TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'fulfilled', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_needs_school ON public.student_needs (school_id);
CREATE INDEX IF NOT EXISTS idx_student_needs_teacher ON public.student_needs (created_by_teacher_id);


-- ==============================================================================
-- 18. İHTİYAÇ KODLARI (StudentNeedCodes)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.student_need_codes (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_need_id TEXT NOT NULL REFERENCES public.student_needs(id) ON DELETE CASCADE,
  need_code TEXT NOT NULL,                        -- Örn: "KC-IHT-7A2B41"
  code_hash TEXT NOT NULL,
  code_status TEXT DEFAULT 'active' CHECK (code_status IN ('active', 'used', 'expired', 'revoked')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_need_codes_school ON public.student_need_codes (school_id);
CREATE INDEX IF NOT EXISTS idx_need_codes_code ON public.student_need_codes (need_code);


-- ==============================================================================
-- 19. DESTEK TAHSİSLERİ (SupportAllocations)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.support_allocations (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_need_id TEXT NOT NULL REFERENCES public.student_needs(id) ON DELETE CASCADE,
  student_name_snapshot TEXT,
  student_class_snapshot TEXT,
  allocation_number TEXT NOT NULL,                -- Örn: "KC-THS-202611-001"
  need_code_reference TEXT NOT NULL,
  support_type TEXT NOT NULL CHECK (support_type IN ('food_pool', 'education_support')),
  source_type TEXT NOT NULL,
  source_reference_id TEXT,
  assigned_by_teacher_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_by_teacher_name TEXT,
  status TEXT DEFAULT 'product_allocated',
  justification_note TEXT,
  valid_until TEXT,
  delivered_at TIMESTAMPTZ,
  delivered_by_canteen_user_id TEXT,
  delivered_by_canteen_name TEXT,
  cancelled_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  cancelled_by_user_id TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_allocations_school ON public.support_allocations (school_id);
CREATE INDEX IF NOT EXISTS idx_allocations_teacher ON public.support_allocations (assigned_by_teacher_id);


-- ==============================================================================
-- 20. DESTEK TESLİMATLARI (SupportDeliveries)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.support_deliveries (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  allocation_id TEXT NOT NULL REFERENCES public.support_allocations(id) ON DELETE CASCADE,
  delivered_by_canteen_user_id TEXT,
  delivered_by_canteen_name TEXT,
  verification_reference TEXT,
  delivery_status TEXT DEFAULT 'complete',
  quantity_delivered INT NOT NULL DEFAULT 1,
  notes TEXT,
  delivered_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliveries_school ON public.support_deliveries (school_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_allocation ON public.support_deliveries (allocation_id);


-- ==============================================================================
-- 21. DESTEK DURUM TARİHÇESİ (SupportStatusHistory)
-- Denetim izi için okul silinmesine karşı korunur (RESTRICT).
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.support_status_history (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
  allocation_id TEXT NOT NULL REFERENCES public.support_allocations(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by_user_id TEXT,
  changed_by_name TEXT,
  change_reason TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_hist_school ON public.support_status_history (school_id);
CREATE INDEX IF NOT EXISTS idx_support_hist_allocation ON public.support_status_history (allocation_id);


-- ==============================================================================
-- 22. ENVANTER HAREKETLERİ (InventoryMovements)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT,
  movement_type TEXT NOT NULL,
  source_type TEXT,
  source_reference_id TEXT,
  quantity INT NOT NULL DEFAULT 1,
  performed_by_user_id TEXT,
  performed_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_school ON public.inventory_movements (school_id);


-- ==============================================================================
-- 23. PUSH ABONELİKLERİ (PushSubscriptions)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  auth TEXT,
  p256dh TEXT,
  fcm_token TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_school ON public.push_subscriptions (school_id);
CREATE INDEX IF NOT EXISTS idx_push_user ON public.push_subscriptions (user_id);

COMMIT;

-- ==============================================================================
-- ŞEMA KURULUMU BAŞARIYLA TAMAMLANDI
-- Sırada: 002_rls_and_security.sql dosyasını çalıştırınız.
-- ==============================================================================
