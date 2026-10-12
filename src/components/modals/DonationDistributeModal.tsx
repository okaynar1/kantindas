import React, { useState } from 'react';
import { X, HeartHandshake, ShieldCheck, AlertCircle } from 'lucide-react';
import { DonationItem } from '../../types.ts';
import { api } from '../../services/api.ts';

interface DonationDistributeModalProps {
  isOpen: boolean;
  onClose: () => void;
  donationItem: DonationItem | null;
  onDistributed: () => void;
}

export const DonationDistributeModal: React.FC<DonationDistributeModalProps> = ({
  isOpen,
  onClose,
  donationItem,
  onDistributed,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('Okul idaresi ve rehberlik servisi koordinasyonuyla gizlilik esasıyla teslim edildi.');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !donationItem) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity > donationItem.remainingQuantity) {
      setError(`Havuzda yalnızca ${donationItem.remainingQuantity} adet ürün mevcuttur.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.distributeDonation({
        donationItemId: donationItem.id,
        quantity,
        notes,
      });
      onDistributed();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Dağıtım kaydı oluşturulamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden">
        <div className="bg-emerald-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-emerald-300" />
            <h3 className="font-bold text-base">Dayanışma Ürünü Dağıtım Kaydı</h3>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-emerald-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-800 font-semibold">Havuzdaki Ürün</p>
              <p className="text-sm font-bold text-emerald-950">{donationItem.productNameSnapshot}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-emerald-700">Kullanılabilir Bakiye</p>
              <p className="text-lg font-black text-emerald-900">{donationItem.remainingQuantity} Adet</p>
            </div>
          </div>

          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <span>
              <strong>Gizlilik İlkesi:</strong> İhtiyaç sahibi öğrencinin kimliği sisteme girilmez.
              Dağıtım okul idaresi veya rehberlik gözetiminde anonim olarak kayıt altına alınır.
            </span>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Dağıtılacak Adet
            </label>
            <input
              type="number"
              min={1}
              max={donationItem.remainingQuantity}
              required
              value={quantity}
              onChange={e => setQuantity(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:outline-emerald-600 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Yetkili Açıklama / Dağıtım Notu
            </label>
            <textarea
              rows={2}
              required
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl focus:outline-emerald-600"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={loading || quantity <= 0}
              className="px-5 py-2 text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Kaydediliyor...' : 'Dağıtımı Onayla & Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
