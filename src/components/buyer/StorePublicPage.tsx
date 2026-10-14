import React, { useEffect, useState } from 'react';
import {
  CheckCircle,
  MessageSquare,
  UserPlus,
  UserCheck,
  ShoppingBag,
  MapPin,
  Clock,
  ArrowRight,
  Search,
  Truck,
  Star,
  Award,
  Sparkles,
} from 'lucide-react';
import { Product, Store, StoreReview } from '../../types';
import { getStoreById } from '../../services/storeService';
import { getStoreProducts, incrementProductView } from '../../services/productService';
import { getStoreReviews } from '../../services/storeReviewService';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { STORE_BACKGROUND_PRESETS } from '../../constants/defaultData';
import { StoreRatingModal } from '../common/StoreRatingModal';

interface StorePublicPageProps {
  storeId: string;
  onBack: () => void;
  onOpenProductDetail: (product: Product) => void;
  onStartChat: (store: Store) => void;
}

export const StorePublicPage: React.FC<StorePublicPageProps> = ({
  storeId,
  onBack,
  onOpenProductDetail,
  onStartChat,
}) => {
  const { currentUser, login } = useAuth();
  const { addToCart } = useCart();

  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<StoreReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'reviews'>('products');
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);

  const loadData = async () => {
    try {
      const [sData, pData, rData] = await Promise.all([
        getStoreById(storeId),
        getStoreProducts(storeId),
        getStoreReviews(storeId),
      ]);
      setStore(sData);
      setProducts(pData || []);
      setReviews(rData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [storeId]);

  const handleFollowToggle = () => {
    setIsFollowing(!isFollowing);
  };

  const handleOpenRating = async () => {
    if (!currentUser) {
      const loggedIn = await login();
      if (!loggedIn) return;
    }
    setIsRatingModalOpen(true);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-16 px-4 text-center text-xs text-slate-400">
        جارٍ التحميل...
      </div>
    );
  }

  if (!store) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-3">
        <h3 className="font-extrabold text-[#101B3D] text-lg">المتجر غير متوفر</h3>
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl bg-[#07875F] text-white font-bold text-xs"
        >
          العودة
        </button>
      </div>
    );
  }

  // Calculate average rating
  const reviewsCount = reviews.length;
  const avgRatingNumber =
    reviewsCount > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewsCount
      : store.rating || 5.0;
  const displayRating = avgRatingNumber.toFixed(1);

  // Distribution for 5, 4, 3, 2, 1
  const ratingDistribution = [5, 4, 3, 2, 1].map((stars) => {
    const count = reviews.filter((r) => Math.round(r.rating) === stars).length;
    const percentage = reviewsCount > 0 ? (count / reviewsCount) * 100 : 0;
    return { stars, count, percentage };
  });

  const presetObj =
    STORE_BACKGROUND_PRESETS.find((p) => p.id === store.backgroundTheme) || STORE_BACKGROUND_PRESETS[0];

  const filteredProducts = products.filter((p) =>
    searchTerm.trim() ? p.title.toLowerCase().includes(searchTerm.toLowerCase()) : true
  );

  return (
    <div className="min-h-screen bg-[#F4F7FA] pb-24 text-right">
      {/* Back button */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition shadow-2xs"
        >
          <ArrowRight className="w-3.5 h-3.5" />
          <span>العودة</span>
        </button>
      </div>

      {/* Store Hero Banner */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mt-2.5">
        <div
          className={`relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-md p-4 sm:p-7 min-h-[170px] sm:min-h-[220px] flex flex-col justify-end bg-gradient-to-r ${presetObj.class}`}
          style={
            store.bannerUrl
              ? {
                  backgroundImage: `linear-gradient(rgba(16,27,61,0.5), rgba(16,27,61,0.9)), url(${store.bannerUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : undefined
          }
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 text-white">
            <div className="flex items-center gap-3">
              <img
                src={store.logoUrl || 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=200'}
                alt={store.storeName}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover bg-slate-800 border-2 border-white shadow-lg shrink-0"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-2xl font-black drop-shadow font-serif">{store.storeName}</h1>
                  {store.isVerified && (
                    <span className="inline-flex items-center gap-1 bg-[#07875F] text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-xs">
                      <CheckCircle className="w-3 h-3" />
                      موثّق
                    </span>
                  )}
                  {/* Rating Pill Badge in Header */}
                  <button
                    onClick={() => setActiveTab('reviews')}
                    className="inline-flex items-center gap-1.5 bg-amber-500/90 hover:bg-amber-500 text-white text-[11px] px-2.5 py-0.5 rounded-full font-black shadow-xs transition"
                    title="انقر لعرض التقييمات والآراء"
                  >
                    <Star className="w-3 h-3 fill-white text-white" />
                    <span>{displayRating}</span>
                    <span className="text-amber-100 font-medium">({reviewsCount} تقييم)</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] sm:text-xs text-[#DDF7EC] font-semibold">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {store.city}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Truck className="w-3 h-3" /> سعر التوصيل: {store.deliveryFee.toLocaleString()} ر.ي
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {store.isOpen ? (
                      <span className="text-[#DDF7EC] font-bold">مفتوح</span>
                    ) : (
                      <span className="text-rose-300 font-bold">مغلق</span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions: Follow, Message, and Rate */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <button
                onClick={handleOpenRating}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition"
              >
                <Star className="w-3.5 h-3.5 fill-white text-white" />
                <span>تقييم المتجر</span>
              </button>

              <button
                onClick={handleFollowToggle}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
                  isFollowing
                    ? 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-md'
                    : 'bg-white text-[#101B3D] hover:bg-slate-100'
                }`}
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="w-3.5 h-3.5 text-[#DDF7EC]" />
                    <span>متابع</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5 text-[#07875F]" />
                    <span>متابعة</span>
                  </>
                )}
              </button>

              <button
                onClick={() => onStartChat(store)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#07875F] hover:bg-[#06704F] text-white text-xs font-bold shadow-xs transition"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>مراسلة المتجر</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs (المنتجات vs التقييمات) */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mt-5">
        <div className="flex items-center gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('products')}
            className={`pb-3 px-3 sm:px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'products'
                ? 'border-[#07875F] text-[#07875F]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>المنتجات والمعروضات</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
              {products.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-3 px-3 sm:px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'reviews'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span>التقييمات والآراء</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold">
              {reviewsCount}
            </span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mt-5">
        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center justify-between w-full sm:w-auto">
                <h2 className="text-sm sm:text-base font-black text-[#101B3D] flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-[#07875F]" />
                  <span>معروضات المتجر</span>
                </h2>
                <span className="text-xs text-slate-400">({products.length})</span>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ابحث في المتجر..."
                  className="w-full pr-8 pl-3 py-1.5 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-[#07875F]"
                />
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500 space-y-1">
                <ShoppingBag className="w-10 h-10 mx-auto text-slate-300" />
                <p className="font-bold text-[#101B3D] text-xs">لا توجد منتجات حالياً</p>
              </div>
            ) : (
              /* 2 Columns on Mobile */
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => {
                      incrementProductView(product.id);
                      onOpenProductDetail(product);
                    }}
                    className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-md transition cursor-pointer flex flex-col justify-between h-full"
                  >
                    <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
                      <img
                        src={product.imageUrl}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {product.isSold ? (
                        <span className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-2xs">
                          تم البيع
                        </span>
                      ) : (
                        <span className="absolute top-2 right-2 bg-[#101B3D]/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-2xs">
                          {product.condition === 'new' ? 'جديد' : 'مستعمل'}
                        </span>
                      )}
                    </div>

                    <div className="p-2.5 sm:p-3.5 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-xs sm:text-sm text-[#101B3D] group-hover:text-[#07875F] transition line-clamp-2 leading-snug">
                          {product.title}
                        </h3>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-2">
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs sm:text-sm font-black text-[#07875F]">
                            {product.price.toLocaleString()} ر.ي
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              incrementProductView(product.id);
                              onOpenProductDetail(product);
                            }}
                            className="py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#101B3D] text-[11px] font-bold text-center transition"
                          >
                            التفاصيل
                          </button>

                          {!product.isSold && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(product, 1);
                              }}
                              className="py-1.5 px-2 rounded-xl bg-[#07875F] hover:bg-[#06704F] text-white text-[11px] font-bold text-center transition shadow-2xs"
                            >
                              + سلة
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <div className="space-y-5">
            {/* Rating Summary Card */}
            <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-2xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                {/* Score & Stars */}
                <div className="text-center md:border-l md:border-slate-100 md:pl-6 space-y-2">
                  <div className="text-4xl sm:text-5xl font-black text-[#101B3D] font-serif tracking-tight">
                    {displayRating}
                  </div>
                  <div className="flex items-center justify-center gap-1" dir="ltr">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-5 h-5 ${
                          avgRatingNumber >= s
                            ? 'text-amber-400 fill-amber-400'
                            : avgRatingNumber >= s - 0.5
                            ? 'text-amber-400 fill-amber-200'
                            : 'text-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    متوسط التقييم من {reviewsCount} مستخدم
                  </p>
                  <button
                    onClick={handleOpenRating}
                    className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>أضف تقييمك للمتجر</span>
                  </button>
                </div>

                {/* Rating Distribution Bars */}
                <div className="md:col-span-2 space-y-2">
                  <h4 className="text-xs font-black text-slate-700 mb-2">توزيع التقييمات:</h4>
                  {ratingDistribution.map((item) => (
                    <div key={item.stars} className="flex items-center gap-3 text-xs">
                      <div className="w-12 text-slate-600 font-bold flex items-center gap-1">
                        <span>{item.stars}</span>
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      </div>
                      <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full transition-all duration-500"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                      <div className="w-10 text-left text-slate-400 text-[11px] font-semibold">
                        {item.count}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Reviews List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm sm:text-base text-[#101B3D] flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#07875F]" />
                  <span>آراء وتجارب الزبائن</span>
                </h3>
                <span className="text-xs text-slate-400">({reviews.length} تعليق)</span>
              </div>

              {reviews.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 text-center border border-slate-200/80 text-slate-500 space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-amber-50 text-amber-500 flex items-center justify-center">
                    <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#101B3D]">لا توجد تقييمات لهذا المتجر بعد</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      كن أول من يشارك تجربته مع هذا المتجر بعد الشراء أو التواصل!
                    </p>
                  </div>
                  <button
                    onClick={handleOpenRating}
                    className="px-5 py-2.5 rounded-xl bg-[#07875F] hover:bg-[#06704F] text-white text-xs font-bold transition shadow-xs inline-flex items-center gap-1.5"
                  >
                    <Star className="w-3.5 h-3.5 fill-white text-white" />
                    <span>كن أول من يقيّم</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            {rev.userAvatar ? (
                              <img
                                src={rev.userAvatar}
                                alt={rev.userName}
                                className="w-9 h-9 rounded-full object-cover border border-slate-200"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-[#DDF7EC] text-[#07875F] font-black text-xs flex items-center justify-center">
                                {rev.userName.charAt(0)}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-xs sm:text-sm text-[#101B3D]">
                                {rev.userName}
                              </div>
                              <span className="text-[10px] text-slate-400">
                                {new Date(rev.createdAt).toLocaleDateString('ar-YE', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            </div>
                          </div>

                          {/* Interaction badge */}
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              rev.interactionType === 'purchase'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : rev.interactionType === 'chat'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {rev.interactionType === 'purchase'
                              ? 'تم الشراء 🛍️'
                              : rev.interactionType === 'chat'
                              ? 'تواصل واستفسار 💬'
                              : 'تجربة عامة ⭐'}
                          </span>
                        </div>

                        {/* Stars */}
                        <div className="flex items-center gap-1" dir="ltr">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${
                                rev.rating >= s
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-slate-200'
                              }`}
                            />
                          ))}
                        </div>

                        {/* Comment text */}
                        {rev.comment && (
                          <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            {rev.comment}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Rating Modal */}
      <StoreRatingModal
        isOpen={isRatingModalOpen}
        onClose={() => setIsRatingModalOpen(false)}
        storeId={store.id}
        storeName={store.storeName}
        onReviewSuccess={loadData}
      />
    </div>
  );
};

