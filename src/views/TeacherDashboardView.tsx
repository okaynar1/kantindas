import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  UserPlus,
  Heart,
  BookOpen,
  PackageCheck,
  Key,
  Truck,
  History,
  FileText,
  User,
  LogOut,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  ShoppingBag,
  Clock,
  Sparkles,
  Bell,
  BellOff,
  CheckCircle2,
  ChevronRight,
  X,
  Filter,
} from 'lucide-react';
import { api, API_BASE_URL } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { StudentNeed, SupportAllocation, NotificationItem } from '../types.ts';

export const TeacherDashboardView: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeMenu, setActiveMenu] = useState<string>('overview');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Data states
  const [needs, setNeeds] = useState<StudentNeed[]>([]);
  const [allocations, setAllocations] = useState<SupportAllocation[]>([]);
  const [foodStock, setFoodStock] = useState<any[]>([]);
  const [stationeryStock, setStationeryStock] = useState<any[]>([]);

  // Student Identification Form State
  const [studentRefId, setStudentRefId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [grade, setGrade] = useState('3. Sınıf');
  const [classroom, setClassroom] = useState('3-A');
  const [needType, setNeedType] = useState<'food' | 'stationery' | 'both' | 'other'>('food');
  const [needDescription, setNeedDescription] = useState('');
  const [createdNeedResult, setCreatedNeedResult] = useState<{ need: StudentNeed; code: string } | null>(null);

  // Allocation Modal State (Dayanışma Havuzu / Eğitim Desteği)
  const [selectedNeed, setSelectedNeed] = useState<StudentNeed | null>(null);
  const [selectedSupportType, setSelectedSupportType] = useState<'food_pool' | 'education_support'>('food_pool');
  const [selectedItems, setSelectedItems] = useState<{ productId: string; quantity: number }[]>([]);
  const [justificationNote, setJustificationNote] = useState('');
  const [validUntil, setValidUntil] = useState('Bugün');

  // Cancel allocation modal
  const [cancelAllocationId, setCancelAllocationId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Copied code feedback
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Password change state
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newPassRepeat, setNewPassRepeat] = useState('');

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'food_pool' | 'education_support' | 'unread'>('all');
  const [highlightedAllocationId, setHighlightedAllocationId] = useState<string | null>(null);
  const [toastNotification, setToastNotification] = useState<NotificationItem | null>(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.getNotifications();
      const list = res.notifications || [];
      setNotifications(list);
      setUnreadCount(list.filter(n => !n.read).length);
    } catch (err) {
      console.error('Failed to fetch teacher notifications:', err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const [nRes, aRes, dRes] = await Promise.all([
        api.getTeacherNeeds(),
        api.getTeacherAllocations(),
        api.getTeacherAvailableDonations(),
      ]);
      setNeeds(nRes.needs || []);
      setAllocations(aRes.allocations || []);
      setFoodStock(dRes.foodStock || []);
      setStationeryStock(dRes.stationeryStock || []);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Veriler yüklenemedi.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchNotifications();

    if (!user) return;

    // Connect to Server-Sent Events (SSE) stream for live in-app notifications
    const streamUrl = `${API_BASE_URL}/notifications/stream?token=${encodeURIComponent(user.id)}`;
    const eventSource = new EventSource(streamUrl);

    eventSource.addEventListener('connected', () => {
      console.log('[TeacherDashboard] SSE connection established.');
    });

    eventSource.addEventListener('support_delivery_notification', (e: MessageEvent) => {
      try {
        const eventData = JSON.parse(e.data);
        if (eventData.notification) {
          setNotifications(prev => [eventData.notification, ...prev.filter(n => n.id !== eventData.notification.id)]);
          setUnreadCount(prev => prev + 1);
          setToastNotification(eventData.notification);
          setTimeout(() => setToastNotification(null), 7000);

          // Audio chime
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(587.33, ctx.currentTime);
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
            osc.start();
            osc.stop(ctx.currentTime + 0.45);
          } catch {}

          // Refresh allocations list so delivery is shown immediately without manual reload
          fetchData();
        }
      } catch (err) {
        console.error('Error handling support_delivery_notification event:', err);
      }
    });

    eventSource.addEventListener('notification', (e: MessageEvent) => {
      try {
        const notif = JSON.parse(e.data) as NotificationItem;
        setNotifications(prev => [notif, ...prev.filter(n => n.id !== notif.id)]);
        setUnreadCount(prev => prev + 1);
      } catch (err) {
        console.error('Error handling notification event:', err);
      }
    });

    eventSource.onerror = () => {
      // Browser will automatically retry SSE connection
    };

    return () => {
      eventSource.close();
    };
  }, [user]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.read) {
      await handleMarkAsRead(notif.id);
    }
    setShowNotificationDrawer(false);

    if (notif.allocationId) {
      setHighlightedAllocationId(notif.allocationId);
      setActiveMenu('deliveries');
      setTimeout(() => setHighlightedAllocationId(null), 4500);
    } else {
      setActiveMenu('notifications');
    }
  };

  // Handle student identification
  const handleCreateNeed = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setCreatedNeedResult(null);
    try {
      const res = await api.createStudentNeed({
        studentReferenceId: studentRefId,
        studentName,
        grade,
        classroom,
        needType,
        needDescription,
      });

      setCreatedNeedResult({
        need: res.need,
        code: res.needCode,
      });

      setMsg({ type: 'success', text: 'Öğrenci ihtiyaç kaydı başarıyla açıldı.' });
      setStudentRefId('');
      setStudentName('');
      setNeedDescription('');
      await fetchData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'İhtiyaç kaydı oluşturulamadı.' });
    }
  };

  // Renew need code
  const handleRenewCode = async (needId: string) => {
    try {
      const res = await api.renewNeedCode(needId);
      setMsg({ type: 'success', text: `İhtiyaç kodu yenilendi: ${res.newCode}` });
      await fetchData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Kod yenilenemedi.' });
    }
  };

  // Cancel student need
  const handleCancelNeed = async (needId: string) => {
    try {
      await api.cancelStudentNeed(needId);
      setMsg({ type: 'success', text: 'İhtiyaç kaydı kapatıldı.' });
      await fetchData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'İhtiyaç kaydı kapatılamadı.' });
    }
  };

  // Open Allocation Flow
  const openAllocationFlow = (need: StudentNeed, type: 'food_pool' | 'education_support') => {
    setSelectedNeed(need);
    setSelectedSupportType(type);
    setSelectedItems([]);
    setJustificationNote(type === 'food_pool' ? 'Teneffüs beslenme desteği' : 'Temel ders kırtasiye desteği');
    setValidUntil('Bugün');
    setActiveMenu(type === 'food_pool' ? 'food_pool' : 'education_support');
  };

  // Toggle item in allocation
  const handleToggleItem = (productId: string, maxQty: number) => {
    const existing = selectedItems.find(i => i.productId === productId);
    if (existing) {
      setSelectedItems(selectedItems.filter(i => i.productId !== productId));
    } else {
      if (maxQty <= 0) return;
      setSelectedItems([...selectedItems, { productId, quantity: 1 }]);
    }
  };

  // Update item quantity in allocation
  const handleUpdateItemQty = (productId: string, qty: number, maxQty: number) => {
    if (qty <= 0) {
      setSelectedItems(selectedItems.filter(i => i.productId !== productId));
      return;
    }
    const safeQty = Math.min(qty, maxQty);
    setSelectedItems(selectedItems.map(i => (i.productId === productId ? { ...i, quantity: safeQty } : i)));
  };

  // Submit Allocation
  const handleSubmitAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNeed) return;
    if (selectedItems.length === 0) {
      setMsg({ type: 'error', text: 'Lütfen en az bir ürün seçiniz.' });
      return;
    }

    try {
      const res = await api.createSupportAllocation({
        studentNeedId: selectedNeed.id,
        supportType: selectedSupportType,
        items: selectedItems,
        justificationNote,
        validUntil,
      });

      setMsg({
        type: 'success',
        text: `"${res.allocation.allocationNumber}" numaralı destek tahsisi oluşturuldu ve kantin görevlisine iletildi.`,
      });
      setSelectedNeed(null);
      setSelectedItems([]);
      await fetchData();
      setActiveMenu('allocations');
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Tahsis işlemi gerçekleştirilemedi.' });
    }
  };

  // Cancel allocation
  const handleExecuteCancelAllocation = async () => {
    if (!cancelAllocationId) return;
    try {
      await api.cancelSupportAllocation(cancelAllocationId, cancelReason);
      setMsg({ type: 'success', text: 'Tahsis iptal edildi ve rezerve ürünler iade edildi.' });
      setCancelAllocationId(null);
      setCancelReason('');
      await fetchData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Tahsis iptal edilemedi.' });
    }
  };

  // Copy code to clipboard
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (newPass.length < 6) {
      setMsg({ type: 'error', text: 'Yeni şifre en az 6 karakter olmalıdır.' });
      return;
    }
    if (newPass !== newPassRepeat) {
      setMsg({ type: 'error', text: 'Yeni şifreler uyuşmuyor.' });
      return;
    }
    try {
      await api.changePassword({
        currentPassword: currentPass,
        newPassword: newPass,
        newPasswordRepeat: newPassRepeat,
      });
      setMsg({ type: 'success', text: 'Şifreniz başarıyla güncellendi.' });
      setCurrentPass('');
      setNewPass('');
      setNewPassRepeat('');
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Şifre güncellenemedi.' });
    }
  };

  const activeNeeds = needs.filter(n => n.status === 'active');
  const deliveredAllocations = allocations.filter(a => a.status === 'fully_delivered');
  const pendingAllocations = allocations.filter(a => a.status === 'ready_for_delivery' || a.status === 'sent_to_canteen');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-stone-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/30">
              Danışman Öğretmen Portali
            </span>
            <span className="text-xs text-stone-300">Öğrenci Destek & Dayanışma Modülü</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight">
            Hoş Geldiniz, {user?.fullName}
          </h1>
          <p className="text-xs text-stone-300 max-w-xl leading-relaxed">
            İhtiyaç sahibi öğrencileri sisteme tanımlayabilir, Dayanışma Havuzu ve Eğitim Desteği kapsamında anonim ürün tahsisi yapabilir ve teslimatları takip edebilirsiniz.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Notifications Trigger Bell */}
          <button
            onClick={() => setShowNotificationDrawer(true)}
            className="relative flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer border border-white/10"
            title="Teslimat Bildirimleri"
          >
            <Bell className={`w-4 h-4 ${unreadCount > 0 ? 'text-amber-400' : 'text-stone-300'}`} />
            <span className="hidden sm:inline">Bildirimler</span>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black rounded-full bg-red-500 text-white shadow-xs">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Yenile</span>
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-600/80 hover:bg-red-600 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Çıkış</span>
          </button>
        </div>
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

      {/* Navigation Tabs - Explicitly Matching Prompt Menus */}
      <div className="bg-white rounded-2xl border border-stone-200 p-2 shadow-xs flex items-center gap-1.5 overflow-x-auto text-xs font-bold">
        {[
          { id: 'overview', label: 'Genel Bakış', icon: Sparkles },
          { id: 'notifications', label: 'Teslimat Bildirimleri', icon: Bell, badge: unreadCount },
          { id: 'add_need', label: 'Öğrenci Tanımlama', icon: UserPlus },
          { id: 'needs_list', label: 'İhtiyaç Sahibi Öğrenciler', icon: GraduationCap },
          { id: 'food_pool', label: 'Dayanışma Havuzu', icon: Heart },
          { id: 'education_support', label: 'Eğitim Desteği', icon: BookOpen },
          { id: 'allocations', label: 'Ürün Tahsis İşlemleri', icon: PackageCheck },
          { id: 'need_codes', label: 'İhtiyaç Kodları', icon: Key },
          { id: 'deliveries', label: 'Teslimat Takibi', icon: Truck },
          { id: 'history', label: 'Destek Geçmişi', icon: History },
          { id: 'reports', label: 'Raporlar', icon: FileText },
          { id: 'profile', label: 'Profil ve Güvenlik', icon: User },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeMenu === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveMenu(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl whitespace-nowrap transition-all cursor-pointer relative ${
                isActive
                  ? 'bg-blue-800 text-white shadow-xs'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && tab.badge > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  isActive ? 'bg-red-500 text-white' : 'bg-red-600 text-white'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 1. GENEL BAKIŞ */}
      {activeMenu === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs">
              <span className="text-[11px] font-bold text-stone-400 block uppercase">Aktif İhtiyaçlar</span>
              <p className="text-2xl font-black text-amber-700 mt-1">{activeNeeds.length}</p>
              <span className="text-[10px] text-stone-500 font-medium">Destek bekleyen öğrenci</span>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs">
              <span className="text-[11px] font-bold text-stone-400 block uppercase">Kantinde Bekleyen</span>
              <p className="text-2xl font-black text-purple-700 mt-1">{pendingAllocations.length}</p>
              <span className="text-[10px] text-purple-600 font-medium">Teslim bekliyor</span>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs">
              <span className="text-[11px] font-bold text-stone-400 block uppercase">Tamamlanan Teslimat</span>
              <p className="text-2xl font-black text-emerald-700 mt-1">{deliveredAllocations.length}</p>
              <span className="text-[10px] text-emerald-600 font-medium">Öğrenciye ulaştı</span>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs">
              <span className="text-[11px] font-bold text-stone-400 block uppercase">Mevcut Bağış Stoğu</span>
              <p className="text-2xl font-black text-blue-700 mt-1">
                {foodStock.reduce((s, i) => s + i.availableQuantity, 0) + stationeryStock.reduce((s, i) => s + i.availableQuantity, 0)}
              </p>
              <span className="text-[10px] text-blue-600 font-medium">Dağıtıma uygun ürün</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center">
                    <Heart className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-stone-900">Dayanışma Havuzu (Gıda)</h3>
                </div>
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                  {foodStock.reduce((s, i) => s + i.availableQuantity, 0)} Porsiyon Hazır
                </span>
              </div>
              <p className="text-xs text-stone-500 leading-relaxed">
                İhtiyaç sahibi öğrencilere kantinden taze sandviç, tost, meyve ve süt gibi beslenme ürünleri tahsis edin.
              </p>
              <button
                onClick={() => setActiveMenu('food_pool')}
                className="w-full py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Dayanışma Havuzu Tahsisini Aç
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-stone-900">Eğitim Desteği (Kırtasiye)</h3>
                </div>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                  {stationeryStock.reduce((s, i) => s + i.availableQuantity, 0)} Ürün Hazır
                </span>
              </div>
              <p className="text-xs text-stone-500 leading-relaxed">
                Defter, boya kalemleri, kalem kutusu ve kırtasiye seti gibi eğitim malzemelerini öğrencilere tahsis edin.
              </p>
              <button
                onClick={() => setActiveMenu('education_support')}
                className="w-full py-2 bg-blue-800 hover:bg-blue-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Eğitim Desteği Tahsisini Aç
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BİLDİRİMLER PANELİ */}
      {activeMenu === 'notifications' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-stone-900">Öğrenci Destek Teslimat Bildirimleri</h2>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Kantin görevlisinin öğrenciye teslim ettiği Dayanışma Havuzu ve Eğitim Desteği materyalleri anlık olarak buraya yansır.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Tümünü Okundu Say
                </button>
              )}
              <button
                onClick={fetchNotifications}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Yenile
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold">
            <button
              onClick={() => setNotificationFilter('all')}
              className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
                notificationFilter === 'all'
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Tümü ({notifications.length})
            </button>
            <button
              onClick={() => setNotificationFilter('food_pool')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
                notificationFilter === 'food_pool'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              Dayanışma Havuzu ({notifications.filter(n => n.supportType === 'food_pool').length})
            </button>
            <button
              onClick={() => setNotificationFilter('education_support')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
                notificationFilter === 'education_support'
                  ? 'bg-blue-700 text-white'
                  : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Eğitim Desteği ({notifications.filter(n => n.supportType === 'education_support').length})
            </button>
            {unreadCount > 0 && (
              <button
                onClick={() => setNotificationFilter('unread')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
                  notificationFilter === 'unread'
                    ? 'bg-red-600 text-white'
                    : 'bg-red-50 text-red-700 hover:bg-red-100'
                }`}
              >
                Okunmamışlar ({unreadCount})
              </button>
            )}
          </div>

          {/* Notifications List */}
          {notifications.length === 0 || (
            notifications.filter(n => {
              if (notificationFilter === 'food_pool') return n.supportType === 'food_pool';
              if (notificationFilter === 'education_support') return n.supportType === 'education_support';
              if (notificationFilter === 'unread') return !n.read;
              return true;
            }).length === 0
          ) ? (
            <div className="p-12 text-center border border-dashed border-stone-200 rounded-2xl bg-stone-50/50 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 mx-auto flex items-center justify-center">
                <BellOff className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-stone-800">Henüz Teslimat Bildirimi Bulunmuyor</h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Kantin görevlisi tahsis ettiğiniz Dayanışma Havuzu veya Eğitim Desteği ürünlerini öğrenciye teslim ettiğinde, bu ekranda anlık olarak listelenecektir.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications
                .filter(n => {
                  if (notificationFilter === 'food_pool') return n.supportType === 'food_pool';
                  if (notificationFilter === 'education_support') return n.supportType === 'education_support';
                  if (notificationFilter === 'unread') return !n.read;
                  return true;
                })
                .map(notif => {
                  const isFood = notif.supportType === 'food_pool';
                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                        !notif.read
                          ? 'bg-blue-50/30 border-blue-200 hover:border-blue-300 shadow-xs'
                          : 'bg-white border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-start gap-3.5 flex-1">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isFood ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {isFood ? <Heart className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                        </div>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                isFood
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-blue-50 text-blue-800 border-blue-200'
                              }`}
                            >
                              {isFood ? '🍲 Dayanışma Havuzu' : '📚 Eğitim Desteği'}
                            </span>
                            {!notif.read && (
                              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                            )}
                            <h4 className="text-xs font-bold text-stone-900">{notif.title}</h4>
                          </div>

                          <p className="text-xs text-stone-600 leading-snug">{notif.message}</p>

                          <div className="flex items-center gap-3 text-[11px] text-stone-400 font-mono pt-0.5">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(notif.createdAt).toLocaleString('tr-TR')}
                            </span>
                            {notif.allocationId && (
                              <span className="text-stone-500 font-bold">
                                Tahsis ID: {notif.allocationId}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleMarkAsRead(notif.id);
                          }}
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                            notif.read
                              ? 'text-stone-400 hover:text-stone-600'
                              : 'text-blue-700 bg-blue-100 hover:bg-blue-200'
                          }`}
                        >
                          {notif.read ? 'Okundu' : 'Okundu Yap'}
                        </button>
                        <button
                          onClick={() => handleNotificationClick(notif)}
                          className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 cursor-pointer transition-colors"
                        >
                          <span>Detaya Git</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* 2. ÖĞRENCİ TANIMLAMA VE İHTİYAÇ KAYDI */}
      {activeMenu === 'add_need' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-6 max-w-2xl">
          <div>
            <h2 className="text-lg font-bold text-stone-900">Yeni Öğrenci İhtiyaç Kaydı Oluştur</h2>
            <p className="text-xs text-stone-500">
              Kayıt oluşturulduğunda sistem tahmin edilemez benzersiz bir ihtiyaç kodu üretecektir.
            </p>
          </div>

          {createdNeedResult && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                <CheckCircle className="w-4 h-4" />
                <span>İhtiyaç kaydı başarıyla açıldı!</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-emerald-200 space-y-1 text-xs font-mono text-stone-700">
                <p><strong>Öğrenci:</strong> {createdNeedResult.need.studentName} ({createdNeedResult.need.grade}/{createdNeedResult.need.classroom})</p>
                <p><strong>Okul No:</strong> {createdNeedResult.need.studentReferenceId}</p>
                <div className="flex items-center justify-between p-2 bg-emerald-100 rounded-lg font-bold text-emerald-900 mt-2">
                  <span>Üretilen İhtiyaç Kodu: {createdNeedResult.code}</span>
                  <button
                    onClick={() => handleCopyCode(createdNeedResult.code)}
                    className="flex items-center gap-1 text-[11px] bg-white px-2 py-1 rounded border border-emerald-300 cursor-pointer"
                  >
                    {copiedCode === createdNeedResult.code ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                    Kopyala
                  </button>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleCreateNeed} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Öğrenci Adı Soyadı *</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Emre Can"
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-stone-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Kurum İçi Öğrenci No / Kayıt No *</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: 1048"
                  value={studentRefId}
                  onChange={e => setStudentRefId(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-stone-200 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Sınıf *</label>
                <select
                  value={grade}
                  onChange={e => setGrade(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-stone-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="1. Sınıf">1. Sınıf</option>
                  <option value="2. Sınıf">2. Sınıf</option>
                  <option value="3. Sınıf">3. Sınıf</option>
                  <option value="4. Sınıf">4. Sınıf</option>
                  <option value="5. Sınıf">5. Sınıf</option>
                  <option value="6. Sınıf">6. Sınıf</option>
                  <option value="7. Sınıf">7. Sınıf</option>
                  <option value="8. Sınıf">8. Sınıf</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Şube *</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: 3-B veya 4-A"
                  value={classroom}
                  onChange={e => setClassroom(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-stone-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">İhtiyaç Türü *</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'food', label: 'Yiyecek Desteği' },
                  { id: 'stationery', label: 'Kırtasiye Desteği' },
                  { id: 'both', label: 'Hem Gıda Hem Kırtasiye' },
                  { id: 'other', label: 'Diğer Eğitim Desteği' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setNeedType(opt.id as any)}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                      needType === opt.id
                        ? 'border-blue-700 bg-blue-50 text-blue-900 shadow-xs'
                        : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">İhtiyaç Açıklaması (Gizli - Yalnızca Rehberlik Görür)</label>
              <textarea
                rows={3}
                placeholder="Öğrencinin durumu hakkında kısa rehberlik notu..."
                value={needDescription}
                onChange={e => setNeedDescription(e.target.value)}
                className="w-full text-xs p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-800 hover:bg-blue-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              Öğrenci İhtiyaç Kaydını Oluştur ve Kod Üret
            </button>
          </form>
        </div>
      )}

      {/* 3. İHTİYAÇ SAHİBİ ÖĞRENCİLER */}
      {activeMenu === 'needs_list' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-stone-900">Tanımlı İhtiyaç Sahibi Öğrenciler</h2>
              <p className="text-xs text-stone-500">
                Sistemde kayıtlı öğrenci ihtiyaçları ve kendilerine tahsis edilen gizli kodlar.
              </p>
            </div>
            <button
              onClick={() => setActiveMenu('add_need')}
              className="px-3 py-1.5 bg-blue-800 hover:bg-blue-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              + Yeni Öğrenci Ekle
            </button>
          </div>

          <div className="overflow-x-auto border border-stone-100 rounded-2xl">
            <table className="w-full text-left text-xs text-stone-600">
              <thead className="bg-stone-50 text-stone-700 uppercase font-bold text-[10px] tracking-wider border-b border-stone-100">
                <tr>
                  <th className="px-4 py-3">Öğrenci Ad Soyad</th>
                  <th className="px-4 py-3">Okul No</th>
                  <th className="px-4 py-3">Sınıf/Şube</th>
                  <th className="px-4 py-3">İhtiyaç Türü</th>
                  <th className="px-4 py-3">İhtiyaç Kodu</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3 text-right">Tahsis / İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {needs.map(n => (
                  <tr key={n.id} className="hover:bg-stone-50/50">
                    <td className="px-4 py-3 font-bold text-stone-900">{n.studentName}</td>
                    <td className="px-4 py-3 font-mono text-stone-500">{n.studentReferenceId}</td>
                    <td className="px-4 py-3 font-medium text-stone-700">{n.grade} / {n.classroom}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-800">
                        {n.needType === 'food' ? 'Gıda Desteği' : n.needType === 'stationery' ? 'Kırtasiye Desteği' : 'Gıda + Kırtasiye'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 font-mono font-bold text-blue-900 bg-blue-50 px-2 py-1 rounded-lg w-fit">
                        <span>{n.needCodeReference}</span>
                        <button
                          onClick={() => handleCopyCode(n.needCodeReference)}
                          className="text-stone-400 hover:text-stone-600 ml-1 cursor-pointer"
                          title="Kopyala"
                        >
                          {copiedCode === n.needCodeReference ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          n.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-stone-100 text-stone-500'
                        }`}
                      >
                        {n.status === 'active' ? 'Aktif İhtiyaç' : 'Kapatıldı'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1.5">
                      {n.status === 'active' && (
                        <>
                          <button
                            onClick={() => openAllocationFlow(n, 'food_pool')}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg font-bold text-[11px] cursor-pointer"
                          >
                            Yemek Tahsis Et
                          </button>
                          <button
                            onClick={() => openAllocationFlow(n, 'education_support')}
                            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg font-bold text-[11px] cursor-pointer"
                          >
                            Kırtasiye Tahsis Et
                          </button>
                          <button
                            onClick={() => handleRenewCode(n.id)}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg font-bold text-[11px] cursor-pointer"
                            title="Kodu yenile"
                          >
                            Kodu Yenile
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. DAYANIŞMA HAVUZU (GIDA TAHSİS MODÜLÜ) */}
      {activeMenu === 'food_pool' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-bold text-stone-900">Dayanışma Havuzu — Yiyecek & İçecek Tahsisi</h2>
              </div>
              <p className="text-xs text-stone-500">
                Velilerin satın alarak oluşturduğu Dayanışma Havuzu stoklarından ihtiyaç sahibi öğrencilere gıda tahsis edin.
              </p>
            </div>
            {selectedNeed && (
              <span className="px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                Seçili: {selectedNeed.studentName} ({selectedNeed.grade}/{selectedNeed.classroom})
              </span>
            )}
          </div>

          {!selectedNeed ? (
            <div className="p-8 text-center border-2 border-dashed border-stone-200 rounded-2xl space-y-3">
              <Heart className="w-10 h-10 text-stone-300 mx-auto" />
              <p className="text-sm font-bold text-stone-700">Lütfen önce gıda tahsisi yapılacak öğrenciyi seçin</p>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {activeNeeds.map(n => (
                  <button
                    key={n.id}
                    onClick={() => setSelectedNeed(n)}
                    className="px-3 py-1.5 rounded-xl border border-stone-200 hover:border-emerald-500 text-xs font-bold text-stone-800 hover:bg-emerald-50 cursor-pointer transition-colors"
                  >
                    {n.studentName} ({n.classroom})
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitAllocation} className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Havuzda Mevcut Kantin Ürünleri (Yalnızca Stokta Olanlar)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {foodStock.map(item => {
                    const isSelected = selectedItems.some(i => i.productId === item.productId);
                    const selectedQty = selectedItems.find(i => i.productId === item.productId)?.quantity || 1;
                    return (
                      <div
                        key={item.productId}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/40 shadow-xs'
                            : 'border-stone-200 bg-white hover:border-stone-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-bold text-stone-900">{item.productName}</p>
                            <span className="text-[10px] text-stone-400">{item.categoryName}</span>
                          </div>
                          <span className="text-xs font-mono font-bold text-emerald-800">₺{item.unitPrice}</span>
                        </div>

                        <div className="mt-3 flex items-center justify-between text-xs">
                          <span className="text-[11px] font-bold text-stone-500">
                            Havuz Stoğu: <strong className="text-emerald-700">{item.availableQuantity} adet</strong>
                          </span>

                          {isSelected ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleUpdateItemQty(item.productId, selectedQty - 1, item.availableQuantity)}
                                className="w-6 h-6 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold flex items-center justify-center cursor-pointer"
                              >
                                -
                              </button>
                              <span className="font-bold font-mono px-1">{selectedQty}</span>
                              <button
                                type="button"
                                onClick={() => handleUpdateItemQty(item.productId, selectedQty + 1, item.availableQuantity)}
                                className="w-6 h-6 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold flex items-center justify-center cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleItem(item.productId, item.availableQuantity)}
                              className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            >
                              Tahsis Et
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-100">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Tahsis Nedeni / Kısa Gizli Açıklama</label>
                  <input
                    type="text"
                    value={justificationNote}
                    onChange={e => setJustificationNote(e.target.value)}
                    placeholder="Örn: Teneffüs beslenme desteği"
                    className="w-full text-xs px-3 py-2 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Teslimat / Geçerlilik Tarihi</label>
                  <input
                    type="text"
                    value={validUntil}
                    onChange={e => setValidUntil(e.target.value)}
                    placeholder="Örn: Bugün"
                    className="w-full text-xs px-3 py-2 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setSelectedNeed(null)}
                  className="px-4 py-2 border border-stone-200 text-stone-600 rounded-xl text-xs font-bold hover:bg-stone-50 cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={selectedItems.length === 0}
                  className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  Gıda Tahsisini Onayla ve Kantinciye İlet ({selectedItems.length} Ürün)
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* 5. EĞİTİM DESTEĞİ (KIRTASİYE TAHSİS MODÜLÜ) */}
      {activeMenu === 'education_support' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-stone-900">Eğitim Desteği — Kırtasiye & Okul Malzemeleri</h2>
              </div>
              <p className="text-xs text-stone-500">
                Defter, boya, kalem ve okul kiti gibi kırtasiye ürünlerini öğrencilere tahsis edin.
              </p>
            </div>
            {selectedNeed && (
              <span className="px-3 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold">
                Seçili: {selectedNeed.studentName} ({selectedNeed.grade}/{selectedNeed.classroom})
              </span>
            )}
          </div>

          {!selectedNeed ? (
            <div className="p-8 text-center border-2 border-dashed border-stone-200 rounded-2xl space-y-3">
              <BookOpen className="w-10 h-10 text-stone-300 mx-auto" />
              <p className="text-sm font-bold text-stone-700">Lütfen önce kırtasiye tahsisi yapılacak öğrenciyi seçin</p>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {activeNeeds.map(n => (
                  <button
                    key={n.id}
                    onClick={() => {
                      setSelectedNeed(n);
                      setSelectedSupportType('education_support');
                    }}
                    className="px-3 py-1.5 rounded-xl border border-stone-200 hover:border-blue-500 text-xs font-bold text-stone-800 hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    {n.studentName} ({n.classroom})
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitAllocation} className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Mevcut Kırtasiye Bağış Havuzu
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {stationeryStock.map(item => {
                    const isSelected = selectedItems.some(i => i.productId === item.productId);
                    const selectedQty = selectedItems.find(i => i.productId === item.productId)?.quantity || 1;
                    return (
                      <div
                        key={item.productId}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                            : 'border-stone-200 bg-white hover:border-stone-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-bold text-stone-900">{item.productName}</p>
                            <span className="text-[10px] text-stone-400">{item.categoryName}</span>
                          </div>
                          <span className="text-xs font-mono font-bold text-blue-800">₺{item.unitPrice}</span>
                        </div>

                        <div className="mt-3 flex items-center justify-between text-xs">
                          <span className="text-[11px] font-bold text-stone-500">
                            Havuz Stoğu: <strong className="text-blue-700">{item.availableQuantity} adet</strong>
                          </span>

                          {isSelected ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleUpdateItemQty(item.productId, selectedQty - 1, item.availableQuantity)}
                                className="w-6 h-6 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold flex items-center justify-center cursor-pointer"
                              >
                                -
                              </button>
                              <span className="font-bold font-mono px-1">{selectedQty}</span>
                              <button
                                type="button"
                                onClick={() => handleUpdateItemQty(item.productId, selectedQty + 1, item.availableQuantity)}
                                className="w-6 h-6 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold flex items-center justify-center cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleItem(item.productId, item.availableQuantity)}
                              className="px-2.5 py-1 bg-blue-800 hover:bg-blue-900 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            >
                              Tahsis Et
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-100">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Tahsis Nedeni / Açıklama</label>
                  <input
                    type="text"
                    value={justificationNote}
                    onChange={e => setJustificationNote(e.target.value)}
                    placeholder="Örn: Matematik dersi için defter ve kalem temini"
                    className="w-full text-xs px-3 py-2 border border-stone-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Geçerlilik Tarihi</label>
                  <input
                    type="text"
                    value={validUntil}
                    onChange={e => setValidUntil(e.target.value)}
                    placeholder="Örn: Bugün"
                    className="w-full text-xs px-3 py-2 border border-stone-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setSelectedNeed(null)}
                  className="px-4 py-2 border border-stone-200 text-stone-600 rounded-xl text-xs font-bold hover:bg-stone-50 cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={selectedItems.length === 0}
                  className="px-5 py-2.5 bg-blue-800 hover:bg-blue-900 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  Kırtasiye Tahsisini Onayla ve Kantinciye İlet ({selectedItems.length} Ürün)
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* 6. ÜRÜN TAHSİS İŞLEMLERİ */}
      {activeMenu === 'allocations' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-stone-900">Ürün Tahsis İşlemleri ve Takibi</h2>
              <p className="text-xs text-stone-500">
                Oluşturulan tüm tahsislerin güncel teslimat ve iptal durumları.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto border border-stone-100 rounded-2xl">
            <table className="w-full text-left text-xs text-stone-600">
              <thead className="bg-stone-50 text-stone-700 uppercase font-bold text-[10px] tracking-wider border-b border-stone-100">
                <tr>
                  <th className="px-4 py-3">Tahsis No</th>
                  <th className="px-4 py-3">Öğrenci Ad Soyad</th>
                  <th className="px-4 py-3">Sınıf/Şube</th>
                  <th className="px-4 py-3">Destek Türü</th>
                  <th className="px-4 py-3">Ürünler</th>
                  <th className="px-4 py-3">İhtiyaç Kodu</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {allocations.map(a => (
                  <tr key={a.id} className="hover:bg-stone-50/50">
                    <td className="px-4 py-3 font-mono font-bold text-stone-900">{a.allocationNumber}</td>
                    <td className="px-4 py-3 font-bold text-stone-900">{a.studentNameSnapshot}</td>
                    <td className="px-4 py-3 text-stone-600">{a.studentClassSnapshot}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        a.supportType === 'food_pool' ? 'bg-emerald-50 text-emerald-800' : 'bg-blue-50 text-blue-800'
                      }`}>
                        {a.supportType === 'food_pool' ? 'Dayanışma (Gıda)' : 'Eğitim (Kırtasiye)'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-800 font-medium">
                      {a.items.map(it => `${it.productNameSnapshot} (${it.quantityAllocated} adet)`).join(', ')}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-stone-700">{a.needCodeReference}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        a.status === 'fully_delivered'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : a.status === 'cancelled'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {a.status === 'fully_delivered'
                          ? 'Teslim Edildi'
                          : a.status === 'cancelled'
                          ? 'İptal Edildi'
                          : 'Kantinde Hazır (Teslim Bekliyor)'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {a.status !== 'fully_delivered' && a.status !== 'cancelled' && (
                        <button
                          onClick={() => setCancelAllocationId(a.id)}
                          className="px-2.5 py-1 text-[11px] font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg cursor-pointer transition-colors"
                        >
                          İptal Et
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cancel Modal */}
          {cancelAllocationId && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-stone-200 space-y-4">
                <h3 className="font-bold text-base text-stone-900">Tahsis İptali</h3>
                <p className="text-xs text-stone-600">
                  Bu tahsisi iptal ettiğinizde ayrılan ürünler otomatik olarak Dayanışma / Kırtasiye havuzuna iade edilir.
                </p>
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">İptal Gerekçesi</label>
                  <input
                    type="text"
                    value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                    placeholder="Örn: Yanlış ürün seçimi veya veli talebi"
                    className="w-full text-xs px-3 py-2 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setCancelAllocationId(null)}
                    className="px-3 py-1.5 rounded-xl border border-stone-200 text-stone-600 text-xs font-bold hover:bg-stone-50 cursor-pointer"
                  >
                    Vazgeç
                  </button>
                  <button
                    onClick={handleExecuteCancelAllocation}
                    className="px-3.5 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 cursor-pointer"
                  >
                    Tahsisi İptal Et ve Stoğu İade Et
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 7. İHTİYAÇ KODLARI */}
      {activeMenu === 'need_codes' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-lg font-bold text-stone-900">Öğrenci İhtiyaç Kodları</h2>
            <p className="text-xs text-stone-500">
              Kriptografik olarak üretilmiş tahmin edilemez ihtiyaç kodları. Kantin görevlisine yalnızca bu kod verilerek teslimat yapılır.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {needs.map(n => (
              <div key={n.id} className="p-4 rounded-2xl border border-stone-200 bg-stone-50/50 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold text-stone-900">{n.studentName}</p>
                    <span className="text-[10px] text-stone-500">{n.grade} / {n.classroom} (No: {n.studentReferenceId})</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    n.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
                  }`}>
                    {n.status === 'active' ? 'Aktif' : 'Pasif'}
                  </span>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-blue-200 flex items-center justify-between font-mono font-bold text-sm text-blue-900">
                  <span>{n.needCodeReference}</span>
                  <button
                    onClick={() => handleCopyCode(n.needCodeReference)}
                    className="text-stone-400 hover:text-stone-600 cursor-pointer"
                    title="Kopyala"
                  >
                    {copiedCode === n.needCodeReference ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {n.status === 'active' && (
                  <button
                    onClick={() => handleRenewCode(n.id)}
                    className="w-full py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    Kodu Yenile
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. TESLİMAT TAKİBİ */}
      {activeMenu === 'deliveries' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-lg font-bold text-stone-900">Kantinci Teslimat Durumu Takibi</h2>
            <p className="text-xs text-stone-500">
              Kantin görevlisine aktarılan tahsislerin ve onaylanan teslimatların anlık durumu.
            </p>
          </div>

          <div className="overflow-x-auto border border-stone-100 rounded-2xl">
            <table className="w-full text-left text-xs text-stone-600">
              <thead className="bg-stone-50 text-stone-700 uppercase font-bold text-[10px] tracking-wider border-b border-stone-100">
                <tr>
                  <th className="px-4 py-3">Tahsis No</th>
                  <th className="px-4 py-3">Öğrenci</th>
                  <th className="px-4 py-3">Ürünler</th>
                  <th className="px-4 py-3">İhtiyaç Kodu</th>
                  <th className="px-4 py-3">Teslim Durumu</th>
                  <th className="px-4 py-3">Teslim Tarihi</th>
                  <th className="px-4 py-3">Teslim Eden Görevli</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {allocations.map(a => {
                  const isHighlighted = highlightedAllocationId === a.id;
                  return (
                    <tr
                      key={a.id}
                      className={`transition-colors ${
                        isHighlighted
                          ? 'bg-emerald-100 font-semibold ring-2 ring-emerald-500'
                          : 'hover:bg-stone-50/50'
                      }`}
                    >
                      <td className="px-4 py-3 font-mono font-bold text-stone-900 flex items-center gap-1.5">
                        {isHighlighted && <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />}
                        {a.allocationNumber}
                      </td>
                      <td className="px-4 py-3 font-bold text-stone-900">{a.studentNameSnapshot}</td>
                      <td className="px-4 py-3">{a.items.map(i => `${i.productNameSnapshot} (${i.quantityAllocated}x)`).join(', ')}</td>
                      <td className="px-4 py-3 font-mono font-bold text-stone-700">{a.needCodeReference}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          a.status === 'fully_delivered'
                            ? 'bg-emerald-50 text-emerald-700'
                            : a.status === 'cancelled'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {a.status === 'fully_delivered' ? 'Teslim Edildi ✅' : a.status === 'cancelled' ? 'İptal Edildi' : 'Kantin Hazırlıyor ⏳'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-stone-500">
                        {a.deliveredAt ? new Date(a.deliveredAt).toLocaleString('tr-TR') : '—'}
                      </td>
                      <td className="px-4 py-3 text-stone-700 font-medium">
                        {a.deliveredByCanteenName || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 9. DESTEK GEÇMİŞİ & 10. RAPORLAR */}
      {(activeMenu === 'history' || activeMenu === 'reports') && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-lg font-bold text-stone-900">
              {activeMenu === 'history' ? 'Sosyal Destek ve Tahsis Geçmişi' : 'Öğretmen Destek Raporları'}
            </h2>
            <p className="text-xs text-stone-500">
              Okulunuzda gerçekleştirilen destek faaliyetlerinin tarihsel arşivi.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
              <span className="text-[11px] font-bold text-stone-500 block uppercase">Toplam İhtiyaç Kaydı</span>
              <p className="text-2xl font-black text-stone-900 mt-1">{needs.length}</p>
            </div>
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
              <span className="text-[11px] font-bold text-stone-500 block uppercase">Toplam Tahsis İşlemi</span>
              <p className="text-2xl font-black text-blue-900 mt-1">{allocations.length}</p>
            </div>
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
              <span className="text-[11px] font-bold text-stone-500 block uppercase">Başarılı Teslimat</span>
              <p className="text-2xl font-black text-emerald-900 mt-1">{deliveredAllocations.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* 11. PROFİL VE GÜVENLİK */}
      {activeMenu === 'profile' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-6 max-w-xl">
          <div>
            <h2 className="text-lg font-bold text-stone-900">Öğretmen Profili ve Şifre Güvenliği</h2>
            <p className="text-xs text-stone-500">
              Kişisel oturum şifrenizi güvenli şekilde güncelleyebilirsiniz.
            </p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">Mevcut Şifre</label>
              <input
                type="password"
                required
                value={currentPass}
                onChange={e => setCurrentPass(e.target.value)}
                placeholder="Mevcut şifreniz"
                className="w-full text-xs px-3 py-2 border border-stone-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">Yeni Şifre</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                placeholder="En az 6 karakter"
                className="w-full text-xs px-3 py-2 border border-stone-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">Yeni Şifre Tekrar</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassRepeat}
                onChange={e => setNewPassRepeat(e.target.value)}
                placeholder="Yeni şifreyi onaylayın"
                className="w-full text-xs px-3 py-2 border border-stone-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="py-2.5 px-6 bg-blue-800 hover:bg-blue-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              Şifreyi Güncelle
            </button>
          </form>
        </div>
      )}

      {/* Notifications Slide-over Drawer */}
      {showNotificationDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setShowNotificationDrawer(false)}
          />

          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 overflow-hidden">
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Teslimat Bildirimleri</h3>
                  <span className="text-[11px] text-stone-500">{unreadCount} okunmamış bildirim</span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-[11px] font-bold text-stone-600 hover:text-stone-900 px-2 py-1 rounded hover:bg-stone-200/60 transition-colors cursor-pointer"
                  >
                    Tümü Okundu
                  </button>
                )}
                <button
                  onClick={() => setShowNotificationDrawer(false)}
                  className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Filters */}
            <div className="p-3 border-b border-stone-100 flex items-center gap-1.5 overflow-x-auto text-xs font-bold">
              <button
                onClick={() => setNotificationFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap text-[11px] ${
                  notificationFilter === 'all'
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                Tümü ({notifications.length})
              </button>
              <button
                onClick={() => setNotificationFilter('food_pool')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap text-[11px] ${
                  notificationFilter === 'food_pool'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                🍲 Gıda
              </button>
              <button
                onClick={() => setNotificationFilter('education_support')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap text-[11px] ${
                  notificationFilter === 'education_support'
                    ? 'bg-blue-700 text-white'
                    : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                }`}
              >
                📚 Eğitim
              </button>
            </div>

            {/* Drawer Body List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {notifications.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 mx-auto flex items-center justify-center">
                    <BellOff className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-stone-700">Henüz teslimat bildirimi yok</p>
                  <p className="text-[11px] text-stone-400 max-w-xs mx-auto">
                    Kantin görevlisi destek ürünlerini teslim ettiğinde bildirimler anında burada belirecektir.
                  </p>
                </div>
              ) : (
                notifications
                  .filter(n => {
                    if (notificationFilter === 'food_pool') return n.supportType === 'food_pool';
                    if (notificationFilter === 'education_support') return n.supportType === 'education_support';
                    if (notificationFilter === 'unread') return !n.read;
                    return true;
                  })
                  .map(notif => {
                    const isFood = notif.supportType === 'food_pool';
                    return (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                          !notif.read
                            ? 'bg-blue-50/40 border-blue-200 hover:border-blue-300'
                            : 'bg-white border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              isFood
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}
                          >
                            {isFood ? '🍲 Dayanışma Havuzu' : '📚 Eğitim Desteği'}
                          </span>
                          <span className="text-[10px] text-stone-400 font-mono">
                            {new Date(notif.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-stone-900">{notif.title}</h4>
                          <p className="text-xs text-stone-600 mt-0.5 leading-snug">{notif.message}</p>
                        </div>

                        <div className="pt-1 flex items-center justify-between text-[11px]">
                          <span className="text-emerald-700 font-bold hover:underline">
                            Teslimatı Görüntüle →
                          </span>
                          {!notif.read && (
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                              Yeni
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-stone-200 bg-stone-50 flex items-center justify-between text-xs">
              <button
                onClick={() => {
                  setShowNotificationDrawer(false);
                  setActiveMenu('notifications');
                }}
                className="text-blue-800 font-bold hover:underline cursor-pointer"
              >
                Geniş Bildirim Ekranını Aç
              </button>
              <button
                onClick={() => setShowNotificationDrawer(false)}
                className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold rounded-xl cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Toast Notification on Incoming Delivery */}
      {toastNotification && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md w-full bg-stone-900 border border-emerald-500/50 text-white p-4 rounded-2xl shadow-2xl flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              toastNotification.supportType === 'food_pool' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
            }`}
          >
            {toastNotification.supportType === 'food_pool' ? <Heart className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-emerald-400">{toastNotification.title}</h4>
              <span className="text-[10px] text-stone-400">Şimdi</span>
            </div>
            <p className="text-xs text-stone-200 mt-1 leading-snug">{toastNotification.message}</p>
            <div className="mt-2.5 flex items-center gap-2">
              <button
                onClick={() => handleNotificationClick(toastNotification)}
                className="text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-500 px-3 py-1 rounded-lg transition-colors cursor-pointer"
              >
                Teslimatı Görüntüle
              </button>
              <button
                onClick={() => setToastNotification(null)}
                className="text-[11px] text-stone-400 hover:text-stone-200 px-2 py-1 cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
