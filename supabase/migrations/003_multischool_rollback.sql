-- ==============================================================================
-- KANTİNCEP ÇOK OKULLU SİSTEM GERİ ALMA (ROLLBACK) SCRİPTİ (AŞAMA 2 - GÜVENLİ)
-- Dosya: supabase/migrations/003_multischool_rollback.sql
-- Proje ID: mamsootbzwwfkcylklro
-- ==============================================================================
-- UYARI: Bu dosya yalnızca acil bir durumda ve yetkili onayıyla çalıştırılmalıdır.
-- HİÇBİR TABLOYU VEYA KULLANICI VERİSİNİ SİLMEZ (DROP TABLE / TRUNCATE YOKTUR).
-- Çok okullu RLS politikalarını ve kısıtları güvenli biçimde önceki duruma döndürür.
-- ==============================================================================

BEGIN;

-- 1. Rol Bazlı RLS Politikalarını Temizleme ve Eski Permissive Duruma Döndürme
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
    -- Yeni sertleştirilmiş politikaları kaldır
    EXECUTE format('DROP POLICY IF EXISTS "%I_select_policy" ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%I_write_policy" ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%I_insert_policy" ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%I_update_policy" ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%I_delete_policy" ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%I_policy" ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%I_teacher_manager_policy" ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%I_school_policy" ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_select" ON public.%I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_write" ON public.%I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "schools_read_policy" ON public.%I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "schools_admin_write_policy" ON public.%I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "audit_logs_select_policy" ON public.%I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "audit_logs_insert_policy" ON public.%I;', t);
    
    -- Eski tek okullu genel erişim politikasını geri yükle (Sistem durmaması için)
    EXECUTE format('DROP POLICY IF EXISTS "KantinCep_Permissive_Policy" ON public.%I;', t);
    EXECUTE format('CREATE POLICY "KantinCep_Permissive_Policy" ON public.%I FOR ALL USING (true) WITH CHECK (true);', t);
  END LOOP;
END $$;

-- 2. İndeksleri Kaldırma
DROP INDEX IF EXISTS public.idx_users_unique_manager_per_school;
DROP INDEX IF EXISTS public.idx_schools_code;
DROP INDEX IF EXISTS public.idx_payments_school_id;
DROP INDEX IF EXISTS public.idx_order_status_history_school_id;
DROP INDEX IF EXISTS public.idx_audit_logs_school_id;
DROP INDEX IF EXISTS public.idx_notifications_school_id;
DROP INDEX IF EXISTS public.idx_support_status_history_school_id;
DROP INDEX IF EXISTS public.idx_push_subscriptions_school_id;

-- 3. Kısıtları (Constraints) Güvenle Kaldırma
ALTER TABLE public.schools DROP CONSTRAINT IF EXISTS schools_manager_user_unique;
ALTER TABLE public.schools DROP CONSTRAINT IF EXISTS schools_manager_user_fk;
ALTER TABLE public.schools DROP CONSTRAINT IF EXISTS schools_code_unique;

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_school_id_fk;
ALTER TABLE public.order_status_history DROP CONSTRAINT IF EXISTS order_status_history_school_id_fk;
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_school_id_fk;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_school_id_fk;
ALTER TABLE public.support_status_history DROP CONSTRAINT IF EXISTS support_status_history_school_id_fk;
ALTER TABLE public.push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_school_id_fk;

-- 4. Güvenlik Fonksiyonlarını Kaldırma
DROP FUNCTION IF EXISTS public.verify_school_code(TEXT);
DROP FUNCTION IF EXISTS public.get_current_user_id();
DROP FUNCTION IF EXISTS public.get_current_user_app_role();
DROP FUNCTION IF EXISTS public.get_current_user_school_id();
DROP FUNCTION IF EXISTS public.is_admin();

COMMIT;

-- ==============================================================================
-- ROLLBACK İŞLEMİ TAMAMLANDI (Mevcut Veriler %100 Korunmuştur)
-- ==============================================================================
