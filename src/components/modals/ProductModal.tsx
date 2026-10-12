import React, { useState, useEffect } from 'react';
import { X, PackagePlus, Image as ImageIcon, Tag, AlertCircle } from 'lucide-react';
import { Product, Category, ProductType } from '../../types.ts';
import { api } from '../../services/api.ts';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  existingProduct?: Product | null;
  onSaved: (product: Product) => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  categories,
  existingProduct,
  onSaved,
}) => {
  const [name, setName] = useState(existingProduct?.name || '');
  const [description, setDescription] = useState(existingProduct?.description || '');
  const [categoryId, setCategoryId] = useState(existingProduct?.categoryId || categories[0]?.id || '');
  const [productType, setProductType] = useState<ProductType>(existingProduct?.productType || 'food');
  const [price, setPrice] = useState(existingProduct ? String(existingProduct.price) : '40');
  const [stockQuantity, setStockQuantity] = useState(existingProduct ? String(existingProduct.stockQuantity) : '50');
  const [imageUrl, setImageUrl] = useState(existingProduct?.imageUrl || 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=80');
  const [allergens, setAllergens] = useState<string[]>(existingProduct?.allergens || []);
  const [activeStatus, setActiveStatus] = useState<boolean>(existingProduct ? existingProduct.activeStatus : true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existingProduct) {
      setName(existingProduct.name);
      setDescription(existingProduct.description);
      setCategoryId(existingProduct.categoryId);
      setProductType(existingProduct.productType);
      setPrice(String(existingProduct.price));
      setStockQuantity(String(existingProduct.stockQuantity));
      setImageUrl(existingProduct.imageUrl);
      setAllergens(existingProduct.allergens || []);
      setActiveStatus(existingProduct.activeStatus);
    } else {
      setName('');
      setDescription('');
      setCategoryId(categories[0]?.id || '');
      setProductType('food');
      setPrice('40');
      setStockQuantity('50');
      setImageUrl('https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=80');
      setAllergens([]);
      setActiveStatus(true);
    }
    setError(null);
  }, [existingProduct, isOpen, categories]);

  if (!isOpen) return null;

  const ALLERGEN_OPTIONS = ['Gluten', 'Süt Ürünleri', 'Yumurta', 'Fındık/Fıstık', 'Soya', 'Hardal', 'Kereviz', 'Susam'];

  const toggleAllergen = (item: string) => {
    setAllergens(prev =>
      prev.includes(item) ? prev.filter(a => a !== item) : [...prev, item]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Ürün adı zorunludur.');
      return;
    }

    const numPrice = Number(price);
    const numStock = Number(stockQuantity);

    if (isNaN(numPrice) || numPrice < 0) {
      setError('Geçerli bir fiyat giriniz.');
      return;
    }
    if (isNaN(numStock) || numStock < 0) {
      setError('Geçerli bir stok miktarı giriniz.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (existingProduct) {
        const res = await api.updateProduct(existingProduct.id, {
          name,
          description,
          categoryId,
          productType,
          price: numPrice,
          stockQuantity: numStock,
          imageUrl,
          allergens,
          activeStatus,
        });
        onSaved(res.product);
      } else {
        const res = await api.createProduct({
          name,
          description,
          categoryId,
          productType,
          price: numPrice,
          stockQuantity: numStock,
          imageUrl,
          allergens,
          activeStatus,
        });
        onSaved(res.product);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ürün kaydedilemedi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-emerald-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-emerald-300" />
            <h3 className="font-bold text-base">
              {existingProduct ? 'Ürün Bilgilerini Güncelle' : 'Kantine Yeni Ürün Ekle'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-emerald-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 overflow-y-auto">
          {error && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Ürün Türü</label>
              <select
                value={productType}
                onChange={e => setProductType(e.target.value as ProductType)}
                className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl focus:outline-emerald-600 bg-white"
              >
                <option value="food">Kantin Yiyecek & İçecek</option>
                <option value="stationery">Eğitim & Kırtasiye Ürünü</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Kategori</label>
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl focus:outline-emerald-600 bg-white"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Ürün Adı</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Örn: Kaşarlı Tost (Tam Buğday)"
              className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl focus:outline-emerald-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Fiyat (₺)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                required
                value={price}
                onChange={e => setPrice(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl focus:outline-emerald-600 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Mevcut Stok Adedi</label>
              <input
                type="number"
                min="0"
                required
                value={stockQuantity}
                onChange={e => setStockQuantity(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl focus:outline-emerald-600 font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Açıklama</label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="İçindekiler, gramaj veya porsiyon bilgisi..."
              className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl focus:outline-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
              <ImageIcon className="w-3.5 h-3.5 text-stone-400" />
              Ürün Görsel URL
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl focus:outline-emerald-600"
            />
          </div>

          {/* Allergens selection (only for food) */}
          {productType === 'food' && (
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-stone-400" />
                Alerjen Bilgileri (İlgili olanları işaretleyin)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ALLERGEN_OPTIONS.map(a => {
                  const isChecked = allergens.includes(a);
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => toggleAllergen(a)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                        isChecked
                          ? 'bg-amber-100 text-amber-900 border-amber-300 font-semibold'
                          : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {isChecked ? `✓ ${a}` : a}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active status */}
          <div className="pt-1 flex items-center gap-2">
            <input
              type="checkbox"
              id="activeStatusCheck"
              checked={activeStatus}
              onChange={e => setActiveStatus(e.target.checked)}
              className="rounded text-emerald-700 focus:ring-emerald-600"
            />
            <label htmlFor="activeStatusCheck" className="text-xs font-semibold text-stone-700 cursor-pointer">
              Ürün Satışa Açık (İşareti kaldırırsanız veli ekranlarında görünmez)
            </label>
          </div>

          <div className="pt-3 border-t border-stone-100 flex justify-end gap-2">
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
              {loading ? 'Kaydediliyor...' : existingProduct ? 'Güncelle' : 'Ürünü Ekle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
