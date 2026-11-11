# KANTİNCEP SIFIRDAN ÇOK OKULLU KURULUM REHBERİ (FRESH SETUP)

Bu rehber, KantinCep uygulamasını **yeni ve boş bir Supabase projesi** üzerinde, sıfırdan ve en yüksek güvenlik standartlarıyla çok okullu (multi-tenant) olarak kurmak için hazırlanmıştır.

Mevcut veritabanındaki test kayıtları aktarılmayacak; sistem temiz bir sayfayla yayına alınacaktır.

---

## 📁 KURULUM DOSYALARI

| Sıra | Dosya | Görevi |
|---|---|---|
| **1** | `supabase/fresh_setup/001_complete_schema.sql` | 23 tablonun tamamını, birincil/yabancı anahtarları, `school_id` kısıtlarını, tek müdür kuralını ve performans indekslerini kurar. |
| **2** | `supabase/fresh_setup/002_rls_and_security.sql` | Güvenlik fonksiyonlarını (`is_admin`, `get_current_user_school_id`, `verify_school_code`) oluşturur, tüm tablolarda RLS'i açar ve rol bazlı politikaları uygular. |
| **3** | `supabase/fresh_setup/003_verification.sql` | Veritabanı kurulumunu 8 aşamalı otomatik testten geçirir. Veri değiştirmez veya silmez. |

---

## 🚀 ADIM ADIM KURULUM KILAVUZU

### ADIM 1: Yeni Bir Supabase Projesi Oluşturun
1. [supabase.com](https://supabase.com) adresine gidin ve hesabınıza giriş yapın.
2. **"New Project"** butonuna tıklayın.
3. Proje Bilgileri:
   - **Name:** `kantincep-platform` (veya istediğiniz bir ad)
   - **Database Password:** Güçlü bir şifre belirleyin ve güvenli bir yere kaydedin.
   - **Region:** Türkiye'ye en yakın bölgeyi (örn: `Frankfurt (eu-central-1)`) seçin.
4. Projenin oluşturulmasını (yaklaşık 1-2 dakika) bekleyin.

---

### ADIM 2: SQL Dosyalarını Sırayla Çalıştırın

#### 1. Şemayı Yükleyin (001_complete_schema.sql)
1. Supabase Dashboard'da sol menüden **SQL Editor** simgesine tıklayın.
2. **New Query** butonuna basın.
3. `supabase/fresh_setup/001_complete_schema.sql` dosyasının tüm içeriğini yapıştırın.
4. Sağ alttaki yeşil **RUN** butonuna tıklayın.
5. `Success. No rows returned` mesajını teyit edin.

#### 2. Güvenlik ve RLS Kurallarını Yükleyin (002_rls_and_security.sql)
1. SQL Editor'de yeni bir sekme (**New Query**) açın.
2. `supabase/fresh_setup/002_rls_and_security.sql` dosyasının tüm içeriğini yapıştırın.
3. **RUN** butonuna tıklayın.
4. `Success. No rows returned` mesajını görün.

#### 3. Kurulumu Test Edin (003_verification.sql)
1. Yeni bir sorgu sekmesi açın.
2. `supabase/fresh_setup/003_verification.sql` dosyasının tüm içeriğini yapıştırıp **RUN** butonuna basın.
3. **Messages** sekmesinde `[1/8]`'den `[8/8]`'e kadar bütün kontrollerin `✅` aldığını ve en sonda `🎉 TEBRİKLER: YENİ VERİTABANI ÇOK OKULLU KURULUMU %100 BAŞARILI!` yazdığını teyit edin.

---

### ADIM 3: İlk Sistem Yöneticisi ve İlk Okulu Oluşturma (Opsiyonel Başlangıç)

### ADIM 3: İlk Sistem Yöneticisi ve İlk Okulu Güvenli Oluşturma

Yeni veritabanınız tamamen temizdir ve açıkta sabit/varsayılan parola barındırmaz. Sisteme güvenli ilk yönetici hesabını eklemek için **iki yöntem** mevcuttur:

#### YÖNTEM A (Önerilen ve En Güvenli): Supabase Auth Üzerinden Oluşturma
1. Supabase Dashboard -> **Authentication** -> **Users** sekmesine gidin.
2. **"Add user"** -> **"Create user"** seçeneğine tıklayın.
3. Yönetici e-posta adresinizi (örn: `admin@kantincep.com`) ve belirlediğiniz **güçlü bir parolayı** girin.
4. "Auto Confirm User" seçeneğini işaretleyip **"Create user"** butonuna basın.
5. Kullanıcı listesinde oluşan kullanıcının **User UID** değerini (UUID) kopyalayın.
6. SQL Editor'de aşağıdaki sorguyu bu UID ile çalıştırarak yönetici yetkisini veritabanına bağlayın (Parolanız SQL içinde yer almaz, Supabase Auth'un bcrypt altyapısında güvenle saklanır):

