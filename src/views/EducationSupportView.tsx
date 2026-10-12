import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Pencil,
  Sparkles,
  ShieldCheck,
  CheckCircle,
  Plus,
  Minus,
  History,
  Gift,
  AlertCircle,
} from 'lucide-react';
import { Product, Donation } from '../types.ts';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { PaymentModal } from '../components/modals/PaymentModal.tsx';

export const EducationSupportView: React.FC = () => {
  const { user, refreshUserData } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [donationQuantities, setDonationQuantities] = useState<Record<string, number>>({});
  const [note, setNote] = useState<string>('Tüm evlatlarımızın defteri, kalemi tam olsun.');
  const [activeTab, setActiveTab] = useState<'donate' | 'history'>('donate');

  const [pendingDonation, setPendingDonation] = useState<Donation | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodRes, donRes] = await Promise.all([
        api.getProducts({ type: 'stationery', active: true }),
        api.getDonations('education_support'),
      ]);

      setProducts(prodRes.products);
      setDonations(donRes.donations);
    } catch (err: any) {
      setErrorNotice(err.message || 'Veriler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleQtyChange = (productId: string, delta: number) => {
    setDonationQuantities(prev => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [productId]: next };
    });
  };

  const selectedItems = Object.entries(donationQuantities)
    .filter(([_, qty]) => qty > 0)
    .map(([productId, quantity]) => {
      const prod = products.find(p => p.id === productId);
      return {
        product: prod!,
        quantity,
        total: (prod?.price || 0) * quantity,
      };
    })
    .filter(item => item.product);

  const totalDonationAmount = Math.round(
    selectedItems.reduce((sum, item) => sum + item.total, 0) * 100
  ) / 100;

  const handleCreateDonation = async () => {
    if (selectedItems.length === 0) return;

    setCheckoutLoading(true);
    setErrorNotice(null);
    try {
      const payload = {
        donationType: 'education_support',
        items: selectedItems.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        note,
      };

      const res = await api.createDonation(payload);
      if (res.success && res.donation) {
        setPendingDonation(res.donation);
      }
    } catch (err: any) {
      setErrorNotice(err.message || 'Bağış oluşturulamadı.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setDonationQuantities({});
    setPendingDonation(null);
    setSuccessNotice('Kırtasiye desteğiniz havuza eklendi! Geleceğe yaptığınız katkı için minnettarız.');
    loadData();
    refreshUserData();
  };

  // Counters
  let totalStationeryDonated = 0;
  let totalStationeryDelivered = 0;
  let totalStationeryRemaining = 0;

  for (const don of donations.filter(d => d.paymentStatus === 'paid')) {
    for (const item of don.items) {
      totalStationeryDonated += item.quantity;
      totalStationeryDelivered += item.deliveredQuantity;
      totalStationeryRemaining += item.remainingQuantity;
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-indigo-950 to-stone-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-800 text-blue-200 text-xs font-semibold">
            <BookOpen className="w-3.5 h-3.5 text-blue-300" />
            <span>KantinCep Eğitime Destek Fonu</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black font-serif">
            Eğitime Destek: Defteri, Kalemi Eksik Kalmasın
          </h1>

          <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
            Yemek desteğinden tamamen bağımsız çalışan bu modülde; defter, boya kalemi, silgi ve okul setlerini
            okul kantini üzerinden ihtiyaç sahibi öğrencilerimiz için satın alabilirsiniz.
            Ürünler okul rehberlik servisi tarafından yeni eğitim döneminde öğrencilere teslim edilir.
          </p>

          <div className="pt-2 flex items-center gap-3 text-xs text-blue-200">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              Yemek Stoğundan Ayrı Takip
            </span>
            <span>·</span>
            <span>Öğrenci Gizliliği Korunur</span>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
            <Pencil className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-stone-500 font-medium">Bağışlanan Kırtasiye Ürünü</p>
            <p className="text-2xl font-black text-stone-900">{totalStationeryDonated} Adet</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-stone-500 font-medium">Öğrencilere Teslim Edilen</p>
            <p className="text-2xl font-black text-emerald-950">{totalStationeryDelivered} Adet</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-900 flex items-center justify-center shrink-0">
            <Gift className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs text-stone-500 font-medium">Havuzda Dağıtıma Hazır</p>
            <p className="text-2xl font-black text-indigo-900">{totalStationeryRemaining} Adet</p>
          </div>
        </div>
      </div>

      {successNotice && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span className="font-semibold">{successNotice}</span>
          </div>
          <button onClick={() => setSuccessNotice(null)} className="font-bold">✕</button>
        </div>
      )}

      {errorNotice && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="font-semibold">{errorNotice}</span>
          </div>
          <button onClick={() => setErrorNotice(null)} className="font-bold">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
        <button
          onClick={() => setActiveTab('donate')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'donate'
              ? 'bg-blue-800 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          Kırtasiye Desteği Satın Al
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'history'
              ? 'bg-blue-800 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          Destek Geçmişim ({donations.length})
        </button>
      </div>

      {activeTab === 'donate' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products List */}
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-sm font-bold text-stone-900">
              Bağışlanabilir Okul & Kırtasiye Gereçleri
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {products.map(prod => {
                const qty = donationQuantities[prod.id] || 0;

                return (
                  <div
                    key={prod.id}
                    className="p-3.5 rounded-2xl border border-stone-200 bg-white shadow-xs flex items-center gap-3 justify-between"
                  >
                    <img
                      src={prod.imageUrl}
                      alt={prod.name}
                      className="w-16 h-16 rounded-xl object-cover bg-stone-100 shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-stone-900 truncate">{prod.name}</h4>
                      <p className="text-[11px] text-stone-500 truncate">{prod.description}</p>
                      <p className="text-xs font-black text-blue-900 mt-1">₺{prod.price.toFixed(2)}</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 bg-stone-100 rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => handleQtyChange(prod.id, -1)}
                        className="w-6 h-6 rounded-lg bg-white hover:bg-stone-200 flex items-center justify-center text-stone-700 shadow-2xs"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold w-4 text-center">{qty}</span>
                      <button
                        type="button"
                        onClick={() => handleQtyChange(prod.id, 1)}
                        className="w-6 h-6 rounded-lg bg-white hover:bg-stone-200 flex items-center justify-center text-stone-700 shadow-2xs"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Checkout Box */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4 sticky top-24">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <h3 className="font-bold text-sm text-stone-900">Destek Özeti</h3>
                <span className="text-xs font-semibold text-blue-800">Kırtasiye Sepeti</span>
              </div>

              {selectedItems.length === 0 ? (
                <div className="py-6 text-center text-stone-400 space-y-1">
                  <BookOpen className="w-8 h-8 mx-auto text-stone-300" />
                  <p className="text-xs">Lütfen destek olmak istediğiniz kırtasiye ürünlerini seçiniz.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedItems.map(item => (
                    <div key={item.product.id} className="text-xs flex items-center justify-between">
                      <span className="truncate pr-2">
                        {item.quantity}× {item.product.name}
                      </span>
                      <span className="font-bold text-stone-900 shrink-0">₺{item.total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Dayanışma Notunuz
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl focus:outline-blue-600"
                />
              </div>

              <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-[11px] text-blue-900 space-y-1">
                <div className="flex items-center gap-1 font-semibold text-blue-950">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
                  Eğitim Materyali Garantisi
                </div>
                <p>
                  Kırtasiye bağışları nakit paraya dönüştürülemez; doğrudan okul idaresi nezaretinde öğrencilere teslim edilir.
                </p>
              </div>

              <div className="border-t border-stone-100 pt-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-stone-500">Toplam Destek</p>
                  <p className="text-xl font-black text-blue-900">₺{totalDonationAmount.toFixed(2)}</p>
                </div>

                <button
                  type="button"
                  disabled={selectedItems.length === 0 || checkoutLoading}
                  onClick={handleCreateDonation}
                  className="px-5 py-2.5 rounded-xl bg-blue-800 hover:bg-blue-900 text-white text-xs font-bold transition-colors shadow-xs disabled:opacity-40 cursor-pointer"
                >
                  {checkoutLoading ? 'Hazırlanıyor...' : 'Desteği Tamamla →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-stone-900">Kırtasiye Desteği Kayıtlarınız</h2>
          {donations.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-stone-200 text-stone-400 text-xs">
              Henüz kırtasiye destek kaydınız bulunmuyor.
            </div>
          ) : (
            <div className="space-y-3">
              {donations.map(don => (
                <div
                  key={don.id}
                  className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-stone-900">{don.donationNumber}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                        {don.paymentStatus === 'paid' ? 'Ödendi / Havuzda' : 'Beklemede'}
                      </span>
                    </div>
                    <p className="text-xs text-stone-600">
                      {don.items.map(i => `${i.quantity} adet ${i.productNameSnapshot}`).join(' · ')}
                    </p>
                    <span className="text-[11px] text-stone-400">
                      {new Date(don.createdAt).toLocaleDateString('tr-TR')} · Not: "{don.note || '-'}"
                    </span>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-stone-500">Destek Tutarı</p>
                    <p className="text-base font-black text-blue-900">₺{don.totalAmount.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {pendingDonation && (
        <PaymentModal
          isOpen={Boolean(pendingDonation)}
          onClose={() => setPendingDonation(null)}
          targetId={pendingDonation.id}
          targetType="donation"
          amount={pendingDonation.totalAmount}
          title="Eğitime Destek Ödemesi"
          subtitle={`${pendingDonation.items.length} Kalem Kırtasiye Gereci`}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};
