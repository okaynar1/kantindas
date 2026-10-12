import React, { useState } from 'react';
import { X, CreditCard, ShieldCheck, Lock, AlertTriangle, CheckCircle, Info, ExternalLink } from 'lucide-react';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  targetType: 'order' | 'donation';
  amount: number;
  title: string;
  subtitle: string;
  onSuccess: (data: any) => void;
  onFailure?: (error: string) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  targetId,
  targetType,
  amount,
  title,
  subtitle,
  onSuccess,
  onFailure,
}) => {
  const { refreshUserData } = useAuth();
  const [cardNumber, setCardNumber] = useState('5428 •••• •••• 9012');
  const [expiry, setExpiry] = useState('12/28');
  const [cvv, setCvv] = useState('321');
  const [cardHolder, setCardHolder] = useState('AYSE YILMAZ');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showConfigGuide, setShowConfigGuide] = useState(false);

  if (!isOpen) return null;

  const handleSimulate = async (result: 'success' | 'failed' | 'cancel') => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.checkoutPayment({
        targetId,
        targetType,
        simulationResult: result,
        cardNumberMasked: cardNumber,
      });

      await refreshUserData();

      if (result === 'success') {
        onSuccess(res);
        onClose();
      } else if (result === 'cancel') {
        onClose();
      }
    } catch (err: any) {
      const msg = err.message || 'Ödeme gerçekleştirilemedi.';
      setErrorMsg(msg);
      if (onFailure) onFailure(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-stone-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-white">Güvenli Ödeme Geçidi</span>
                <span className="text-[10px] bg-amber-500 text-stone-950 font-bold px-1.5 py-0.5 rounded tracking-wider uppercase">
                  Test / Simülasyon
                </span>
              </div>
              <p className="text-xs text-stone-400">256-Bit SSL Şifreli Güvenli Tahsilat</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Order Summary Pill */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
            <div>
              <p className="text-xs text-stone-500 font-medium">{title}</p>
              <p className="text-sm font-semibold text-stone-900">{subtitle}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-stone-500">Ödenecek Tutar</p>
              <p className="text-xl font-bold text-emerald-800">₺{amount.toFixed(2)}</p>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Ödeme Başarısız!</p>
                <p>{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Card Preview Visual */}
          <div className="relative h-44 rounded-2xl p-5 text-white shadow-lg overflow-hidden flex flex-col justify-between bg-gradient-to-tr from-emerald-900 via-stone-900 to-emerald-950 border border-emerald-700/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono tracking-widest text-emerald-300">KANTINCEP SECURE CARD</span>
              <CreditCard className="w-6 h-6 text-emerald-300" />
            </div>

            <div className="font-mono text-lg tracking-widest text-stone-100">
              {cardNumber}
            </div>

            <div className="flex items-center justify-between text-xs font-mono">
              <div>
                <span className="block text-[9px] text-stone-400 uppercase">Kart Sahibi</span>
                <span className="font-semibold tracking-wider">{cardHolder}</span>
              </div>
              <div>
                <span className="block text-[9px] text-stone-400 uppercase">SKT</span>
                <span className="font-semibold">{expiry}</span>
              </div>
            </div>
          </div>

          {/* Input details */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Kart Sahibi Ad Soyad</label>
              <input
                type="text"
                value={cardHolder}
                onChange={e => setCardHolder(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:outline-emerald-600"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-stone-700 mb-1">Kart Numarası</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={e => setCardNumber(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl font-mono focus:outline-emerald-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">SKT</label>
                <input
                  type="text"
                  value={expiry}
                  onChange={e => setExpiry(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl font-mono focus:outline-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* Test Action Controls */}
          <div className="space-y-2 pt-2 border-t border-stone-100">
            <p className="text-[11px] text-stone-500 font-medium">
              Geliştirme / Test Senaryoları (Sistem Doğrulama Butonları):
            </p>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleSimulate('success')}
              className="w-full py-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4 text-emerald-300" />
              {loading ? 'İşlem Yapılıyor...' : `✅ Başarılı Ödeme Onayla (₺${amount.toFixed(2)})`}
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleSimulate('failed')}
                className="py-2.5 px-3 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                ❌ Kart Reddi / Yetersiz Bakiye
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleSimulate('cancel')}
                className="py-2.5 px-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100 text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer"
              >
                İptal Et / Vazgeç
              </button>
            </div>
          </div>

          {/* Production Integration Info Trigger */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowConfigGuide(!showConfigGuide)}
              className="text-[11px] text-emerald-800 hover:underline flex items-center gap-1 font-medium"
            >
              <Info className="w-3.5 h-3.5" />
              Canlı Ödeme Sağlayıcısına (iyzico / PayTR) Geçiş Bilgisi
            </button>

            {showConfigGuide && (
              <div className="mt-2 p-3 rounded-xl bg-stone-100 text-[11px] text-stone-600 space-y-1.5 border border-stone-200">
                <p className="font-semibold text-stone-800">Gerçek Ödeme Entegrasyonu İçin Gerekli Adımlar:</p>
                <p>1. <code>.env</code> dosyasına <code>PAYMENT_PROVIDER=iyzico</code> veya <code>paytr</code> ekleyin.</p>
                <p>2. BDDK onaylı sağlayıcınızdan alınan <code>API_KEY</code>, <code>SECRET_KEY</code> ve <code>BASE_URL</code> anahtarlarını tanımlayın.</p>
                <p>3. Webhook bildirimleri için sunucu tarafındaki <code>/api/payments/webhook</code> endpoint'i HMAC-SHA256 doğrulamasıyla hazırdır.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
