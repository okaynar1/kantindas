import React, { useState, useEffect } from 'react';
import {
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RotateCcw,
  KeyRound,
  Calendar,
  Utensils,
  ChevronRight,
  RefreshCw,
  QrCode,
} from 'lucide-react';
import { Order, OrderStatus } from '../types.ts';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const ParentOrdersView: React.FC = () => {
  const { user, refreshUserData } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);

  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.getOrders();
      setOrders(res.orders);
    } catch (err: any) {
      setActionNotice(err.message || 'Siparişler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  const confirmCancelOrder = async () => {
    if (!orderToCancel) return;
    setCancellingId(orderToCancel.id);
    try {
      await api.updateOrderStatus(orderToCancel.id, 'cancelled', 'Veli tarafından iptal edildi.');
      setActionNotice(`${orderToCancel.orderNumber} numaralı siparişiniz başarıyla iptal edildi ve stok iadesi yapıldı.`);
      setOrderToCancel(null);
      await fetchOrders();
      await refreshUserData();
    } catch (err: any) {
      setActionNotice(err.message || 'Sipariş iptal edilemedi.');
      setOrderToCancel(null);
    } finally {
      setCancellingId(null);
    }
  };

  const filteredOrders = orders.filter(o => {
    const isCompleted = o.orderStatus === 'delivered' || o.orderStatus === 'cancelled';
    if (filter === 'active') return !isCompleted;
    if (filter === 'completed') return isCompleted;
    return true;
  });

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending_payment':
        return { label: 'Ödeme Bekleniyor', color: 'bg-stone-100 text-stone-700 border-stone-200' };
      case 'paid_pending':
        return { label: 'Ödendi / Sıraya Alındı', color: 'bg-blue-100 text-blue-900 border-blue-200' };
      case 'preparing':
        return { label: 'Kantinde Hazırlanıyor 🥪', color: 'bg-amber-100 text-amber-900 border-amber-200' };
      case 'ready':
        return { label: 'Hazır! Teslim Alınabilir 🔔', color: 'bg-emerald-100 text-emerald-900 border-emerald-300' };
      case 'delivered':
        return { label: 'Teslim Edildi ✅', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'cancelled':
        return { label: 'İptal Edildi ❌', color: 'bg-red-50 text-red-700 border-red-200' };
      default:
        return { label: status, color: 'bg-stone-100 text-stone-700 border-stone-200' };
    }
  };

  const getStepProgress = (status: OrderStatus) => {
    if (status === 'cancelled') return -1;
    switch (status) {
      case 'pending_payment': return 0;
      case 'paid_pending': return 1;
      case 'preparing': return 2;
      case 'ready': return 3;
      case 'delivered': return 4;
      default: return 1;
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 font-serif">
            Siparişlerim ve Teslimat Takibi
          </h1>
          <p className="text-xs text-stone-500">
            Öğrencilerinizin aktif kantin siparişlerini ve geçmiş teslimat kodlarını görüntüleyin.
          </p>
        </div>

        <button
          onClick={fetchOrders}
          className="self-start sm:self-auto px-3.5 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Durumu Güncelle
        </button>
      </div>

      {actionNotice && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <span>{actionNotice}</span>
          <button onClick={() => setActionNotice(null)} className="text-emerald-900 font-bold">✕</button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-2xl w-fit">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            filter === 'all' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          Tümü ({orders.length})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            filter === 'active' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          Aktif Siparişler ({orders.filter(o => o.orderStatus !== 'delivered' && o.orderStatus !== 'cancelled').length})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            filter === 'completed' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          Tamamlananlar
        </button>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="py-16 text-center text-stone-400">
          <div className="animate-spin w-8 h-8 border-2 border-emerald-700 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-xs">Siparişler yükleniyor...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-stone-200 p-8 space-y-2">
          <Package className="w-10 h-10 text-stone-300 mx-auto" />
          <p className="text-sm font-semibold text-stone-700">Henüz sipariş kaydınız bulunmuyor.</p>
          <p className="text-xs text-stone-400">Menüden dilediğiniz lezzetleri seçerek ilk siparişinizi verebilirsiniz.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map(order => {
            const statusBadge = getStatusBadge(order.orderStatus);
            const currentStep = getStepProgress(order.orderStatus);
            const canCancel = order.orderStatus === 'paid_pending' || order.orderStatus === 'pending_payment';

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden transition-all hover:border-emerald-300"
              >
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-stone-900">
                        {order.orderNumber}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${statusBadge.color}`}>
                        {statusBadge.label}
                      </span>
                    </div>

                    <div className="text-xs text-stone-600 flex flex-wrap items-center gap-2">
                      <span className="font-bold text-stone-900">{order.studentNameSnapshot}</span>
                      <span>·</span>
                      <span>{order.studentClassSnapshot}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-stone-400" />
                        {order.orderDate}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1 font-semibold text-emerald-900">
                        <Clock className="w-3 h-3 text-emerald-700" />
                        {order.breakNameSnapshot}
                      </span>
                    </div>
                  </div>

                  {/* Delivery Code Spotlight Badge */}
                  {order.orderStatus !== 'cancelled' && (
                    <div className="bg-emerald-950 text-white rounded-xl p-2.5 px-4 flex items-center justify-between sm:justify-end gap-3 self-start sm:self-auto shadow-xs border border-emerald-800">
                      <div>
                        <span className="block text-[9px] text-emerald-300 uppercase tracking-widest font-mono">
                          Kantin Teslim Kodu
                        </span>
                        <span className="text-xl font-mono font-black tracking-widest text-white">
                          {order.deliveryCode}
                        </span>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-emerald-800 text-emerald-200 flex items-center justify-center">
                        <KeyRound className="w-4 h-4" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Progress Steps Tracker (for active orders) */}
                {order.orderStatus !== 'cancelled' && (
                  <div className="p-4 sm:px-6 bg-stone-50/30 border-b border-stone-100">
                    <div className="grid grid-cols-4 gap-2 text-center">
                      {[
                        { title: 'Sipariş Alındı', step: 1 },
                        { title: 'Hazırlanıyor', step: 2 },
                        { title: 'Hazır', step: 3 },
                        { title: 'Teslim Edildi', step: 4 },
                      ].map(s => {
                        const isDone = currentStep >= s.step;
                        const isCurrent = currentStep === s.step;

                        return (
                          <div key={s.step} className="space-y-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all ${
                                isDone ? 'bg-emerald-600' : 'bg-stone-200'
                              } ${isCurrent ? 'ring-2 ring-emerald-300' : ''}`}
                            />
                            <p
                              className={`text-[10px] font-bold ${
                                isDone ? 'text-emerald-950' : 'text-stone-400'
                              }`}
                            >
                              {s.title}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Items Breakdown */}
                <div className="p-4 sm:p-5 space-y-3">
                  <div className="divide-y divide-stone-100">
                    {order.items.map(item => (
                      <div key={item.id} className="py-2 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-stone-100 text-stone-700 font-bold flex items-center justify-center text-[11px]">
                            {item.quantity}×
                          </span>
                          <span className="font-semibold text-stone-800">{item.productNameSnapshot}</span>
                        </div>
                        <span className="font-bold text-stone-900">₺{item.lineTotal.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {order.note && (
                    <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-100 text-xs text-amber-900">
                      <strong>Kantinci Notu:</strong> {order.note}
                    </div>
                  )}

                  {/* Summary & Cancel button */}
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-stone-100">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs text-stone-500">Toplam Ödenen:</span>
                      <span className="text-lg font-black text-emerald-950">₺{order.totalAmount.toFixed(2)}</span>
                      <span className="text-[11px] text-stone-400 font-medium">({order.paymentStatus === 'paid' ? 'Ödendi' : 'Bekliyor'})</span>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <button
                        onClick={() => setReceiptOrder(order)}
                        className="px-3 py-1.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Fiş Görüntüle
                      </button>

                      {canCancel && (
                        <button
                          onClick={() => setOrderToCancel(order)}
                          disabled={cancellingId === order.id}
                          className="px-3.5 py-1.5 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 text-xs font-bold transition-colors cursor-pointer"
                        >
                          Siparişi İptal Et
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel Order Confirmation Modal */}
      {orderToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-stone-200 space-y-4">
            <h3 className="font-bold text-base text-stone-900">Siparişi İptal Et</h3>
            <p className="text-xs text-stone-600">
              <strong>{orderToCancel.orderNumber}</strong> numaralı siparişinizi iptal etmek istediğinize emin misiniz?
              Siparişteki ürünler kantin stoğuna iade edilecek ve siparişiniz iptal olarak güncellenecektir.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOrderToCancel(null)}
                className="px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100 rounded-lg cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={cancellingId === orderToCancel.id}
                onClick={confirmCancelOrder}
                className="px-4 py-1.5 text-xs font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 cursor-pointer disabled:opacity-50"
              >
                {cancellingId === orderToCancel.id ? 'İptal Ediliyor...' : 'Evet, İptal Et'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {receiptOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-stone-200 overflow-hidden font-sans">
            <div className="p-4 bg-emerald-950 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] text-emerald-300 font-mono uppercase tracking-widest">KantinCep Fişi</span>
                <h3 className="font-bold text-base">{receiptOrder.orderNumber}</h3>
              </div>
              <button
                onClick={() => setReceiptOrder(null)}
                className="text-stone-300 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="text-center py-2 border-b border-dashed border-stone-200 space-y-1">
                <p className="font-bold text-stone-900 text-sm">Atatürk İlkokulu ve Ortaokulu Kantini</p>
                <p className="text-stone-500 text-[11px]">Akıllı Teneffüs Sipariş Belgesi</p>
                <div className="my-2 p-2 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">KANTİN TESLİM KODU</span>
                  <span className="text-2xl font-mono font-black text-emerald-950 tracking-widest">{receiptOrder.deliveryCode}</span>
                </div>
              </div>

              <div className="space-y-1 text-stone-600">
                <div className="flex justify-between">
                  <span>Öğrenci:</span>
                  <span className="font-bold text-stone-900">{receiptOrder.studentNameSnapshot}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sınıf:</span>
                  <span className="font-bold text-stone-900">{receiptOrder.studentClassSnapshot}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tarih / Teneffüs:</span>
                  <span className="font-bold text-stone-900">{receiptOrder.orderDate} · {receiptOrder.breakNameSnapshot}</span>
                </div>
              </div>

              <div className="divide-y divide-stone-100 border-t border-b border-stone-200 py-2 space-y-1">
                {receiptOrder.items.map(it => (
                  <div key={it.id} className="flex justify-between pt-1">
                    <span>{it.quantity}× {it.productNameSnapshot}</span>
                    <span className="font-mono font-bold">₺{it.lineTotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between text-sm font-black text-emerald-950">
                <span>Ödenen Tutar:</span>
                <span>₺{receiptOrder.totalAmount.toFixed(2)}</span>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-bold cursor-pointer"
                >
                  Yazdır / İndir
                </button>
                <button
                  onClick={() => setReceiptOrder(null)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-semibold cursor-pointer"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
