import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  Clock,
  Heart,
  BookOpen,
  AlertTriangle,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';
import { CanteenReportSummary } from '../types.ts';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const CanteenReportsView: React.FC = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<CanteenReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await api.getCanteenSummary(selectedDate || undefined);
      setSummary(res.summary);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [user, selectedDate]);

  const [downloading, setDownloading] = useState(false);
  const [downloadNotice, setDownloadNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleDownloadCsv = async () => {
    setDownloading(true);
    setDownloadNotice(null);
    try {
      const token = localStorage.getItem('kantincep_auth_token') || '';
      const res = await fetch(`/api/reports/export-csv?token=${encodeURIComponent(token)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('CSV dışa aktarma yetkilendirmesi başarısız.');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kantincep_siparis_raporu_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setDownloadNotice({ type: 'success', text: 'CSV raporu başarıyla indirildi.' });
    } catch (err: any) {
      setDownloadNotice({ type: 'error', text: err.message || 'CSV indirilemedi.' });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 font-serif">
            Kantin Raporlama ve Analiz Paneli
          </h1>
          <p className="text-xs text-stone-500">
            Günlük sipariş yoğunluğu, teneffüs dağılımı ve sosyal dayanışma istatistikleri.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date Filter selector */}
          <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl">
            <button
              onClick={() => setSelectedDate('')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                selectedDate === '' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Bugün
            </button>
            <input
              type="text"
              placeholder="GG.AA.YYYY"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="px-2.5 py-1 text-xs border border-stone-200 rounded-lg bg-white w-28 font-mono focus:outline-emerald-600"
            />
          </div>

          <button
            onClick={fetchReports}
            className="p-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold transition-colors shadow-xs cursor-pointer"
            title="Yenile"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleDownloadCsv}
            disabled={downloading}
            className="px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition-colors flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {downloading ? 'İndiriliyor...' : 'CSV İndir (KVKK Güvenli)'}
          </button>
        </div>
      </div>

      {downloadNotice && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
            downloadNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          <span>{downloadNotice.text}</span>
          <button onClick={() => setDownloadNotice(null)} className="font-bold ml-2">✕</button>
        </div>
      )}

      {loading || !summary ? (
        <div className="py-16 text-center text-xs text-stone-400">Raporlar hesaplanıyor...</div>
      ) : (
        <>
          {/* Key Metric Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs text-stone-500 font-medium">Günlük Toplam Ciro</span>
              <p className="text-2xl font-black text-emerald-900 mt-1">₺{summary.todaySalesAmount.toFixed(2)}</p>
              <p className="text-[11px] text-stone-400 mt-1">Sadece kantin satış gelirleri</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs text-stone-500 font-medium">Toplam Sipariş Adedi</span>
              <p className="text-2xl font-black text-stone-900 mt-1">{summary.todayOrderCount} Sipariş</p>
              <p className="text-[11px] text-emerald-700 mt-1">
                {summary.deliveredOrdersCount} teslim edildi · {summary.cancelledOrdersCount} iptal
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs text-stone-500 font-medium">Dayanışma Havuzu (Yemek)</span>
              <p className="text-2xl font-black text-amber-900 mt-1">{summary.foodPoolRemainingItems} Porsiyon</p>
              <p className="text-[11px] text-stone-400 mt-1">
                {summary.foodPoolDistributedItems} porsiyon ulaştırıldı
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs text-stone-500 font-medium">Eğitime Destek (Kırtasiye)</span>
              <p className="text-2xl font-black text-blue-900 mt-1">{summary.educationRemainingItems} Adet</p>
              <p className="text-[11px] text-stone-400 mt-1">
                {summary.educationDistributedItems} adet dağıtıldı
              </p>
            </div>
          </div>

          {/* Break Intensity and Top Products Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Teneffüs Yoğunluğu */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-700" />
                  Teneffüse Göre Sipariş Yoğunluğu
                </h3>
                <span className="text-xs text-stone-400">Bugünkü Dağılım</span>
              </div>

              <div className="space-y-3">
                {summary.breakDistribution.map(b => {
                  const maxCount = Math.max(1, ...summary.breakDistribution.map(x => x.count));
                  const percent = Math.round((b.count / maxCount) * 100);

                  return (
                    <div key={b.breakName} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-stone-800">{b.breakName}</span>
                        <span className="font-bold text-stone-900">{b.count} Sipariş</span>
                      </div>
                      <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                        <div
                          className="h-full bg-emerald-700 rounded-full transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* En Çok Tercih Edilen Ürünler */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-700" />
                  En Çok Sipariş Edilen Lezzetler
                </h3>
                <span className="text-xs text-stone-400">İlk 5 Ürün</span>
              </div>

              {summary.popularProducts.length === 0 ? (
                <p className="text-xs text-stone-400 py-6 text-center">Henüz sipariş kaydı yok.</p>
              ) : (
                <div className="divide-y divide-stone-100">
                  {summary.popularProducts.map((p, idx) => (
                    <div key={p.name} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-md bg-stone-100 text-stone-600 font-bold flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-stone-900">{p.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-stone-900 block">{p.quantity} Adet</span>
                        <span className="text-[10px] text-emerald-800">₺{p.revenue.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Notice on Accounting Distinction */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong>Mali Şeffaflık İlkesi:</strong> Dayanışma Havuzu ve Eğitime Destek bağış tutarları,
              öğrencilere ulaştırılan sosyal emanetler olup kantin ticari satış gelirine dahil edilmemiştir.
              Raporlarda satış cirosu ile bağış havuzu bakiyeleri kesin çizgilerle ayrı tutulmaktadır.
            </div>
          </div>
        </>
      )}
    </div>
  );
};
