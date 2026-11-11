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
  Plus,
  Trash2,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { User, TeacherProfile, CanteenProfile, ManagerReportSummary, AuditLog, BreakTime } from '../types.ts';

export const ManagerDashboardView: React.FC = () => {
  const { user, school, logout } = useAuth();
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

  // Break form states for Kurum Müdürü
  const [isCreatingBreak, setIsCreatingBreak] = useState(false);
  const [newBreakName, setNewBreakName] = useState('');
  const [newBreakStart, setNewBreakStart] = useState('10:00');
  const [newBreakEnd, setNewBreakEnd] = useState('10:15');
  const [newBreakLimit, setNewBreakLimit] = useState(15);
  const [confirmDeleteBreak, setConfirmDeleteBreak] = useState<BreakTime | null>(null);

  // Deletion modals for teachers and canteen users
  const [deleteTeacherModal, setDeleteTeacherModal] = useState<TeacherProfile | null>(null);
  const [deleteCanteenModal, setDeleteCanteenModal] = useState<CanteenProfile | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const [tRes, cRes, rRes, lRes, bRes, sRes] = await Promise.all([
        api.getManagerTeachers(),
        api.getManagerCanteenUsers(),
        api.getManagerReports(),
        api.getManagerAuditLogs().catch((auditErr: any) => {
          console.warn('[ManagerDashboard] Audit logs load warning:', auditErr?.message);
          return { logs: [] };
        }),
        api.getBreaks(user?.schoolId),
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

  // Break Management Handlers
  const handleCreateBreak = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await api.createBreak({
        name: newBreakName,
        startTime: newBreakStart,
        endTime: newBreakEnd,
        orderDeadlineMinutesBefore: newBreakLimit,
        schoolId: user?.schoolId,
      });
      setMsg({ type: 'success', text: `"${newBreakName}" teneffüs ve sipariş aralığı okulunuza başarıyla eklendi.` });
      setNewBreakName('');
      setIsCreatingBreak(false);
      await fetchData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Teneffüs eklenemedi.' });
    }
  };

  const handleToggleBreak = async (b: BreakTime) => {
    try {
      await api.updateBreak(b.id, { activeStatus: !b.activeStatus });
      setMsg({
        type: 'success',
        text: `"${b.name}" ${!b.activeStatus ? 'siparişe açıldı' : 'siparişe kapatıldı'}.`,
      });
      await fetchData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Teneffüs durumu değiştirilemedi.' });
    }
  };

  const handleDeleteBreak = async () => {
    if (!confirmDeleteBreak) return;
    try {
      await api.deleteBreak(confirmDeleteBreak.id);
      setMsg({ type: 'success', text: `"${confirmDeleteBreak.name}" teneffüs saati başarıyla silindi.` });
      setConfirmDeleteBreak(null);
      await fetchData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Teneffüs silinemedi.' });
    }
  };

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

  const handleDeleteTeacher = async () => {
    if (!deleteTeacherModal) return;
    try {
      const res = await api.deleteManagerTeacher(deleteTeacherModal.id);
      setMsg({ type: 'success', text: res.message || 'Öğretmen hesabı okuldan kaldırıldı.' });
      setDeleteTeacherModal(null);
      await fetchData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Öğretmen silinemedi.' });
    }
  };

  const handleDeleteCanteen = async () => {
    if (!deleteCanteenModal) return;
    try {
      const res = await api.deleteManagerCanteenUser(deleteCanteenModal.id);
      setMsg({ type: 'success', text: res.message || 'Kantinci hesabı okuldan kaldırıldı.' });
      setDeleteCanteenModal(null);
      await fetchData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Kantinci silinemedi.' });
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
            <span className="text-xs text-stone-300">{school?.name || 'Kurum Müdürü Portali'}</span>
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
                      <button
                        onClick={() => setDeleteTeacherModal(t)}
                        className="px-2.5 py-1 text-[11px] font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                        title="Öğretmen hesabını okuldan kaldır"
                      >
                        <Trash2 className="w-3 h-3" />
                        Kaldır
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
                      <button
                        onClick={() => setDeleteCanteenModal(c)}
                        className="px-2.5 py-1 text-[11px] font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                        title="Kantinci hesabını okuldan kaldır"
                      >
                        <Trash2 className="w-3 h-3" />
                        Kaldır
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
                {school?.name || 'Okul'} bünyesindeki kayıtlı öğrenciler ({students.length} öğrenci).
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-800" />
                <h2 className="text-lg font-bold text-stone-900">Teneffüs Saatleri ve Sipariş Kabul Aralıkları</h2>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Okulunuzun resmi zil programı ve öğrencilerin sıcak beslenme teslimat saatleri. Veliler yalnızca burada belirlenen aktif zaman dilimlerine ön sipariş verebilir.
              </p>
            </div>

            <button
              onClick={() => setIsCreatingBreak(!isCreatingBreak)}
              className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition-colors flex items-center gap-2 shadow-xs cursor-pointer self-start sm:self-auto shrink-0"
            >
              <Plus className="w-4 h-4" />
              + Yeni Teneffüs Ekle
            </button>
          </div>

          {/* Yeni Teneffüs Ekleme Formu */}
          {isCreatingBreak && (
            <form onSubmit={handleCreateBreak} className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-3">
              <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-800" />
                Okulunuz İçin Yeni Teneffüs / Zil Saati Tanımla
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">Teneffüs Adı *</label>
                  <input
                    type="text"
                    required
                    value={newBreakName}
                    onChange={e => setNewBreakName(e.target.value)}
                    placeholder="Örn: 2. Teneffüs / Beslenme Saati"
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl bg-white focus:outline-emerald-700"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">Başlangıç Saati *</label>
                  <input
                    type="time"
                    required
                    value={newBreakStart}
                    onChange={e => setNewBreakStart(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl bg-white focus:outline-emerald-700"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">Bitiş Saati *</label>
                  <input
                    type="time"
                    required
                    value={newBreakEnd}
                    onChange={e => setNewBreakEnd(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl bg-white focus:outline-emerald-700"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">Ön Sipariş Kabul Limiti (Dk Önce)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newBreakLimit}
                    onChange={e => setNewBreakLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl bg-white focus:outline-emerald-700"
                  />
                  <span className="text-[10px] text-stone-400">Zilden kaç dakika önceye kadar sipariş verilebilir</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingBreak(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-200 rounded-xl cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-emerald-800 text-white rounded-xl hover:bg-emerald-900 shadow-xs cursor-pointer"
                >
                  Teneffüsü Kaydet
                </button>
              </div>
            </form>
          )}

          {/* Teneffüs Listesi */}
          {breaks.length === 0 ? (
            <div className="py-12 text-center bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
              <Clock className="w-10 h-10 text-stone-300 mx-auto" />
              <p className="text-sm font-semibold text-stone-700">Henüz tanımlı teneffüs saati bulunmuyor.</p>
              <p className="text-xs text-stone-400">Yukarıdaki butona tıklayarak okulunuzun ilk zil ve teneffüs saatini ekleyebilirsiniz.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {breaks.map(b => (
                <div
                  key={b.id}
                  className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 transition-shadow shadow-2xs ${
                    b.activeStatus ? 'border-emerald-200 bg-emerald-50/25' : 'border-stone-200 bg-stone-50 opacity-65'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-900">{b.name}</span>
                      <button
                        onClick={() => setConfirmDeleteBreak(b)}
                        className="text-stone-400 hover:text-red-600 p-1 rounded-lg transition-colors cursor-pointer"
                        title="Teneffüsü Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-lg font-black font-mono text-emerald-900 mt-2 tracking-tight">
                      {b.startTime} - {b.endTime}
                    </p>

                    <div className="flex items-center gap-1.5 text-[11px] text-stone-500 mt-1">
                      <span>Ön sipariş limiti:</span>
                      <span className="font-semibold text-stone-800">{b.orderDeadlineMinutesBefore || 15} dk önce</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleToggleBreak(b)}
                      className={`text-[11px] font-bold py-1.5 px-3 rounded-xl border transition-all cursor-pointer w-full text-center ${
                        b.activeStatus
                          ? 'border-emerald-300 bg-emerald-100/70 text-emerald-800 hover:bg-emerald-200/60'
                          : 'border-stone-300 bg-stone-200/60 text-stone-700 hover:bg-stone-300'
                      }`}
                    >
                      {b.activeStatus ? '✓ Siparişe Açık' : '✕ Kapalı'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bilgilendirme Kutusu */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex items-start gap-3 text-xs text-stone-600">
            <ShieldCheck className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-stone-900">Çok Okullu Güvenlik İzolasyonu & Kantin Entegrasyonu</p>
              <p className="text-[11px] text-stone-500">
                Belirlediğiniz bu teneffüs saatleri doğrudan kantin görevlinizin ekranında görüntülenir ve öğrencilerin sipariş kabul saatlerini sınırlar. Yalnızca okulunuza özeldir; başka okullar veya merkezi yönetim bu saatleri okulunuz adına değiştiremez.
              </p>
            </div>
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

      {/* Teneffüs Silme Onay Modalı */}
      {confirmDeleteBreak && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-stone-200 space-y-4">
            <h3 className="font-bold text-base text-stone-900">Teneffüs Saatini Sil</h3>
            <p className="text-sm text-stone-600">
              <span className="font-semibold text-stone-900">"{confirmDeleteBreak.name}"</span> ({confirmDeleteBreak.startTime} - {confirmDeleteBreak.endTime}) teneffüs aralığını okul programınızdan silmek istediğinize emin misiniz?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteBreak(null)}
                className="px-3.5 py-1.5 rounded-xl border border-stone-200 text-stone-600 text-xs font-bold hover:bg-stone-50 cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleDeleteBreak}
                className="px-4 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 shadow-xs cursor-pointer"
              >
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Öğretmen Hesabını Kaldırma Modalı */}
      {deleteTeacherModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="font-bold text-base text-stone-900">Öğretmen Hesabını Kaldır</h3>
                <p className="text-xs text-stone-500 font-medium">{deleteTeacherModal.fullName}</p>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              <strong className="text-stone-900">{deleteTeacherModal.fullName}</strong> ({deleteTeacherModal.email}) öğretmen hesabını okulunuzdan kaldırmak üzeresiniz.
            </p>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
              <p className="font-bold">Veri Güvenliği ve Kayıt Koruma:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                <li>Öğretmenin okul erişimi ve yetkisi derhal kapatılır.</li>
                <li>Geçmişte açtığı öğrenci ihtiyaç kayıtları ve tahsis geçmişi şeffaflık ve denetim için korunur.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTeacherModal(null)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 text-xs font-bold hover:bg-stone-50 cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleDeleteTeacher}
                className="px-4 py-2 rounded-xl bg-red-700 text-white text-xs font-bold hover:bg-red-800 shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hesabı Okuldan Kaldır
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kantinci Hesabını Kaldırma Modalı */}
      {deleteCanteenModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="font-bold text-base text-stone-900">Kantinci Hesabını Kaldır</h3>
                <p className="text-xs text-stone-500 font-medium">{deleteCanteenModal.fullName}</p>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              <strong className="text-stone-900">{deleteCanteenModal.fullName}</strong> ({deleteCanteenModal.email}) kantin personeli hesabını okulunuzdan kaldırmak üzeresiniz.
            </p>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
              <p className="font-bold">Veri Güvenliği ve Kayıt Koruma:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                <li>Kantincinin okul kantin ekranına ve sipariş listelerine erişimi kapatılır.</li>
                <li>Daha önce teslim ettiği siparişlerin, ödemelerin ve yardım paketlerinin geçmiş kayıtları korunur.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteCanteenModal(null)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 text-xs font-bold hover:bg-stone-50 cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleDeleteCanteen}
                className="px-4 py-2 rounded-xl bg-red-700 text-white text-xs font-bold hover:bg-red-800 shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hesabı Okuldan Kaldır
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