```sql
-- 1. Merkezi Sistem Yöneticisini Bağla (UUID Supabase Auth'tan alınır)
INSERT INTO public.users (
  id, full_name, email, role, school_id, account_status
) VALUES (
  'BURAYA_KOPYALANAN_AUTH_UID_YAPISTIRIN',
  'Merkezi Sistem Yöneticisi',
  'admin@kantincep.com',
  'admin',
  NULL, -- Merkezi yönetici tüm okullara erişebilir
  'active'
);

-- 2. İlk Okul Kaydı (Örnek: Atatürk İlkokulu)
INSERT INTO public.schools (
  id, code, name, address, timezone, active_status
) VALUES (
  'school-1',
  'ATATURK01',
  'Atatürk İlkokulu ve Ortaokulu',
  'Meşrutiyet Cad. No:44 Çankaya / Ankara',
  'Europe/Istanbul',
  true
);
```

#### YÖNTEM B: SQL Üzerinden Kendi Belirleyeceğiniz Güçlü Şifreyle Oluşturma
Eğer Auth paneline girmeden doğrudan SQL ile ilk yöneticiyi eklemek isterseniz, `pgcrypto` eklentisi yardımıyla parolanızı dinamik hash'leyerek oluşturabilirsiniz (SQL'deki `'GÜÇLÜ_PAROLANIZI_YAZIN'` kısmını kendi belirleyeceğiniz şifre ile değiştiriniz):

```sql
-- Dinamik bcrypt hash ile güvenli yönetici oluşturma:
INSERT INTO public.users (
  id, full_name, email, role, school_id, account_status, password_hash, must_change_password
) VALUES (
  'user-admin-' || SUBSTRING(gen_random_uuid()::text FROM 1 FOR 8),
  'Merkezi Sistem Yöneticisi',
  'admin@kantincep.com',
  'admin',
  NULL,
  'active',
  crypt('GÜÇLÜ_PAROLANIZI_YAZIN', gen_salt('bf', 10)),
  true -- İlk girişte parola değiştirme zorunluluğu
);
```

---

### ADIM 4: Ortam Değişkenleri (Environment Variables) Yapılandırması

Yeni projenizin Supabase Dashboard -> **Project Settings** -> **API** sekmesinden bilgilerinizi alın:

1. **Project URL:** `https://<yeni-proje-id>.supabase.co`
2. **Project API keys -> `anon` `public`:** Genel anonim anahtar
3. **Project API keys -> `service_role` `secret`:** Yalnızca sunucu tarafı gizli anahtar

#### `.env` / Vercel Ortam Değişkenleri Listesi:

```env
# 1. Supabase Genel Bağlantısı (Sunucu ve İstemci)
SUPABASE_URL=https://<yeni-proje-id>.supabase.co
SUPABASE_ANON_KEY=<yeni-anon-key>

# 2. VITE İstemci Tarafı İçin (Gerekirse)
VITE_SUPABASE_URL=https://<yeni-proje-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<yeni-anon-key>

# 3. YALNIZCA SUNUCU TARAFI (Node.js/Express) İÇİN GİZLİ SERVİS ANAHTARI
# ⚠️ DİKKAT: Bu anahtar ASLA istemciye (frontend) veya VITE_ önekiyle verilmemelidir!
SUPABASE_SERVICE_ROLE_KEY=<yeni-service-role-secret-key>
```

---

## 🔒 GÜVENLİK MİMARİSİ VE KORUNAN ÖZELLİKLER

1. **Tam İzolasyon:** Her okul verisi (`school_id`) seviyesinde izole edilmiştir. Bir okulun personeli veya velisi diğer okulun ürününü, siparişini, öğrencisini veya desteğini asla göremez.
2. **Tek Aktif Müdür Garantisi:** `idx_users_unique_manager_per_school` indeksi sayesinde bir okula ikinci bir aktif müdür kaydı veritabanı seviyesinde engellenmiştir.
3. **Öğrenci Gizliliği (KVKK):** `student_needs` ve `student_need_codes` tabloları yalnızca okulun müdür ve rehber öğretmenlerine açıktır; kantin ve velilere kapalıdır.
4. **Muhasebe Güvencesi:** `payments` tablosundaki `ON DELETE RESTRICT` kuralı sayesinde okul silinse dahi kanuni finansal denetim izi silinmez.
5. **Recursion-Free RLS:** RLS sorgularının `users` tablosunu döngüye sokması `SECURITY DEFINER` yardımcı fonksiyonlarıyla kökten çözülmüştür.
