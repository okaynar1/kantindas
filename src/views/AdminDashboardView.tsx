import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  Clock,
  School as SchoolIcon,
  FileText,
  CheckCircle,
  AlertCircle,
  Eye,
  RefreshCw,
  Plus,
  Tag,
  Trash2,
} from 'lucide-react';
import { User, BreakTime, AuditLog, School, Category } from '../types.ts';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const AdminDashboardView: React.FC = () => {
  const { user, adminSelectedSchool, setAdminSelectedSchool } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [breaks, setBreaks] = useState<BreakTime[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // School editing & creation
  const [schoolName, setSchoolName] = useState('');
  const [schoolAddress, setSchoolAddress] = useState('');
  const [isCreatingSchool, setIsCreatingSchool] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolCode, setNewSchoolCode] = useState('');
  const [newSchoolAddress, setNewSchoolAddress] = useState('');
  const [assignManagerModal, setAssignManagerModal] = useState<{
    schoolId: string;
    schoolName: string;
    fullName: string;
    email: string;
    tempPass: string;
  } | null>(null);

  // School deletion modal state
  const [deleteSchoolModal, setDeleteSchoolModal] = useState<{
    school: School;
    inputCode: string;
    step: 1 | 2;
    hardDelete: boolean;
  } | null>(null);

  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const targetSchoolId = adminSelectedSchool?.id;
      const [uRes, bRes, lRes, sRes, cRes] = await Promise.all([
        api.getAdminUsers(),
        api.getBreaks(targetSchoolId),
        api.getAuditLogs(),
        api.getSchools(),
        api.getCategories(targetSchoolId),
      ]);
      setUsers(uRes.users);
      setBreaks(bRes.breaks);
      setAuditLogs(lRes.logs);
      setSchools(sRes.schools);
      setCategories(cRes.categories);

      if (sRes.schools.length > 0) {
        setSchoolName(sRes.schools[0].name);
        setSchoolAddress(sRes.schools[0].address || '');
      }
    } catch (err: any) {
      setFormMsg({ type: 'error', text: err.message || 'Veriler yüklenemedi.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, adminSelectedSchool]);

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg(null);
    try {
      const res = await api.createSchool({
        name: newSchoolName,
        code: newSchoolCode,
        address: newSchoolAddress,
      });
      setFormMsg({
        type: 'success',
        text: `Yeni okul "${res.school.name}" (Kod: ${res.school.code}) başarıyla sisteme eklendi.`,
      });
      setNewSchoolName('');
      setNewSchoolCode('');
      setNewSchoolAddress('');
      setIsCreatingSchool(false);
      await fetchData();
    } catch (err: any) {
      setFormMsg({ type: 'error', text: err.message || 'Okul oluşturulamadı.' });
    }
  };

  const handleAssignManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignManagerModal) return;
    setFormMsg(null);
    try {
      const res = await api.assignSchoolManager(assignManagerModal.schoolId, {
        fullName: assignManagerModal.fullName,
        email: assignManagerModal.email,
        tempPassword: assignManagerModal.tempPass || '123456',
      });
      setFormMsg({
        type: 'success',
        text: `${res.message} Geçici şifre: ${assignManagerModal.tempPass || '123456'}`,
      });
      setAssignManagerModal(null);
      await fetchData();
    } catch (err: any) {
      setFormMsg({ type: 'error', text: err.message || 'Müdür atanamadı.' });
    }
  };

  const handleToggleSchoolStatus = async (targetSchool: School) => {
    try {
      await api.updateSchool(targetSchool.id, {
        activeStatus: !targetSchool.activeStatus,
      });
      setFormMsg({
        type: 'success',
        text: `"${targetSchool.name}" okulu ${!targetSchool.activeStatus ? 'aktifleştirildi' : 'pasifleştirildi'}.`,
      });
      await fetchData();
    } catch (err: any) {
      setFormMsg({ type: 'error', text: err.message || 'Okul durumu değiştirilemedi.' });
    }
  };

  const handleDeleteSchool = async () => {
    if (!deleteSchoolModal) return;
    try {
      const res = await api.deleteSchool(deleteSchoolModal.school.id, deleteSchoolModal.hardDelete);
      setFormMsg({
        type: 'success',
        text: res.message || `"${deleteSchoolModal.school.name}" başarıyla arşive alındı.`,
      });
      if (adminSelectedSchool?.id === deleteSchoolModal.school.id) {
        setAdminSelectedSchool(null);
      }
      setDeleteSchoolModal(null);
      await fetchData();
    } catch (err: any) {
      setFormMsg({ type: 'error', text: err.message || 'Okul silinemedi.' });
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
            Okul ve kurum müdürü yönetimi, sistem genelinde yetkilendirme, izleme ve güvenlik denetimi.
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

      {adminSelectedSchool && (
        <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2">
            <SchoolIcon className="w-4 h-4 text-blue-700 shrink-0" />
            <div>
              <span className="font-bold text-blue-950">Özel Okul İncelemesi Aktif: </span>
              <span className="font-semibold">{adminSelectedSchool.name}</span>
              {adminSelectedSchool.code && (
                <span className="ml-1.5 px-2 py-0.5 rounded bg-blue-200 text-blue-950 font-mono font-bold text-[10px]">
                  {adminSelectedSchool.code}
                </span>
              )}
              <p className="text-[11px] text-blue-700">Üst panelde ve ilgili alanlarda bu okulun verileri gösterilmektedir.</p>
            </div>
          </div>
          <button
            onClick={() => setAdminSelectedSchool(null)}
            className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-white border border-blue-300 hover:bg-blue-100 text-blue-900 font-bold text-xs transition-colors cursor-pointer shadow-xs"
          >
            ✕ Tüm Okullara Dön
          </button>
        </div>
      )}

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

      {/* Yönetici Profil ve Sistem Durumu */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-blue-800" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-stone-900">{user?.fullName || 'Merkezi Sistem Yöneticisi'}</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200">
                  Sistem Yöneticisi (Admin)
                </span>
              </div>
              <p className="text-xs text-stone-500 font-mono mt-0.5">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
            <div className="text-right">
              <span className="text-[11px] text-stone-400 block">Kayıtlı Okullar</span>
              <span className="font-bold text-stone-900 text-sm">{schools.length} Okul</span>
            </div>
            <div className="h-8 w-px bg-stone-200" />
            <div className="text-right">
              <span className="text-[11px] text-stone-400 block">Aktif Okullar</span>
              <span className="font-bold text-emerald-800 text-sm">{schools.filter(s => s.activeStatus).length} Aktif</span>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-stone-600 text-xs flex items-center gap-2">
          <SchoolIcon className="w-4 h-4 text-emerald-800 shrink-0" />
          <span>
            <strong>Yetki İlkesi:</strong> Okul personeli (öğretmen ve kantinci) ekleme ve günlük yetkilendirme işlemleri ilgili okulun Kurum Müdürü tarafından yapılmaktadır. Merkezi Yönetici olarak okulları ve okul müdürlerini yönetebilirsiniz.
          </span>
        </div>
      </div>

      {/* Section: Multi-School Management & Managers */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SchoolIcon className="w-5 h-5 text-emerald-800" />
            <div>
              <h2 className="font-bold text-sm text-stone-900">Çok Okullu Sistem Yönetimi (Okullar ve Kurum Müdürleri)</h2>
              <p className="text-[11px] text-stone-400">
                Tüm okulların listesi, veli kayıt kodları ve tek yetkili okul müdürleri.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCreatingSchool(!isCreatingSchool)}
            className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            + Yeni Okul Ekle
          </button>
        </div>

        {isCreatingSchool && (
          <form onSubmit={handleCreateSchool} className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
            <h4 className="text-xs font-bold text-stone-800">Sisteme Yeni Okul Ekle</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">Okul Tam Adı *</label>
                <input
                  type="text"
                  required
                  value={newSchoolName}
                  onChange={e => setNewSchoolName(e.target.value)}
                  placeholder="Örn: Gazi Anadolu Lisesi"
                  className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl bg-white font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  Benzersiz Okul Kodu * <span className="text-[10px] text-stone-400">(Velilerin kayıt kodu)</span>
                </label>
                <input
                  type="text"
                  required
                  value={newSchoolCode}
                  onChange={e => setNewSchoolCode(e.target.value.toUpperCase())}
                  placeholder="Örn: GAZI02"
                  className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl bg-white font-mono font-bold tracking-wider"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">Adres & Konum</label>
                <input
                  type="text"
                  value={newSchoolAddress}
                  onChange={e => setNewSchoolAddress(e.target.value)}
                  placeholder="İlçe / İl"
                  className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCreatingSchool(false)}
                className="px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-200 rounded-lg cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold bg-emerald-800 text-white rounded-lg hover:bg-emerald-900 cursor-pointer"
              >
                Okulu Sisteme Kaydet
              </button>
            </div>
          </form>
        )}

        {/* Schools Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-600">
            <thead className="bg-stone-50 border-b border-stone-200 text-[11px] font-bold text-stone-700 uppercase">
              <tr>
                <th className="py-2.5 px-3">Okul Adı</th>
                <th className="py-2.5 px-3">Okul Kodu</th>
                <th className="py-2.5 px-3">Adres</th>
                <th className="py-2.5 px-3">Yetkili Kurum Müdürü</th>
                <th className="py-2.5 px-3">Durum</th>
                <th className="py-2.5 px-3 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {schools.map(s => {
                const manager = users.find(u => u.id === s.managerUserId || (u.schoolId === s.id && u.role === 'manager' && u.accountStatus === 'active'));
                return (
                  <tr key={s.id} className="hover:bg-stone-50/50">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-stone-900">{s.name}</div>
                      <div className="text-[10px] text-stone-400 font-mono">{s.id}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-mono font-bold bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded text-[11px] tracking-wide">
                        {s.code || 'KODSUZ'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-stone-500 max-w-xs truncate">
                      {s.address || '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      {manager ? (
                        <div>
                          <div className="font-bold text-stone-900 text-[11px]">{manager.fullName}</div>
                          <div className="text-[10px] text-stone-400 font-mono">{manager.email}</div>
                        </div>
                      ) : (
                        <span className="text-[10px] text-stone-400 italic">Müdür Atanmadı</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          s.activeStatus !== false
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {s.activeStatus !== false ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            if (adminSelectedSchool?.id === s.id) {
                              setAdminSelectedSchool(null);
                            } else {
                              setAdminSelectedSchool(s);
                            }
                          }}
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                            adminSelectedSchool?.id === s.id
                              ? 'bg-blue-800 text-white border-blue-800 shadow-xs'
                              : 'border-stone-200 text-stone-700 hover:bg-stone-100'
                          }`}
                          title="Bu okulun detaylarını üst panelde ve sistemde aktif kıl"
                        >
                          {adminSelectedSchool?.id === s.id ? '✓ Seçili Okul' : 'Okulu İncele'}
                        </button>
                        <button
                          onClick={() =>
                            setAssignManagerModal({
                              schoolId: s.id,
                              schoolName: s.name,
                              fullName: manager?.fullName || '',
                              email: manager?.email || '',
                              tempPass: '123456',
                            })
                          }
                          className="text-[11px] font-bold px-2.5 py-1 rounded-lg border border-blue-200 text-blue-800 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          {manager ? 'Müdür Değiştir' : '+ Müdür Ata'}
                        </button>
                        <button
                          onClick={() => handleToggleSchoolStatus(s)}
                          className={`text-[11px] font-bold px-2 py-1 rounded-lg border transition-colors cursor-pointer ${
                            s.activeStatus !== false
                              ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                              : 'border-emerald-200 text-emerald-800 hover:bg-emerald-50'
                          }`}
                        >
                          {s.activeStatus !== false ? 'Pasife Al' : 'Aktifleştir'}
                        </button>
                        <button
                          onClick={() =>
                            setDeleteSchoolModal({
                              school: s,
                              inputCode: '',
                              step: 1,
                              hardDelete: false,
                            })
                          }
                          className="text-[11px] font-bold px-2 py-1 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Okulu sistemden kaldır veya arşive al"
                        >
                          <Trash2 className="w-3 h-3" />
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Manager Modal */}
      {assignManagerModal && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <SchoolIcon className="w-5 h-5 text-blue-800" />
              <div>
                <h3 className="font-bold text-stone-900 text-sm">
                  Okul Müdürü Yetkilendirme
                </h3>
                <p className="text-[11px] text-stone-500 font-medium">
                  {assignManagerModal.schoolName}
                </p>
              </div>
            </div>

            <p className="text-xs text-stone-500">
              KantinCep mimarisi gereği her okulun <strong className="text-stone-800">yalnızca tek bir yetkili müdür hesabı</strong> bulunur.
              Müdür, yalnızca kendi okulunun danışman öğretmenlerini, kantincisini ve öğrencilerini yönetebilir.
            </p>

            <form onSubmit={handleAssignManager} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">Müdür Ad Soyad *</label>
                <input
                  type="text"
                  required
                  value={assignManagerModal.fullName}
                  onChange={e =>
                    setAssignManagerModal({ ...assignManagerModal, fullName: e.target.value })
                  }
                  placeholder="Örn: Kemal Öztürk"
                  className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl bg-white font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">Müdür E-posta Adresi *</label>
                <input
                  type="email"
                  required
                  value={assignManagerModal.email}
                  onChange={e =>
                    setAssignManagerModal({ ...assignManagerModal, email: e.target.value })
                  }
                  placeholder="mudur@kantincep.com"
                  className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">Geçici Giriş Şifresi</label>
                <input
                  type="text"
                  value={assignManagerModal.tempPass}
                  onChange={e =>
                    setAssignManagerModal({ ...assignManagerModal, tempPass: e.target.value })
                  }
                  placeholder="123456"
                  className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl bg-white font-mono"
                />
                <span className="text-[10px] text-stone-400">Varsayılan: 123456 (İlk girişte değiştirilir)</span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAssignManagerModal(null)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-blue-800 text-white rounded-xl hover:bg-blue-900 shadow-xs cursor-pointer"
                >
                  Müdürü Yetkilendir ve Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Archive School Modal */}
      {deleteSchoolModal && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="font-bold text-stone-900 text-sm">
                  Okulu Sistemden Kaldır / Arşivle
                </h3>
                <p className="text-[11px] text-stone-500 font-medium">
                  {deleteSchoolModal.school.name}
                </p>
              </div>
            </div>

            <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-xs text-red-900 space-y-1.5">
              <p className="font-bold">Önemli Güvenlik Kuralları:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                <li>Okul kodu (<span className="font-mono font-bold">{deleteSchoolModal.school.code || 'KODSUZ'}</span>) yeni veli ve öğrenci kayıtlarına kapatılır.</li>
                <li>Bu okula bağlı tüm personellerin (müdür, öğretmen, kantinci) oturum erişimleri askıya alınır.</li>
                <li>Veri bütünlüğü ve denetim kayıtları korunur; geçmiş mali ödeme ve sipariş kayıtları silinmez.</li>
              </ul>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Onaylamak için okul kodunu (<span className="font-mono font-bold text-red-700">{deleteSchoolModal.school.code}</span>) yazınız:
                </label>
                <input
                  type="text"
                  value={deleteSchoolModal.inputCode}
                  onChange={e =>
                    setDeleteSchoolModal({ ...deleteSchoolModal, inputCode: e.target.value.toUpperCase() })
                  }
                  placeholder={deleteSchoolModal.school.code || 'OKUL ADI'}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl bg-white font-mono font-bold"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="hardDeleteCheck"
                  checked={deleteSchoolModal.hardDelete}
                  onChange={e =>
                    setDeleteSchoolModal({ ...deleteSchoolModal, hardDelete: e.target.checked })
                  }
                  className="rounded text-red-700"
                />
                <label htmlFor="hardDeleteCheck" className="text-[11px] text-stone-600 cursor-pointer">
                  Kalıcı silmeyi dene (yalnızca geçmişte sipariş veya ödeme almamış okullar için)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteSchoolModal(null)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  disabled={
                    deleteSchoolModal.school.code
                      ? deleteSchoolModal.inputCode !== deleteSchoolModal.school.code
                      : !deleteSchoolModal.inputCode
                  }
                  onClick={handleDeleteSchool}
                  className="px-4 py-2 text-xs font-bold bg-red-700 text-white rounded-xl hover:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {deleteSchoolModal.hardDelete ? 'Kalıcı Olarak Sil' : 'Okulu Arşive Al ve Kapat'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Okul Denetim & İnceleme (Seçili Okul Varsa Salt Okunur) */}
      {adminSelectedSchool && (
        <div className="bg-white rounded-2xl border border-blue-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-800" />
              <div>
                <h2 className="font-bold text-sm text-stone-900">
                  {adminSelectedSchool.name} – Ayar ve Yapılandırma Denetimi (Salt Okunur)
                </h2>
                <p className="text-[11px] text-stone-500">
                  Teneffüs ve sipariş saatleri Kurum Müdürü, ürün kategorileri Kantinci tarafından yönetilmektedir.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
              Merkezi Denetim Modu
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Teneffüsler Özeti */}
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2.5">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-800" />
                <h3 className="text-xs font-bold text-stone-800">Teneffüs ve Zil Saatleri ({breaks.length})</h3>
              </div>
              {breaks.length === 0 ? (
                <p className="text-xs text-stone-400">Bu okul için henüz teneffüs tanımlanmamış.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {breaks.map(b => (
                    <div key={b.id} className="p-2.5 bg-white rounded-lg border border-stone-200 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-stone-900">{b.name}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${b.activeStatus ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>
                          {b.activeStatus ? 'Siparişe Açık' : 'Kapalı'}
                        </span>
                      </div>
                      <p className="font-mono text-emerald-800 font-bold mt-1">{b.startTime} - {b.endTime}</p>
                      <span className="text-[10px] text-stone-400">Ön sipariş: {b.orderDeadlineMinutesBefore || 15} dk önce</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Kategoriler Özeti */}
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2.5">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-800" />
                <h3 className="text-xs font-bold text-stone-800">Ürün Kategorileri ({categories.length})</h3>
              </div>
              {categories.length === 0 ? (
                <p className="text-xs text-stone-400">Bu okul için henüz kategori tanımlanmamış.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {categories.map(c => (
                    <div key={c.id} className="p-2.5 bg-white rounded-lg border border-stone-200 text-xs">
                      <p className="font-bold text-stone-900 truncate">{c.name}</p>
                      <span className="text-[10px] text-stone-400">
                        {c.productType === 'food' ? 'Kantin Yiyecek' : 'Kırtasiye'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Section 2: System Audit Logs */}
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
