# KANTİNCEP ÇOK OKULLU SİSTEM – VERİTABANI MİGRASYON & GÜVENLİK REHBERİ (AŞAMA 2)

Bu rehber, KantinCep platformunun tek okullu mimariden **Supabase Row Level Security (RLS) destekli, çok okullu (multi-tenant) güvenli mimariye** geçişini adım adım gerçekleştirmek üzere hazırlanmıştır.

---

## ⚠️ ÖNEMLİ GÜVENLİK İLKELERİ VE TAAHHÜTLER

1. **Canlı Supabase üzerinde asistan tarafından hiçbir SQL ÇALIŞTIRILMAMIŞTIR.**
2. Hazırlanan SQL dosyaları **asla tablo silmez (`DROP TABLE` YOKTUR)**, **kullanıcı veya sipariş silmez (`DELETE/TRUNCATE` YOKTUR)**.
3. Mevcut Atatürk İlkokulu (`school-1`), okul müdürü (`user-manager-1`), öğretmenler, kantinci, veliler ve sipariş kayıtları **%100 korunmaktadır**.
4. Güvenlik açıkları (sonsuz döngü, `school_id IS NULL` veri sızıntısı, Postgres vs Uygulama rolü karmaşası, `ON DELETE CASCADE` veri kaybı riski) tamamen kapatılmıştır.

---

## 💾 VERİTABANI YEDEĞİ ALMA KILAVUZU

### ❓ Soru: "Tabloları CSV olarak indirsem yedek için yeterli olur mu?"
**CEVAP: HAYIR, KESİNLİKLE YETERSİZDİR!**

Bir veritabanını yalnızca CSV formatında dışa aktarmak aşağıdaki kritik eksiklikler nedeniyle gerçek bir yedek teşkil etmez:
1. **Şema ve Veri Tipleri Kaybı:** CSV dosyası yalnızca metin içerir; `JSONB`, `BOOLEAN`, `TIMESTAMPTZ`, `NUMERIC(10,2)` gibi zengin veri tiplerini koruyamaz.
2. **Kısıtlar ve İlişkiler Kaybı:** Birincil anahtarlar (`PRIMARY KEY`), yabancı anahtarlar (`FOREIGN KEY`), teklik kısıtları (`UNIQUE`), `CHECK` kısıtları ve `DEFAULT` değerleri CSV içinde yer almaz.
3. **Fonksiyonlar, İndeksler ve Güvenlik Kuralları:** RLS güvenlik politikaları, `SECURITY DEFINER` yardımcı fonksiyonları ve performans indeksleri CSV'ye aktarılamaz.
4. **Geri Yükleme Çıkmazı:** CSV'den geri yükleme yaparken tabloları tek tek yabancı anahtar hiyerarşisine göre içe aktarmak gerekir; döngüsel ilişkilerde veya eksik bağımlılıklarda geri yükleme hata verip kilitlenir.

### ✅ Gerçek ve Güvenli Yedekleme Yöntemleri:

