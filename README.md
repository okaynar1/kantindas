# KantinCep — Akıllı Okul Kantini ve Sosyal Dayanışma Platformu

> **Slogan:** "Sıranı bekleme, iyiliği paylaş!"  
> **Para Birimi:** Türk Lirası (₺)  
> **Saat Dilimi:** Europe/Istanbul (GG.AA.YYYY)  
> **Temel Hedef:** Velilerin öğrencileri için okul kantininden ön sipariş vermesi, siparişlerin seçilen teneffüse kadar hazırlanması ve ihtiyaç sahibi öğrenciler için yemek ve kırtasiye desteğinin (Dayanışma Havuzu & Eğitime Destek) aynı sistem üzerinden güvenle yönetilmesi.

---

## 1. Mimari Genel Bakış

KantinCep, modern tam donanımlı bir full-stack web uygulaması olarak tasarlanmıştır:
- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide Icons.
- **Backend:** Express API katmanı (`server.ts` & `src/server/routes.ts`), Vite middleware entegrasyonu, rol tabanlı erişim kontrolü (RBAC), atomik işlem güvenliği (ACID uyumlu kalıcı dosya veritabanı).
- **Veritabanı Katmanı (`src/server/db.ts`):** `data/kantincep_db.json` üzerinde atomik yazma kilitleri, kalıcı kullanıcılar, okullar, öğrenciler, kategoriler, teneffüsler, ürünler, siparişler, bağışlar, ödeme kayıtları ve sistem denetim kayıtları (Audit Log).
- **Güvenlik & KVKK:** 6698 sayılı KVKK ilkelerine uygun olarak çocuklara ait asgari veri prensibi (yalnızca Ad Soyad, Sınıf ve Şube). Kredi kartı bilgileri asla saklanmaz.

---

## 2. Kullanıcı Rolleri ve Hazır Test Hesapları

Platformda test ve geliştirme sürecini kolaylaştırmak için aşağıdaki roller ve 1-tıkla geçiş desteği bulunmaktadır:

| Rol | E-posta | Varsayılan Şifre | İsim / Görev | Yetkiler |
|---|---|---|---|---|
| **Veli** | `veli@kantincep.com` | `veli123` | Ayşe Yılmaz | Menüden sipariş verme, öğrenci tanımlama (Ali & Zeynep), 4 haneli teslimat kodunu görme, Dayanışma Havuzu ve Eğitime Destek bağışı yapma, sipariş iptali |
| **Kantinci** | `kantin@kantincep.com` | `kantin123` | Mehmet Usta | Canlı sipariş panosu, teneffüs ve tarih filtreleme, durum geçişleri (`Hazırlanıyor` -> `Hazır` -> `Teslim Edildi`), 4 haneli PIN ile teslimat doğrulama, ürün/fiyat/stok yönetimi, bağış dağıtım kayıtları, CSV raporlama |
| **Yönetici** | `yonetici@kantincep.com` | `admin123` | Kemal Öztürk (Okul Müdürü) | Okul ve teneffüs saatleri ayarları, kantinci ve personel hesabı açma/askıya alma, sistem audit logları |

---

## 3. Canlı Ödeme Sağlayıcısına (iyzico / PayTR) Geçiş Adımları

Uygulama geliştirme ve test aşamasında **Simülasyon Ödeme Geçidi** (`simulation`) ile çalışmakta olup aşağıdaki 3 temel test senaryosunu doğrudan UI üzerinden destekler:
1. `✅ Başarılı Ödeme`: Kart limit kontrolü simülasyonu geçer, sipariş sıraya alınır veya bağış havuza eklenir.
2. `❌ Kart Reddi / Yetersiz Bakiye`: Banka reddi simüle edilir, sipariş ödenmiş gibi kaydedilmez, stok korunur veya iade edilir.
3. `⚠️ İptal Et / Vazgeç`: Kullanıcı işlemi iptal eder.

### Canlıya Geçiş İçin Yapılacaklar:

1. **Ortam Değişkenleri (`.env`):**
   ```bash
   # Ödeme Sağlayıcı Seçimi: "iyzico" veya "paytr"
   PAYMENT_PROVIDER="iyzico"

   # iyzico için:
   IYZICO_API_KEY="sandbox-..." # veya canlı API Key
   IYZICO_SECRET_KEY="sandbox-..." # veya canlı Secret Key
   IYZICO_BASE_URL="https://api.iyzipay.com"

   # PayTR için:
   PAYTR_MERCHANT_ID="123456"
   PAYTR_MERCHANT_KEY="xxxxxx"
   PAYTR_MERCHANT_SALT="yyyyyy"
   PAYTR_TEST_MODE="0"
   ```

2. **Webhook Entegrasyonu:**
   - KantinCep backend'inde `/api/payments/webhook` uç noktası hazırdır.
   - iyzico veya PayTR yönetim panelinizden bildirim URL'si olarak:
     `https://<SENIN_DOMAININ>/api/payments/webhook` tanımlanmalıdır.
   - İmzalı bildirim kontrolü (HMAC-SHA256) ve mükerrer bildirim koruması (idempotency) aktiftir.

---

## 4. Test ve Kabul Kriterleri Doğrulama Sonuçları

- **Veli Testleri:**
  - [x] Yeni veli hesabı oluşturulabiliyor (KVKK onayı zorunlu).
  - [x] Veli giriş ve çıkış yapabiliyor.
  - [x] Öğrenci eklenip düzenlenebiliyor (Sınıf & Şube).
  - [x] Ürünler kategorilere göre filtrelenip sepete eklenebiliyor.
  - [x] Tarih (yalnızca okul günleri) ve teneffüs seçilebiliyor.
  - [x] Sahte istemci fiyatları engelleniyor; sunucu ürünün veritabanındaki güncel fiyatını baz alıyor.
  - [x] Ödeme başarılı olduğunda sipariş `paid_pending` durumuna geçiyor ve 4 haneli benzersiz PIN kodu üretiliyor.
  - [x] Başarısız ödemede sipariş ödenmiş olarak kaydedilmiyor.
  - [x] Dayanışma Havuzu ve Eğitime Destek bağışları oluşturulup güvenle ödenebiliyor.

- **Kantinci Testleri:**
  - [x] Yetkili kantinci hesabıyla giriş yapılabiliyor.
  - [x] Yeni ürün (yemek veya kırtasiye) eklenebiliyor, fiyat ve stok güncellenebiliyor.
  - [x] Bekleyen siparişler gerçek zamanlı listeleniyor.
  - [x] Sipariş "Hazırlanıyor", "Hazır" durumlarına geçirilebiliyor.
  - [x] Sipariş teslimatı öğrencinin 4 haneli PIN kodu doğrulanarak onaylanıyor (mükerrer teslimat engellenir).
  - [x] Dayanışma Havuzu ve Eğitime Destek bakiyeleri ayrı takip ediliyor.
  - [x] İhtiyaç sahibi öğrencilere anonim dağıtım kaydı okul idaresi imzasıyla yapılabiliyor.
  - [x] CSV raporu dışa aktarılabiliyor (kişisel veri içermez).

---

## 5. Çalıştırma Komutları

```bash
# Bağımlılıkları yükleme
npm install

# Geliştirme sunucusunu başlatma (Express + Vite Port 3000)
npm run dev

# Derleme ve üretim test
npm run build
npm start
```
