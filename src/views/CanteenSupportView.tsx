import React, { useState, useEffect } from 'react';
import {
  PackageCheck,
  Search,
  CheckCircle,
  AlertCircle,
  Clock,
  Heart,
  BookOpen,
  Key,
  ShieldCheck,
  RefreshCw,
  QrCode,
  Tag,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface CanteenAllocationItem {
  id: string;
  allocationNumber: string;
  needCodeReference: string;
  studentNameSnapshot: string;
  studentClassSnapshot: string;
  supportType: 'food_pool' | 'education_support';
  status: string;
  createdAt: string;
  validUntil?: string;
  deliveredAt?: string;
  items: {
    id: string;
    productId: string;
    productNameSnapshot: string;
    quantityAllocated: number;
    quantityDelivered: number;
    quantityRemaining: number;
  }[];
}

export const CanteenSupportView: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'food' | 'education' | 'all'>('all');
  const [allocations, setAllocations] = useState<CanteenAllocationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Need code verification state
  const [verificationCode, setVerificationCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifiedAllocations, setVerifiedAllocations] = useState<CanteenAllocationItem[] | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Delivery action state
  const [deliveringId, setDeliveringId] = useState<string | null>(null);
  const [deliveryNotes, setDeliveryNotes] = useState('');

  const fetchAllocations = async () => {
    setLoading(true);
    try {
      const res = await api.getCanteenAllocations();
      setAllocations(res.allocations || []);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Tahsisler yüklenemedi.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllocations();
  }, [user]);

  // Handle verify need code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError(null);
    setVerifiedAllocations(null);

    const clean = verificationCode.trim().toUpperCase();
    if (!clean) {
      setVerifyError('Lütfen geçerli bir ihtiyaç kodu giriniz.');
      return;
    }

    setVerifying(true);
    try {
      const res = await api.verifyNeedCode(clean);
      setVerifiedAllocations(res.allocations || []);
      if (res.allocations.length === 0) {
        setVerifyError('Bu kodla ilişkilendirilmiş bekleyen teslimat bulunamadı.');
      }
    } catch (err: any) {
      setVerifyError(err.message || 'Geçersiz veya bu okula ait olmayan ihtiyaç kodu.');
    } finally {
      setVerifying(false);
    }
  };

  // Handle deliver allocation
  const handleDeliver = async (alloc: CanteenAllocationItem) => {
    setDeliveringId(alloc.id);
    setMsg(null);
    try {
      const res = await api.deliverSupportAllocation(
        alloc.id,
        alloc.needCodeReference,
        deliveryNotes || 'Kantin teslimatı başarıyla yapıldı.'
      );

      setMsg({ type: 'success', text: res.message || 'Ürünler teslim edildi ve kayıtlara işlendi.' });
      setDeliveryNotes('');
      // Update verification list
      if (verifiedAllocations) {
        setVerifiedAllocations(
          verifiedAllocations.map(a => (a.id === alloc.id ? { ...a, status: 'fully_delivered' } : a))
        );
      }
      await fetchAllocations();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Teslim işlemi tamamlanamadı.' });
    } finally {
      setDeliveringId(null);
    }
  };

  const filteredAllocations = allocations.filter(a => {
    if (activeTab === 'food') return a.supportType === 'food_pool';
    if (activeTab === 'education') return a.supportType === 'education_support';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-teal-900 to-stone-900 text-white rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold border border-teal-500/30">
              Kantin Görevlisi
            </span>
            <span className="text-xs text-stone-300">Merkez Okul Kantini</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-serif">
            Öğrenci Destek Tahsisleri ve İhtiyaç Koduyla Teslimat
          </h1>
          <p className="text-xs text-stone-300 max-w-xl">
            Öğrencinin sunduğu ihtiyaç kodunu doğrulayarak Dayanışma Havuzu (gıda) ve Eğitim Desteği (kırtasiye) ürünlerini güvenle teslim edebilirsiniz.
          </p>
        </div>

        <button
          onClick={fetchAllocations}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Yenile
        </button>
      </div>

      {/* Global Alerts */}
      {msg && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between ${
            msg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {msg.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span className="font-medium">{msg.text}</span>
          </div>
          <button onClick={() => setMsg(null)} className="text-stone-400 hover:text-stone-600 font-bold ml-4">
            ✕
          </button>
        </div>
      )}

      {/* 1. İHTİYAÇ KODU İLE HIZLI TESLİMAT DOĞRULAMA ALANI */}
      <div className="bg-white rounded-2xl border-2 border-teal-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center">
            <Key className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-stone-900">İhtiyaç Kodu ile Doğrulama ve Teslimat</h2>
            <p className="text-[11px] text-stone-500">
              Öğrencinin ibraz ettiği gizli ihtiyaç kodunu (örn. KC-IHT-XXXXXX) girerek teslimatı onaylayın.
            </p>
          </div>
        </div>

        <form onSubmit={handleVerifyCode} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Key className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
            <input
              type="text"
              required
              value={verificationCode}
              onChange={e => setVerificationCode(e.target.value)}
              placeholder="İhtiyaç Kodunu Giriniz (Örn: KC-IHT-7A2B41)"
              className="w-full pl-10 pr-4 py-2.5 text-xs font-mono font-bold uppercase border border-stone-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={verifying}
            className="px-6 py-2.5 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {verifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Kodu Doğrula
          </button>
        </form>

        {verifyError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{verifyError}</span>
          </div>
        )}

        {/* Verified Allocations Display */}
        {verifiedAllocations && verifiedAllocations.length > 0 && (
          <div className="space-y-3 pt-3 border-t border-stone-100">
            <h3 className="text-xs font-bold text-teal-900 uppercase tracking-wider">
              Doğrulanan Teslimat Bilgileri ({verifiedAllocations.length} Tahsis)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {verifiedAllocations.map(alloc => (
                <div
                  key={alloc.id}
                  className="p-4 rounded-2xl border border-teal-200 bg-teal-50/30 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-teal-700 uppercase">
                        {alloc.supportType === 'food_pool' ? '🥪 Dayanışma Havuzu (Gıda)' : '📚 Eğitim Desteği (Kırtasiye)'}
                      </span>
                      <h4 className="text-sm font-bold text-stone-900 mt-0.5">
                        {alloc.studentNameSnapshot} ({alloc.studentClassSnapshot})
                      </h4>
                      <p className="text-[11px] font-mono text-stone-500">Tahsis No: {alloc.allocationNumber}</p>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        alloc.status === 'fully_delivered'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {alloc.status === 'fully_delivered' ? 'Teslim Edildi ✅' : 'Teslim Bekliyor ⏳'}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-stone-200 space-y-1.5">
                    <p className="text-[11px] font-bold text-stone-700">Teslim Edilecek Ürünler:</p>
                    <ul className="text-xs space-y-1">
                      {alloc.items.map(it => (
                        <li key={it.id} className="flex items-center justify-between text-stone-800">
                          <span>{it.productNameSnapshot}</span>
                          <span className="font-bold font-mono text-teal-900">{it.quantityAllocated} Adet</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {alloc.status !== 'fully_delivered' ? (
                    <button
                      onClick={() => handleDeliver(alloc)}
                      disabled={deliveringId === alloc.id}
                      className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {deliveringId === alloc.id ? 'İşleniyor...' : 'Öğrenciye Teslim Edildi Olarak Onayla'}
                    </button>
                  ) : (
                    <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl text-center text-xs font-bold">
                      Bu tahsis başarıyla teslim edilmiştir.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. TÜM TAHSİSLER LİSTESİ VE SEKMELER */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-stone-900">Kantine Atanan Öğrenci Destek Tahsisleri</h2>
            <p className="text-xs text-stone-500">
              * Gizlilik gereği öğrencinin özel aile durumu veya rehberlik açıklaması kantin ekranında gösterilmez.
            </p>
          </div>

          {/* 3 Tabs: Dayanışma Havuzu, Eğitim Desteği, Tüm Tahsisler */}
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveTab('food')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'food' ? 'bg-white text-emerald-800 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Dayanışma Havuzu
            </button>
            <button
              onClick={() => setActiveTab('education')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'education' ? 'bg-white text-blue-800 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Eğitim Desteği
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'all' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Tüm Tahsisler ({allocations.length})
            </button>
          </div>
        </div>

        {/* Allocations Table */}
        <div className="overflow-x-auto border border-stone-100 rounded-2xl">
          <table className="w-full text-left text-xs text-stone-600">
            <thead className="bg-stone-50 text-stone-700 uppercase font-bold text-[10px] tracking-wider border-b border-stone-100">
              <tr>
                <th className="px-4 py-3">Tahsis No</th>
                <th className="px-4 py-3">İhtiyaç Kodu</th>
                <th className="px-4 py-3">Öğrenci Ad Soyad</th>
                <th className="px-4 py-3">Sınıf ve Şube</th>
                <th className="px-4 py-3">Ürün Adı & Adet</th>
                <th className="px-4 py-3">Tahsis Tarihi</th>
                <th className="px-4 py-3">Teslim Durumu</th>
                <th className="px-4 py-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredAllocations.map(a => (
                <tr key={a.id} className="hover:bg-stone-50/50">
                  <td className="px-4 py-3 font-mono font-bold text-stone-900">{a.allocationNumber}</td>
                  <td className="px-4 py-3 font-mono font-bold text-teal-800 bg-teal-50/30 px-2 rounded">
                    {a.needCodeReference}
                  </td>
                  <td className="px-4 py-3 font-bold text-stone-900">{a.studentNameSnapshot}</td>
                  <td className="px-4 py-3 text-stone-700 font-medium">{a.studentClassSnapshot}</td>
                  <td className="px-4 py-3 font-medium text-stone-800">
                    {a.items.map(i => `${i.productNameSnapshot} (${i.quantityAllocated} adet)`).join(', ')}
                  </td>
                  <td className="px-4 py-3 font-mono text-stone-500 text-[11px]">
                    {new Date(a.createdAt).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        a.status === 'fully_delivered'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : a.status === 'cancelled'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {a.status === 'fully_delivered'
                        ? 'Teslim Edildi'
                        : a.status === 'cancelled'
                        ? 'İptal Edildi'
                        : 'Öğrenciye tahsis edildi — Teslim bekliyor'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {a.status !== 'fully_delivered' && a.status !== 'cancelled' ? (
                      <button
                        onClick={() => {
                          setVerificationCode(a.needCodeReference);
                          setVerifiedAllocations([a]);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="px-2.5 py-1 bg-teal-800 hover:bg-teal-900 text-white rounded-lg font-bold text-[11px] cursor-pointer"
                      >
                        Teslim Et
                      </button>
                    ) : (
                      <span className="text-[11px] text-stone-400 font-medium">Tamamlandı</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
