import React, { useState } from 'react';
import {
  UtensilsCrossed,
  ShoppingBag,
  Bell,
  Heart,
  BookOpen,
  Users,
  ClipboardList,
  Store,
  BarChart3,
  ShieldCheck,
  ChevronDown,
  LogOut,
  Sparkles,
  School,
  Check,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { KvkkModal } from './modals/KvkkModal.tsx';
import { AuthModal } from './modals/AuthModal.tsx';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenCart: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenCart,
}) => {
  const {
    user,
    cartCount,
    notifications,
    unreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    quickUsers,
    quickLogin,
    logout,
  } = useAuth();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isKvkkOpen, setIsKvkkOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-stone-200/80 shadow-xs">
        {/* Top Announcement Bar */}
        <div className="bg-emerald-950 text-emerald-100 text-[11px] py-1 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-4xl mx-auto w-full justify-between">
            <div className="flex items-center gap-1.5 font-medium">
              <School className="w-3.5 h-3.5 text-emerald-400" />
              <span>Atatürk İlkokulu ve Ortaokulu</span>
              <span className="text-emerald-500">·</span>
              <span className="hidden sm:inline text-emerald-300">Sıranı bekleme, iyiliği paylaş!</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="bg-emerald-800 text-emerald-200 text-[10px] px-2 py-0.5 rounded font-mono">
                Akıllı Teneffüs Sistemi
              </span>
              <button
                onClick={() => setIsKvkkOpen(true)}
                className="hover:text-white underline text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Info className="w-3 h-3" />
                KVKK & Bilgi
              </button>
            </div>
          </div>
        </div>

        {/* Main Navbar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab(user?.role === 'canteen' ? 'canteen_orders' : 'menu')}
                className="flex items-center gap-2.5 text-left group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-800 text-white flex items-center justify-center shadow-xs group-hover:bg-emerald-900 transition-colors">
                  <UtensilsCrossed className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-xl tracking-tight text-emerald-950 font-serif">
                      KantinCep
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-200">
                      v1.0
                    </span>
                  </div>
                  <p className="text-[10px] text-stone-500 font-medium -mt-0.5">
                    Okul Kantini & Sosyal Dayanışma
                  </p>
                </div>
              </button>
            </div>

            {/* Navigation Links based on Role */}
            <nav className="hidden md:flex items-center gap-1">
              {user?.role === 'parent' && (
                <>
                  <button
                    onClick={() => setActiveTab('menu')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'menu'
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    Menü & Sipariş
                  </button>

                  <button
                    onClick={() => setActiveTab('orders')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'orders'
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    Siparişlerim
                  </button>

                  <button
                    onClick={() => setActiveTab('food_pool')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeTab === 'food_pool'
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'text-emerald-900 hover:bg-emerald-50'
                    }`}
                  >
                    <Heart className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500" />
                    Dayanışma Havuzu
                  </button>

                  <button
                    onClick={() => setActiveTab('education_support')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeTab === 'education_support'
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'text-blue-900 hover:bg-blue-50'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                    Eğitime Destek
                  </button>

                  <button
                    onClick={() => setActiveTab('students')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'students'
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    Öğrencilerim
                  </button>
                </>
              )}

              {user?.role === 'canteen' && (
                <>
                  <button
                    onClick={() => setActiveTab('canteen_orders')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeTab === 'canteen_orders'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    Canlı Siparişler
                  </button>

                  <button
                    onClick={() => setActiveTab('canteen_products')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeTab === 'canteen_products'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <Store className="w-3.5 h-3.5" />
                    Ürün & Stok
                  </button>

                  <button
                    onClick={() => setActiveTab('canteen_donations')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeTab === 'canteen_donations'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <Heart className="w-3.5 h-3.5 text-emerald-600" />
                    Dayanışma & Dağıtım
                  </button>

                  <button
                    onClick={() => setActiveTab('canteen_reports')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeTab === 'canteen_reports'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    Raporlar & Analiz
                  </button>
                </>
              )}

              {user?.role === 'admin' && (
                <>
                  <button
                    onClick={() => setActiveTab('admin_dashboard')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeTab === 'admin_dashboard'
                        ? 'bg-blue-800 text-white shadow-xs'
                        : 'text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Yönetim & Güvenlik
                  </button>

                  <button
                    onClick={() => setActiveTab('canteen_orders')}
                    className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900"
                  >
                    Kantin Ekranı
                  </button>

                  <button
                    onClick={() => setActiveTab('menu')}
                    className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900"
                  >
                    Veli Ekranı
                  </button>
                </>
              )}
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2">
              {/* Cart Button (for parents) */}
              {user?.role === 'parent' && (
                <button
                  onClick={onOpenCart}
                  className="relative p-2.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 hover:border-emerald-600 transition-colors cursor-pointer flex items-center gap-1.5"
                  title="Sepeti Görüntüle"
                >
                  <ShoppingBag className="w-5 h-5 text-emerald-800" />
                  {cartCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </button>
              )}

              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  className="relative p-2.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer"
                  title="Bildirimler"
                >
                  <Bell className="w-5 h-5" />
                  {unreadNotificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center">
                      {unreadNotificationCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {isNotifOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden z-50">
                    <div className="p-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-800">Uygulama Bildirimleri</span>
                      {unreadNotificationCount > 0 && (
                        <button
                          onClick={markAllNotificationsAsRead}
                          className="text-[11px] text-emerald-800 hover:underline"
                        >
                          Tümünü Okundu Say
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-stone-100">
                      {notifications.length === 0 ? (
                        <p className="p-6 text-center text-xs text-stone-400">Henüz bildirim bulunmuyor.</p>
                      ) : (
                        notifications.map(n => (
                          <div
                            key={n.id}
                            onClick={() => markNotificationAsRead(n.id)}
                            className={`p-3.5 transition-colors cursor-pointer ${
                              n.read ? 'bg-white opacity-70' : 'bg-emerald-50/40'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-bold text-stone-900">{n.title}</p>
                              {!n.read && (
                                <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0 mt-1" />
                              )}
                            </div>
                            <p className="text-xs text-stone-600 mt-1">{n.message}</p>
                            <span className="text-[10px] text-stone-400 block mt-1">
                              {new Date(n.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User / Role Switcher Profile Button */}
              <div className="relative">
                {user ? (
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="p-1.5 pl-3 rounded-xl border border-stone-200 hover:border-stone-300 flex items-center gap-2 transition-colors cursor-pointer bg-stone-50"
                  >
                    <div className="text-left hidden sm:block">
                      <p className="text-xs font-bold text-stone-900 truncate max-w-[120px]">{user.fullName}</p>
                      <p className="text-[10px] text-stone-500 uppercase font-semibold">
                        {user.role === 'parent' ? '👨‍👩‍👦 Veli' : user.role === 'canteen' ? '🥪 Kantinci' : '🛡️ Yönetici'}
                      </p>
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-emerald-800 text-white font-bold text-xs flex items-center justify-center">
                      {user.fullName.charAt(0)}
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                  </button>
                ) : (
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Giriş / Kayıt
                  </button>
                )}

                {/* User Menu Dropdown */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden z-50">
                    <div className="p-3.5 bg-stone-50 border-b border-stone-200">
                      <p className="text-xs font-bold text-stone-900">{user?.fullName}</p>
                      <p className="text-[11px] text-stone-500">{user?.email}</p>
                      <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        {user?.role === 'parent' ? 'Veli Hesabı' : user?.role === 'canteen' ? 'Kantin İşletmecisi' : 'Sistem Yöneticisi'}
                      </span>
                    </div>

                    {/* Quick Demo Switcher Section */}
                    <div className="p-2 border-b border-stone-100">
                      <p className="text-[10px] uppercase font-bold text-stone-400 px-2 py-1 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        Test İçin Hızlı Rol Değiştir:
                      </p>
                      {quickUsers.map(q => (
                        <button
                          key={q.id}
                          onClick={() => {
                            quickLogin(q.id);
                            setIsUserMenuOpen(false);
                            if (q.role === 'canteen') setActiveTab('canteen_orders');
                            else if (q.role === 'admin') setActiveTab('admin_dashboard');
                            else setActiveTab('menu');
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between hover:bg-stone-100 transition-colors cursor-pointer ${
                            user?.id === q.id ? 'font-bold text-emerald-900 bg-emerald-50' : 'text-stone-700'
                          }`}
                        >
                          <div>
                            <span className="block truncate">{q.fullName}</span>
                            <span className="text-[10px] text-stone-400">
                              {q.role === 'parent' ? 'Veli' : q.role === 'canteen' ? 'Kantinci' : 'Yönetici'}
                            </span>
                          </div>
                          {user?.id === q.id && <Check className="w-3.5 h-3.5 text-emerald-700" />}
                        </button>
                      ))}
                    </div>

                    <div className="p-1">
                      <button
                        onClick={() => {
                          logout();
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Güvenli Çıkış Yap
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Submenu Bar */}
        <div className="md:hidden border-t border-stone-200 bg-stone-50 px-2 py-1.5 flex overflow-x-auto gap-1">
          {user?.role === 'parent' && (
            <>
              <button
                onClick={() => setActiveTab('menu')}
                className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap font-bold ${
                  activeTab === 'menu' ? 'bg-emerald-800 text-white' : 'text-stone-700'
                }`}
              >
                Menü
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap font-bold ${
                  activeTab === 'orders' ? 'bg-emerald-800 text-white' : 'text-stone-700'
                }`}
              >
                Siparişlerim
              </button>
              <button
                onClick={() => setActiveTab('food_pool')}
                className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap font-bold flex items-center gap-1 ${
                  activeTab === 'food_pool' ? 'bg-emerald-800 text-white' : 'text-emerald-900'
                }`}
              >
                <Heart className="w-3 h-3 text-emerald-500 fill-emerald-500" />
                Dayanışma
              </button>
              <button
                onClick={() => setActiveTab('education_support')}
                className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap font-bold flex items-center gap-1 ${
                  activeTab === 'education_support' ? 'bg-blue-800 text-white' : 'text-blue-900'
                }`}
              >
                <BookOpen className="w-3 h-3 text-blue-600" />
                Eğitim
              </button>
              <button
                onClick={() => setActiveTab('students')}
                className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap font-bold ${
                  activeTab === 'students' ? 'bg-emerald-800 text-white' : 'text-stone-700'
                }`}
              >
                Öğrenciler
              </button>
            </>
          )}

          {user?.role === 'canteen' && (
            <>
              <button
                onClick={() => setActiveTab('canteen_orders')}
                className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap font-bold ${
                  activeTab === 'canteen_orders' ? 'bg-amber-600 text-white' : 'text-stone-700'
                }`}
              >
                Siparişler
              </button>
              <button
                onClick={() => setActiveTab('canteen_products')}
                className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap font-bold ${
                  activeTab === 'canteen_products' ? 'bg-amber-600 text-white' : 'text-stone-700'
                }`}
              >
                Ürün & Stok
              </button>
              <button
                onClick={() => setActiveTab('canteen_donations')}
                className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap font-bold ${
                  activeTab === 'canteen_donations' ? 'bg-amber-600 text-white' : 'text-stone-700'
                }`}
              >
                Dayanışma
              </button>
              <button
                onClick={() => setActiveTab('canteen_reports')}
                className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap font-bold ${
                  activeTab === 'canteen_reports' ? 'bg-amber-600 text-white' : 'text-stone-700'
                }`}
              >
                Raporlar
              </button>
            </>
          )}
        </div>
      </header>

      {/* Modals */}
      <KvkkModal isOpen={isKvkkOpen} onClose={() => setIsKvkkOpen(false)} />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
};
