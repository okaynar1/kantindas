import React from 'react';
import { X, ShieldCheck, Lock, FileText, CheckCircle2 } from 'lucide-react';

interface KvkkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KvkkModal: React.FC<KvkkModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-stone-200">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-lg">KVKK Aydınlatma Metni & Gizlilik Politikası</h3>
              <p className="text-xs text-stone-500">6698 sayılı Kişisel Verilerin Korunması Kanunu Uyarınca</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 text-sm text-stone-600 leading-relaxed">
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-900 flex items-start gap-3">
            <Lock className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold text-emerald-950">Öğrenci ve Çocuk Verilerinin Öncelikli Güvenliği</p>
              <p>
                KantinCep, çocuklara ait hassas kişisel verilerin korunmasını en yüksek öncelik kabul eder.
                Uygulama yalnızca okul kantini siparişi ve teslimatı için zorunlu olan asgari bilgileri (Ad Soyad, Sınıf ve Şube) işler.
                T.C. Kimlik Numarası, biyometrik veri veya ev adresi talep edilmez ve saklanmaz.
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-stone-900 flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              1. Veri Sorumlusu ve Kapsam
            </h4>
            <p>
              KantinCep platformunda işlenen veli ve öğrenci verileri, 6698 sayılı KVKK kapsamında yalnızca teneffüs ön siparişlerinin
              hazırlanması, kantin stok yönetimi ve sosyal dayanışma bağışlarının şeffaf ve güvenli yürütülmesi amacıyla işlenir.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-stone-900 flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              2. Dayanışma Havuzu ve Eğitime Destek Gizlilik Esasları
            </h4>
            <p>
              Dayanışma Havuzu ve Eğitime Destek modüllerinde bağışta bulunan velilerin kimlik ve iletişim bilgileri gizli tutulur.
              Aynı şekilde destekten faydalanan ihtiyaç sahibi öğrencilerin kimlikleri ve kişisel durumları asla bağışçılara,
              diğer velilere veya üçüncü şahıslara açıklanmaz. Dağıtım okul yönetimi ve rehberlik servisi koordinasyonunda gizlilik esasıyla yapılır.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-stone-900 flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              3. Ödeme ve Kart Bilgileri Güvenliği
            </h4>
            <p>
              Kredi veya banka kartı numaraları, son kullanma tarihleri ve CVV güvenlik kodları KantinCep sunucularında veya
              veritabanında ASLA saklanmaz. Tüm ödeme işlemleri BDDK lisanslı ödeme kuruluşları (iyzico / PayTR) ve bankaların
              güvenli 256-bit SSL şifreli ödeme altyapısı üzerinden 3D Secure güvencesiyle gerçekleştirilir.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-stone-900 flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              4. İlgili Kişi Hakları
            </h4>
            <p>
              KVKK'nın 11. maddesi uyarınca dilediğiniz zaman sisteme kayıtlı öğrenci bilgilerinizi silebilir, hesabınızı kapatabilir
              ve verilerinizin işlenme durumu hakkında bilgi talep edebilirsiniz.
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-stone-200 bg-stone-50 rounded-b-2xl flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-emerald-800 text-white font-medium hover:bg-emerald-900 transition-colors shadow-xs"
          >
            Anladım, Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
