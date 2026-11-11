import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  RefreshCw,
  ChefHat,
  KeyRound,
  Filter,
  Check,
  Eye,
  Store,
  Archive,
  CalendarCheck,
} from 'lucide-react';
import { Order, OrderStatus, BreakTime, CanteenReportSummary } from '../types.ts';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { DeliveryVerifyModal } from '../components/modals/DeliveryVerifyModal.tsx';

export const CanteenOrdersView: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [breaks, setBreaks] = useState<BreakTime[]>([]);
  const [summary, setSummary] = useState<CanteenReportSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Operational view scope: 'active' (today's active queue) vs 'archived' (past / completed orders)
  const [viewScope, setViewScope] = useState<'active' | 'archived'>('active');
  const [confirmArchiveModal, setConfirmArchiveModal] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [breakFilter, setBreakFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  // Delivery & Detail modals
  const [selectedOrderForDelivery, setSelectedOrderForDelivery] = useState<Order | null>(null);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = async () => {
    try {
      const [ordRes, brkRes, sumRes] = await Promise.all([
        api.getOrders({
          includeArchived: viewScope === 'archived',
          onlyArchived: viewScope === 'archived',
        }),
        api.getBreaks(user?.schoolId || 'school-1'),
        api.getCanteenSummary(),
      ]);

      setOrders(ordRes.orders);
      setBreaks(brkRes.breaks);
      setSummary(sumRes.summary);
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err.message || 'Veriler yüklenemedi.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, viewScope]);

  const handleManualArchive = async () => {
    setIsArchiving(true);
    try {
      const res = await api.endOfDayArchive(user?.schoolId);
      setActionNotice({
        type: 'success',
        text: res.message || `${res.archivedCount} adet sipariş gün sonu arşivi ile tamamlandı.`,
      });
      setConfirmArchiveModal(false);
      await fetchData();
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err.message || 'Gün sonu işlemi gerçekleştirilemedi.' });
    } finally {
      setIsArchiving(false);
    }
  };

  // Auto-refresh interval (polling every 10 seconds for real-time order board)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchData();
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, user]);

  const handleStatusChange = async (orderId: string, nextStatus: OrderStatus, note?: string) => {
    setUpdatingId(orderId);
    try {
      await api.updateOrderStatus(orderId, nextStatus, note);
      setActionNotice({
        type: 'success',
        text: `Sipariş durumu güncellendi: ${nextStatus === 'preparing' ? 'Hazırlanıyor' : nextStatus === 'ready' ? 'Hazır' : nextStatus}`,
      });
      await fetchData();
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err.message || 'Durum güncellenemedi.' });
    } finally {
      setUpdatingId(null);
    }
  };

  // Extract unique dates from orders
  const uniqueDates = Array.from(new Set(orders.map(o => o.orderDate))).filter(Boolean);

  const filteredOrders = orders.filter(o => {
    const matchStatus = statusFilter === 'all' || o.orderStatus === statusFilter;
    const matchBreak = breakFilter === 'all' || o.breakId === breakFilter;
    const matchDate = dateFilter === 'all' || o.orderDate === dateFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      o.orderNumber.toLowerCase().includes(q) ||
      o.studentNameSnapshot.toLowerCase().includes(q) ||
      o.studentClassSnapshot.toLowerCase().includes(q) ||
      o.deliveryCode.includes(q);
    return matchStatus && matchBreak && matchDate && matchSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header & Real-time Live Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 font-serif">
              Canlı Kantin Sipariş Ekranı
            </h1>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-600 animate-pulse' : 'bg-stone-400'}`} />
              {autoRefresh ? 'Canlı Senkron (10s)' : 'Manuel Mod'}
            </span>
          </div>
          <p className="text-xs text-stone-500">
            Teneffüslere göre ön siparişleri hazırlayın, 4 haneli kod ile öğrencilere teslim edin.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-stone-600 flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
              className="rounded text-emerald-700"
            />
            Oto-Yenile
          </label>
          <button
            onClick={fetchData}
            className="px-3.5 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </button>
        </div>
      </div>

      {/* Operasyonel Ekran ve Arşiv Seçicisi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setViewScope('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewScope === 'active'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            Canlı Operasyon Ekranı (Bugün)
          </button>
          <button
            onClick={() => setViewScope('archived')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewScope === 'archived'
                ? 'bg-amber-800 text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            Geçmiş / Arşivlenmiş Siparişler
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-stone-500 hidden md:inline">
            Otomatik temizlik her gün <strong className="text-stone-800">23:59 TSİ</strong>'de gerçekleşir.
          </span>
          <button
            onClick={() => setConfirmArchiveModal(true)}
            className="px-3 py-1.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Tamamlanan siparişleri şimdi arşive aktar"
          >
            <CalendarCheck className="w-3.5 h-3.5 text-emerald-700" />
            Gün Sonunu Kapat
          </button>
        </div>
      </div>

      {actionNotice && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          <span>{actionNotice.text}</span>
          <button onClick={() => setActionNotice(null)} className="font-bold ml-2">✕</button>
        </div>
      )}

      {/* Top Stat Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-xs">
            <p className="text-[11px] text-stone-500 font-medium">Bugünkü Sipariş</p>
            <p className="text-xl font-black text-stone-900">{summary.todayOrderCount}</p>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-xs">
            <p className="text-[11px] text-blue-700 font-medium">Sırada Bekleyen</p>
            <p className="text-xl font-black text-blue-900">{summary.pendingOrdersCount}</p>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs">
            <p className="text-[11px] text-amber-700 font-medium">Hazırlanıyor 🥪</p>
            <p className="text-xl font-black text-amber-900">{summary.preparingOrdersCount}</p>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
            <p className="text-[11px] text-emerald-700 font-medium">Hazır 🔔</p>
            <p className="text-xl font-black text-emerald-900">{summary.readyOrdersCount}</p>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-xs">
            <p className="text-[11px] text-stone-500 font-medium">Teslim Edilen</p>
            <p className="text-xl font-black text-stone-700">{summary.deliveredOrdersCount}</p>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-emerald-300 bg-emerald-50/50 shadow-xs">
            <p className="text-[11px] text-emerald-800 font-medium">Günlük Ciro</p>
            <p className="text-xl font-black text-emerald-950">₺{summary.todaySalesAmount.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Okul Zil ve Teslimat Saatleri Bilgilendirme Barı */}
      {breaks.length > 0 && (
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs shadow-2xs">
          <div className="flex items-center gap-2 text-emerald-950 font-medium">
            <Clock className="w-4 h-4 text-emerald-700 shrink-0" />
            <span className="font-bold">Kurum Müdürü Tarafından Belirlenen Teneffüs & Teslimat Saatleri:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {breaks.filter(b => b.activeStatus).map(b => (
              <span key={b.id} className="px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-emerald-950 font-mono text-[11px] font-bold shadow-2xs">
                {b.name}: {b.startTime}-{b.endTime}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 p-1 bg-stone-100 rounded-xl">
            {[
              { id: 'all', label: 'Tüm Siparişler' },
              { id: 'paid_pending', label: 'Bekleyenler' },
              { id: 'preparing', label: 'Hazırlanıyor' },
              { id: 'ready', label: 'Hazır' },
              { id: 'delivered', label: 'Teslim Edildi' },
              { id: 'cancelled', label: 'İptal' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Date, Break and Search */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-stone-200 rounded-xl bg-white focus:outline-emerald-600 font-semibold text-stone-700"
            >
              <option value="all">Tüm Tarihler</option>
              {uniqueDates.map(d => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <select
              value={breakFilter}
              onChange={e => setBreakFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-stone-200 rounded-xl bg-white focus:outline-emerald-600 font-semibold text-stone-700"
            >
              <option value="all">Tüm Teneffüsler</option>
              {breaks.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.startTime})
                </option>
              ))}
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Öğrenci, kod, sipariş no..."
                className="pl-8 pr-3 py-1.5 text-xs border border-stone-200 rounded-xl focus:outline-emerald-600 w-full sm:w-48"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Orders Board / Cards */}
      {loading ? (
        <div className="py-16 text-center text-stone-400 text-xs">Siparişler taranıyor...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-stone-200 p-8 space-y-2">
          <ClipboardList className="w-10 h-10 text-stone-300 mx-auto" />
          <p className="text-sm font-semibold text-stone-700">Seçili filtreye uygun sipariş bulunamadı.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map(order => {
            const isUpdating = updatingId === order.id;

            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl border shadow-xs overflow-hidden flex flex-col justify-between transition-all ${
                  order.orderStatus === 'preparing'
                    ? 'border-amber-400 ring-2 ring-amber-100'
                    : order.orderStatus === 'ready'
                    ? 'border-emerald-500 ring-2 ring-emerald-100'
                    : order.orderStatus === 'delivered'
                    ? 'border-stone-200 opacity-70'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <div>
                  {/* Top order strip */}
                  <div className="p-3.5 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-stone-900">{order.orderNumber}</span>
                        <span className="text-[10px] text-stone-400">· {order.orderDate}</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-900 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-emerald-700" />
                        {order.breakNameSnapshot}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-sm font-black px-2 py-0.5 rounded bg-emerald-950 text-white block">
                        PIN: {order.deliveryCode}
                      </span>
                    </div>
                  </div>

                  {/* Student Details */}
                  <div className="p-3.5 pb-2">
                    <p className="text-sm font-bold text-stone-900">{order.studentNameSnapshot}</p>
                    <p className="text-xs text-stone-500">{order.studentClassSnapshot}</p>

                    {/* Items */}
                    <div className="mt-2.5 pt-2 border-t border-stone-100 space-y-1">
                      {order.items.map(it => (
                        <div key={it.id} className="text-xs flex items-center justify-between">
                          <span className="font-medium text-stone-800">
                            <strong className="text-emerald-900">{it.quantity}×</strong> {it.productNameSnapshot}
                          </span>
                          <span className="text-stone-500 font-mono">₺{it.lineTotal.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    {order.note && (
                      <p className="mt-2 p-2 rounded-lg bg-amber-50 text-[11px] text-amber-900 font-medium">
                        <strong>Not:</strong> {order.note}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="p-3.5 pt-2 border-t border-stone-100 bg-stone-50/40 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-400 font-medium">Tutar: ₺{order.totalAmount.toFixed(2)}</span>
                    <span className="text-[11px] font-bold text-stone-600">
                      {order.orderStatus === 'paid_pending' && 'Beklemede'}
                      {order.orderStatus === 'preparing' && 'Hazırlanıyor 🥪'}
                      {order.orderStatus === 'ready' && 'Hazır! 🔔'}
                      {order.orderStatus === 'delivered' && 'Teslim Edildi ✅'}
                      {order.orderStatus === 'cancelled' && 'İptal Edildi ❌'}
                    </span>
                  </div>

                  {/* Status buttons */}
                  {order.orderStatus === 'paid_pending' && (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleStatusChange(order.id, 'preparing')}
                      className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-bold transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <ChefHat className="w-3.5 h-3.5" />
                      Hazırlamaya Başla
                    </button>
                  )}

                  {order.orderStatus === 'preparing' && (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleStatusChange(order.id, 'ready')}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Hazır Olarak İşaretle
                    </button>
                  )}

                  {order.orderStatus === 'ready' && (
                    <button
                      type="button"
                      onClick={() => setSelectedOrderForDelivery(order)}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-950 hover:bg-black text-white text-xs font-bold transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                      Kodu Doğrula & Teslim Et
                    </button>
                  )}

                  {order.orderStatus === 'delivered' && (
                    <div className="text-center py-1 text-xs text-emerald-800 font-bold flex items-center justify-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      Öğrenciye Teslim Edildi
                    </div>
                  )}

                  {order.orderStatus === 'cancelled' && (
                    <div className="text-center py-1 text-xs text-red-600 font-bold">
                      İptal Edilmiş Sipariş
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setViewingOrder(order)}
                    className="w-full py-1.5 px-3 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3 h-3" />
                    Detayları Gör
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Order Details Modal */}
      {viewingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden">
            <div className="p-4 bg-emerald-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] text-emerald-300 font-mono">Sipariş Fişi</span>
                <h3 className="font-bold text-base">{viewingOrder.orderNumber}</h3>
              </div>
              <button
                onClick={() => setViewingOrder(null)}
                className="text-emerald-200 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-stone-50 rounded-xl space-y-1">
                <div className="flex justify-between">
                  <span className="text-stone-500">Öğrenci:</span>
                  <span className="font-bold text-stone-900">{viewingOrder.studentNameSnapshot}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Sınıf / Şube:</span>
                  <span className="font-bold text-stone-900">{viewingOrder.studentClassSnapshot}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Tarih & Teneffüs:</span>
                  <span className="font-bold text-stone-900">{viewingOrder.orderDate} · {viewingOrder.breakNameSnapshot}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Teslimat Kodu (PIN):</span>
                  <span className="font-mono font-bold text-emerald-900 text-sm">{viewingOrder.deliveryCode}</span>
                </div>
              </div>

              <div>
                <p className="font-bold text-stone-900 mb-2">Sipariş Kalemleri</p>
                <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden">
                  {viewingOrder.items.map(it => (
                    <div key={it.id} className="p-2.5 flex justify-between bg-white">
                      <span>{it.quantity}× {it.productNameSnapshot}</span>
                      <span className="font-bold">₺{it.lineTotal.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="p-2.5 bg-stone-50 flex justify-between font-bold">
                    <span>Toplam:</span>
                    <span className="text-emerald-900">₺{viewingOrder.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {viewingOrder.note && (
                <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="font-bold text-amber-900">Veli Notu:</p>
                  <p className="text-amber-800">{viewingOrder.note}</p>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setViewingOrder(null)}
                  className="px-4 py-2 bg-stone-100 text-stone-700 hover:bg-stone-200 rounded-xl font-bold"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delivery PIN Code Verification Modal */}
      {selectedOrderForDelivery && (
        <DeliveryVerifyModal
          isOpen={Boolean(selectedOrderForDelivery)}
          onClose={() => setSelectedOrderForDelivery(null)}
          order={selectedOrderForDelivery}
          onVerified={() => {
            setSelectedOrderForDelivery(null);
            fetchData();
          }}
        />
      )}

      {/* Gün Sonunu Kapatma ve Arşivleme Modalı */}
      {confirmArchiveModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center gap-2 text-emerald-800">
              <CalendarCheck className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="font-bold text-base text-stone-900">Gün Sonunu Kapat ve Arşivle</h3>
                <p className="text-xs text-stone-500">Günlük Operasyonel Sipariş Temizliği</p>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Bugün okul kantininde teslim edilmiş (<strong className="text-stone-900">Teslim Edildi</strong>) ve iptal edilmiş siparişler aktif canlı ekrandan çıkarılarak geçmiş gün arşivine aktarılacaktır.
            </p>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
              <p className="font-bold">Korunan Veriler:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                <li>Henüz teslim edilmemiş veya hazırlık aşamasındaki siparişler korunur ve ekranda kalır.</li>
                <li>Günlük ciro, ödeme kayıtları, kasa raporları ve stok hareketleri aynen korunur.</li>
                <li>Arşivlenen siparişlere dilediğiniz an "Geçmiş / Arşivlenmiş Siparişler" sekmesinden erişebilirsiniz.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isArchiving}
                onClick={() => setConfirmArchiveModal(false)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 text-xs font-bold hover:bg-stone-50 cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={isArchiving}
                onClick={handleManualArchive}
                className="px-4 py-2 rounded-xl bg-emerald-800 text-white text-xs font-bold hover:bg-emerald-900 shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {isArchiving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                {isArchiving ? 'Arşivleniyor...' : 'Evet, Gün Sonunu Kapat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
