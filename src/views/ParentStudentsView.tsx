import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, GraduationCap, School, ShieldCheck } from 'lucide-react';
import { Student } from '../types.ts';
import { api } from '../services/api.ts';
import { StudentModal } from '../components/modals/StudentModal.tsx';

export const ParentStudentsView: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await api.getStudents();
      setStudents(res.students);
    } catch (e: any) {
      setActionNotice({ type: 'error', text: e.message || 'Öğrenciler yüklenemedi.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const confirmDelete = async () => {
    if (!studentToDelete) return;
    try {
      await api.deleteStudent(studentToDelete.id);
      setActionNotice({ type: 'success', text: `"${studentToDelete.fullName}" başarıyla silindi.` });
      setStudentToDelete(null);
      await fetchStudents();
    } catch (e: any) {
      setActionNotice({ type: 'error', text: e.message || 'Öğrenci silinemedi.' });
      setStudentToDelete(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 font-serif">
            Öğrenci Bilgilerim
          </h1>
          <p className="text-xs text-stone-500">
            Kantin siparişi vereceğiniz öğrencilerin sınıf ve şube bilgileri.
          </p>
        </div>

        <button
          onClick={() => { setEditingStudent(null); setModalOpen(true); }}
          className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Yeni Öğrenci Ekle
        </button>
      </div>

      {actionNotice && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          <span>{actionNotice.text}</span>
          <button onClick={() => setActionNotice(null)} className="font-bold ml-2">✕</button>
        </div>
      )}

      <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-900 text-xs flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
        <span>
          <strong>Çocuk Verileri Güvencesi:</strong> Kantin siparişi için zorunlu olan Ad Soyad, Sınıf ve Şube haricinde
          öğrenciye ait hiçbir kişisel veri istenmez veya kaydedilmez.
        </span>
      </div>

      {loading ? (
        <div className="py-16 text-center text-stone-400 text-xs">Yükleniyor...</div>
      ) : students.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-stone-200">
          <GraduationCap className="w-10 h-10 text-stone-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-stone-700">Kayıtlı öğrenciniz bulunmuyor.</p>
          <p className="text-xs text-stone-400 mt-1">Sipariş verebilmek için lütfen önce öğrencinizi sisteme tanımlayınız.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {students.map(s => (
            <div
              key={s.id}
              className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm">
                    {s.fullName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-stone-900 text-sm">{s.fullName}</h3>
                    <p className="text-xs text-stone-500 font-medium">
                      {s.grade} · Şube: <span className="font-bold text-emerald-900">{s.classroom}</span>
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-stone-400 pt-1 flex items-center gap-1">
                  <School className="w-3 h-3" />
                  Atatürk İlkokulu ve Ortaokulu
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => { setEditingStudent(s); setModalOpen(true); }}
                  className="w-8 h-8 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100 flex items-center justify-center transition-colors cursor-pointer"
                  title="Düzenle"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setStudentToDelete(s)}
                  className="w-8 h-8 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
                  title="Sil"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-stone-200 space-y-4">
            <h3 className="font-bold text-base text-stone-900">Öğrenciyi Sil</h3>
            <p className="text-xs text-stone-600">
              <strong>"{studentToDelete.fullName}"</strong> öğrencisini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100 rounded-lg cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-1.5 text-xs font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 cursor-pointer"
              >
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}

      <StudentModal
        isOpen={modalOpen}
        existingStudent={editingStudent}
        onClose={() => setModalOpen(false)}
        onSaved={fetchStudents}
      />
    </div>
  );
};
