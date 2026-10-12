import React, { useState, useEffect } from 'react';
import { X, UserPlus, GraduationCap, Building2 } from 'lucide-react';
import { Student } from '../../types.ts';
import { api } from '../../services/api.ts';

interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (student: Student) => void;
  existingStudent?: Student | null;
}

export const StudentModal: React.FC<StudentModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  existingStudent,
}) => {
  const [fullName, setFullName] = useState(existingStudent?.fullName || '');
  const [grade, setGrade] = useState(existingStudent?.grade || '3. Sınıf');
  const [classroom, setClassroom] = useState(existingStudent?.classroom || '3-A');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existingStudent) {
      setFullName(existingStudent.fullName);
      setGrade(existingStudent.grade);
      setClassroom(existingStudent.classroom);
    } else {
      setFullName('');
      setGrade('3. Sınıf');
      setClassroom('3-A');
    }
    setError(null);
  }, [existingStudent, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Öğrenci adı soyadı zorunludur.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (existingStudent) {
        const res = await api.updateStudent(existingStudent.id, {
          fullName,
          grade,
          classroom,
        });
        onSaved(res.student);
      } else {
        const res = await api.createStudent({
          fullName,
          grade,
          classroom,
        });
        onSaved(res.student);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Öğrenci kaydedilemedi.');
    } finally {
      setLoading(false);
    }
  };

  const grades = [
    'Ana Sınıfı',
    '1. Sınıf',
    '2. Sınıf',
    '3. Sınıf',
    '4. Sınıf',
    '5. Sınıf',
    '6. Sınıf',
    '7. Sınıf',
    '8. Sınıf',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden">
        <div className="bg-emerald-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-300" />
            <h3 className="font-bold text-base">
              {existingStudent ? 'Öğrenci Bilgilerini Düzenle' : 'Yeni Öğrenci Ekle'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-emerald-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Öğrenci Ad Soyad
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Örn: Emir Yılmaz"
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:outline-emerald-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-emerald-700" />
                Sınıf Düzeyi
              </label>
              <select
                value={grade}
                onChange={e => {
                  setGrade(e.target.value);
                  const digit = e.target.value.match(/\d/)?.[0] || '1';
                  setClassroom(`${digit}-A`);
                }}
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:outline-emerald-600 bg-white"
              >
                {grades.map(g => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                Şube
              </label>
              <input
                type="text"
                required
                value={classroom}
                onChange={e => setClassroom(e.target.value.toUpperCase())}
                placeholder="Örn: 3-B"
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:outline-emerald-600 font-bold"
              />
            </div>
          </div>

          <div className="p-3 bg-stone-50 rounded-xl text-[11px] text-stone-500 border border-stone-100">
            ℹ️ Siparişler okul kantininde öğrencinin adı, sınıfı ve sipariş teslim koduyla eşleştirilir.
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