#### Yöntem 1: Supabase Otomatik / Point-in-Time (WAL) Yedeği (Önerilen)
1. [Supabase Dashboard](https://supabase.com/dashboard/project/mamsootbzwwfkcylklro) sayfasına gidin.
2. Sol menüden **Database** -> **Backups** sekmesine tıklayın.
3. Günlük otomatik snapshot yedeğin mevcut olduğunu teyit edin. Projeniz Pro planda ise Point-in-Time Recovery (PITR) ile dakikası dakikasına geri dönüş noktası mevcuttur.

#### Yöntem 2: pg_dump ile Tam Şema + Veri Yedeği (.sql formatında)
Terminalinizde aşağıdaki komutu çalıştırarak tüm şemayı, fonksiyonları, RLS politikalarını ve verileri tek bir tutarlı dosya olarak bilgisayarınıza indirebilirsiniz:
```bash
pg_dump -h db.mamsootbzwwfkcylklro.supabase.co -U postgres -d postgres --clean --if-exists > kantincep_tam_yedek_$(date +%Y%m%d_%H%M%S).sql
```

---

## 📁 HAZIRLANAN DOSYALAR VE ÇALIŞTIRMA SIRASI

| Sıra | Dosya Yolu | Amacı |
|---|---|---|
| **Adım 0** | *Salt-Okunur İnceleme Sorguları* | Mevcut durumun (okul, müdür, eksik sütunlar) doğrulanması. |
| **Adım 1** | `supabase/migrations/001_multischool_migration.sql` | **Ana Migrasyon:** Yeni sütunları (`code`, `manager_user_id`, `school_id`), kısıtları, indeksleri ve sertleştirilmiş RLS politikalarını uygular. |
| **Adım 2** | `supabase/migrations/002_multischool_verification.sql` | **Doğrulama Testi:** 23 tablonun, kısıtların, fonksiyonların ve veri bütünlüğünün otomatik testidir. Veri değiştirmez. |
| **Acil Durum** | `supabase/migrations/003_multischool_rollback.sql` | **Geri Alma:** Beklenmedik bir durumda politikaları önceki permissive duruma döndürür. Veri silmez. |

---

## 🛠️ UYGULAMA ADIMLARI (Supabase Dashboard)

### 1. Adım: Salt-Okunur Ön Kontrolleri Yapın
Supabase Dashboard -> **SQL Editor** -> **New Query** açarak şu sorguyu çalıştırın:
```sql
SELECT id, name, active_status FROM public.schools WHERE id = 'school-1';
SELECT id, full_name, email, role, school_id FROM public.users WHERE role IN ('admin', 'manager');
```

### 2. Adım: Ana Migrasyonu Çalıştırın
1. `supabase/migrations/001_multischool_migration.sql` dosyasının tüm içeriğini kopyalayın.
2. Supabase SQL Editor alanına yapıştırın.
3. Sağ alttaki yeşil **RUN** butonuna tıklayın.
4. Çıktı panelinde `Success. No rows returned` bildirimini görün.

### 3. Adım: 9 Aşamalı Doğrulama Testini Çalıştırın
1. SQL Editor'de yeni bir sekme açın.
2. `supabase/migrations/002_multischool_verification.sql` dosyasının içeriğini yapıştırıp **RUN** butonuna tıklayın.
3. Mesajlar sekmesinde 9 kontrolün de `✅` aldığını ve en sonda `🎉 TEBRİKLER: TÜM MİGRASYON DOĞRULAMA TESTLERİ BAŞARIYLA GEÇTİ!` mesajının geldiğini teyit edin.

---

## 🔒 GÜVENLİK SERTLEŞTİRMELERİ ÖZETİ

1. **`school_id IS NULL` Koruması:** Hiçbir kiracı tablosunda sahipsiz veri başkasına sızdırılmaz.
2. **Sonsuz Döngü (Infinite Recursion) Engelleme:** RLS politikalarında doğrudan `public.users` alt sorgusu yapmak yerine `SECURITY DEFINER` yardımcı fonksiyonları (`get_current_user_school_id`, `get_current_user_app_role`, `is_admin`) kullanılmıştır.
3. **Rol Ayrımı:** Postgres rolü (`service_role`, `authenticated`) ile KantinCep rolleri (`admin`, `manager`, `teacher`, `canteen`, `parent`) ayrıştırılmıştır.
4. **search_path Güvenliği:** Bütün `SECURITY DEFINER` fonksiyonları `SET search_path = pg_catalog, public, pg_temp;` ile koruma altına alınmıştır.
5. **Finansal Veri Güvencesi:** `payments` tablosundaki foreign key `ON DELETE RESTRICT` olarak tanımlanmış, okul silinmelerinde muhasebe geçmişinin kaybolması engellenmiştir.
6. **KVKK ve Öğrenci Gizliliği:** Öğrenci ihtiyaç kayıtları (`student_needs`, `student_need_codes`) sadece Okul Müdürü ve Danışman Öğretmenlere açıktır; veliler veya kantinciler bu kayıtları göremez.
