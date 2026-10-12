import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  Clock,
  School as SchoolIcon,
  FileText,
  UserPlus,
  Lock,
  CheckCircle,
  AlertCircle,
  Eye,
  RefreshCw,
  Plus,
  Tag,
} from 'lucide-react';
import { User, BreakTime, AuditLog, School, Category } from '../types.ts';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const AdminDashboardView: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [breaks, setBreaks] = useState<BreakTime[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // School editing
  const [schoolName, setSchoolName] = useState('');
  const [schoolAddress, setSchoolAddress] = useState('');

  // New staff user form
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'canteen' | 'admin'>('canteen');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // New break form
  const [isCreatingBreak, setIsCreatingBreak] = useState(false);
  const [newBreakName, setNewBreakName] = useState('');
  const [newBreakStart, setNewBreakStart] = useState('11:00');
  const [newBreakEnd, setNewBreakEnd] = useState('11:15');
  const [newBreakLimit, setNewBreakLimit] = useState(15);

  // New category form
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'food' | 'stationery'>('food');

  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ type: 'break' | 'category'; id: string; name: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [uRes, bRes, lRes, sRes, cRes] = await Promise.all([
        api.getAdminUsers(),
        api.getBreaks(),
        api.getAuditLogs(),
        api.getSchools(),
        api.getCategories(),
      ]);
      setUsers(uRes.users);
      setBreaks(bRes.breaks);
      setAuditLogs(lRes.logs);
      setSchools(sRes.schools);
      setCategories(cRes.categories);

      if (sRes.schools.length > 0) {
        setSchoolName(sRes.schools[0].name);
        setSchoolAddress(sRes.schools[0].address);
      }
    } catch (err: any) {
      setFormMsg({ type: 'error', text: err.message || 'Veriler yüklenemedi.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleToggleUserStatus = async (targetUser: User) => {
    const nextStatus = targetUser.accountStatus === 'active' ? 'suspended' : 'active';
    try {
      await api.updateUserStatus(targetUser.id, nextStatus);
      setFormMsg({
        type: 'success',
        text: `Kullanıcı "${targetUser.fullName}" hesabı ${nextStatus === 'active' ? 'aktifleştirildi' : 'askıya alındı'}.`,
      });
      await fetchData();
    } catch (err: any) {
      setFormMsg({ type: 'error', text: err.message || 'Kullanıcı durumu değiştirilemedi.' });
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg(null);
    try {
      await api.createAdminUser({
        fullName: newFullName,
        email: newEmail,
        role: newRole,
      });
      setFormMsg({ type: 'success', text: `Yeni ${newRole === 'canteen' ? 'kantinci' : 'yönetici'} hesabı oluşturuldu.` });
      setNewFullName('');
      setNewEmail('');
      setIsCreatingUser(false);
      await fetchData();
    } catch (err: any) {
      setFormMsg({ type: 'error', text: err.message || 'Hesap oluşturulamadı.' });
    }
  };

  const handleSaveSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (schools.length === 0) return;
    try {
      await api.updateSchool(schools[0].id, {
        name: schoolName,
        address: schoolAddress,
      });
      setFormMsg({ type: 'success', text: 'Okul bilgileri başarıyla güncellendi.' });
      await fetchData();
    } catch (err: any) {
      setFormMsg({ type: 'error', text: err.message || 'Okul güncellenemedi.' });
    }
  };

  const handleCreateBreak = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createBreak({
        name: newBreakName,
        startTime: newBreakStart,
        endTime: newBreakEnd,
        orderDeadlineMinutesBefore: newBreakLimit,
      });
      setFormMsg({ type: 'success', text: 'Yeni teneffüs başarıyla eklendi.' });
      setNewBreakName('');
      setIsCreatingBreak(false);
      await fetchData();
    } catch (err: any) {
      setFormMsg({ type: 'error', text: err.message || 'Teneffüs eklenemedi.' });
    }
  };

  const executeConfirmDelete = async () => {
    if (!confirmModal) return;
    try {
      if (confirmModal.type === 'break') {
        await api.deleteBreak(confirmModal.id);
        setFormMsg({ type: 'success', text: `"${confirmModal.name}" teneffüs saati başarıyla silindi.` });
      } else {
        await api.deleteCategory(confirmModal.id);
        setFormMsg({ type: 'success', text: `"${confirmModal.name}" kategorisi başarıyla silindi/kapatıldı.` });
      }
      setConfirmModal(null);
      await fetchData();
    } catch (err: any) {
      setFormMsg({ type: 'error', text: err.message || 'Silme işlemi gerçekleştirilemedi.' });
      setConfirmModal(null);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createCategory({
        name: newCatName,
        productType: newCatType,
      });
      setFormMsg({ type: 'success', text: 'Yeni kategori eklendi.' });
      setNewCatName('');
      setIsCreatingCategory(false);
      await fetchData();
    } catch (err: any) {
      setFormMsg({ type: 'error', text: err.message || 'Kategori eklenemedi.' });
    }
  };

  const handleToggleBreak = async (b: BreakTime) => {
    try {
      await api.updateBreak(b.id, { activeStatus: !b.activeStatus });
      setFormMsg({
        type: 'success',
        text: `"${b.name}" ${!b.activeStatus ? 'siparişe açıldı' : 'siparişe kapatıldı'}.`,
      });
      await fetchData();
    } catch (err: any) {
      setFormMsg({ type: 'error', text: err.message || 'Teneffüs durumu değiştirilemedi.' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 font-serif">
              Okul İdaresi ve Sistem Yönetimi
            </h1>
            <span className="bg-blue-100 text-blue-900 font-bold text-xs px-2.5 py-0.5 rounded-full">
              Süper Admin
            </span>
          </div>
          <p className="text-xs text-stone-500">
            Kantin personeli hesap yetkilendirmesi, teneffüs saatleri ve güvenlik denetim kayıtları.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="self-start sm:self-auto px-3.5 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Yenile
        </button>
      </div>

      {formMsg && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
            formMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {formMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{formMsg.text}</span>
        </div>
      )}

      {/* Section 1: Staff and Users Management */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-800" />
            <h2 className="font-bold text-sm text-stone-900">Yetkili Kullanıcı ve Personel Hesapları</h2>
          </div>

          <button
            onClick={() => setIsCreatingUser(!isCreatingUser)}
            className="px-3 py-1.5 rounded-xl bg-blue-800 hover:bg-blue-900 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            + Kantinci / Personel Ekle
          </button>
        </div>

        {isCreatingUser && (
          <form onSubmit={handleCreateStaff} className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
            <h4 className="text-xs font-bold text-stone-800">Yeni Personel Tanımla</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">Ad Soyad</label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={e => setNewFullName(e.target.value)}
                  placeholder="Örn: Hasan Yılmaz"
                  className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">E-posta</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="hasan@kantincep.com"
                  className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">Rol</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl bg-white font-semibold"
                >
                  <option value="canteen">Kantin İşletmecisi (Canteen)</option>
                  <option value="admin">Okul Yöneticisi (Admin)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCreatingUser(false)}
                className="px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-200 rounded-lg"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold bg-blue-800 text-white rounded-lg hover:bg-blue-900"
              >
                Personeli Kaydet
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-600">
            <thead className="bg-stone-50 border-b border-stone-200 text-[11px] font-bold text-stone-700 uppercase">
              <tr>
                <th className="py-2.5 px-3">Ad Soyad</th>
                <th className="py-2.5 px-3">E-posta</th>
                <th className="py-2.5 px-3">Rol</th>
                <th className="py-2.5 px-3">Hesap Durumu</th>
                <th className="py-2.5 px-3 text-right">Erişim Yönetimi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-stone-50/50">
                  <td className="py-2.5 px-3 font-bold text-stone-900">{u.fullName}</td>
                  <td className="py-2.5 px-3 font-mono">{u.email}</td>
                  <td className="py-2.5 px-3">
                    <span className="font-semibold text-stone-800">
                      {u.role === 'parent' ? 'Veli' : u.role === 'canteen' ? 'Kantinci' : 'Yönetici'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        u.accountStatus === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {u.accountStatus === 'active' ? 'Aktif' : 'Askıya Alındı'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {u.id !== user?.id && (
                      <button
                        onClick={() => handleToggleUserStatus(u)}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                          u.accountStatus === 'active'
                            ? 'border-red-200 text-red-700 hover:bg-red-50'
                            : 'border-emerald-200 text-emerald-800 hover:bg-emerald-50'
                        }`}
                      >
                        {u.accountStatus === 'active' ? 'Askıya Al' : 'Aktifleştir'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section: School Info & Settings */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <SchoolIcon className="w-5 h-5 text-emerald-800" />
          <div>
            <h2 className="font-bold text-sm text-stone-900">Okul Bilgileri ve Kantin Tanımı</h2>
            <p className="text-[11px] text-stone-400">Okul adı, adresi ve zaman dilimi</p>
          </div>
        </div>

        <form onSubmit={handleSaveSchool} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-[11px] font-semibold text-stone-600 mb-1">Okul Adı</label>
            <input
              type="text"
              required
              value={schoolName}
              onChange={e => setSchoolName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl bg-white font-bold"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-stone-600 mb-1">Okul Adresi</label>
            <input
              type="text"
              required
              value={schoolAddress}
              onChange={e => setSchoolAddress(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl bg-white"
            />
          </div>
          <div>
            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2 text-xs font-bold bg-emerald-800 text-white rounded-xl hover:bg-emerald-900 shadow-xs cursor-pointer"
            >
              Okul Bilgilerini Kaydet
            </button>
          </div>
        </form>
      </div>

      {/* Section 2: School Break Times */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-800" />
            <div>
              <h2 className="font-bold text-sm text-stone-900">Teneffüs Saatleri ve Sipariş Kabul Aralıkları</h2>
              <p className="text-[11px] text-stone-400">Okul zil programı ve teneffüs ön sipariş süreleri</p>
            </div>
          </div>

          <button
            onClick={() => setIsCreatingBreak(!isCreatingBreak)}
            className="px-3 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            + Yeni Teneffüs Ekle
          </button>
        </div>

        {isCreatingBreak && (
          <form onSubmit={handleCreateBreak} className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
            <h4 className="text-xs font-bold text-stone-800">Yeni Teneffüs / Zil Saati Tanımla</h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">Teneffüs Adı</label>
                <input
                  type="text"
                  required
                  value={newBreakName}
                  onChange={e => setNewBreakName(e.target.value)}
                  placeholder="Örn: 5. Teneffüs"
                  className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">Başlangıç Saati</label>
                <input
                  type="time"
                  required
                  value={newBreakStart}
                  onChange={e => setNewBreakStart(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">Bitiş Saati</label>
                <input
                  type="time"
                  required
                  value={newBreakEnd}
                  onChange={e => setNewBreakEnd(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">Sipariş Kabul Limiti (Dk Önce)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={newBreakLimit}
                  onChange={e => setNewBreakLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCreatingBreak(false)}
                className="px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-200 rounded-lg cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold bg-emerald-800 text-white rounded-lg hover:bg-emerald-900 cursor-pointer"
              >
                Teneffüsü Kaydet
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {breaks.map(b => (
            <div
              key={b.id}
              className={`p-3.5 rounded-2xl border flex flex-col justify-between space-y-2 ${
                b.activeStatus ? 'border-emerald-200 bg-emerald-50/20' : 'border-stone-200 bg-stone-50 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-stone-900">{b.name}</p>
                  <button
                    onClick={() => handleDeleteBreak(b.id, b.name)}
                    className="text-stone-400 hover:text-red-600 p-0.5"
                    title="Sil"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-sm font-mono font-black text-emerald-900 mt-1">
                  {b.startTime} - {b.endTime}
                </p>
                <p className="text-[10px] text-stone-400 mt-0.5">
                  Ön sipariş limiti: {b.orderDeadlineMinutesBefore || 15} dk önce
                </p>
              </div>

              <button
                onClick={() => handleToggleBreak(b)}
                className={`text-[11px] font-bold py-1 px-2 rounded-lg border transition-colors cursor-pointer ${
                  b.activeStatus
                    ? 'border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                    : 'border-stone-300 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {b.activeStatus ? '✓ Siparişe Açık' : '✕ Kapalı'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2.5: Product Categories Management */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-indigo-800" />
            <div>
              <h2 className="font-bold text-sm text-stone-900">Kantin ve Kırtasiye Kategorileri</h2>
              <p className="text-[11px] text-stone-400">Ürün gruplandırma ve menü sekmeleri</p>
            </div>
          </div>

          <button
            onClick={() => setIsCreatingCategory(!isCreatingCategory)}
            className="px-3 py-1.5 rounded-xl bg-indigo-800 hover:bg-indigo-900 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            + Yeni Kategori Ekle
          </button>
        </div>

        {isCreatingCategory && (
          <form onSubmit={handleCreateCategory} className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
            <h4 className="text-xs font-bold text-stone-800">Yeni Kategori Oluştur</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">Kategori Adı</label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  placeholder="Örn: Taze Meyveler & Salata"
                  className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">Kategori Türü</label>
                <select
                  value={newCatType}
                  onChange={e => setNewCatType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl bg-white font-semibold"
                >
                  <option value="food">Kantin Yiyecek & İçecek</option>
                  <option value="stationery">Eğitim & Kırtasiye</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCreatingCategory(false)}
                className="px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-200 rounded-lg cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold bg-indigo-800 text-white rounded-lg hover:bg-indigo-900 cursor-pointer"
              >
                Kategoriyi Kaydet
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {categories.filter(c => c.activeStatus).map(cat => (
            <div
              key={cat.id}
              className="p-3 rounded-xl border border-stone-200 bg-stone-50 flex items-center justify-between gap-1"
            >
              <div className="min-w-0">
                <p className="text-xs font-bold text-stone-900 truncate">{cat.name}</p>
                <span className="text-[10px] text-stone-400">
                  {cat.productType === 'food' ? 'Yiyecek' : 'Kırtasiye'}
                </span>
              </div>
              <button
                onClick={() => handleDeleteCategory(cat.id, cat.name)}
                className="text-stone-400 hover:text-red-600 p-1 rounded"
                title="Sil"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: System Audit Logs */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-stone-700" />
            <h2 className="font-bold text-sm text-stone-900">Sistem İşlem ve Güvenlik Denetim Günlüğü (Audit Log)</h2>
          </div>
          <span className="text-xs text-stone-400">Son 100 işlem</span>
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-stone-100 font-mono text-[11px]">
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
    </div>
  );
};
