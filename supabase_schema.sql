-- ==============================================================================
-- KANTİNCEP SUPABASE VERİTABANI ŞEMASI VE BAŞLANGIÇ VERİLERİ (SEED)
-- Proje ID: mamsootbzwwfkcylklro
-- ==============================================================================
-- Bu SQL kodunu Supabase Dashboard -> SQL Editor alanına yapıştırıp "RUN" butonuna basınız.
-- Tüm tablolar, indeksler, RLS güvenlik politikaları ve varsayılan veriler otomatik oluşturulacaktır.
-- ==============================================================================

-- 1. OKULLAR (Schools)
CREATE TABLE IF NOT EXISTS public.schools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  timezone TEXT DEFAULT 'Europe/Istanbul',
  active_status BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. KULLANICILAR (Users)
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL, -- 'parent' | 'canteen' | 'admin' | 'manager' | 'teacher'
  school_id TEXT REFERENCES public.schools(id) ON DELETE SET NULL,
  account_status TEXT DEFAULT 'active', -- 'active' | 'suspended'
  phone TEXT,
  must_change_password BOOLEAN DEFAULT false,
  title_or_branch TEXT,
  canteen_unit TEXT,
  created_by_manager_id TEXT,
  password_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ÖĞRENCİLER (Students)
CREATE TABLE IF NOT EXISTS public.students (
  id TEXT PRIMARY KEY,
  parent_user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  school_id TEXT REFERENCES public.schools(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  grade TEXT NOT NULL,
  classroom TEXT NOT NULL,
  active_status BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. KATEGORİLER (Categories)
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  school_id TEXT REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  product_type TEXT NOT NULL, -- 'food' | 'stationery'
  active_status BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TENEFFÜSLER & ZAMANLAR (Breaks)
CREATE TABLE IF NOT EXISTS public.breaks (
  id TEXT PRIMARY KEY,
  school_id TEXT REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  order_deadline_minutes_before INT DEFAULT 15,
  active_status BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ÜRÜNLER (Products)
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  school_id TEXT REFERENCES public.schools(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  product_type TEXT NOT NULL, -- 'food' | 'stationery'
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock_quantity INT NOT NULL DEFAULT 0,
  image_url TEXT,
  allergens JSONB DEFAULT '[]'::jsonb,
  active_status BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. SİPARİŞLER (Orders)
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL,
  parent_user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  student_id TEXT REFERENCES public.students(id) ON DELETE SET NULL,
  student_name_snapshot TEXT,
  student_class_snapshot TEXT,
  school_id TEXT REFERENCES public.schools(id) ON DELETE CASCADE,
  order_date TEXT NOT NULL,
  break_id TEXT REFERENCES public.breaks(id) ON DELETE SET NULL,
  break_name_snapshot TEXT,
  order_type TEXT DEFAULT 'canteen',
  payment_status TEXT DEFAULT 'pending',
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

-- 8. BAĞIŞLAR & DAYANIŞMA HAVUZU (Donations)
CREATE TABLE IF NOT EXISTS public.donations (
  id TEXT PRIMARY KEY,
  donation_number TEXT NOT NULL,
  donor_user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  donor_name_snapshot TEXT,
  school_id TEXT REFERENCES public.schools(id) ON DELETE CASCADE,
  donation_type TEXT NOT NULL, -- 'food_pool' | 'education_support'
  payment_status TEXT DEFAULT 'pending',
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  note TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. ÖDEME KAYITLARI (Payments)
CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY,
  target_id TEXT NOT NULL,
  target_type TEXT NOT NULL, -- 'order' | 'donation'
  payment_provider TEXT DEFAULT 'simulation',
  provider_reference TEXT,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'TRY',
  payment_status TEXT DEFAULT 'pending',
  raw_response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. SİPARİŞ DURUM GEÇMİŞİ (OrderStatusHistory)
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id TEXT PRIMARY KEY,
  order_id TEXT REFERENCES public.orders(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by_user_id TEXT,
  changed_by_name TEXT,
  changed_by_role TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  note TEXT
);

-- 11. BAĞIŞ DAĞITIMLARI (DonationDistributions)
CREATE TABLE IF NOT EXISTS public.donation_distributions (
  id TEXT PRIMARY KEY,
  school_id TEXT REFERENCES public.schools(id) ON DELETE CASCADE,
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

-- 12. DENETİM GÜNLÜĞÜ (AuditLogs)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT,
  actor_name TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 13. BİLDİRİMLER (Notifications)
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
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

-- 14. ÖĞRETMEN PROFİLLERİ (TeacherProfiles)
CREATE TABLE IF NOT EXISTS public.teacher_profiles (
  id TEXT PRIMARY KEY,
  auth_user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  school_id TEXT REFERENCES public.schools(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  branch TEXT,
  account_status TEXT DEFAULT 'active',
  must_change_password BOOLEAN DEFAULT false,
  created_by_manager_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. KANTİNCİ PROFİLLERİ (CanteenProfiles)
CREATE TABLE IF NOT EXISTS public.canteen_profiles (
  id TEXT PRIMARY KEY,
  auth_user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  school_id TEXT REFERENCES public.schools(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  canteen_unit TEXT,
  account_status TEXT DEFAULT 'active',
  must_change_password BOOLEAN DEFAULT false,
  created_by_manager_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. KURUM MÜDÜRÜ PROFİLLERİ (ManagerProfiles)
CREATE TABLE IF NOT EXISTS public.manager_profiles (
  id TEXT PRIMARY KEY,
  auth_user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  school_id TEXT REFERENCES public.schools(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  account_status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. ÖĞRENCİ İHTİYAÇ KAYITLARI (StudentNeeds)
CREATE TABLE IF NOT EXISTS public.student_needs (
  id TEXT PRIMARY KEY,
  school_id TEXT REFERENCES public.schools(id) ON DELETE CASCADE,
  student_reference_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  grade TEXT NOT NULL,
  classroom TEXT NOT NULL,
  need_code_reference TEXT NOT NULL,
  need_type TEXT NOT NULL, -- 'food' | 'stationery' | 'both' | 'other'
  need_description TEXT,
  created_by_teacher_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_by_teacher_name TEXT,
  status TEXT DEFAULT 'active', -- 'active' | 'fulfilled' | 'cancelled'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. İHTİYAÇ KODLARI (StudentNeedCodes)
CREATE TABLE IF NOT EXISTS public.student_need_codes (
  id TEXT PRIMARY KEY,
  school_id TEXT REFERENCES public.schools(id) ON DELETE CASCADE,
  student_need_id TEXT REFERENCES public.student_needs(id) ON DELETE CASCADE,
  need_code TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  code_status TEXT DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

-- 19. DESTEK TAHSİSLERİ (SupportAllocations)
CREATE TABLE IF NOT EXISTS public.support_allocations (
  id TEXT PRIMARY KEY,
  school_id TEXT REFERENCES public.schools(id) ON DELETE CASCADE,
  student_need_id TEXT REFERENCES public.student_needs(id) ON DELETE CASCADE,
  student_name_snapshot TEXT,
  student_class_snapshot TEXT,
  allocation_number TEXT NOT NULL,
  need_code_reference TEXT NOT NULL,
  support_type TEXT NOT NULL, -- 'food_pool' | 'education_support'
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

-- 20. DESTEK TESLİMATLARI (SupportDeliveries)
CREATE TABLE IF NOT EXISTS public.support_deliveries (
  id TEXT PRIMARY KEY,
  allocation_id TEXT REFERENCES public.support_allocations(id) ON DELETE CASCADE,
  school_id TEXT REFERENCES public.schools(id) ON DELETE CASCADE,
  delivered_by_canteen_user_id TEXT,
  delivered_by_canteen_name TEXT,
  verification_reference TEXT,
  delivery_status TEXT DEFAULT 'complete',
  quantity_delivered INT NOT NULL DEFAULT 1,
  notes TEXT,
  delivered_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 21. DESTEK DURUM GEÇMİŞİ (SupportStatusHistory)
CREATE TABLE IF NOT EXISTS public.support_status_history (
  id TEXT PRIMARY KEY,
  allocation_id TEXT REFERENCES public.support_allocations(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by_user_id TEXT,
  changed_by_name TEXT,
  change_reason TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 22. ENVANTER HAREKETLERİ (InventoryMovements)
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id TEXT PRIMARY KEY,
  school_id TEXT REFERENCES public.schools(id) ON DELETE CASCADE,
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

-- 23. PUSH ABONELİKLERİ (PushSubscriptions)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  auth TEXT,
  p256dh TEXT,
  fcm_token TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- GÜVENLİK VE RLS (Row Level Security) POLİTİKALARI
-- Uygulama Anon Key ve Doğrudan Erişim için İzinler
-- ==============================================================================
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'schools', 'users', 'students', 'categories', 'breaks', 'products',
    'orders', 'donations', 'payments', 'order_status_history', 'donation_distributions',
    'audit_logs', 'notifications', 'teacher_profiles', 'canteen_profiles', 'manager_profiles',
    'student_needs', 'student_need_codes', 'support_allocations', 'support_deliveries',
    'support_status_history', 'inventory_movements', 'push_subscriptions'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "KantinCep_Permissive_Policy" ON public.%I;', t);
    EXECUTE format('CREATE POLICY "KantinCep_Permissive_Policy" ON public.%I FOR ALL USING (true) WITH CHECK (true);', t);
  END LOOP;
END $$;

-- ==============================================================================
-- İNDEKSLER (Performans Artırımı İçin)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_students_parent ON public.students(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_school ON public.products(school_id);
CREATE INDEX IF NOT EXISTS idx_orders_parent ON public.orders(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(order_status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_student_needs_teacher ON public.student_needs(created_by_teacher_id);
CREATE INDEX IF NOT EXISTS idx_support_alloc_teacher ON public.support_allocations(assigned_by_teacher_id);

-- ==============================================================================
-- BAŞLANGIÇ VERİLERİ (SEED DATA)
-- Varsayılan Okul, Teneffüsler, Kategoriler, Ürünler ve Test Hesapları
-- ==============================================================================

-- 1. Varsayılan Okul
INSERT INTO public.schools (id, name, address, timezone, active_status)
VALUES (
  'school-1',
  'Atatürk İlkokulu ve Ortaokulu',
  'Meşrutiyet Cad. No:44 Çankaya / Ankara',
  'Europe/Istanbul',
  true
) ON CONFLICT (id) DO NOTHING;

-- 2. Teneffüsler
INSERT INTO public.breaks (id, school_id, name, start_time, end_time, order_deadline_minutes_before, active_status)
VALUES
  ('break-1', 'school-1', '1. Teneffüs', '09:40', '09:55', 15, true),
  ('break-2', 'school-1', '2. Teneffüs', '10:35', '10:50', 15, true),
  ('break-3', 'school-1', 'Öğle Arası', '12:15', '13:00', 30, true),
  ('break-4', 'school-1', '3. Teneffüs', '13:40', '13:55', 15, true),
  ('break-5', 'school-1', '4. Teneffüs', '14:35', '14:50', 15, true)
ON CONFLICT (id) DO NOTHING;

-- 3. Kategoriler
INSERT INTO public.categories (id, school_id, name, product_type, active_status)
VALUES
  ('cat-1', 'school-1', 'Sandviç & Tost', 'food', true),
  ('cat-2', 'school-1', 'Sıcak Yemek & Çorba', 'food', true),
  ('cat-3', 'school-1', 'Sağlıklı Atıştırmalıklar', 'food', true),
  ('cat-4', 'school-1', 'İçecekler', 'food', true),
  ('cat-5', 'school-1', 'Temel Kırtasiye', 'stationery', true),
  ('cat-6', 'school-1', 'Boya & Sanat Setleri', 'stationery', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Ürünler
INSERT INTO public.products (id, school_id, category_id, name, description, product_type, price, stock_quantity, image_url, allergens, active_status)
VALUES
  ('prod-1', 'school-1', 'cat-1', 'Kaşarlı Tost (Tam Buğday)', 'Doğal kaşar peyniri ve tereyağı ile taze pişirilen sıcak tost.', 'food', 45.00, 50, 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=80', '["Gluten", "Süt Ürünleri"]'::jsonb, true),
  ('prod-2', 'school-1', 'cat-1', 'Karışık Tost (Sucuklu & Kaşarlı)', 'Dana sucuk, kaşar peyniri ve taze domates sosuyla sıcak ekmekte.', 'food', 55.00, 40, 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&auto=format&fit=crop&q=80', '["Gluten", "Süt Ürünleri"]'::jsonb, true),
  ('prod-3', 'school-1', 'cat-1', 'Peynirli Soğuk Sandviç', 'Ezine beyaz peynir, kıvırcık marul, taze salatalık ve domates.', 'food', 50.00, 30, 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=500&auto=format&fit=crop&q=80', '["Gluten", "Süt Ürünleri"]'::jsonb, true),
  ('prod-4', 'school-1', 'cat-1', 'Izgara Tavuklu Baget Sandviç', 'Marine edilmiş ızgara tavuk göğsü, hafif hardallı sos ve marul.', 'food', 65.00, 25, 'https://images.unsplash.com/photo-1553909489-cd47e0907980?w=500&auto=format&fit=crop&q=80', '["Gluten", "Hardal"]'::jsonb, true),
  ('prod-5', 'school-1', 'cat-2', 'Süzme Mercimek Çorbası & Ekmek', 'Taze limon ve kıtır kruton ekmek ile sunulan geleneksel çorba.', 'food', 35.00, 35, 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=500&auto=format&fit=crop&q=80', '["Gluten"]'::jsonb, true),
  ('prod-6', 'school-1', 'cat-2', 'Domates Soslu Fiyonk Makarna', 'Kıymalı veya sade domates sosu ve rendelenmiş kaşar seçeneğiyle.', 'food', 55.00, 30, 'https://images.unsplash.com/photo-1621996346565-e3d5d6281745?w=500&auto=format&fit=crop&q=80', '["Gluten", "Süt Ürünleri"]'::jsonb, true),
  ('prod-7', 'school-1', 'cat-3', 'Fındık & Kuru Üzüm Karışımı (50g)', 'Çiğ Giresun fındığı ve çekirdeksiz İzmir kuru üzümü.', 'food', 25.00, 60, 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=500&auto=format&fit=crop&q=80', '["Sert Kabuklu Yemişler"]'::jsonb, true),
  ('prod-8', 'school-1', 'cat-3', 'Çilekli Doğal Yoğurt (150g)', 'Probiyotik mayalı taze yoğurt ve gerçek çilek parçacıkları.', 'food', 28.00, 30, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=500&auto=format&fit=crop&q=80', '["Süt Ürünleri"]'::jsonb, true),
  ('prod-9', 'school-1', 'cat-4', 'Taze Sıkma Portakal Suyu (250ml)', 'Şekersiz, katkısız %100 Finike portakalından sipariş anında sıkılır.', 'food', 35.00, 40, 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&auto=format&fit=crop&q=80', '[]'::jsonb, true),
  ('prod-10', 'school-1', 'cat-4', 'Günlük Şişe Süt (200ml)', 'Pastörize tam yağlı kalsiyum zengini çocuk sütü.', 'food', 20.00, 60, 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&auto=format&fit=crop&q=80', '["Süt Ürünleri"]'::jsonb, true),
  ('prod-11', 'school-1', 'cat-4', 'Doğal Köy Ayranı (200ml)', 'Az tuzlu, probiyotik yoğurttan serinletici geleneksel ayran.', 'food', 18.00, 50, 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=500&auto=format&fit=crop&q=80', '["Süt Ürünleri"]'::jsonb, true),
  ('prod-12', 'school-1', 'cat-4', 'Doğal Kaynak Suyu (500ml)', 'BPA içermeyen şişede saf doğal kaynak suyu.', 'food', 10.00, 100, 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=500&auto=format&fit=crop&q=80', '[]'::jsonb, true)
ON CONFLICT (id) DO NOTHING;

-- 5. Varsayılan Kullanıcılar (Şifreleri: 123456)
-- Hash: SHA-256('123456_kantincep_salt_2026') = 412076341f18fec6dca72e01a7cd9df6fa49d0be07e30e8ead7517ecf2fb0008
INSERT INTO public.users (id, full_name, email, role, school_id, account_status, phone, password_hash, title_or_branch, canteen_unit)
VALUES
  ('user-parent-1', 'Ayşe Yılmaz', 'veli@kantincep.com', 'parent', 'school-1', 'active', '0555 123 45 67', '412076341f18fec6dca72e01a7cd9df6fa49d0be07e30e8ead7517ecf2fb0008', NULL, NULL),
  ('user-canteen-1', 'Mehmet Usta', 'kantin@kantincep.com', 'canteen', 'school-1', 'active', '0532 987 65 43', '412076341f18fec6dca72e01a7cd9df6fa49d0be07e30e8ead7517ecf2fb0008', NULL, 'Merkez Okul Kantini'),
  ('user-teacher-1', 'Zehra Aydın (Danışman Öğretmen)', 'ogretmen@kantincep.com', 'teacher', 'school-1', 'active', '0542 333 44 55', '412076341f18fec6dca72e01a7cd9df6fa49d0be07e30e8ead7517ecf2fb0008', 'Rehberlik & Psikolojik Danışmanlık', NULL),
  ('user-manager-1', 'Kemal Öztürk (Kurum Müdürü)', 'mudur@kantincep.com', 'manager', 'school-1', 'active', '0505 456 78 90', '412076341f18fec6dca72e01a7cd9df6fa49d0be07e30e8ead7517ecf2fb0008', NULL, NULL),
  ('user-admin-1', 'Sistem Yöneticisi', 'yonetici@kantincep.com', 'admin', 'school-1', 'active', '0505 111 22 33', '412076341f18fec6dca72e01a7cd9df6fa49d0be07e30e8ead7517ecf2fb0008', NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  account_status = EXCLUDED.account_status;

-- 6. Varsayılan Öğrenciler
INSERT INTO public.students (id, parent_user_id, school_id, full_name, grade, classroom, active_status)
VALUES
  ('student-1', 'user-parent-1', 'school-1', 'Ali Yılmaz', '4. Sınıf', '4-B', true),
  ('student-2', 'user-parent-1', 'school-1', 'Zeynep Yılmaz', '2. Sınıf', '2-A', true)
ON CONFLICT (id) DO NOTHING;

-- BİTTİ: KantinCep Supabase şeması ve başlangıç tohum verileri başarıyla hazırlandı.
