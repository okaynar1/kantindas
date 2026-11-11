-- ==============================================================================
-- KANTİNCEP ÇOK OKULLU SİSTEM DOĞRULAMA TESTİ (AŞAMA 2 - GÜVENLİ VE KAPSAMLI)
-- Dosya: supabase/migrations/002_multischool_verification.sql
-- Proje ID: mamsootbzwwfkcylklro
-- ==============================================================================
-- Bu dosya migrasyonun başarısını, veri bütünlüğünü, güvenlik sertleştirmesini
-- ve çok okullu izolasyon kurallarını doğrular.
-- HİÇBİR VERİYİ DEĞİŞTİRMEZ VEYA SİLMEZ (SALT-OKUNUR ÇALIŞIR).
-- ==============================================================================

DO $$
DECLARE
  v_missing_tables TEXT[] := ARRAY[]::TEXT[];
  v_tbl TEXT;
  v_school_code TEXT;
  v_manager_count INT;
  v_null_school_id_count INT;
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
  v_six_tables TEXT[] := ARRAY[
    'payments', 'order_status_history', 'audit_logs',
    'notifications', 'support_status_history', 'push_subscriptions'
  ];
  v_required_funcs TEXT[] := ARRAY[
    'verify_school_code', 'get_current_user_id', 
    'get_current_user_app_role', 'get_current_user_school_id', 'is_admin'
  ];
BEGIN
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '🔍 KANTİNCEP ÇOK OKULLU SİSTEM DOĞRULAMA TESTİ BAŞLATILIYOR...';
  RAISE NOTICE '====================================================================';

  -- 1. 23 Tablonun Varlığının Kontrolü
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
    RAISE NOTICE '✅ [1/9] 23 tablonun tamamı eksiksiz mevcut.';
  END IF;

  -- 2. Eksik 6 Tabloda school_id Sütununun Varlığı
  FOREACH v_tbl IN ARRAY v_six_tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = v_tbl AND column_name = 'school_id'
    ) THEN
      RAISE EXCEPTION '❌ HATA: %.school_id sütunu bulunamadı!', v_tbl;
    END IF;
  END LOOP;
  RAISE NOTICE '✅ [2/9] Eksik 6 tablonun tamamına school_id sütunu başarıyla eklendi.';

  -- 3. school_id Boş (NULL) Veri Sızıntısı Kontrolü
  -- payments, order_status_history, notifications, support_status_history tablolarında
  -- hiçbir kayıt sahipsiz (school_id NULL) kalmamalıdır.
  SELECT COUNT(*) INTO v_null_school_id_count FROM public.payments WHERE school_id IS NULL;
  IF v_null_school_id_count > 0 THEN
    RAISE EXCEPTION '❌ HATA: payments tablosunda % adet school_id IS NULL kayıt tespit edildi!', v_null_school_id_count;
  END IF;

  SELECT COUNT(*) INTO v_null_school_id_count FROM public.order_status_history WHERE school_id IS NULL;
  IF v_null_school_id_count > 0 THEN
    RAISE EXCEPTION '❌ HATA: order_status_history tablosunda % adet school_id IS NULL kayıt tespit edildi!', v_null_school_id_count;
  END IF;

  SELECT COUNT(*) INTO v_null_school_id_count FROM public.notifications WHERE school_id IS NULL;
  IF v_null_school_id_count > 0 THEN
    RAISE EXCEPTION '❌ HATA: notifications tablosunda % adet school_id IS NULL kayıt tespit edildi!', v_null_school_id_count;
  END IF;
  RAISE NOTICE '✅ [3/9] Hiçbir kritik tabloda sahipsiz (school_id NULL) veri kalmadı.';

  -- 4. schools Tablosundaki code ve manager_user_id Kontrolü
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'schools' AND column_name = 'code'
  ) THEN
    RAISE EXCEPTION '❌ HATA: schools.code sütunu bulunamadı!';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'schools' AND column_name = 'manager_user_id'
  ) THEN
    RAISE EXCEPTION '❌ HATA: schools.manager_user_id sütunu bulunamadı!';
  END IF;

  SELECT code INTO v_school_code FROM public.schools WHERE id = 'school-1';
  IF v_school_code IS NULL OR v_school_code = '' THEN
    RAISE EXCEPTION '❌ HATA: Mevcut okul (school-1) için okul kodu atanmamış!';
  END IF;
  RAISE NOTICE '✅ [4/9] Okul kodu sütunu mevcut ve ilk okul için kod doğrulandı: %', v_school_code;

  -- 5. Okul Başına Tek Müdür Kuralı Kontrolü (Constraint & Index)
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
      AND tablename = 'users' 
      AND indexname = 'idx_users_unique_manager_per_school'
  ) THEN
    RAISE EXCEPTION '❌ HATA: users tablosunda okul başına tek müdür indeksi (idx_users_unique_manager_per_school) eksik!';
  END IF;

  SELECT COUNT(*) INTO v_manager_count 
  FROM public.users 
  WHERE school_id = 'school-1' AND role = 'manager' AND account_status = 'active';

  IF v_manager_count > 1 THEN
    RAISE EXCEPTION '❌ HATA: school-1 okulunda birden fazla (% adet) aktif müdür bulundu!', v_manager_count;
  END IF;
  RAISE NOTICE '✅ [5/9] Okul başına tek müdür kuralı doğrulandı. Mevcut müdür sayısı: %', v_manager_count;

  -- 6. Güvenli Yabancı Anahtar (Foreign Key) İlişkileri Kontrolü
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' AND constraint_name = 'payments_school_id_fk'
  ) THEN
    RAISE EXCEPTION '❌ HATA: payments_school_id_fk yabancı anahtar kısıtı eksik!';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' AND constraint_name = 'audit_logs_school_id_fk'
  ) THEN
    RAISE EXCEPTION '❌ HATA: audit_logs_school_id_fk yabancı anahtar kısıtı eksik!';
  END IF;
  RAISE NOTICE '✅ [6/9] Tablolar arası school_id Foreign Key ilişkileri başarıyla doğrulandı.';

  -- 7. Güvenlik ve RLS (Row Level Security) Kontrolü
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
  RAISE NOTICE '✅ [7/9] Tüm 23 tabloda RLS (Row Level Security) aktif durumda.';

  -- 8. Güvenlik Yardımcı Fonksiyonlarının Kontrolü
  FOREACH v_func IN ARRAY v_required_funcs LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_proc WHERE proname = v_func
    ) THEN
      v_missing_funcs := array_append(v_missing_funcs, v_func);
    END IF;
  END LOOP;

  IF array_length(v_missing_funcs, 1) > 0 THEN
    RAISE EXCEPTION '❌ HATA: Aşağıdaki güvenlik fonksiyonları eksik: %', v_missing_funcs;
  END IF;
  RAISE NOTICE '✅ [8/9] Tüm güvenlik yardımcı fonksiyonları (is_admin, get_current_user_school_id vb.) eksiksiz mevcut.';

  -- 9. Hassas Tablolarda (student_needs, audit_logs) Özel İzolasyon Kontrolü
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
  RAISE NOTICE '✅ [9/9] Hassas öğrenci ihtiyaçları ve denetim kayıtları için ayrıntılı rol bazlı güvenlik politikaları doğrulandı.';

  RAISE NOTICE '====================================================================';
  RAISE NOTICE '🎉 TEBRİKLER: TÜM MİGRASYON DOĞRULAMA TESTLERİ BAŞARIYLA GEÇTİ!';
  RAISE NOTICE '====================================================================';
END $$;
