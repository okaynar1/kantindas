import React, { useState, useEffect } from 'react';
import { X, Trash2, Plus, Minus, Calendar, Clock, User as UserIcon, AlertCircle, ShoppingBag } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { Student, BreakTime } from '../../types.ts';
import { PaymentModal } from './PaymentModal.tsx';
import { StudentModal } from './StudentModal.tsx';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCompleted: () => void;
}

export const CartModal: React.FC<CartModalProps> = ({ isOpen, onClose, onOrderCompleted }) => {
  const { cart, removeFromCart, updateCartQuantity, clearCart, cartTotal, user } = useAuth();

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [breaks, setBreaks] = useState<BreakTime[]>([]);
  const [selectedBreakId, setSelectedBreakId] = useState<string>('');
  const [orderDate, setOrderDate] = useState<string>('');
  const [orderNote, setOrderNote] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modals
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [activeOrderForPayment, setActiveOrderForPayment] = useState<any | null>(null);

  // Load students & breaks
  useEffect(() => {
    if (!isOpen || !user) return;

    // Default order date to today's date formatted as DD.MM.YYYY
    const d = new Date();
    // If weekend, advance to Monday
    if (d.getDay() === 6) d.setDate(d.getDate() + 2); // Saturday -> Monday
    if (d.getDay() === 0) d.setDate(d.getDate() + 1); // Sunday -> Monday

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    setOrderDate(`${day}.${month}.${year}`);

    async function loadData() {
      try {
        const [studRes, brkRes] = await Promise.all([
          api.getStudents(),
          api.getBreaks(user?.schoolId || 'school-1'),
        ]);

        setStudents(studRes.students);
        if (studRes.students.length > 0 && !selectedStudentId) {
          setSelectedStudentId(studRes.students[0].id);
        }

        const activeBreaks = brkRes.breaks.filter(b => b.activeStatus);
        setBreaks(activeBreaks);
        if (activeBreaks.length > 0 && !selectedBreakId) {
          setSelectedBreakId(activeBreaks[0].id);
        }
      } catch (err: any) {
        console.error(err);
      }
    }
    loadData();
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleStudentCreated = (newStudent: Student) => {
    setStudents(prev => [...prev, newStudent]);
    setSelectedStudentId(newStudent.id);
  };

  const handleProceedToPayment = async () => {
    setErrorMsg(null);

    if (!selectedStudentId) {
      setErrorMsg('Lütfen siparişin teslim edileceği öğrenciyi seçiniz veya yeni öğrenci ekleyiniz.');
      return;
    }
    if (!selectedBreakId) {
      setErrorMsg('Lütfen teslimat teneffüsünü seçiniz.');
      return;
    }
    if (cart.length === 0) {
      setErrorMsg('Sepetiniz boş.');
      return;
    }

    setLoading(true);
    try {
      const orderPayload = {
        studentId: selectedStudentId,
        orderDate,
        breakId: selectedBreakId,
        items: cart.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        note: orderNote,
      };

      const res = await api.createOrder(orderPayload);
      if (res.success && res.order) {
        // Open payment modal
        setActiveOrderForPayment(res.order);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Sipariş oluşturulamadı.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    clearCart();
    setActiveOrderForPayment(null);
    onClose();
    onOrderCompleted();
  };

  // Generate selectable upcoming school days (next 5 days, excluding weekends)
  const getUpcomingSchoolDays = () => {
    const dates: string[] = [];
    let current = new Date();
    while (dates.length < 5) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const d = String(current.getDate()).padStart(2, '0');
        const m = String(current.getMonth() + 1).padStart(2, '0');
        const y = current.getFullYear();
        dates.push(`${d}.${m}.${y}`);
      }
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const upcomingDates = getUpcomingSchoolDays();

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-xs">
        <div className="bg-white h-full max-w-md w-full shadow-2xl flex flex-col justify-between overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-stone-200 bg-emerald-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-300" />
              <div>
                <h3 className="font-bold text-base">Kantin Sipariş Sepeti</h3>
                <p className="text-xs text-emerald-200">Teneffüse Önceden Sipariş</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-emerald-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Student Selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-emerald-700" />
                  Siparişi Teslim Alacak Öğrenci
                </label>
                <button
                  type="button"
                  onClick={() => setIsStudentModalOpen(true)}
                  className="text-xs text-emerald-700 hover:underline font-semibold"
                >
                  + Yeni Öğrenci
                </button>
              </div>

              {students.length === 0 ? (
                <div className="p-3 rounded-xl border border-dashed border-stone-300 bg-stone-50 text-center">
                  <p className="text-xs text-stone-500 mb-1.5">Kayıtlı öğrenciniz bulunmuyor.</p>
                  <button
                    type="button"
                    onClick={() => setIsStudentModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold"
                  >
                    Hemen Öğrenci Ekle
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {students.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedStudentId(s.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedStudentId === s.id
                          ? 'border-emerald-700 bg-emerald-50/70 text-emerald-950 font-semibold ring-1 ring-emerald-700'
                          : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                      }`}
                    >
                      <p className="text-xs font-bold truncate">{s.fullName}</p>
                      <p className="text-[11px] text-stone-500">{s.grade} · {s.classroom}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Date Selection */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                Sipariş Günü (Okul Günleri)
              </label>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {upcomingDates.map((dateStr, idx) => (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => setOrderDate(dateStr)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                      orderDate === dateStr
                        ? 'bg-emerald-800 text-white'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    {idx === 0 ? `Bugün (${dateStr})` : dateStr}
                  </button>
                ))}
              </div>
            </div>

            {/* Break Time Selection */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-700" />
                Teslim Alınacak Teneffüs
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {breaks.map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedBreakId(b.id)}
                    className={`p-2 rounded-xl border text-left cursor-pointer transition-colors ${
                      selectedBreakId === b.id
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-950 font-semibold'
                        : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <p className="text-xs font-bold">{b.name}</p>
                    <p className="text-[10px] text-stone-500">{b.startTime} - {b.endTime}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Cart Items List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-stone-700">Seçilen Ürünler ({cart.length})</span>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-[11px] text-red-600 hover:underline"
                  >
                    Sepeti Temizle
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="py-8 text-center text-stone-400">
                  <ShoppingBag className="w-10 h-10 mx-auto mb-2 stroke-1" />
                  <p className="text-xs">Sepetinizde ürün bulunmuyor.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cart.map(item => (
                    <div
                      key={item.product.id}
                      className="p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 flex items-center justify-between gap-2"
                    >
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="w-12 h-12 rounded-lg object-cover bg-stone-100 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-stone-900 truncate">{item.product.name}</p>
                        <p className="text-xs text-emerald-800 font-bold">₺{item.product.price} / adet</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                          className="w-6 h-6 rounded bg-stone-200 hover:bg-stone-300 flex items-center justify-center text-stone-700"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                          disabled={item.quantity >= item.product.stockQuantity}
                          className="w-6 h-6 rounded bg-stone-200 hover:bg-stone-300 flex items-center justify-center text-stone-700 disabled:opacity-40"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.product.id)}
                          className="w-6 h-6 rounded text-red-600 hover:bg-red-50 flex items-center justify-center ml-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Note */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Kantinciye Not (Opsiyonel)</label>
              <input
                type="text"
                value={orderNote}
                onChange={e => setOrderNote(e.target.value)}
                placeholder="Örn: Tost sıcak olsun, az pişmiş..."
                className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl focus:outline-emerald-600"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-stone-200 bg-stone-50 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-stone-500">Toplam Tutar</p>
                <p className="text-xs text-stone-400">KDV Dahil</p>
              </div>
              <p className="text-2xl font-black text-emerald-900">₺{cartTotal.toFixed(2)}</p>
            </div>

            <button
              type="button"
              disabled={cart.length === 0 || loading}
              onClick={handleProceedToPayment}
              className="w-full py-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm transition-colors shadow-xs disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? 'İşleniyor...' : 'Güvenli Ödeme Adımına Geç →'}
            </button>
          </div>
        </div>
      </div>

      {/* Student Modal */}
      <StudentModal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
        onSaved={handleStudentCreated}
      />

      {/* Payment Gateway Modal */}
      {activeOrderForPayment && (
        <PaymentModal
          isOpen={Boolean(activeOrderForPayment)}
          onClose={() => setActiveOrderForPayment(null)}
          targetId={activeOrderForPayment.id}
          targetType="order"
          amount={activeOrderForPayment.totalAmount}
          title="Kantin Ön Siparişi Ödemesi"
          subtitle={`${activeOrderForPayment.studentNameSnapshot} · ${activeOrderForPayment.breakNameSnapshot}`}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </>
  );
};
