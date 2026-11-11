import React, { useState } from 'react';
import { Lock, ShieldAlert, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';

interface ForcePasswordChangeModalProps {
  isOpen: boolean;
  onSuccess: () => void;
}

export const ForcePasswordChangeModal: React.FC<ForcePasswordChangeModalProps> = ({
  isOpen,
  onSuccess,
}) => {
  const { user, refreshUserData } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordRepeat, setNewPasswordRepeat] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 6) {
      setError('Yeni şifre en az 6 karakter uzunluğunda olmalıdır.');
      return;
    }

    if (newPassword !== newPasswordRepeat) {
      setError('Yeni şifreler birbiriyle uyuşmuyor.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.changePassword({
        currentPassword,
        newPassword,
        newPasswordRepeat,
      });

      setSuccess(res.message || 'Şifreniz başarıyla güncellendi.');
      await refreshUserData();
      setTimeout(() => {
        onSuccess();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Şifre güncellenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative bg-white rounded-2xl sm:rounded-3xl max-w-md w-full max-h-[92vh] flex flex-col shadow-2xl border border-stone-200 my-auto overflow-hidden">
        {/* Header (fixed at top of modal) */}
        <div className="p-5 sm:p-6 pb-2 text-center space-y-2 shrink-0 border-b border-stone-100 bg-stone-50/50">
          <div className="w-11 h-11 sm:w-12 sm:h-12 bg-amber-100 text-amber-800 rounded-2xl mx-auto flex items-center justify-center shadow-xs">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-stone-900 leading-snug">
            İlk Giriş: Şifre Değiştirme Zorunluluğu
          </h2>
          <p className="text-xs text-stone-500 max-w-xs mx-auto leading-relaxed">
            Sayın <strong className="text-stone-800">{user?.fullName || 'Kullanıcı'}</strong>, hesabınızın güvenliği için atanan geçici şifrenizi yalnızca sizin bildiğiniz yeni ve kalıcı bir şifreyle güncellemeniz gerekmektedir.
          </p>
        </div>

        {/* Scrollable Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2 shadow-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2 shadow-xs">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span className="font-medium">{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 flex items-center justify-between">
                <span>Mevcut Geçici Şifreniz</span>
                <span className="text-[10px] font-normal text-stone-400">Atanan ilk şifre</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Geçici şifreniz (örn. 123456)"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 flex items-center justify-between">
                <span>Yeni Kalıcı Şifre</span>
                <span className="text-[10px] font-normal text-stone-400">En az 6 karakter</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Yeni kalıcı şifreniz"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Yeni Şifre Tekrar</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPasswordRepeat}
                  onChange={e => setNewPasswordRepeat(e.target.value)}
                  placeholder="Yeni şifrenizi tekrar giriniz"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm hover:shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Kaydediliyor...</span>
                  </>
                ) : (
                  'Yeni Şifremi Kaydet ve Giriş Yap'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
