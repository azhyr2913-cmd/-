import React, { useEffect, useState } from 'react';
import {
  ShoppingBag,
  CheckCircle,
  Eye,
  MapPin,
  Clock,
  MessageSquare,
  LayoutList,
  LayoutGrid,
  PlusCircle,
  SlidersHorizontal,
  Store as StoreIcon,
  Car,
  Home,
  Smartphone,
  Zap,
  Wrench,
  Armchair,
  Truck,
  Package,
  Layers,
  Star,
  ShieldCheck,
  Sparkles,
  ChevronLeft,
} from 'lucide-react';
import { Category, Product, Store as StoreType } from '../../types';
import { getActiveStores } from '../../services/storeService';
import { queryProducts, incrementProductView } from '../../services/productService';
import { useCart } from '../../context/CartContext';
import { formatHarajTime, formatHarajPrice, HARAJ_BEIHAN_AREAS } from '../../utils/harajUtils';

interface HomeFeedProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (catId: string) => void;
  onOpenProductDetail: (product: Product) => void;
  onOpenStorePage: (storeId: string) => void;
  selectedCity: string;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onOpenPostAd?: () => void;
  onOpenStoreModal?: () => void;
  onStartChatWithProduct?: (product: Product) => void;
  onStartChatWithStore?: (store: StoreType) => void;
}

const HARAJ_SUBTAGS: Record<string, string[]> = {
  'cat-automotive': ['الكل', 'شاص', 'هايلوكس', 'لاندكروزر', 'صالون', 'نيسان', 'دراجات نارية', 'شاحنات', 'قطع غيار'],
  'cat-realestate': ['الكل', 'أراضي للبيع', 'بيوت ومنازل', 'محلات تجارية', 'مزارع', 'عقارات للإيجار'],
  'cat-electronics': ['الكل', 'آيفون', 'سامسونج', 'شاشات', 'لابتوبات', 'كاميرات', 'طاقة وبطاريات'],
  'cat-livestock': ['الكل', 'ضأن بلدي', 'ماعز بيحاني', 'إبل وحيران', 'أبقار', 'أعلاف وحبوب'],
  'cat-solar-energy': ['الكل', 'ألواح شمسية', 'بطاريات جيل', 'بطاريات ليثيوم', 'محولات وإنفرترات'],
  'cat-autoparts': ['الكل', 'تويوتا', 'إطارات وجنوط', 'زيوت وبطاريات', 'صدامات وإكسسوارات'],
  'cat-home-furniture': ['الكل', 'مجالس يمنية', 'غرف نوم', 'مكيفات', 'ثلاجات', 'أفران'],
  'cat-honey-agri': ['الكل', 'عسل سدر دوعني', 'عسل سدر بيحاني', 'عسل سمر', 'تمور', 'بن يمني'],
  'cat-services': ['الكل', 'نقل عفش وبضائع', 'حفريات ومعدات', 'مقاولات وبناء', 'صيانة وورش'],
};

