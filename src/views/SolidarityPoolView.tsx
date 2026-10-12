import React, { useState, useEffect } from 'react';
import {
  Heart,
  ShieldCheck,
  CheckCircle,
  Plus,
  Minus,
  Gift,
  History,
  Sparkles,
  Info,
  AlertCircle,
} from 'lucide-react';
import { Product, Donation } from '../types.ts';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { PaymentModal } from '../components/modals/PaymentModal.tsx';

export const SolidarityPoolView: React.FC = () => {
  const { user, refreshUserData } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [donationQuantities, setDonationQuantities] = useState<Record<string, number>>({});
  const [note, setNote] = useState<string>('Geleceğimiz olan yavrularımıza afiyet olsun.');
  const [activeTab, setActiveTab] = useState<'donate' | 'history'>('donate');

  // Payment checkout modal
  const [pendingDonation, setPendingDonation] = useState<Donation | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodRes, donRes] = await Promise.all([
        api.getProducts({ type: 'food', active: true }),
        api.getDonations('food_pool'),
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

  // Calculate total donation
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
        donationType: 'food_pool',
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
    setSuccessNotice('Bağışınız başarıyla havuza eklendi! İyiliğiniz için teşekkür ederiz.');
    loadData();
    refreshUserData();
  };

  // Overall transparent counters (from donations list)
  let totalDonatedCount = 0;
  let totalDeliveredCount = 0;
  let totalRemainingCount = 0;

  for (const don of donations.filter(d => d.paymentStatus === 'paid')) {
    for (const item of don.items) {
      totalDonatedCount += item.quantity;
      totalDeliveredCount += item.deliveredQuantity;
      totalRemainingCount += item.remainingQuantity;
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-stone-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-800 text-emerald-200 text-xs font-semibold">
            <Heart className="w-3.5 h-3.5 fill-emerald-300 text-emerald-300" />
            <span>KantinCep Sosyal Dayanışma Platformu</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black font-serif">
            Dayanışma Havuzu: Sıcak Bir Tost, Mutlu Bir Kalp
          </h1>

          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
            Hiçbir öğrencimiz teneffüste kantin sırasına mahcup bakmasın.
            Bağışladığınız sıcak tostlar, çorbalar ve taze meyveler; okul idaresi ve rehberlik servisi
            tarafından ihtiyaç sahibi öğrencilerimize <strong>tamamen gizlilik esasıyla</strong> ulaştırılır.
          </p>

          <div className="pt-2 flex items-center gap-3 text-xs text-emerald-200">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              %100 Anonim ve Şeffaf
            </span>
            <span>·</span>
            <span>Öğrenci Onurunu Koruyan Sistem</span>
          </div>
        </div>
      </div>

      {/* Transparent Counters Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-stone-500 font-medium">Toplam Bağışlanan Öğün</p>
            <p className="text-2xl font-black text-stone-900">{totalDonatedCount} Porsiyon</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-stone-500 font-medium">Öğrencilere Ulaştırılan</p>
            <p className="text-2xl font-black text-blue-950">{totalDeliveredCount} Porsiyon</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
            <Heart className="w-6 h-6 text-amber-600 fill-amber-600" />
          </div>
          <div>
            <p className="text-xs text-stone-500 font-medium">Havuzda Bekleyen Sıcak Desteği</p>
            <p className="text-2xl font-black text-amber-900">{totalRemainingCount} Porsiyon</p>
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
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          Havuza Bağış Yap
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'history'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          Bağış Geçmişim ({donations.length})
        </button>
      </div>

      {activeTab === 'donate' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products List for Donation */}
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-sm font-bold text-stone-900">
              Havuza Eklenebilecek Kantin Ürünleri
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
                      <p className="text-xs font-black text-emerald-800 mt-1">₺{prod.price.toFixed(2)}</p>
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

          {/* Donation Summary & Checkout Box */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4 sticky top-24">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <h3 className="font-bold text-sm text-stone-900">Bağış Özeti</h3>
                <span className="text-xs font-semibold text-emerald-800">Dayanışma Sepeti</span>
              </div>

              {selectedItems.length === 0 ? (
                <div className="py-6 text-center text-stone-400 space-y-1">
                  <Heart className="w-8 h-8 mx-auto text-stone-300" />
                  <p className="text-xs">Lütfen bağışlamak istediğiniz ürün adedini seçiniz.</p>
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
                  Dayanışma Notunuz (Opsiyonel)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="İyi dilekleriniz..."
                  className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl focus:outline-emerald-600"
                />
              </div>

              <div className="p-3 rounded-xl bg-stone-50 border border-stone-100 text-[11px] text-stone-500 space-y-1">
                <div className="flex items-center gap-1 font-semibold text-stone-700">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  Tam Gizlilik Güvencesi
                </div>
                <p>
                  Bağışçı kimliğiniz kantin görevlilerine veya diğer velilere gösterilmez. Ödemeniz doğrudan havuza aktarılır.
                </p>
              </div>

              <div className="border-t border-stone-100 pt-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-stone-500">Toplam Bağış Tutarı</p>
                  <p className="text-xl font-black text-emerald-900">₺{totalDonationAmount.toFixed(2)}</p>
                </div>

                <button
                  type="button"
                  disabled={selectedItems.length === 0 || checkoutLoading}
                  onClick={handleCreateDonation}
                  className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition-colors shadow-xs disabled:opacity-40 cursor-pointer"
                >
                  {checkoutLoading ? 'Hazırlanıyor...' : 'Bağışı Tamamla →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-stone-900">Geçmiş Bağış Kayıtlarınız</h2>
          {donations.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-stone-200 text-stone-400 text-xs">
              Henüz bağış kaydınız bulunmuyor.
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
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
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
                    <p className="text-xs text-stone-500">Bağış Tutarı</p>
                    <p className="text-base font-black text-emerald-900">₺{don.totalAmount.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Payment Modal for Donation */}
      {pendingDonation && (
        <PaymentModal
          isOpen={Boolean(pendingDonation)}
          onClose={() => setPendingDonation(null)}
          targetId={pendingDonation.id}
          targetType="donation"
          amount={pendingDonation.totalAmount}
          title="Dayanışma Havuzu Bağış Ödemesi"
          subtitle={`${pendingDonation.items.length} Kalem Sıcak Yemek Desteği`}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};
