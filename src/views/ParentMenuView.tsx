import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Minus,
  Check,
  Heart,
  Clock,
  Sparkles,
  ShoppingBag,
  Info,
  ShieldCheck,
  AlertCircle,
  GraduationCap,
} from 'lucide-react';
import { Product, Category, Student } from '../types.ts';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { StudentModal } from '../components/modals/StudentModal.tsx';

interface ParentMenuViewProps {
  onOpenCart: () => void;
  onNavigateTab: (tab: string) => void;
}

export const ParentMenuView: React.FC<ParentMenuViewProps> = ({ onOpenCart, onNavigateTab }) => {
  const { user, addToCart, cart, cartCount, cartTotal } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Per-product quantities for adding to cart
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [addedNotice, setAddedNotice] = useState<string | null>(null);

  // Student modal
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [prodRes, catRes, studRes] = await Promise.all([
          api.getProducts({ type: 'food', active: true }),
          api.getCategories(user?.schoolId || 'school-1'),
          api.getStudents(),
        ]);

        setProducts(prodRes.products);
        setCategories(catRes.categories.filter(c => c.productType === 'food'));
        setStudents(studRes.students);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  const handleQuantityChange = (productId: string, delta: number, maxStock: number) => {
    setQuantities(prev => {
      const current = prev[productId] || 1;
      const next = Math.max(1, Math.min(maxStock, current + delta));
      return { ...prev, [productId]: next };
    });
  };

  const handleAddToCart = (product: Product) => {
    const qty = quantities[product.id] || 1;
    addToCart(product, qty);
    setAddedNotice(product.id);
    setTimeout(() => {
      setAddedNotice(null);
    }, 1500);
  };

  const filteredProducts = products.filter(p => {
    const matchCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const matchSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Hero Announcement Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-emerald-950 via-emerald-900 to-stone-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-800/80 text-emerald-200 text-xs font-semibold backdrop-blur-xs">
            <Clock className="w-3.5 h-3.5 text-emerald-300" />
            <span>Teneffüs Ziline Hazır Sipariş</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold font-serif text-white leading-tight">
            Sıranı Bekleme, <br className="hidden sm:inline" />
            Sağlıklı ve Taze Öğününü Teneffüste Al!
          </h1>

          <p className="text-emerald-100/90 text-xs sm:text-sm leading-relaxed max-w-xl">
            Veliler öğrencileri için okul kantininden önceden sipariş verir; kantinci siparişi teneffüs saatine hazırlar.
            Öğrenci 4 haneli teslimat koduyla sıraya girmeden siparişini teslim alır.
          </p>

          <div className="pt-2 flex flex-wrap gap-2.5">
            <button
              onClick={() => onNavigateTab('food_pool')}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Heart className="w-4 h-4 fill-stone-950" />
              Dayanışma Havuzuna Katıl
            </button>
            <button
              onClick={() => onNavigateTab('education_support')}
              className="px-4 py-2 rounded-xl bg-emerald-800/80 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 backdrop-blur-xs border border-emerald-600/40 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-300" />
              Eğitime Destek Modülü
            </button>
          </div>
        </div>

        {/* Decorative background shape */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-96 h-96 rounded-full bg-emerald-600/10 blur-3xl pointer-events-none" />
      </div>

      {/* Student Selector Quick Banner */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-stone-900">Kayıtlı Öğrencileriniz</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {students.length === 0 ? (
                <span className="text-xs text-stone-400">Henüz öğrenci eklenmemiş.</span>
              ) : (
                students.map(s => (
                  <span
                    key={s.id}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-stone-100 text-stone-800 border border-stone-200"
                  >
                    {s.fullName} ({s.grade} - {s.classroom})
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsStudentModalOpen(true)}
          className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Öğrenci Ekle / Düzenle
        </button>
      </div>

      {/* Search & Category Filter Section */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Categories Segmented Control */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 p-1 bg-stone-100 rounded-2xl max-w-full">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                selectedCategory === 'all'
                  ? 'bg-white text-emerald-950 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Tüm Menü
            </button>
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === c.id
                    ? 'bg-white text-emerald-950 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative sm:w-64">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Ürün veya lezzet ara..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-emerald-600 shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Product Catalog Grid */}
      {loading ? (
        <div className="py-16 text-center text-stone-400">
          <div className="animate-spin w-8 h-8 border-2 border-emerald-700 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-xs">Kantin menüsü yükleniyor...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-stone-200 p-8">
          <AlertCircle className="w-10 h-10 text-stone-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-stone-700">Aradığınız kriterlere uygun ürün bulunamadı.</p>
          <p className="text-xs text-stone-400 mt-1">Lütfen farklı bir kategori veya arama terimi deneyiniz.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredProducts.map(product => {
            const qty = quantities[product.id] || 1;
            const isOutOfStock = product.stockQuantity <= 0;
            const isLowStock = product.stockQuantity > 0 && product.stockQuantity <= 5;
            const isJustAdded = addedNotice === product.id;

            return (
              <div
                key={product.id}
                className="bg-white rounded-2xl border border-stone-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div>
                  {/* Image */}
                  <div className="relative h-44 w-full bg-stone-100 overflow-hidden">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Stock Alert Label */}
                    <div className="absolute top-2.5 right-2.5">
                      {isOutOfStock ? (
                        <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-xs">
                          Tükendi
                        </span>
                      ) : isLowStock ? (
                        <span className="bg-amber-500 text-stone-950 text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-xs">
                          Son {product.stockQuantity} Adet
                        </span>
                      ) : (
                        <span className="bg-stone-900/70 text-white text-[10px] font-medium px-2 py-0.5 rounded-lg backdrop-blur-xs">
                          Stok: {product.stockQuantity}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-2">
                    <h3 className="font-bold text-stone-900 text-sm leading-snug line-clamp-1">
                      {product.name}
                    </h3>

                    <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed h-8">
                      {product.description}
                    </p>

                    {/* Allergens (Zero-pill text format with dots) */}
                    {product.allergens.length > 0 && (
                      <div className="text-[11px] text-amber-800/90 font-medium truncate pt-1">
                        Alerjen: {product.allergens.join(' · ')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer / Price & Add Actions */}
                <div className="p-4 pt-0 space-y-3">
                  <div className="flex items-center justify-between border-t border-stone-100 pt-3">
                    <span className="text-lg font-black text-emerald-900">
                      ₺{product.price.toFixed(2)}
                    </span>

                    {/* Quantity Stepper */}
                    {!isOutOfStock && (
                      <div className="flex items-center gap-1.5 bg-stone-100 rounded-xl p-1">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(product.id, -1, product.stockQuantity)}
                          className="w-6 h-6 rounded-lg bg-white hover:bg-stone-200 flex items-center justify-center text-stone-700 shadow-2xs transition-colors cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold w-4 text-center">{qty}</span>
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(product.id, 1, product.stockQuantity)}
                          disabled={qty >= product.stockQuantity}
                          className="w-6 h-6 rounded-lg bg-white hover:bg-stone-200 flex items-center justify-center text-stone-700 shadow-2xs transition-colors cursor-pointer disabled:opacity-30"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Add To Cart Button */}
                  <button
                    type="button"
                    disabled={isOutOfStock}
                    onClick={() => handleAddToCart(product)}
                    className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                      isOutOfStock
                        ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                        : isJustAdded
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-800 hover:bg-emerald-900 text-white'
                    }`}
                  >
                    {isJustAdded ? (
                      <>
                        <Check className="w-4 h-4" />
                        Sepete Eklendi!
                      </>
                    ) : isOutOfStock ? (
                      'Stok Tükendi'
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4" />
                        Sepete Ekle ({qty} Adet)
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Bottom Cart Bar if Cart has items */}
      {cartCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-30">
          <div className="bg-emerald-950 text-white p-3.5 rounded-2xl shadow-2xl border border-emerald-800/80 flex items-center justify-between backdrop-blur-md">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold">{cartCount} Ürün Sepette</span>
              </div>
              <p className="text-sm font-black text-emerald-300">₺{cartTotal.toFixed(2)}</p>
            </div>

            <button
              onClick={onOpenCart}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs font-bold transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              Sepeti Onayla →
            </button>
          </div>
        </div>
      )}

      {/* Student Modal */}
      <StudentModal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
        onSaved={newStud => {
          setStudents(prev => [...prev, newStud]);
        }}
      />
    </div>
  );
};
