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
    <div className="fixed inset-0 z-50 bg-stone-900/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-5">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-2xl mx-auto flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-stone-900">İlk Giriş: Şifre Değiştirme Zorunluluğu</h2>
          <p className="text-xs text-stone-500 max-w-xs mx-auto">
            Sayın {user?.fullName}, kurum müdürünüz tarafından atanan geçici şifrenizi güvenliğiniz için kalıcı bir şifreyle değiştirmelisiniz.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700">Mevcut Geçici Şifreniz</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Müdürün verdiği geçici şifre (örn. 123456)"
                className="w-full pl-9 pr-3 py-2 text-xs border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700">Yeni Kalıcı Şifre</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="En az 6 karakter"
                className="w-full pl-9 pr-3 py-2 text-xs border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700">Yeni Şifre Tekrar</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                minLength={6}
                value={newPasswordRepeat}
                onChange={e => setNewPasswordRepeat(e.target.value)}
                placeholder="Yeni şifreyi tekrar giriniz"
                className="w-full pl-9 pr-3 py-2 text-xs border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm disabled:opacity-50"
          >
            {loading ? 'Güncelleniyor...' : 'Yeni Şifremi Kaydet ve Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  );
};
