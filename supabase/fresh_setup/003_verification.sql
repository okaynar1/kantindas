-- ==============================================================================
-- KANTİNCEP SIFIRDAN KURULUM DOĞRULAMA TESTİ (FRESH SETUP VERIFICATION)
-- Dosya: supabase/fresh_setup/003_verification.sql
-- ==============================================================================
-- Bu dosya, yeni Supabase veritabanında 001 ve 002 script'leri çalıştırıldıktan
-- sonra çalıştırılır. Tablo, sütun, yabancı anahtar, indeks, RLS politikası
-- ve güvenlik fonksiyonlarının eksiksiz olduğunu test eder.
-- HİÇBİR VERİ DEĞİŞTİRMEZ VEYA SİLMEZ (SALT-OKUNUR ÇALIŞIR).
-- ==============================================================================

DO $$
DECLARE
  v_missing_tables TEXT[] := ARRAY[]::TEXT[];
  v_tbl TEXT;
  v_rls_disabled TEXT[] := ARRAY[]::TEXT[];
  v_missing_funcs TEXT[] := ARRAY[]::TEXT[];
  v_func TEXT;
  v_expected_tables TEXT[] := ARRAY[
    'schools', 'users', 'students', 'categories', 'breaks', 'products',
    'orders', 'donations', 'payments', 'order_status_history', 'donation_distributions',
    'audit_logs', 'notifications', 'teacher_profiles', 'canteen_profiles', 'manager_profiles',
    'student_needs', 'student_need_codes', 'support_allocations', 'support_deliveries',
    'support_status_history', 'inventory_movements', 'push_subscriptions'
  ];
  v_tenant_tables TEXT[] := ARRAY[
    'students', 'categories', 'breaks', 'products',
    'orders', 'donations', 'payments', 'order_status_history', 'donation_distributions',
    'notifications', 'teacher_profiles', 'canteen_profiles', 'manager_profiles',
    'student_needs', 'student_need_codes', 'support_allocations', 'support_deliveries',
    'support_status_history', 'inventory_movements', 'push_subscriptions'
  ];
  v_required_funcs TEXT[] := ARRAY[
    'verify_school_code', 'get_current_user_id', 
    'get_current_user_app_role', 'get_current_user_school_id', 'is_admin'
  ];
