import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, Shield, Sparkles, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { KvkkModal } from './KvkkModal.tsx';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'login' | 'register' | 'quick';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialTab = 'login' }) => {
  const { login, register, quickLogin, quickUsers } = useAuth();
  const [tab, setTab] = useState<'login' | 'register' | 'quick' | 'reset'>(initialTab);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [passwordRepeat, setPasswordRepeat] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [kvkkConsent, setKvkkConsent] = useState(false);
  const [isKvkkModalOpen, setIsKvkkModalOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Giriş yapılamadı. Bilgilerinizi kontrol ediniz.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== passwordRepeat) {
      setError('Şifreler uyuşmuyor.');
      return;
    }
    if (!kvkkConsent) {
      setError('Lütfen KVKK ve Aydınlatma Metnini onaylayınız.');
      return;
    }

    setLoading(true);
    try {
      await register({
        fullName,
        email,
        password,
        passwordRepeat,
        kvkkConsent,
      });
      setSuccessMsg('Hesabınız başarıyla oluşturuldu! Hoş geldiniz.');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Kayıt işlemi başarısız.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.resetPassword({ email: resetEmail, newPassword: resetNewPassword });
      setSuccessMsg(res.message);
      setTimeout(() => {
        setTab('login');
        setSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Şifre sıfırlanamadı.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuick = async (userId: string) => {
    setLoading(true);
    try {
      await quickLogin(userId);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
        <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden">
          {/* Header */}
          <div className="bg-emerald-900 text-white p-5 flex items-center justify-between">
            <div>
              <span className="text-xs uppercase tracking-wider text-emerald-300 font-semibold">KantinCep Giriş Portalı</span>
              <h3 className="text-xl font-bold font-serif text-white">Sıranı Bekleme, İyiliği Paylaş</h3>
            </div>
            <button
              onClick={onClose}
              className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-emerald-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Selector */}
          <div className="flex border-b border-stone-200 bg-stone-50 p-1.5 gap-1">
            <button
              type="button"
              onClick={() => { setTab('login'); setError(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                tab === 'login'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Giriş Yap
            </button>
            <button
              type="button"
              onClick={() => { setTab('register'); setError(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                tab === 'register'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Veli Kayıt Ol
            </button>
            <button
              type="button"
              onClick={() => { setTab('quick'); setError(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1 ${
                tab === 'quick'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-800 hover:bg-emerald-100/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Test Hesapları
            </button>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* TAB: Quick Demo Switch */}
            {tab === 'quick' && (
              <div className="space-y-3">
                <p className="text-xs text-stone-500 mb-2">
                  Test ve değerlendirme için aşağıdaki hazır rollerden birini anında seçebilirsiniz:
                </p>

                {quickUsers.map(u => {
                  const roleConfig = {
                    parent: { label: 'Veli Hesabı', desc: 'Ayşe Yılmaz (Ali ve Zeynep\'in Velisi)', badge: 'bg-emerald-100 text-emerald-800' },
                    canteen: { label: 'Kantinci Paneli', desc: 'Mehmet Usta (Atatürk İlkokulu Kantini)', badge: 'bg-amber-100 text-amber-800' },
                    admin: { label: 'Okul Yönetimi / Admin', desc: 'Kemal Öztürk (Okul Müdürü)', badge: 'bg-blue-100 text-blue-800' },
                  }[u.role] || { label: u.role, desc: u.email, badge: 'bg-stone-100 text-stone-800' };

                  return (
                    <button
                      key={u.id}
                      onClick={() => handleQuick(u.id)}
                      disabled={loading}
                      className="w-full text-left p-3.5 rounded-xl border border-stone-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-stone-900 text-sm">{u.fullName}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${roleConfig.badge}`}>
                            {roleConfig.label}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 mt-0.5">{roleConfig.desc}</p>
                        <p className="text-[11px] text-stone-400 mt-0.5">{u.email}</p>
                      </div>
                      <span className="text-xs font-semibold text-emerald-700 group-hover:translate-x-1 transition-transform">
                        Seç →
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* TAB: Login */}
            {tab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">E-posta Adresi</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="veli@kantincep.com"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-emerald-600 focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-stone-700">Şifre</label>
                    <button
                      type="button"
                      onClick={() => { setTab('reset'); setError(null); }}
                      className="text-xs text-emerald-700 hover:underline cursor-pointer"
                    >
                      Şifremi Unuttum?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-emerald-600 focus:border-emerald-600"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-medium text-sm transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setTab('quick')}
                    className="text-xs text-stone-500 hover:text-emerald-700 underline"
                  >
                    Veya test hesabı ile tek tıkla dene
                  </button>
                </div>
              </form>
            )}

            {/* TAB: Register */}
            {tab === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Ad Soyad (Veli)</label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="Örn. Selin Kaya"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">E-posta Adresi</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="selin@example.com"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Şifre</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="En az 6 karakter"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-emerald-600"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Şifre Tekrar</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                      <input
                        type="password"
                        required
                        value={passwordRepeat}
                        onChange={e => setPasswordRepeat(e.target.value)}
                        placeholder="Tekrar yazın"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-emerald-600"
                      />
                    </div>
                  </div>
                </div>

                {/* KVKK Consent Checkbox */}
                <div className="pt-1">
                  <label className="flex items-start gap-2 text-xs text-stone-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={kvkkConsent}
                      onChange={e => setKvkkConsent(e.target.checked)}
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>
                      <button
                        type="button"
                        onClick={() => setIsKvkkModalOpen(true)}
                        className="text-emerald-700 font-semibold underline hover:text-emerald-900"
                      >
                        KVKK Aydınlatma Metni
                      </button>
                      'ni okudum, anladım ve onaylıyorum.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-medium text-sm transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Kaydediliyor...' : 'Veli Hesabı Oluştur'}
                </button>
              </form>
            )}

            {/* TAB: Password Reset */}
            {tab === 'reset' && (
              <form onSubmit={handleResetPassword} className="space-y-3.5">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-900 text-xs">
                  Kayıtlı e-posta adresinizi ve yeni şifrenizi girerek anında şifrenizi güncelleyebilirsiniz.
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Kayıtlı E-posta Adresi</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                      placeholder="veli@kantincep.com"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Yeni Şifreniz</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      value={resetNewPassword}
                      onChange={e => setResetNewPassword(e.target.value)}
                      placeholder="En az 6 karakter"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-emerald-600"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setTab('login')}
                    className="flex-1 py-2 rounded-xl border border-stone-200 bg-stone-50 text-stone-600 text-xs font-semibold hover:bg-stone-100 cursor-pointer"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      <KvkkModal isOpen={isKvkkModalOpen} onClose={() => setIsKvkkModalOpen(false)} />
    </>
  );
};
