import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { ParentMenuView } from './views/ParentMenuView.tsx';
import { ParentOrdersView } from './views/ParentOrdersView.tsx';
import { SolidarityPoolView } from './views/SolidarityPoolView.tsx';
import { EducationSupportView } from './views/EducationSupportView.tsx';
import { ParentStudentsView } from './views/ParentStudentsView.tsx';
import { CanteenOrdersView } from './views/CanteenOrdersView.tsx';
import { CanteenProductsView } from './views/CanteenProductsView.tsx';
import { CanteenDonationsView } from './views/CanteenDonationsView.tsx';
import { CanteenReportsView } from './views/CanteenReportsView.tsx';
import { AdminDashboardView } from './views/AdminDashboardView.tsx';
import { ManagerDashboardView } from './views/ManagerDashboardView.tsx';
import { TeacherDashboardView } from './views/TeacherDashboardView.tsx';
import { CanteenSupportView } from './views/CanteenSupportView.tsx';
import { CartModal } from './components/modals/CartModal.tsx';
import { KvkkModal } from './components/modals/KvkkModal.tsx';
import { ForcePasswordChangeModal } from './components/modals/ForcePasswordChangeModal.tsx';
import { ShieldCheck, Heart, Sparkles, School, UtensilsCrossed } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('menu');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isKvkkOpen, setIsKvkkOpen] = useState(false);

  // Sync activeTab when user role changes
  useEffect(() => {
    if (user?.role === 'canteen') {
      setActiveTab('canteen_orders');
    } else if (user?.role === 'manager') {
      setActiveTab('manager_dashboard');
    } else if (user?.role === 'teacher') {
      setActiveTab('teacher_dashboard');
    } else if (user?.role === 'admin') {
      setActiveTab('admin_dashboard');
    } else {
      setActiveTab('menu');
    }
  }, [user?.role]);

  return (
    <div className="min-h-screen flex flex-col bg-[#faf8f5] text-stone-800">
      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenCart={() => setIsCartOpen(true)}
      />

      {/* Main View Area */}
      <main className="flex-1 pb-16">
        {/* Veli Screens */}
        {activeTab === 'menu' && (
          <ParentMenuView
            onOpenCart={() => setIsCartOpen(true)}
            onNavigateTab={tab => setActiveTab(tab)}
          />
        )}
        {activeTab === 'orders' && <ParentOrdersView />}
        {activeTab === 'food_pool' && <SolidarityPoolView />}
        {activeTab === 'education_support' && <EducationSupportView />}
        {activeTab === 'students' && <ParentStudentsView />}

        {/* Kantinci Screens */}
        {activeTab === 'canteen_orders' && <CanteenOrdersView />}
        {activeTab === 'canteen_products' && <CanteenProductsView />}
        {activeTab === 'canteen_donations' && <CanteenDonationsView />}
        {activeTab === 'canteen_reports' && <CanteenReportsView />}
        {activeTab === 'canteen_support' && <CanteenSupportView />}

        {/* Kurum Müdürü Screen */}
        {activeTab === 'manager_dashboard' && <ManagerDashboardView />}

        {/* Danışman Öğretmen Screen */}
        {activeTab === 'teacher_dashboard' && <TeacherDashboardView />}

        {/* Yönetici Screen */}
        {activeTab === 'admin_dashboard' && <AdminDashboardView />}
      </main>

      {/* Mandatory Password Change Modal for newly created accounts / temporary passwords */}
      {user?.mustChangePassword && (
        <ForcePasswordChangeModal
          isOpen={true}
          onSuccess={() => {}}
        />
      )}

      {/* Cart Drawer Modal */}
      <CartModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onOrderCompleted={() => setActiveTab('orders')}
      />

      {/* KVKK Modal */}
      <KvkkModal isOpen={isKvkkOpen} onClose={() => setIsKvkkOpen(false)} />

      {/* Footer */}
      <footer className="bg-stone-900 text-stone-300 py-12 border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Col 1 */}
            <div className="space-y-3 md:col-span-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center">
                  <UtensilsCrossed className="w-4 h-4 text-emerald-200" />
                </div>
                <span className="font-bold text-lg text-white font-serif tracking-tight">KantinCep</span>
              </div>
              <p className="text-xs text-stone-400 max-w-sm leading-relaxed">
                Akıllı okul kantini teneffüs ön sipariş ve sosyal dayanışma platformu.
                "Sıranı bekleme, iyiliği paylaş!" mottosuyla öğrencilerin teneffüste taze gıdaya erişimini kolaylaştırır,
                ihtiyaç sahibi öğrencilere anonim destek sağlar.
              </p>
              <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-medium">
                <ShieldCheck className="w-4 h-4" />
                <span>6698 Sayılı KVKK Uyumlu & Çocuk Verisi Korumalı</span>
              </div>
            </div>

            {/* Col 2 */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Hızlı Bağlantılar</h4>
              <ul className="text-xs space-y-1.5 text-stone-400">
                <li>
                  <button onClick={() => setActiveTab('menu')} className="hover:text-white transition-colors cursor-pointer">
                    Kantin Menüsü
                  </button>
                </li>
                <li>
                  <button onClick={() => setActiveTab('food_pool')} className="hover:text-white transition-colors cursor-pointer">
                    Dayanışma Havuzu (Yemek)
                  </button>
                </li>
                <li>
                  <button onClick={() => setActiveTab('education_support')} className="hover:text-white transition-colors cursor-pointer">
                    Eğitime Destek (Kırtasiye)
                  </button>
                </li>
                <li>
                  <button onClick={() => setIsKvkkOpen(true)} className="hover:text-white transition-colors cursor-pointer">
                    KVKK Aydınlatma Metni
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 3 */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Altyapı & Güvenlik</h4>
              <ul className="text-xs space-y-1.5 text-stone-400">
                <li>Atatürk İlkokulu ve Ortaokulu</li>
                <li>Europe/Istanbul Saat Dilimi</li>
                <li>256-Bit SSL Şifreleme</li>
                <li>iyzico / PayTR Ödeme Entegrasyonu</li>
                <li>Kalıcı Veritabanı ve İşlem Güvenliği</li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-stone-800 text-center text-xs text-stone-500 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>© 2026 KantinCep — Tüm Hakları Saklıdır.</p>
            <p className="text-[11px]">Türkiye Cumhuriyeti Okul Kantinleri Yönetmeliğine Uygundur.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