export const HomeFeed: React.FC<HomeFeedProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  onOpenProductDetail,
  onOpenStorePage,
  selectedCity,
  searchTerm,
  onSearchChange,
  onOpenPostAd,
  onOpenStoreModal,
  onStartChatWithProduct,
  onStartChatWithStore,
}) => {
  const { addToCart } = useCart();

  const [stores, setStores] = useState<StoreType[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // View modes: list vs grid
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'views'>('newest');
  const [quickFilter, setQuickFilter] = useState<'all' | 'today' | 'som' | 'verified'>('all');

  useEffect(() => {
    async function loadFeed() {
      setLoading(true);
      try {
        const [storeList, prodList] = await Promise.all([
          getActiveStores(),
          queryProducts({
            categoryId: selectedCategory === 'all' ? undefined : selectedCategory,
            city: selectedCity === 'الكل' ? undefined : selectedCity,
            searchTerm: searchTerm.trim() || undefined,
            onlyAvailable: true,
          }),
        ]);
        setStores(storeList || []);
        setProducts(prodList || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadFeed();
  }, [selectedCategory, selectedCity, searchTerm]);

  // Filter & Sorting
  let filteredProducts = [...products];

  if (quickFilter === 'som') {
    filteredProducts = filteredProducts.filter((p) => p.price === 0);
  } else if (quickFilter === 'verified') {
    const verifiedStoreIds = new Set(stores.filter((s) => s.isVerified).map((s) => s.id));
    filteredProducts = filteredProducts.filter((p) => verifiedStoreIds.has(p.storeId));
  } else if (quickFilter === 'today') {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    filteredProducts = filteredProducts.filter((p) => new Date(p.createdAt || 0).getTime() >= oneDayAgo);
  }

  const sortedProducts = filteredProducts.sort((a, b) => {
    if (sortBy === 'price_asc') return a.price - b.price;
    if (sortBy === 'price_desc') return b.price - a.price;
    if (sortBy === 'views') return (b.viewsCount || 0) - (a.viewsCount || 0);
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  const verifiedStores = stores.filter((s) => s.isVerified);

  const getCategoryIcon = (slug?: string) => {
    switch (slug) {
      case 'automotive':
        return <Car className="w-5 h-5 text-[#07875F]" />;
      case 'realestate':
        return <Home className="w-5 h-5 text-amber-600" />;
      case 'electronics':
        return <Smartphone className="w-5 h-5 text-blue-600" />;
      case 'livestock':
        return <Package className="w-5 h-5 text-emerald-600" />;
      case 'solar-energy':
        return <Zap className="w-5 h-5 text-yellow-600" />;
      case 'autoparts':
        return <Wrench className="w-5 h-5 text-slate-700" />;
      case 'home-furniture':
        return <Armchair className="w-5 h-5 text-purple-600" />;
      case 'honey-agri':
        return <ShoppingBag className="w-5 h-5 text-amber-700" />;
      case 'services':
        return <Truck className="w-5 h-5 text-teal-600" />;
      default:
        return <Layers className="w-5 h-5 text-[#07875F]" />;
    }
  };

  const activeSubtags = HARAJ_SUBTAGS[selectedCategory] || [];

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 text-right">
      {/* ======================================================== */}
      {/* 1. HERO BANNER: منصة رواق | سوق بيحان الإلكتروني الموحد */}
      {/* ======================================================== */}
      <section className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-br from-[#101B3D] via-[#162758] to-[#0A122A] text-white p-5 sm:p-8 shadow-md border border-slate-700/40">
        {/* Decorative background effects */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-[#07875F]/20 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none translate-x-1/3 translate-y-1/3" />

        <div className="relative z-10 max-w-4xl space-y-4">
          {/* Top Tag */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#07875F]/30 text-[#34D399] border border-[#07875F]/50 font-bold">
              <MapPin className="w-3.5 h-3.5" />
              <span>بيحان — شبوة</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 text-slate-300 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-[#34D399]" />
              <span>منصة التجارة الإلكترونية المعتمدة</span>
            </span>
          </div>

          {/* Title & Tagline */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white leading-tight">
              سوق إلكتروني يربط متاجر بيحان بالمشترين مباشرة وبكل سهولة
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              تصفح معارض ومتاجر بيحان وشبوة، واشترِ بضائعك وتواصل مع البائعين فورياً عبر محادثات داخلية مشفرة تحمي أرقام الهواتف والخصوصية.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            {onOpenPostAd && (
              <button
                onClick={onOpenPostAd}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#07875F] hover:bg-[#06704F] text-white font-black text-xs sm:text-sm shadow-md transition transform active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span>أضف منتج / إعلانك الآن</span>
              </button>
            )}

            {onOpenStoreModal && (
              <button
                onClick={onOpenStoreModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm border border-white/20 transition"
              >
                <Sparkles className="w-4 h-4 text-[#34D399]" />
                <span>افتتاح متجر جديد في بيحان</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 2. VERIFIED BEIHAN STORES: المتاجر المعتمدة بشبوة وبيحان */}
      {/* ======================================================== */}
      {verifiedStores.length > 0 && selectedCategory === 'all' && (
        <section className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#DDF7EC] text-[#056B4B] flex items-center justify-center">
                <StoreIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-[#101B3D]">
                  المتاجر المعتمدة بشبوة وبيحان
                </h3>
                <p className="text-[11px] text-slate-500">معارض ومحلات موثقة رسمياً مع تقييمات المشترين</p>
              </div>
            </div>

            {onOpenStoreModal && (
              <button
                onClick={onOpenStoreModal}
                className="text-xs font-bold text-[#07875F] hover:underline flex items-center gap-1"
              >
                <span>افتتاح متجر</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {verifiedStores.slice(0, 4).map((s) => (
              <div
                key={s.id}
                className="group bg-slate-50 hover:bg-white rounded-xl border border-slate-200/90 hover:border-[#07875F] p-3 shadow-2xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div
                  onClick={() => onOpenStorePage(s.id)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <img
                    src={s.logoUrl || 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=120'}
                    alt={s.storeName}
                    className="w-12 h-12 rounded-xl object-cover bg-white border border-slate-200 shrink-0 group-hover:scale-105 transition"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <h4 className="font-extrabold text-xs sm:text-sm text-[#101B3D] truncate group-hover:text-[#07875F] transition">
                        {s.storeName}
                      </h4>
                      <CheckCircle className="w-3.5 h-3.5 text-[#07875F] shrink-0" />
                    </div>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{s.productTypes || 'متجر معتمد'}</p>
                    <div className="flex items-center gap-1 mt-1 text-[11px] text-amber-600 font-bold">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{s.rating ? s.rating.toFixed(1) : '5.0'}</span>
                      <span className="text-slate-400 text-[10px] font-normal">
                        ({s.ratingsCount || 1} تقييم)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/80 grid grid-cols-2 gap-1.5 text-xs font-bold">
                  <button
                    onClick={() => onOpenStorePage(s.id)}
                    className="py-1.5 px-2 rounded-lg bg-white hover:bg-slate-100 text-[#101B3D] border border-slate-200 transition text-center text-[11px]"
                  >
                    زيارة المتجر
                  </button>
                  <button
                    onClick={() => {
                      if (onStartChatWithStore) {
                        onStartChatWithStore(s);
                      } else {
                        onOpenStorePage(s.id);
                      }
                    }}
                    className="py-1.5 px-2 rounded-lg bg-[#DDF7EC] hover:bg-[#cbf2e2] text-[#056B4B] transition text-center text-[11px] flex items-center justify-center gap-1"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>مراسلة</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ======================================================== */}
      {/* 3. MARKETPLACE CATEGORIES: أقسام السوق وتصفح التصنيفات */}
      {/* ======================================================== */}
      <section className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs sm:text-sm font-extrabold text-[#101B3D] flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#07875F]" />
              <span>أقسام السوق — تصفح التصنيفات والمنتجات</span>
            </h3>
            <p className="text-[11px] text-slate-500">اختر القسم لمشاهدة كافة السلع المتاحة في بيحان</p>
          </div>

          {selectedCategory !== 'all' && (
            <button
              onClick={() => {
                onSelectCategory('all');
                onSearchChange('');
              }}
              className="text-xs text-[#07875F] font-bold hover:underline"
            >
              عرض كل الأقسام
            </button>
          )}
        </div>

        {/* Categories Icon Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
          {/* All category pill */}
          <button
            onClick={() => {
              onSelectCategory('all');
              onSearchChange('');
            }}
            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl min-w-[72px] transition shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-[#DDF7EC] text-[#056B4B] font-bold border border-[#C0F0DD]'
                : 'hover:bg-slate-50 text-slate-700'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
                selectedCategory === 'all'
                  ? 'bg-[#07875F] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Layers className="w-5 h-5" />
            </div>
            <span className="text-[11px] truncate">كل السوق</span>
          </button>

          {/* Dynamic Categories */}
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  onSelectCategory(cat.id);
                  onSearchChange('');
                }}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl min-w-[76px] transition shrink-0 ${
                  isSelected
                    ? 'bg-[#DDF7EC] text-[#056B4B] font-bold border border-[#C0F0DD]'
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
                    isSelected ? 'bg-[#07875F] text-white shadow-2xs' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {getCategoryIcon(cat.slug)}
                </div>
                <span className="text-[11px] truncate max-w-[85px]">
                  {cat.name.replace('حراج ', '')}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sub-tags if category active */}
        {activeSubtags.length > 0 && (
          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="text-[11px] font-bold text-slate-400 shrink-0">الماركة / النوع:</span>
            {activeSubtags.map((tag) => {
              const isTagActive = tag === 'الكل' ? !searchTerm : searchTerm.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => {
                    if (tag === 'الكل') onSearchChange('');
                    else onSearchChange(tag);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition ${
                    isTagActive
                      ? 'bg-[#07875F] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ======================================================== */}
      {/* 4. BEIHAN LOCAL AREAS: مناطق بيحان — شبوة السريعة */}
      {/* ======================================================== */}
      <section className="bg-white rounded-2xl p-3 border border-slate-200/90 shadow-2xs flex items-center gap-2 overflow-x-auto scrollbar-none text-xs">
        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 shrink-0">
          <MapPin className="w-3.5 h-3.5 text-[#07875F]" />
          <span>مناطق بيحان:</span>
        </div>
        {HARAJ_BEIHAN_AREAS.map((area) => {
          const isMatch = (selectedCity === 'الكل' && area.includes('الكل')) || selectedCity === area;
          return (
            <button
              key={area}
              onClick={() => {
                if (area.includes('الكل')) {
                  onSearchChange('');
                } else {
                  onSearchChange(area.replace('بيحان — ', ''));
                }
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition ${
                isMatch
                  ? 'bg-[#DDF7EC] text-[#056B4B] font-bold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {area.replace('بيحان — ', '')}
            </button>
          );
        })}
      </section>

      {/* ======================================================== */}
      {/* 5. TOOLBAR & FILTER TABS */}
      {/* ======================================================== */}
      <section className="bg-white rounded-2xl p-3 border border-slate-200/90 shadow-2xs flex items-center justify-between gap-2 flex-wrap">
        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-1 text-xs overflow-x-auto scrollbar-none">
          <button
            onClick={() => setQuickFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition text-xs ${
              quickFilter === 'all'
                ? 'bg-[#07875F] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            كل المنتجات ({sortedProducts.length})
          </button>
          <button
            onClick={() => setQuickFilter('today')}
            className={`px-3 py-1.5 rounded-xl font-bold transition text-xs ${
              quickFilter === 'today'
                ? 'bg-[#07875F] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            عروض اليوم
          </button>
          <button
            onClick={() => setQuickFilter('som')}
            className={`px-3 py-1.5 rounded-xl font-bold transition text-xs ${
              quickFilter === 'som'
                ? 'bg-[#07875F] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            على السوم
          </button>
          <button
            onClick={() => setQuickFilter('verified')}
            className={`px-3 py-1.5 rounded-xl font-bold transition text-xs ${
              quickFilter === 'verified'
                ? 'bg-[#07875F] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            متاجر معتمدة
          </button>
        </div>

        {/* View Switcher & Sorter */}
        <div className="flex items-center gap-2">
          {/* Sorter */}
          <div className="flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-xl">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent focus:outline-none cursor-pointer text-xs font-semibold text-slate-700"
            >
              <option value="newest">الأحدث أولاً</option>
              <option value="price_asc">الأقل سعراً</option>
              <option value="price_desc">الأعلى سعراً</option>
              <option value="views">الأكثر طلباً ومشاهدة</option>
            </select>
          </div>

          {/* View Mode: شبكة vs قائمة */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'grid'
                  ? 'bg-white text-[#07875F] shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="عرض الشبكة"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'list'
                  ? 'bg-white text-[#07875F] shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="عرض القائمة"
            >
              <LayoutList className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 6. PRODUCTS LISTINGS FEED */}
      {/* ======================================================== */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400 space-y-2 bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-[#07875F] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p>جارٍ تحميل معروضات سوق بيحان...</p>
        </div>
      ) : sortedProducts.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-500 space-y-3">
          <ShoppingBag className="w-14 h-14 mx-auto text-slate-300" />
          <h4 className="font-extrabold text-[#101B3D] text-base">لا توجد منتجات مطابقة في هذا القسم</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            جرّب تغيير خيارات البحث أو تصفح قسماً آخر، أو يمكنك إضافة إعلانك لبيعه في بيحان بكل سهولة.
          </p>
          {onOpenPostAd && (
            <button
              onClick={onOpenPostAd}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-[#07875F] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#06704F] transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>أضف منتجك أو إعلانك الآن</span>
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* MODE: Modern Grid View */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {sortedProducts.map((product) => (
            <div
              key={product.id}
              onClick={() => {
                incrementProductView(product.id);
                onOpenProductDetail(product);
              }}
              className="group bg-white rounded-2xl border border-slate-200/90 hover:border-[#07875F] overflow-hidden shadow-2xs hover:shadow-md transition cursor-pointer flex flex-col justify-between"
            >
              {/* Product Image */}
              <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
                <img
                  src={product.imageUrl}
                  alt={product.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-2xs">
                  {product.condition === 'new' ? 'جديد' : 'مستعمل'}
                </span>
                <span className="absolute bottom-2 right-2 bg-white/95 text-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-2xs">
                  <Clock className="w-3 h-3 text-[#07875F]" /> {formatHarajTime(product.createdAt)}
                </span>
                {product.additionalImages && product.additionalImages.length > 0 && (
                  <span className="absolute top-2 left-2 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                    📷 {product.additionalImages.length + 1}
                  </span>
                )}
              </div>

              {/* Details */}
              <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                    <span className="text-[#07875F] font-bold truncate max-w-[100px]">
                      {product.storeName}
                    </span>
                    <span className="text-blue-600 truncate">{product.city.replace('بيحان — ', '')}</span>
                  </div>

                  <h3 className="font-bold text-xs sm:text-sm text-[#101B3D] group-hover:text-[#07875F] transition line-clamp-2 leading-snug">
                    {product.title}
                  </h3>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs sm:text-sm font-black text-[#07875F]">
                      {formatHarajPrice(product.price)}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                      <Eye className="w-3 h-3" /> {product.viewsCount || 1}
                    </span>
                  </div>

                  {/* Actions: In-App Chat and Details */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onStartChatWithProduct) {
                          onStartChatWithProduct(product);
                        } else {
                          onOpenProductDetail(product);
                        }
                      }}
                      className="py-1.5 px-2 rounded-xl bg-[#DDF7EC] hover:bg-[#cbf2e2] text-[#056B4B] text-[11px] font-bold text-center transition flex items-center justify-center gap-1 border border-[#C0F0DD]"
                      title="مراسلة البائع للتفاوض وسد السعر"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-[#056B4B]" />
                      <span>فاوض وراسل</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        incrementProductView(product.id);
                        onOpenProductDetail(product);
                      }}
                      className="py-1.5 px-2 rounded-xl bg-[#101B3D] hover:bg-[#1a2c5f] text-white text-[11px] font-bold text-center transition shadow-2xs"
                    >
                      التفاصيل
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* MODE: Classic List View */
        <div className="bg-white rounded-2xl border border-slate-200/90 divide-y divide-slate-100 overflow-hidden shadow-2xs">
          {sortedProducts.map((product) => (
            <div
              key={product.id}
              onClick={() => {
                incrementProductView(product.id);
                onOpenProductDetail(product);
              }}
              className="group p-3 sm:p-4 hover:bg-slate-50 transition cursor-pointer flex gap-3 sm:gap-4 items-center justify-between"
            >
              {/* Thumbnail */}
              <div className="relative w-24 h-22 sm:w-32 sm:h-26 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                <img
                  src={product.imageUrl}
                  alt={product.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-1 right-1 bg-black/75 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                  {product.condition === 'new' ? 'جديد' : 'مستعمل'}
                </span>
              </div>

              {/* Middle details */}
              <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-[#101B3D] group-hover:text-[#07875F] transition line-clamp-2 leading-snug">
                    {product.title}
                  </h3>

                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-xs sm:text-sm font-black text-[#07875F]">
                      {formatHarajPrice(product.price)}
                    </span>
                    {product.deliveryFee > 0 && (
                      <span className="text-[10px] text-slate-400 hidden sm:inline">
                        (توصيل: {product.deliveryFee} ر.ي)
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-2 flex items-center flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-800 truncate max-w-[120px]">
                    👤 {product.storeName}
                  </span>
                  <span className="flex items-center gap-0.5 text-blue-600 font-medium">
                    <MapPin className="w-3 h-3 text-[#07875F]" />
                    <span>{product.city.replace('بيحان — ', '')}</span>
                  </span>
                  <span className="flex items-center gap-0.5 text-slate-400">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{formatHarajTime(product.createdAt)}</span>
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col items-end justify-between self-stretch shrink-0 pl-1">
                <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                  <Eye className="w-3 h-3" /> {product.viewsCount || 1}
                </span>

                <div className="flex items-center gap-1.5 mt-auto">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onStartChatWithProduct) {
                        onStartChatWithProduct(product);
                      } else {
                        onOpenProductDetail(product);
                      }
                    }}
                    className="py-1.5 px-3 rounded-xl bg-[#DDF7EC] hover:bg-[#cbf2e2] text-[#056B4B] border border-[#C0F0DD] transition flex items-center gap-1.5 text-xs font-bold"
                    title="مراسلة البائع للتفاوض وسد السعر"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[#056B4B]" />
                    <span>فاوض وراسل البائع</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. TRUST & PRIVACY INFO BOX (الأمان والخصوصية) */}
      {/* ======================================================== */}
      <section className="bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 rounded-2xl p-4 sm:p-5 border border-emerald-200/80 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#07875F] text-white flex items-center justify-center shrink-0 shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="font-extrabold text-xs sm:text-sm text-[#101B3D]">
                الأمان والخصوصية في منصة رواق بيحان
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                حماية كاملة لأرقام أصحاب المتاجر والمشترين الشخصية عن المتصفحين والجمهور العام، مع محادثات داخلية فورية مشفرة ومباشرة بين المشتري وصاحب المتجر لحفظ الحقوق ومنع الاحتيال.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold shrink-0">
            <span className="px-3 py-1.5 rounded-xl bg-white text-[#056B4B] border border-emerald-200 shadow-2xs">
              ✓ محادثات داخلية مشفرة
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};