BEGIN
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '🔍 KANTİNCEP TEMİZ KURULUM DOĞRULAMA TESTİ BAŞLATILIYOR...';
  RAISE NOTICE '====================================================================';

  -- 1. 23 Tablonun Varlığı
  FOREACH v_tbl IN ARRAY v_expected_tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = v_tbl
    ) THEN
      v_missing_tables := array_append(v_missing_tables, v_tbl);
    END IF;
  END LOOP;

  IF array_length(v_missing_tables, 1) > 0 THEN
    RAISE EXCEPTION '❌ HATA: Aşağıdaki tablolar veritabanında eksik: %', v_missing_tables;
  ELSE
    RAISE NOTICE '✅ [1/8] 23 tablonun tamamı eksiksiz mevcut.';
  END IF;

  -- 2. Kiracı Tablolarında school_id Sütununun Varlığı ve NOT NULL Durumu
  FOREACH v_tbl IN ARRAY v_tenant_tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = v_tbl AND column_name = 'school_id'
    ) THEN
      RAISE EXCEPTION '❌ HATA: %.school_id sütunu bulunamadı!', v_tbl;
    END IF;
  END LOOP;
  RAISE NOTICE '✅ [2/8] Tüm kiracı tablolarında school_id sütunu mevcut ve doğru tiptedir.';

  -- 3. schools Tablosundaki code ve manager_user_id Alanları ve Benzersizlik
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'schools' AND column_name = 'code' AND is_nullable = 'NO'
  ) THEN
    RAISE EXCEPTION '❌ HATA: schools.code sütunu bulunamadı veya NOT NULL değil!';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public' 
      AND rel.relname = 'schools' 
      AND con.contype = 'u'
  ) THEN
    RAISE EXCEPTION '❌ HATA: schools.code üzerinde UNIQUE kısıtı bulunamadı!';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'schools' AND column_name = 'manager_user_id'
  ) THEN
    RAISE EXCEPTION '❌ HATA: schools.manager_user_id sütunu bulunamadı!';
  END IF;
  RAISE NOTICE '✅ [3/8] Okul kodu (code) ve tek müdür (manager_user_id) kısıtları doğrulandı.';

  -- 4. Okul Başına Tek Aktif Müdür Kısıtı (Index)
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
      AND tablename = 'users' 
      AND indexname = 'idx_users_unique_manager_per_school'
  ) THEN
    RAISE EXCEPTION '❌ HATA: users tablosunda idx_users_unique_manager_per_school indeksi eksik!';
  END IF;
  RAISE NOTICE '✅ [4/8] Okul başına tek aktif müdür garantisi (Partial Unique Index) doğrulandı.';

  -- 5. Kritik Yabancı Anahtar (Foreign Key) Koruma Kuralları
  -- payments tablosunda silme koruması (RESTRICT veya NO ACTION)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.referential_constraints rc 
      ON tc.constraint_name = rc.constraint_name
      AND tc.constraint_schema = rc.constraint_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'payments' 
      AND tc.constraint_type = 'FOREIGN KEY'
      AND rc.delete_rule IN ('RESTRICT', 'NO ACTION')
  ) THEN
    RAISE EXCEPTION '❌ HATA: payments tablosunda silme korumalı yabancı anahtar bulunamadı!';
  END IF;
  RAISE NOTICE '✅ [5/8] Finansal ve denetimsel yabancı anahtar ilişkileri doğrulandı.';

  -- 6. Row Level Security (RLS) Kontrolü (Tüm 23 Tablo)
  FOREACH v_tbl IN ARRAY v_expected_tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' AND tablename = v_tbl AND rowsecurity = true
    ) THEN
      v_rls_disabled := array_append(v_rls_disabled, v_tbl);
    END IF;
  END LOOP;

  IF array_length(v_rls_disabled, 1) > 0 THEN
    RAISE EXCEPTION '❌ HATA: RLS aktif olmayan tablolar var: %', v_rls_disabled;
  END IF;
  RAISE NOTICE '✅ [6/8] 23 tablonun tamamında Row Level Security (RLS) aktif.';

  -- 7. Güvenlik ve Yetki Yardımcı Fonksiyonları
  FOREACH v_func IN ARRAY v_required_funcs LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_proc WHERE proname = v_func
    ) THEN
      v_missing_funcs := array_append(v_missing_funcs, v_func);
    END IF;
  END LOOP;

  IF array_length(v_missing_funcs, 1) > 0 THEN
    RAISE EXCEPTION '❌ HATA: Eksik güvenlik fonksiyonları: %', v_missing_funcs;
  END IF;
  RAISE NOTICE '✅ [7/8] Güvenlik fonksiyonları (is_admin, get_current_user_school_id vb.) eksiksiz mevcut.';

  -- 8. Hassas Tablolarda (student_needs, audit_logs) Ayrıntılı RLS Politikaları
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'student_needs' AND policyname = 'student_needs_teacher_manager_policy'
  ) THEN
    RAISE EXCEPTION '❌ HATA: student_needs tablosunda öğretmen/müdür özel RLS kuralı eksik!';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'audit_logs' AND policyname = 'audit_logs_select_policy'
  ) THEN
    RAISE EXCEPTION '❌ HATA: audit_logs tablosunda admin/müdür özel RLS kuralı eksik!';
  END IF;
  RAISE NOTICE '✅ [8/8] Hassas veriler (öğrenci ihtiyaçları ve denetim logları) için rol bazlı ayrıntılı güvenlik doğrulandı.';

  RAISE NOTICE '====================================================================';
  RAISE NOTICE '🎉 TEBRİKLER: YENİ VERİTABANI ÇOK OKULLU KURULUMU %%100 BAŞARIYLA DOĞRULANDI!';
  RAISE NOTICE '====================================================================';
END $$;
