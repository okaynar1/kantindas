import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  GraduationCap,
  Store,
  Clock,
  Heart,
  BookOpen,
  FileText,
  Key,
  Lock,
  LogOut,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  School as SchoolIcon,
  Search,
  Eye,
  EyeOff,
  Building2,
  TrendingUp,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { User, TeacherProfile, CanteenProfile, ManagerReportSummary, AuditLog, BreakTime } from '../types.ts';

export const ManagerDashboardView: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeMenu, setActiveMenu] = useState<string>('overview');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Data states
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [canteens, setCanteens] = useState<CanteenProfile[]>([]);
  const [reports, setReports] = useState<ManagerReportSummary | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [breaks, setBreaks] = useState<BreakTime[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  // Teacher Form Modal
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [teacherName, setTeacherName] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherBranch, setTeacherBranch] = useState('Rehberlik & Psikolojik Danışmanlık');
  const [teacherTempPass, setTeacherTempPass] = useState('');
  const [createdTeacherInfo, setCreatedTeacherInfo] = useState<{ name: string; email: string; pass: string } | null>(null);

  // Canteen Form Modal
  const [isCanteenModalOpen, setIsCanteenModalOpen] = useState(false);
  const [canteenName, setCanteenName] = useState('');
  const [canteenEmail, setCanteenEmail] = useState('');
  const [canteenUnit, setCanteenUnit] = useState('Merkez Okul Kantini');
  const [canteenTempPass, setCanteenTempPass] = useState('');
  const [createdCanteenInfo, setCreatedCanteenInfo] = useState<{ name: string; email: string; pass: string } | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Password change
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newPassRepeat, setNewPassRepeat] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const [tRes, cRes, rRes, lRes, bRes, sRes] = await Promise.all([
        api.getManagerTeachers(),
        api.getManagerCanteenUsers(),
        api.getManagerReports(),
        api.getAuditLogs(),
        api.getBreaks(),
        api.getStudents(),
      ]);
      setTeachers(tRes.teachers || []);
      setCanteens(cRes.canteens || []);
      setReports(rRes.reports || null);
      setAuditLogs(lRes.logs || []);
      setBreaks(bRes.breaks || []);
      setStudents(sRes.students || []);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Veriler yüklenirken hata oluştu.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Create Teacher
  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      const pass = teacherTempPass || Math.random().toString(36).substring(2, 8) + 'KC!';
      const res = await api.createManagerTeacher({
        fullName: teacherName,
        email: teacherEmail,
        branch: teacherBranch,
        tempPassword: pass,
      });

      setCreatedTeacherInfo({
        name: teacherName,
        email: teacherEmail,
        pass: res.tempPassword,
      });

      setTeacherName('');
      setTeacherEmail('');
      setTeacherTempPass('');
      await fetchData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Öğretmen hesabı oluşturulamadı.' });
    }
  };

  // Toggle Teacher Status
  const handleToggleTeacherStatus = async (teacher: TeacherProfile) => {
    const nextStatus = teacher.accountStatus === 'active' ? 'suspended' : 'active';
    try {
      await api.updateTeacherStatus(teacher.id, nextStatus);
      setMsg({
        type: 'success',
        text: `"${teacher.fullName}" hesabı ${nextStatus === 'active' ? 'aktifleştirildi' : 'askıya alındı'}.`,
      });
      await fetchData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Durum değiştirilemedi.' });
    }
  };

  // Reset Teacher Password
  const handleResetTeacherPassword = async (teacher: TeacherProfile) => {
    try {
      const res = await api.resetTeacherPassword(teacher.id);
      setCreatedTeacherInfo({
        name: teacher.fullName,
        email: teacher.email,
        pass: res.tempPassword,
      });
      setIsTeacherModalOpen(true);
      await fetchData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Şifre sıfırlanamadı.' });
    }
  };

  // Create Canteen
  const handleCreateCanteen = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      const pass = canteenTempPass || Math.random().toString(36).substring(2, 8) + 'KC!';
      const res = await api.createManagerCanteenUser({
        fullName: canteenName,
        email: canteenEmail,
        canteenUnit: canteenUnit,
        tempPassword: pass,
      });

      setCreatedCanteenInfo({
        name: canteenName,
        email: canteenEmail,
        pass: res.tempPassword,
      });

      setCanteenName('');
      setCanteenEmail('');
      setCanteenTempPass('');
      await fetchData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Kantinci hesabı oluşturulamadı.' });
    }
  };

  // Toggle Canteen Status
  const handleToggleCanteenStatus = async (canteen: CanteenProfile) => {
    const nextStatus = canteen.accountStatus === 'active' ? 'suspended' : 'active';
    try {
      await api.updateCanteenUserStatus(canteen.id, nextStatus);
      setMsg({
        type: 'success',
        text: `"${canteen.fullName}" hesabı ${nextStatus === 'active' ? 'aktifleştirildi' : 'askıya alındı'}.`,
      });
      await fetchData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Durum değiştirilemedi.' });
    }
  };

  // Reset Canteen Password
  const handleResetCanteenPassword = async (canteen: CanteenProfile) => {
    try {
      const res = await api.resetCanteenUserPassword(canteen.id);
      setCreatedCanteenInfo({
        name: canteen.fullName,
        email: canteen.email,
        pass: res.tempPassword,
      });
      setIsCanteenModalOpen(true);
      await fetchData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Şifre sıfırlanamadı.' });
    }
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
      setMsg({ type: 'error', text: 'Yeni şifreler birbiriyle uyuşmuyor.' });
      return;
    }
    try {
      await api.changePassword({
        currentPassword: currentPass,
        newPassword: newPass,
        newPasswordRepeat: newPassRepeat,
      });
      setMsg({ type: 'success', text: 'Müdür hesabı şifreniz başarıyla güncellendi.' });
      setCurrentPass('');
      setNewPass('');
      setNewPassRepeat('');
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Şifre güncellenemedi.' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-stone-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
              Kurum Müdürü Portali
            </span>
            <span className="text-xs text-stone-300">Atatürk İlkokulu ve Ortaokulu</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight">
            Hoş Geldiniz, {user?.fullName}
          </h1>
          <p className="text-xs text-stone-300 max-w-xl leading-relaxed">
            Okul personeli yetkilendirme, geçici şifre atama, sosyal dayanışma havuzu denetimi ve kurumsal işlem kayıtlarını buradan yönetebilirsiniz.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600/80 hover:bg-red-600 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Çıkış Yap
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
          { id: 'overview', label: 'Genel Bakış', icon: TrendingUp },
          { id: 'teachers', label: 'Öğretmen Hesapları', icon: GraduationCap },
          { id: 'canteens', label: 'Kantinci Hesapları', icon: Store },
          { id: 'auth_rules', label: 'Kullanıcı Yetkilendirme', icon: ShieldCheck },
          { id: 'classes', label: 'Öğrenci ve Sınıf Tanımları', icon: SchoolIcon },
          { id: 'breaks', label: 'Teneffüs ve Sipariş Ayarları', icon: Clock },
          { id: 'food_reports', label: 'Dayanışma Havuzu Raporları', icon: Heart },
          { id: 'edu_reports', label: 'Eğitim Desteği Raporları', icon: BookOpen },
          { id: 'audit_logs', label: 'İşlem Kayıtları', icon: FileText },
          { id: 'security', label: 'Hesap Güvenliği', icon: Key },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeMenu === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveMenu(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      {/* 1. GENEL BAKIŞ */}
      {activeMenu === 'overview' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs">
              <span className="text-[11px] font-bold text-stone-400 block uppercase">Öğretmenler</span>
              <p className="text-2xl font-black text-stone-900 mt-1">{teachers.length}</p>
              <span className="text-[10px] text-emerald-600 font-medium">Aktif Danışman</span>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs">
              <span className="text-[11px] font-bold text-stone-400 block uppercase">Kantin Görevlileri</span>
              <p className="text-2xl font-black text-stone-900 mt-1">{canteens.length}</p>
              <span className="text-[10px] text-stone-500 font-medium">Yetkili Personel</span>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs">
              <span className="text-[11px] font-bold text-stone-400 block uppercase">İhtiyaç Sahibi</span>
              <p className="text-2xl font-black text-amber-700 mt-1">{reports?.totalStudentsInNeed || 0}</p>
              <span className="text-[10px] text-amber-600 font-medium">{reports?.activeNeedsCount || 0} Aktif Kayıt</span>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs">
              <span className="text-[11px] font-bold text-stone-400 block uppercase">Yemek Desteği</span>
              <p className="text-2xl font-black text-emerald-700 mt-1">{reports?.foodPoolDeliveredItems || 0}</p>
              <span className="text-[10px] text-stone-500 font-medium">{reports?.foodPoolRemainingDonations || 0} Kalan Havuz</span>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs">
              <span className="text-[11px] font-bold text-stone-400 block uppercase">Kırtasiye Desteği</span>
              <p className="text-2xl font-black text-blue-700 mt-1">{reports?.educationDeliveredItems || 0}</p>
              <span className="text-[10px] text-stone-500 font-medium">{reports?.educationRemainingDonations || 0} Kalan Ürün</span>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs">
              <span className="text-[11px] font-bold text-stone-400 block uppercase">Bekleyen Teslimat</span>
              <p className="text-2xl font-black text-purple-700 mt-1">{reports?.pendingDeliveriesCount || 0}</p>
              <span className="text-[10px] text-purple-600 font-medium">Kantinde Hazır</span>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-stone-900">Öğretmen Hesabı Tanımla</h3>
              </div>
              <p className="text-xs text-stone-500 leading-relaxed">
                Rehberlik ve danışman öğretmenler için güvenli geçici şifreli yeni hesap oluşturun.
              </p>
              <button
                onClick={() => {
                  setActiveMenu('teachers');
                  setIsTeacherModalOpen(true);
                }}
                className="w-full py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                + Yeni Öğretmen Ekle
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center">
                  <Store className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-stone-900">Kantinci Hesabı Tanımla</h3>
              </div>
              <p className="text-xs text-stone-500 leading-relaxed">
                Okul kantin işletmecisi veya teslimat personeli için güvenli hesap açın.
              </p>
              <button
                onClick={() => {
                  setActiveMenu('canteens');
                  setIsCanteenModalOpen(true);
                }}
                className="w-full py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                + Yeni Kantinci Ekle
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-stone-900">Sosyal Destek Raporları</h3>
              </div>
              <p className="text-xs text-stone-500 leading-relaxed">
                Dayanışma havuzu ve kırtasiye eğitim desteği dağıtım istatistiklerini denetleyin.
              </p>
              <button
                onClick={() => setActiveMenu('food_reports')}
                className="w-full py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Raporları İncele
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. ÖĞRETMEN HESAPLARI */}
      {activeMenu === 'teachers' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-stone-900">Danışman Öğretmen Hesapları</h2>
              <p className="text-xs text-stone-500">
                Öğretmen hesapları yalnızca kurum müdürü tarafından oluşturulabilir ve yetkilendirilebilir.
              </p>
            </div>
            <button
              onClick={() => {
                setCreatedTeacherInfo(null);
                setIsTeacherModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              <UserPlus className="w-4 h-4" />
              Yeni Öğretmen Hesabı Oluştur
            </button>
          </div>

          {/* Teacher Create Modal / Card */}
          {isTeacherModalOpen && (
            <div className="p-5 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-emerald-900">Yeni Öğretmen Hesabı Oluştur</h3>
                <button onClick={() => setIsTeacherModalOpen(false)} className="text-stone-400 hover:text-stone-600 font-bold">
                  ✕
                </button>
              </div>

              {createdTeacherInfo ? (
                <div className="p-4 bg-white border border-emerald-300 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold">
                    <CheckCircle className="w-4 h-4" />
                    <span>Öğretmen hesabı başarıyla oluşturuldu!</span>
                  </div>
                  <div className="text-xs space-y-1 font-mono text-stone-700">
                    <p><strong>Öğretmen:</strong> {createdTeacherInfo.name}</p>
                    <p><strong>E-posta:</strong> {createdTeacherInfo.email}</p>
                    <p className="text-emerald-800 bg-emerald-100/60 p-2 rounded-lg font-bold">
                      <strong>İlk Giriş Geçici Şifresi:</strong> {createdTeacherInfo.pass}
                    </p>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    * Öğretmen ilk giriş yaptığında sistem otomatik olarak kalıcı yeni şifre belirlemesini isteyecektir.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleCreateTeacher} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-stone-700 block mb-1">Ad Soyad *</label>
                    <input
                      type="text"
                      required
                      placeholder="Örn: Zehra Aydın"
                      value={teacherName}
                      onChange={e => setTeacherName(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-stone-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-stone-700 block mb-1">E-posta Adresi *</label>
                    <input
                      type="email"
                      required
                      placeholder="Örn: zehra@okul.meb.k12.tr"
                      value={teacherEmail}
                      onChange={e => setTeacherEmail(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-stone-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-stone-700 block mb-1">Görev / Branş</label>
                    <input
                      type="text"
                      placeholder="Örn: Rehberlik / Sınıf Öğretmeni"
                      value={teacherBranch}
                      onChange={e => setTeacherBranch(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-stone-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-stone-700 block mb-1">İlk Giriş Geçici Şifresi</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Boş bırakılırsa otomatik üretilir"
                        value={teacherTempPass}
                        onChange={e => setTeacherTempPass(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-stone-200 rounded-xl bg-white font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer"
                      >
                        Kaydet
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Teacher List Table */}
          <div className="overflow-x-auto border border-stone-100 rounded-2xl">
            <table className="w-full text-left text-xs text-stone-600">
              <thead className="bg-stone-50 text-stone-700 uppercase font-bold text-[10px] tracking-wider border-b border-stone-100">
                <tr>
                  <th className="px-4 py-3">Ad Soyad</th>
                  <th className="px-4 py-3">E-posta</th>
                  <th className="px-4 py-3">Görev / Branş</th>
                  <th className="px-4 py-3">Hesap Durumu</th>
                  <th className="px-4 py-3">Şifre Durumu</th>
                  <th className="px-4 py-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {teachers.map(t => (
                  <tr key={t.id} className="hover:bg-stone-50/50">
                    <td className="px-4 py-3 font-bold text-stone-900 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-emerald-700" />
                      <span>{t.fullName}</span>
                    </td>
                    <td className="px-4 py-3 text-stone-500 font-mono text-[11px]">{t.email}</td>
                    <td className="px-4 py-3 text-stone-700">{t.branch || 'Danışman Öğretmen'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          t.accountStatus === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {t.accountStatus === 'active' ? 'Aktif' : 'Askıya Alındı'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {t.mustChangePassword ? (
                        <span className="text-amber-700 text-[10px] font-bold bg-amber-50 px-2 py-0.5 rounded-full">
                          Geçici Şifre (Değişim Bekliyor)
                        </span>
                      ) : (
                        <span className="text-emerald-700 text-[10px] font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                          Kalıcı Şifre Belirlendi
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => handleResetTeacherPassword(t)}
                        className="px-2.5 py-1 text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                        title="Yeni geçici şifre ata"
                      >
                        Şifre Sıfırla
                      </button>
                      <button
                        onClick={() => handleToggleTeacherStatus(t)}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                          t.accountStatus === 'active'
                            ? 'text-red-700 bg-red-50 hover:bg-red-100'
                            : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                        }`}
                      >
                        {t.accountStatus === 'active' ? 'Askıya Al' : 'Aktifleştir'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. KANTİNCİ HESAPLARI */}
      {activeMenu === 'canteens' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-stone-900">Kantin İşletmecisi ve Görevli Hesapları</h2>
              <p className="text-xs text-stone-500">
                Kantin hesapları okul kantininin sipariş yönetimi ve sosyal destek teslimatlarını gerçekleştirmesini sağlar.
              </p>
            </div>
            <button
              onClick={() => {
                setCreatedCanteenInfo(null);
                setIsCanteenModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              <UserPlus className="w-4 h-4" />
              Yeni Kantinci Hesabı Oluştur
            </button>
          </div>

          {/* Canteen Create Modal */}
          {isCanteenModalOpen && (
            <div className="p-5 bg-teal-50/50 border border-teal-200 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-teal-900">Yeni Kantinci Hesabı Oluştur</h3>
                <button onClick={() => setIsCanteenModalOpen(false)} className="text-stone-400 hover:text-stone-600 font-bold">
                  ✕
                </button>
              </div>

              {createdCanteenInfo ? (
                <div className="p-4 bg-white border border-teal-300 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-teal-700 text-xs font-bold">
                    <CheckCircle className="w-4 h-4" />
                    <span>Kantinci hesabı başarıyla oluşturuldu!</span>
                  </div>
                  <div className="text-xs space-y-1 font-mono text-stone-700">
                    <p><strong>Görevli:</strong> {createdCanteenInfo.name}</p>
                    <p><strong>E-posta:</strong> {createdCanteenInfo.email}</p>
                    <p className="text-teal-800 bg-teal-100/60 p-2 rounded-lg font-bold">
                      <strong>İlk Giriş Geçici Şifresi:</strong> {createdCanteenInfo.pass}
                    </p>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    * Kullanıcı ilk girişinde şifresini değiştirmeye zorlanacaktır.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleCreateCanteen} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-stone-700 block mb-1">Ad Soyad *</label>
                    <input
                      type="text"
                      required
                      placeholder="Örn: Mehmet Usta"
                      value={canteenName}
                      onChange={e => setCanteenName(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-stone-200 rounded-xl bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-stone-700 block mb-1">E-posta Adresi *</label>
                    <input
                      type="email"
                      required
                      placeholder="Örn: kantin@kantincep.com"
                      value={canteenEmail}
                      onChange={e => setCanteenEmail(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-stone-200 rounded-xl bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-stone-700 block mb-1">Kantin / İşletme Bilgisi</label>
                    <input
                      type="text"
                      placeholder="Örn: Merkez Okul Kantini"
                      value={canteenUnit}
                      onChange={e => setCanteenUnit(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-stone-200 rounded-xl bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-stone-700 block mb-1">Geçici Şifre</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Otomatik üretilir"
                        value={canteenTempPass}
                        onChange={e => setCanteenTempPass(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-stone-200 rounded-xl bg-white font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer"
                      >
                        Kaydet
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Canteen List Table */}
          <div className="overflow-x-auto border border-stone-100 rounded-2xl">
            <table className="w-full text-left text-xs text-stone-600">
              <thead className="bg-stone-50 text-stone-700 uppercase font-bold text-[10px] tracking-wider border-b border-stone-100">
                <tr>
                  <th className="px-4 py-3">Ad Soyad</th>
                  <th className="px-4 py-3">E-posta</th>
                  <th className="px-4 py-3">İşletme / Birim</th>
                  <th className="px-4 py-3">Hesap Durumu</th>
                  <th className="px-4 py-3">Şifre Durumu</th>
                  <th className="px-4 py-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {canteens.map(c => (
                  <tr key={c.id} className="hover:bg-stone-50/50">
                    <td className="px-4 py-3 font-bold text-stone-900 flex items-center gap-2">
                      <Store className="w-4 h-4 text-teal-700" />
                      <span>{c.fullName}</span>
                    </td>
                    <td className="px-4 py-3 text-stone-500 font-mono text-[11px]">{c.email}</td>
                    <td className="px-4 py-3 text-stone-700">{c.canteenUnit || 'Merkez Kantin'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          c.accountStatus === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {c.accountStatus === 'active' ? 'Aktif' : 'Askıya Alındı'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {c.mustChangePassword ? (
                        <span className="text-amber-700 text-[10px] font-bold bg-amber-50 px-2 py-0.5 rounded-full">
                          Geçici Şifre
                        </span>
                      ) : (
                        <span className="text-emerald-700 text-[10px] font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                          Kalıcı Şifre
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => handleResetCanteenPassword(c)}
                        className="px-2.5 py-1 text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                      >
                        Şifre Sıfırla
                      </button>
                      <button
                        onClick={() => handleToggleCanteenStatus(c)}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                          c.accountStatus === 'active'
                            ? 'text-red-700 bg-red-50 hover:bg-red-100'
                            : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                        }`}
                      >
                        {c.accountStatus === 'active' ? 'Askıya Al' : 'Aktifleştir'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. KULLANICI YETKİLENDİRME POLİTİKASI */}
      {activeMenu === 'auth_rules' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-lg font-bold text-stone-900">Kullanıcı Rolleri ve Yetki Matrisi</h2>
            <p className="text-xs text-stone-500">
              KantinCep RBAC (Rol Bazlı Erişim Denetimi) kuralları ve veri gizliliği standartları.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-2">
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">Kurum Müdürü</span>
              <h4 className="text-xs font-bold text-stone-900">Okul Yetki ve Rapor Yönetimi</h4>
              <ul className="text-xs text-stone-600 space-y-1 list-disc list-inside">
                <li>Öğretmen ve kantinci hesabı oluşturma</li>
                <li>Geçici şifre atama ve hesap askıya alma</li>
                <li>Teneffüs saatleri ve sipariş politikası</li>
                <li>Genel istatistik ve dayanışma raporları</li>
                <li>Özel öğrenci aile bilgilerine yetkisiz erişim engellenir</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-2">
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded">Danışman Öğretmen</span>
              <h4 className="text-xs font-bold text-stone-900">İhtiyaç Kaydı & Destek Tahsisi</h4>
              <ul className="text-xs text-stone-600 space-y-1 list-disc list-inside">
                <li>Öğrenci ihtiyaç kaydı ve benzersiz kod üretimi</li>
                <li>Dayanışma Havuzu (gıda) ürün tahsisi</li>
                <li>Eğitim Desteği (kırtasiye) ürün tahsisi</li>
                <li>Tahsis teslimat durumunu canlı izleme</li>
                <li>Teslim edilmemiş tahsisleri iptal etme</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-2">
              <span className="px-2 py-0.5 bg-teal-100 text-teal-800 text-[10px] font-bold rounded">Kantin Görevlisi</span>
              <h4 className="text-xs font-bold text-stone-900">Sipariş & İhtiyaç Koduyla Teslimat</h4>
              <ul className="text-xs text-stone-600 space-y-1 list-disc list-inside">
                <li>Günlük teneffüs siparişlerini hazırlama</li>
                <li>İhtiyaç kodu doğrulama ve ürün teslimi</li>
                <li>Tahsis edilen ürün stoğunu ayrı izleme</li>
                <li>Öğrencinin gizli aile durumunu göremez</li>
                <li>Mükerrer teslimat sunucu tarafından engellenir</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 5. ÖĞRENCİ VE SINIF TANIMLARI */}
      {activeMenu === 'classes' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-stone-900">Okul Öğrenci ve Sınıf Tanımları</h2>
              <p className="text-xs text-stone-500">
                Atatürk İlkokulu ve Ortaokulu bünyesindeki kayıtlı öğrenciler ({students.length} öğrenci).
              </p>
            </div>
          </div>

          <div className="overflow-x-auto border border-stone-100 rounded-2xl">
            <table className="w-full text-left text-xs text-stone-600">
              <thead className="bg-stone-50 text-stone-700 uppercase font-bold text-[10px] tracking-wider border-b border-stone-100">
                <tr>
                  <th className="px-4 py-3">Öğrenci Ad Soyad</th>
                  <th className="px-4 py-3">Sınıf</th>
                  <th className="px-4 py-3">Şube</th>
                  <th className="px-4 py-3">Kayıt Tarihi</th>
                  <th className="px-4 py-3">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {students.map(s => (
                  <tr key={s.id} className="hover:bg-stone-50/50">
                    <td className="px-4 py-3 font-bold text-stone-900">{s.fullName}</td>
                    <td className="px-4 py-3 font-medium text-stone-700">{s.grade}</td>
                    <td className="px-4 py-3 font-bold text-emerald-800">{s.classroom}</td>
                    <td className="px-4 py-3 text-stone-500 font-mono text-[11px]">
                      {new Date(s.createdAt).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                        Aktif Öğrenci
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. TENEFFÜS VE SİPARİŞ AYARLARI */}
      {activeMenu === 'breaks' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-lg font-bold text-stone-900">Teneffüs ve Ön Sipariş Zaman Dilimleri</h2>
            <p className="text-xs text-stone-500">
              Öğrencilerin teneffüste taze sıcak gıda teslim alabilmesi için belirlenen resmi teneffüs saatleri.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {breaks.map(b => (
              <div
                key={b.id}
                className={`p-4 rounded-2xl border ${
                  b.activeStatus ? 'border-emerald-200 bg-emerald-50/20' : 'border-stone-200 bg-stone-50 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-900">{b.name}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                </div>
                <p className="text-base font-black font-mono text-emerald-900 mt-2">
                  {b.startTime} - {b.endTime}
                </p>
                <p className="text-[10px] text-stone-400 mt-1">
                  Ön sipariş limiti: {b.orderDeadlineMinutesBefore || 15} dk önce
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. DAYANIŞMA HAVUZU RAPORLARI */}
      {activeMenu === 'food_reports' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-lg font-bold text-stone-900">Dayanışma Havuzu (Gıda) Faaliyet Raporları</h2>
            <p className="text-xs text-stone-500">
              Velilerin bağışladığı kantin yiyecek/içecek ürünleri ve öğrencilere yapılan teslimatların resmi dökümü.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
              <span className="text-xs font-bold text-emerald-900 block">Tahsis Edilen Gıda Ürünleri</span>
              <p className="text-3xl font-black text-emerald-800 mt-1">{reports?.foodPoolAllocatedItems || 0}</p>
              <span className="text-[11px] text-emerald-700">Adet toplam tahsis</span>
            </div>
            <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl">
              <span className="text-xs font-bold text-teal-900 block">Teslim Edilen Sıcak Beslenme</span>
              <p className="text-3xl font-black text-teal-800 mt-1">{reports?.foodPoolDeliveredItems || 0}</p>
              <span className="text-[11px] text-teal-700">Öğrenciye ulaştırılan adet</span>
            </div>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
              <span className="text-xs font-bold text-amber-900 block">Kullanılabilir Bağış Stoğu</span>
              <p className="text-3xl font-black text-amber-800 mt-1">{reports?.foodPoolRemainingDonations || 0}</p>
              <span className="text-[11px] text-amber-700">Havuzda hazır porsiyon</span>
            </div>
          </div>
        </div>
      )}

      {/* 8. EĞİTİM DESTEĞİ RAPORLARI */}
      {activeMenu === 'edu_reports' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-lg font-bold text-stone-900">Eğitim Desteği (Kırtasiye) Faaliyet Raporları</h2>
            <p className="text-xs text-stone-500">
              Defter, boya, kalem ve okul gereçleri bağışlarının ve öğrenci teslimatlarının raporları.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
              <span className="text-xs font-bold text-blue-900 block">Tahsis Edilen Kırtasiye</span>
              <p className="text-3xl font-black text-blue-800 mt-1">{reports?.educationAllocatedItems || 0}</p>
              <span className="text-[11px] text-blue-700">Defter, kalem seti vb.</span>
            </div>
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl">
              <span className="text-xs font-bold text-indigo-900 block">Öğrenciye Teslim Edilen</span>
              <p className="text-3xl font-black text-indigo-800 mt-1">{reports?.educationDeliveredItems || 0}</p>
              <span className="text-[11px] text-indigo-700">Eksiksiz teslimat</span>
            </div>
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl">
              <span className="text-xs font-bold text-stone-900 block">Kalan Kırtasiye Bağış Stoğu</span>
              <p className="text-3xl font-black text-stone-800 mt-1">{reports?.educationRemainingDonations || 0}</p>
              <span className="text-[11px] text-stone-600">Dağıtıma uygun adet</span>
            </div>
          </div>
        </div>
      )}

      {/* 9. İŞLEM KAYITLARI (AUDIT LOGS) */}
      {activeMenu === 'audit_logs' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-stone-900">Okul Sistemi Denetim Günlüğü (Audit Log)</h2>
              <p className="text-xs text-stone-500">
                Kullanıcı girişleri, yetkilendirmeler ve destek tahsislerine ait yasal işlem izleri.
              </p>
            </div>
            <span className="text-xs text-stone-400 font-mono">Son {auditLogs.length} Kayıt</span>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-stone-100 font-mono text-[11px]">
            {auditLogs.map(log => (
              <div key={log.id} className="py-2.5 flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-900">[{log.action}]</span>
                    <span className="text-stone-500">{log.actorName} ({log.actorRole})</span>
                  </div>
                  <p className="text-stone-600 font-sans text-xs">{log.details}</p>
                </div>
                <span className="text-stone-400 text-[10px] shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString('tr-TR')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 10. HESAP GÜVENLİĞİ */}
      {activeMenu === 'security' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-6 max-w-xl">
          <div>
            <h2 className="text-lg font-bold text-stone-900">Hesap Güvenliği ve Şifre Yönetimi</h2>
            <p className="text-xs text-stone-500">
              Müdür hesabınızın giriş şifresini buradan güvenli şekilde güncelleyebilirsiniz.
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
                className="w-full text-xs px-3 py-2 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                className="w-full text-xs px-3 py-2 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                className="w-full text-xs px-3 py-2 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="py-2.5 px-6 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              Şifreyi Güncelle
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
