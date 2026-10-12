import React, { useState } from 'react';
import { X, CheckCircle, ShieldAlert, KeyRound, QrCode } from 'lucide-react';
import { Order } from '../../types.ts';
import { api } from '../../services/api.ts';

interface DeliveryVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onVerified: (updatedOrder: Order) => void;
}

export const DeliveryVerifyModal: React.FC<DeliveryVerifyModalProps> = ({
  isOpen,
  onClose,
  order,
  onVerified,
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Lütfen 4 haneli teslimat kodunu giriniz.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.verifyOrderDelivery(order.id, code);
      if (res.success && res.order) {
        onVerified(res.order);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Kod doğrulanamadı!');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoFillForTest = () => {
    setCode(order.deliveryCode);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-stone-200 overflow-hidden">
        <div className="bg-amber-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-amber-200" />
            <h3 className="font-bold text-base">Teslimat Doğrulama</h3>
          </div>
          <button
            onClick={onClose}
            className="text-amber-200 hover:text-white p-1 rounded-lg hover:bg-amber-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleVerify} className="p-5 space-y-4">
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-center">
            <p className="text-xs text-stone-500">Sipariş Bilgisi</p>
            <p className="text-sm font-bold text-stone-900">{order.studentNameSnapshot}</p>
            <p className="text-xs text-stone-600">{order.studentClassSnapshot} · {order.breakNameSnapshot}</p>
            <p className="text-[11px] font-mono text-stone-400 mt-1">{order.orderNumber}</p>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1 text-center">
              Öğrencinin Söylediği 4 Haneli Kod
            </label>
            <input
              type="text"
              maxLength={4}
              required
              autoFocus
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="0000"
              className="w-full text-center tracking-widest text-2xl font-mono py-2.5 border-2 border-stone-200 rounded-xl focus:border-amber-600 focus:outline-none"
            />
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={handleAutoFillForTest}
              className="text-[11px] text-stone-400 hover:text-amber-700 underline"
            >
              (Test/Demo Kolaylığı: Kodu Otomatik Doldur: {order.deliveryCode})
            </button>
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading || code.length !== 4}
              className="flex-1 py-2.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              {loading ? 'Doğrulanıyor...' : 'Teslim Et'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
