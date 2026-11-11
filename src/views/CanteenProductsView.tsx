import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Package, Tag, AlertTriangle, Check, X, Search, Store } from 'lucide-react';
import { Product, Category } from '../types.ts';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { ProductModal } from '../components/modals/ProductModal.tsx';

export const CanteenProductsView: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'all' | 'food' | 'stationery'>('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Category management states
  const [showCategoriesPanel, setShowCategoriesPanel] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'food' | 'stationery'>('food');
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        api.getProducts({ active: false, schoolId: user?.schoolId || 'school-1' }),
        api.getCategories(user?.schoolId || 'school-1'),
      ]);
      setProducts(prodRes.products);
      setCategories(catRes.categories);
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err.message || 'Ürünler yüklenemedi.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [user]);

  const handleQuickStockChange = async (p: Product, delta: number) => {
    const newQty = Math.max(0, p.stockQuantity + delta);
    try {
      await api.updateProduct(p.id, { stockQuantity: newQty });
      setProducts(prev => prev.map(item => item.id === p.id ? { ...item, stockQuantity: newQty } : item));
      setActionNotice({ type: 'success', text: `"${p.name}" stoku ${newQty} olarak güncellendi.` });
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err.message || 'Stok güncellenemedi.' });
    }
  };

  const handleToggleStatus = async (product: Product) => {
    try {
      const nextStatus = !product.activeStatus;
      await api.updateProduct(product.id, {
        activeStatus: nextStatus,
      });
      setActionNotice({
        type: 'success',
        text: `"${product.name}" ${nextStatus ? 'satışa açıldı' : 'satışa kapatıldı'}.`,
      });
      await fetchProducts();
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err.message || 'Durum değiştirilemedi.' });
    }
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      await api.deleteProduct(productToDelete.id);
      setActionNotice({ type: 'success', text: `"${productToDelete.name}" arşivlendi ve satıştan kaldırıldı.` });
      setProductToDelete(null);
      await fetchProducts();
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err.message || 'Silme işlemi başarısız.' });
      setProductToDelete(null);
    }
  };

  // Category Handlers for Kantinci
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await api.createCategory({
        name: newCatName.trim(),
        productType: newCatType,
        schoolId: user?.schoolId,
      });
      setActionNotice({ type: 'success', text: `"${newCatName.trim()}" kategorisi okulunuza başarıyla eklendi.` });
      setNewCatName('');
      setIsCreatingCategory(false);
      await fetchProducts();
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err.message || 'Kategori eklenemedi.' });
    }
  };

  const handleToggleCategory = async (cat: Category) => {
    try {
      await api.updateCategory(cat.id, { activeStatus: !cat.activeStatus });
      setActionNotice({
        type: 'success',
        text: `"${cat.name}" kategorisi ${!cat.activeStatus ? 'aktifleştirildi' : 'pasife alındı'}.`,
      });
      await fetchProducts();
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err.message || 'Kategori durumu değiştirilemedi.' });
    }
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    try {
      await api.deleteCategory(categoryToDelete.id);
      setActionNotice({ type: 'success', text: `"${categoryToDelete.name}" kategorisi silindi/arşivlendi.` });
      setCategoryToDelete(null);
      await fetchProducts();
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err.message || 'Kategori silinemedi.' });
      setCategoryToDelete(null);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchType = typeFilter === 'all' || p.productType === typeFilter;
    const matchLowStock = !lowStockOnly || (p.stockQuantity <= 10 && p.activeStatus);
    const q = searchQuery.toLowerCase();
    const matchSearch = p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
    return matchType && matchLowStock && matchSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 font-serif">
            Kantin Ürün & Stok Yönetimi
          </h1>
          <p className="text-xs text-stone-500">
            Kantin ve kırtasiye ürünlerini ekleyin, okul kategorilerini düzenleyin ve stokları anlık güncelleyin.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setShowCategoriesPanel(!showCategoriesPanel)}
            className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
              showCategoriesPanel
                ? 'bg-indigo-50 border-indigo-300 text-indigo-900'
                : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            <Tag className="w-4 h-4 text-indigo-600" />
            {showCategoriesPanel ? 'Kategorileri Gizle' : `Kategori Yönetimi (${categories.length})`}
          </button>

          <button
            onClick={() => { setEditingProduct(null); setModalOpen(true); }}
            className="px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Yeni Ürün Ekle
          </button>
        </div>
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

      {/* Category Management Drawer/Section */}
      {showCategoriesPanel && (
        <div className="bg-white rounded-2xl border border-indigo-200 p-5 shadow-sm space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-indigo-700" />
              <div>
                <h2 className="font-bold text-sm text-stone-900">Kantin ve Kırtasiye Kategorileri Yönetimi</h2>
                <p className="text-[11px] text-stone-500">
                  Okulunuzun ürün gruplandırma menüsü. Eklediğiniz kategoriler ürün ekleme/düzenleme pencerelerinde otomatik görünür.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsCreatingCategory(!isCreatingCategory)}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              + Yeni Kategori Ekle
            </button>
          </div>

          {/* New Category Form */}
          {isCreatingCategory && (
            <form onSubmit={handleCreateCategory} className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200 space-y-3">
              <h4 className="text-xs font-bold text-indigo-950">Okulunuza Yeni Kategori Tanımlayın</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">Kategori Adı *</label>
                  <input
                    type="text"
                    required
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    placeholder="Örn: Sıcak Çorbalar & Tostlar"
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl bg-white focus:outline-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">Kategori Türü *</label>
                  <select
                    value={newCatType}
                    onChange={e => setNewCatType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl bg-white font-semibold focus:outline-indigo-600"
                  >
                    <option value="food">Kantin Yiyecek & İçecek Menüsü</option>
                    <option value="stationery">Eğitim & Kırtasiye Destek Ürünleri</option>
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
                  className="px-4 py-1.5 text-xs font-bold bg-indigo-700 text-white rounded-lg hover:bg-indigo-800 shadow-xs cursor-pointer"
                >
                  Kategoriyi Kaydet
                </button>
              </div>
            </form>
          )}

          {/* Categories Grid */}
          {categories.length === 0 ? (
            <div className="py-8 text-center bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-500">
              Okulunuza ait kayıtlı kategori bulunmuyor. Yeni kategori ekleyerek ürünlerinizi gruplandırabilirsiniz.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {categories.map(cat => {
                const productCount = products.filter(p => p.categoryId === cat.id).length;
                return (
                  <div
                    key={cat.id}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-2 transition-all ${
                      cat.activeStatus
                        ? 'border-stone-200 bg-stone-50/80 hover:border-indigo-200'
                        : 'border-stone-200 bg-stone-100 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-stone-900 truncate">{cat.name}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              cat.productType === 'food'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-indigo-100 text-indigo-800'
                            }`}
                          >
                            {cat.productType === 'food' ? 'Kantin Yiyecek' : 'Kırtasiye'}
                          </span>
                          <span className="text-[10px] text-stone-400">
                            {productCount} ürün
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => setCategoryToDelete(cat)}
                        className="text-stone-400 hover:text-red-600 p-1 rounded-md transition-colors cursor-pointer"
                        title="Kategoriyi Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between">
                      <button
                        onClick={() => handleToggleCategory(cat)}
                        className={`text-[10px] font-bold py-1 px-2.5 rounded-lg border transition-all cursor-pointer w-full text-center ${
                          cat.activeStatus
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                            : 'border-stone-300 bg-stone-200 text-stone-700 hover:bg-stone-300'
                        }`}
                      >
                        {cat.activeStatus ? '✓ Satışta Aktif' : '✕ Pasif'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="text-[11px] text-stone-400 flex items-center gap-1.5 pt-1">
            <Store className="w-3.5 h-3.5 text-stone-400" />
            <span>Kategoriler yalnızca sizin okulunuza aittir ve diğer okulların menülerini etkilemez.</span>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-1.5 bg-stone-100 p-1 rounded-xl">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              typeFilter === 'all' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Tüm Ürünler ({products.length})
          </button>
          <button
            onClick={() => setTypeFilter('food')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              typeFilter === 'food' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Kantin Menüsü
          </button>
          <button
            onClick={() => setTypeFilter('stationery')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              typeFilter === 'stationery' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Kırtasiye & Destek
          </button>
          <button
            onClick={() => setLowStockOnly(!lowStockOnly)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              lowStockOnly ? 'bg-amber-500 text-stone-950 shadow-xs' : 'text-amber-800 hover:bg-amber-100/50'
            }`}
          >
            ⚠️ Düşük Stok ({products.filter(p => p.stockQuantity <= 10 && p.activeStatus).length})
          </button>
        </div>

        <div className="relative sm:w-64">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Ürün adı veya açıklama..."
            className="w-full pl-8 pr-3 py-2 text-xs border border-stone-200 rounded-xl focus:outline-emerald-600"
          />
        </div>
      </div>

      {/* Table / Grid */}
      {loading ? (
        <div className="py-16 text-center text-stone-400 text-xs">Ürünler listeleniyor...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-stone-200 p-8 space-y-2">
          <Package className="w-10 h-10 text-stone-300 mx-auto" />
          <p className="text-sm font-semibold text-stone-700">Ürün bulunamadı.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-600">
              <thead className="bg-stone-50 border-b border-stone-200 text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Ürün</th>
                  <th className="py-3 px-4">Tür / Kategori</th>
                  <th className="py-3 px-4">Fiyat</th>
                  <th className="py-3 px-4">Mevcut Stok</th>
                  <th className="py-3 px-4">Satış Durumu</th>
                  <th className="py-3 px-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredProducts.map(p => {
                  const cat = categories.find(c => c.id === p.categoryId);
                  const isLow = p.stockQuantity <= 10;
                  const isOut = p.stockQuantity <= 0;

                  return (
                    <tr key={p.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-11 h-11 rounded-xl object-cover bg-stone-100 shrink-0"
                          />
                          <div>
                            <p className="font-bold text-stone-900 text-xs">{p.name}</p>
                            <p className="text-[11px] text-stone-400 truncate max-w-xs">{p.description}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-stone-800">{cat?.name || '-'}</span>
                        <span className="block text-[10px] text-stone-400">
                          {p.productType === 'food' ? 'Kantin Yiyecek' : 'Kırtasiye'}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-bold text-emerald-900 text-sm">
                        ₺{p.price.toFixed(2)}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="font-bold min-w-[70px]">
                            <span className={isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-stone-900'}>
                              {p.stockQuantity} Adet
                            </span>
                            {isOut && <span className="block text-[10px] text-red-600 font-bold leading-none mt-0.5">Tükendi</span>}
                            {isLow && !isOut && <span className="block text-[10px] text-amber-600 font-bold leading-none mt-0.5">Kritik Stok</span>}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleQuickStockChange(p, -5)}
                              disabled={p.stockQuantity <= 0}
                              className="px-1.5 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-mono text-[10px] disabled:opacity-40"
                              title="5 Azalt"
                            >
                              -5
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickStockChange(p, 10)}
                              className="px-1.5 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-mono text-[10px] font-bold"
                              title="10 Ekle"
                            >
                              +10
                            </button>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(p)}
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                            p.activeStatus
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
                          }`}
                        >
                          {p.activeStatus ? '✓ Satışta' : '✕ Kapalı'}
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => { setEditingProduct(p); setModalOpen(true); }}
                            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
                            title="Düzenle"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setProductToDelete(p)}
                            className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Satıştan Kaldır"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
      )}

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-stone-200 space-y-4">
            <h3 className="font-bold text-base text-stone-900">Ürünü Satıştan Kaldır</h3>
            <p className="text-xs text-stone-600">
              <strong>"{productToDelete.name}"</strong> ürününü satıştan kaldırıp arşivlemek istediğinize emin misiniz?
              Geçmiş sipariş fişlerindeki kayıtlar korunacak, ancak menüden kaldırılacaktır.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100 rounded-lg cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={confirmDeleteProduct}
                className="px-4 py-1.5 text-xs font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 cursor-pointer"
              >
                Evet, Kaldır
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Delete Confirmation Modal */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-stone-200 space-y-4">
            <h3 className="font-bold text-base text-stone-900">Kategoriyi Sil</h3>
            <p className="text-xs text-stone-600">
              <strong>"{categoryToDelete.name}"</strong> kategorisini silmek/arşivlemek istediğinize emin misiniz?
              Bu kategoriye bağlı ürünler menüde kalır ancak kategori bağlantıları kaldırılır.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100 rounded-lg cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={confirmDeleteCategory}
                className="px-4 py-1.5 text-xs font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 cursor-pointer"
              >
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Modal */}
      <ProductModal
        isOpen={modalOpen}
        categories={categories}
        existingProduct={editingProduct}
        onClose={() => setModalOpen(false)}
        onSaved={fetchProducts}
      />
    </div>
  );
};
