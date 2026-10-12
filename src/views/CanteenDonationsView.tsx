import React, { useState, useEffect } from 'react';
import {
  Heart,
  BookOpen,
  Gift,
  ShieldCheck,
  CheckCircle,
  Plus,
  History,
  FileSpreadsheet,
} from 'lucide-react';
import { Donation, DonationDistribution, DonationItem } from '../types.ts';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { DonationDistributeModal } from '../components/modals/DonationDistributeModal.tsx';

export const CanteenDonationsView: React.FC = () => {
  const { user } = useAuth();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [distributions, setDistributions] = useState<DonationDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [poolTab, setPoolTab] = useState<'food_pool' | 'education_support'>('food_pool');

  // Distribution modal
  const [selectedItemForDistribute, setSelectedItemForDistribute] = useState<DonationItem | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [donRes, distRes] = await Promise.all([
        api.getDonations(),
        api.getDistributions(),
      ]);
      setDonations(donRes.donations);
      setDistributions(distRes.distributions);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Aggregate pool balance by product
  const currentPoolDonations = donations.filter(
    d => d.paymentStatus === 'paid' && d.donationType === poolTab
  );

  const aggregatedPool = new Map<
    string,
    {
      productId: string;
      name: string;
      totalDonated: number;
      totalDelivered: number;
      remaining: number;
      sampleItem: DonationItem;
    }
  >();

  for (const don of currentPoolDonations) {
    for (const item of don.items) {
      const existing = aggregatedPool.get(item.productId) || {
        productId: item.productId,
        name: item.productNameSnapshot,
        totalDonated: 0,
        totalDelivered: 0,
        remaining: 0,
        sampleItem: item,
      };
      existing.totalDonated += item.quantity;
      existing.totalDelivered += item.deliveredQuantity;
      existing.remaining += item.remainingQuantity;
      // prioritize item that has remaining quantity
      if (item.remainingQuantity > 0) {
        existing.sampleItem = item;
      }
      aggregatedPool.set(item.productId, existing);
    }
  }

  const poolItems = Array.from(aggregatedPool.values());

  const currentDistributions = distributions.filter(d => d.donationType === poolTab);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 font-serif">
            Sosyal Dayanışma & Destek Havuzları
          </h1>
          <p className="text-xs text-stone-500">
            Veliler tarafından bağışlanan yemek ve kırtasiye bakiye yönetimi ve yetkili dağıtım kayıtları.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="p-2 px-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Gizlilik Esaslı Dağıtım</span>
          </div>
        </div>
      </div>

      {/* Module Selector (Food Pool vs Education Support) */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
        <button
          onClick={() => setPoolTab('food_pool')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            poolTab === 'food_pool'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-stone-700 hover:bg-stone-100'
          }`}
        >
          <Heart className="w-4 h-4 text-emerald-300 fill-emerald-300" />
          Dayanışma Havuzu (Yemek & Kantin)
        </button>

        <button
          onClick={() => setPoolTab('education_support')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            poolTab === 'education_support'
              ? 'bg-blue-800 text-white shadow-xs'
              : 'text-stone-700 hover:bg-stone-100'
          }`}
        >
          <BookOpen className="w-4 h-4 text-blue-300" />
          Eğitime Destek (Kırtasiye Stoğu)
        </button>
      </div>

      {/* Pool Item Balance Cards */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-stone-900">
          {poolTab === 'food_pool' ? 'Sıcak Yemek ve Kantin Havuzu Bakiyesi' : 'Kırtasiye ve Okul Malzemeleri Havuzu Bakiyesi'}
        </h2>

        {loading ? (
          <div className="py-12 text-center text-xs text-stone-400">Yükleniyor...</div>
        ) : poolItems.length === 0 ? (
          <div className="p-10 text-center bg-white rounded-2xl border border-stone-200 text-stone-400 text-xs">
            Bu havuzda henüz aktif bağış bulunmuyor.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {poolItems.map(item => (
              <div
                key={item.productId}
                className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-400">Havuz Ürünü</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        item.remaining > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {item.remaining > 0 ? 'Dağıtıma Hazır' : 'Tükendi'}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-stone-900 mt-1">{item.name}</h3>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-center pt-2 border-t border-stone-100">
                    <div>
                      <p className="text-[10px] text-stone-400">Toplam Bağış</p>
                      <p className="text-sm font-bold text-stone-800">{item.totalDonated}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-stone-400">Dağıtılan</p>
                      <p className="text-sm font-bold text-blue-900">{item.totalDelivered}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-emerald-800 font-semibold">Kalan Bakiye</p>
                      <p className="text-base font-black text-emerald-900">{item.remaining}</p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={item.remaining <= 0}
                  onClick={() => setSelectedItemForDistribute(item.sampleItem)}
                  className="w-full py-2 px-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition-colors shadow-xs disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  İhtiyaç Sahibine Dağıtım Kaydı Ekle
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Distribution History Audit Log */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-700" />
            Okul İdaresi Yetkili Dağıtım Günlüğü
          </h2>
          <span className="text-xs text-stone-400">Gizlilik esasıyla kayıt altındadır</span>
        </div>

        {currentDistributions.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-stone-200 text-stone-400 text-xs">
            Henüz dağıtım kaydı yapılmadı.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-600">
                <thead className="bg-stone-50 border-b border-stone-200 text-[11px] font-bold text-stone-700 uppercase">
                  <tr>
                    <th className="py-3 px-4">Tarih & Saat</th>
                    <th className="py-3 px-4">Ürün</th>
                    <th className="py-3 px-4">Dağıtılan Miktar</th>
                    <th className="py-3 px-4">Yetkili Görevli</th>
                    <th className="py-3 px-4">Dağıtım Notu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {currentDistributions.map(dist => (
                    <tr key={dist.id} className="hover:bg-stone-50/50">
                      <td className="py-3 px-4 text-stone-400 font-mono">
                        {new Date(dist.distributedAt).toLocaleString('tr-TR')}
                      </td>
                      <td className="py-3 px-4 font-bold text-stone-900">
                        {dist.productNameSnapshot}
                      </td>
                      <td className="py-3 px-4 font-black text-emerald-900">
                        {dist.quantity} Adet
                      </td>
                      <td className="py-3 px-4 font-medium text-stone-800">
                        {dist.authorizedStaffName}
                      </td>
                      <td className="py-3 px-4 text-stone-500 italic">
                        "{dist.notes}"
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Distribution Modal */}
      {selectedItemForDistribute && (
        <DonationDistributeModal
          isOpen={Boolean(selectedItemForDistribute)}
          donationItem={selectedItemForDistribute}
          onClose={() => setSelectedItemForDistribute(null)}
          onDistributed={fetchData}
        />
      )}
    </div>
  );
};
