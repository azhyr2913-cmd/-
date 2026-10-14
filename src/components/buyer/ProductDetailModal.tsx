import React, { useEffect, useState } from 'react';
import {
  X,
  Heart,
  ShoppingBag,
  Store,
  CheckCircle,
  Truck,
  MapPin,
  MessageSquare,
  Eye,
  Share2,
  Clock,
  Tag,
  AlertTriangle,
  Send,
  User,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { Product } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { toggleProductFavorite, toggleProductLike } from '../../services/productService';
import { formatHarajTime } from '../../utils/harajUtils';
import { StoreRatingModal } from '../common/StoreRatingModal';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onOpenStorePage: (storeId: string) => void;
  onStartChatWithProduct: (product: Product, initialProposal?: { price?: number; customMessage?: string }) => void;
  initialIsLiked?: boolean;
  initialIsFavorited?: boolean;
}

interface HarajBid {
  id: string;
  author: string;
  content: string;
  time: string;
  amount?: number;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onOpenStorePage,
  onStartChatWithProduct,
  initialIsLiked = false,
  initialIsFavorited = false,
}) => {
  const { currentUser, login } = useAuth();
  const { addToCart } = useCart();

  const [activeImg, setActiveImg] = useState<string>(product?.imageUrl || '');
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likesCount, setLikesCount] = useState(product?.likesCount || 0);
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited);
  const [, setCopied] = useState(false);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState<string>('');

  // Haraj Bids & Comments state
  const [bids, setBids] = useState<HarajBid[]>([]);
  const [newBidText, setNewBidText] = useState('');

  useEffect(() => {
    if (!product) return;
    const storageKey = `haraj_bids_${product.id}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setBids(JSON.parse(saved));
      } catch {
        setBids([]);
      }
    } else {
      // Realistic default initial bid
      const initial: HarajBid[] = [
        {
          id: 'b1',
          author: 'أبو ناصر البيحاني',
          content: product.price > 0 
            ? `ما شاء الله تبارك الله، أسوم بـ ${(Math.round(product.price * 0.9)).toLocaleString()} ر.ي وصامل للمعاينة.`
            : 'أفتح السوم بـ 35,000 ر.ي وأنا في بيحان العلياء جاهز.',
          time: 'قبل ساعتين',
        },
      ];
      setBids(initial);
    }
  }, [product?.id]);

  if (!product) return null;

  const allImages = [product.imageUrl, ...(product.additionalImages || [])].filter(Boolean);
  const adNumber = product.id.replace(/\D/g, '').slice(-5) || '10842';

  const handleLike = async () => {
    let uid = currentUser?.uid;
    if (!uid) {
      const loggedIn = await login();
      if (!loggedIn || !currentUser) return;
      uid = currentUser.uid;
    }
    const newLiked = await toggleProductLike(uid, product.id);
    setIsLiked(newLiked);
    setLikesCount((prev) => (newLiked ? prev + 1 : Math.max(0, prev - 1)));
  };

  const handleFavorite = async () => {
    let uid = currentUser?.uid;
    if (!uid) {
      const loggedIn = await login();
      if (!loggedIn || !currentUser) return;
      uid = currentUser.uid;
    }
    const newFav = await toggleProductFavorite(uid, product.id);
    setIsFavorited(newFav);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product.title,
        text: `شاهد هذا الإعلان في حراج رواق بيحان: ${product.title}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleStartNegotiationChat = (customMsg?: string, price?: number) => {
    onClose();
    onStartChatWithProduct(product, {
      price,
      customMessage: customMsg,
    });
  };

  const handleSendPriceOffer = () => {
    const raw = offerAmount.replace(/[^\d.]/g, '');
    const parsed = Number(raw);
    if (parsed && parsed > 0) {
      handleStartNegotiationChat(
        `السلام عليكم ورحمة الله، اطلعت على إعلان "${product.title}" المعروض بـ ${product.price > 0 ? product.price.toLocaleString() + ' ر.ي' : 'على السوم'}، وأقترح سد السعر والتراضي على ${parsed.toLocaleString()} ريال يمني. هل يناسبكم؟`,
        parsed
      );
    } else {
      handleStartNegotiationChat(
        `السلام عليكم ورحمة الله، أنا مهتم بالسلعة "${product.title}" وأود التواصل معكم للاتفاق وسد السعر المناسب للطرفين.`
      );
    }
  };

  const handleAddBid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBidText.trim()) return;

    const authorName = currentUser?.displayName || 'مشتري من بيحان';
    const newEntry: HarajBid = {
      id: `bid_${Date.now()}`,
      author: authorName,
      content: newBidText.trim(),
      time: 'الآن',
    };

    const updated = [...bids, newEntry];
    setBids(updated);
    setNewBidText('');
    localStorage.setItem(`haraj_bids_${product.id}`, JSON.stringify(updated));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden border border-gray-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="font-bold text-[#07875F]">سوق رواق — بيحان</span>
            <span>/</span>
            <span className="text-gray-400">إعلان #{adNumber}</span>
            <span>/</span>
            <span className="truncate max-w-[180px] font-medium text-gray-800">{product.title}</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-200 text-gray-500 flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 text-right space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Image Gallery */}
            <div className="space-y-3">
              <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                <img
                  src={activeImg || product.imageUrl}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
                {product.isSold ? (
                  <span className="absolute top-3 right-3 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                    تم البيع
                  </span>
                ) : (
                  <span className="absolute top-3 right-3 bg-black/75 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                    {product.condition === 'new' ? 'جديد' : 'مستعمل'}
                  </span>
                )}
                {product.additionalImages && product.additionalImages.length > 0 && (
                  <span className="absolute bottom-3 right-3 bg-black/75 text-white text-[11px] font-bold px-2 py-0.5 rounded-lg shadow-xs">
                    📷 {product.additionalImages.length + 1} صور
                  </span>
                )}
              </div>

              {allImages.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {allImages.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImg(img)}
                      className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition shrink-0 ${
                        activeImg === img ? 'border-[#008450]' : 'border-gray-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Time, Views, and Likes banner */}
              <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                <span className="flex items-center gap-1 text-gray-700 font-medium">
                  <Clock className="w-3.5 h-3.5 text-[#008450]" />
                  {formatHarajTime(product.createdAt)}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4 text-gray-400" />
                  {product.viewsCount || 1} مشاهدة
                </span>
                <span className="flex items-center gap-1 font-bold text-rose-600">
                  <Heart className="w-4 h-4 fill-rose-600" />
                  {likesCount} إعجاب
                </span>
              </div>
            </div>

            {/* Product & Haraj Details */}
            <div className="flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <h1 className="text-lg sm:text-2xl font-black text-gray-900 leading-snug">
                  {product.title}
                </h1>

                {/* Haraj Price */}
                <div className="flex flex-wrap items-baseline gap-2">
                  {product.price > 0 ? (
                    <>
                      <span className="text-2xl sm:text-3xl font-black text-[#008450]">
                        {product.price.toLocaleString()}
                      </span>
                      <span className="text-xs font-bold text-gray-500">ريال يمني</span>
                      {product.priceSar && (
                        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200">
                          {product.priceSar.toLocaleString()} ر.س
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-2xl sm:text-3xl font-black text-[#008450]">
                      على السوم
                    </span>
                  )}
                </div>

                {/* Haraj Specifications Table */}
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-gray-200">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-[#008450]" /> رقم الإعلان
                    </span>
                    <span className="font-bold text-gray-900">#{adNumber}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-gray-200">
                    <span className="text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#008450]" /> الموقع والحي
                    </span>
                    <span className="font-bold text-blue-600">{product.city}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-gray-200">
                    <span className="text-gray-500">حالة السلعة</span>
                    <span className="font-bold text-gray-900">
                      {product.condition === 'new' ? 'جديد' : 'مستعمل'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-[#008450]" /> الاستلام
                    </span>
                    <span className="font-bold text-gray-900">
                      {product.deliveryFee > 0 ? `توصيل متاح (${product.deliveryFee.toLocaleString()} ر.ي)` : 'استلام يدوي في بيحان'}
                    </span>
                  </div>
                </div>

                {/* Seller / Store Preview Card */}
                <div className="p-3 rounded-2xl bg-[#DDF7EC]/40 border border-[#07875F]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div
                    onClick={() => {
                      onClose();
                      onOpenStorePage(product.storeId);
                    }}
                    className="flex items-center gap-2.5 cursor-pointer flex-1"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#07875F] text-white flex items-center justify-center font-bold shrink-0">
                      <Store className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-[#101B3D]">
                        <span>متجر: {product.storeName}</span>
                        <CheckCircle className="w-3.5 h-3.5 text-[#07875F]" />
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 text-[11px] text-amber-700 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        <span>متجر معتمد • اضغط لزيارة المتجر</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setIsRatingModalOpen(true)}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold transition inline-flex items-center gap-1 shadow-2xs"
                      title="تقييم هذا البائع"
                    >
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      <span>تقييم البائع</span>
                    </button>
                    <button
                      onClick={() => {
                        onClose();
                        onOpenStorePage(product.storeId);
                      }}
                      className="text-xs text-[#07875F] font-bold hover:underline"
                    >
                      المتجر ←
                    </button>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-xs font-bold text-gray-800 mb-1.5">نص الإعلان والتفاصيل:</h3>
                  <div className="text-xs sm:text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                    {product.description || 'لا يوجد وصف إضافي، تواصل مع المعلن للاستفسار.'}
                  </div>
                </div>
              </div>

              {/* Actions & Haraj Contact Bar */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleLike}
                    className={`flex-1 py-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      isLiked
                        ? 'border-rose-300 bg-rose-50 text-rose-700'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-600 text-rose-600' : ''}`} />
                    <span>{isLiked ? 'معجب' : 'إعجاب'}</span>
                  </button>

                  <button
                    onClick={handleFavorite}
                    className={`flex-1 py-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      isFavorited
                        ? 'border-[#008450] bg-emerald-50 text-[#008450]'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isFavorited ? 'fill-[#008450] text-[#008450]' : ''}`} />
                    <span>{isFavorited ? 'في المفضلة' : 'حفظ'}</span>
                  </button>

                  <button
                    onClick={handleShare}
                    className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                    title="مشاركة الإعلان"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>

                {/* ======================================================== */}
                {/* NEGOTIATE & AGREE ON PRICE (التفاوض وسد السعر مع البائع) */}
                {/* ======================================================== */}
                <div className="bg-gradient-to-r from-emerald-50 via-teal-50/70 to-emerald-50 rounded-2xl border-2 border-[#07875F]/30 p-3.5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🤝</span>
                      <div>
                        <h4 className="font-black text-xs sm:text-sm text-[#101B3D]">
                          التفاوض وسد السعر مع البائع
                        </h4>
                        <p className="text-[11px] text-emerald-800 font-semibold">
                          راسل صاحب المعروض واتفقوا على السعر (يسدّوا في السعر) داخل التطبيق
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-[#07875F] text-white font-extrabold px-2 py-0.5 rounded-full shrink-0">
                      محادثة خاصة
                    </span>
                  </div>

                  {/* Quick Offer Input */}
                  <div className="bg-white p-2 rounded-xl border border-emerald-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={offerAmount}
                        onChange={(e) => setOfferAmount(e.target.value)}
                        placeholder={
                          product.price > 0
                            ? `اكتب السعر المقترح (مثال: ${(Math.round(product.price * 0.9)).toLocaleString()})`
                            : 'اكتب السعر المقترح بالريال اليمني...'
                        }
                        className="w-full px-3 py-2 bg-slate-50 rounded-lg text-xs font-bold text-gray-800 border border-slate-200 focus:outline-none focus:border-[#07875F] text-right"
                      />
                      <span className="absolute left-2.5 top-2 text-[10px] text-gray-400 font-bold">
                        ر.ي
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleSendPriceOffer}
                      className="px-3.5 py-2 bg-[#07875F] hover:bg-[#06704F] text-white text-xs font-extrabold rounded-lg transition flex items-center justify-center gap-1.5 shadow-xs shrink-0"
                    >
                      <span>إرسال السوم والبدء بالمحادثة</span>
                      <Send className="w-3.5 h-3.5 rotate-180" />
                    </button>
                  </div>

                  {/* Quick negotiation suggestions */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-[10px] sm:text-[11px]">
                    <span className="text-gray-400 font-bold shrink-0">سريع:</span>
                    <button
                      type="button"
                      onClick={() => handleStartNegotiationChat('كم حدكم النهائي في هذه السلعة يا غالي؟')}
                      className="px-2 py-1 bg-white hover:bg-emerald-100/70 border border-emerald-200 rounded-lg text-emerald-900 font-bold shrink-0 transition"
                    >
                      🤝 كم حدك النهائي؟
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartNegotiationChat('هل السعر يشمل التوصيل داخل بيحان؟')}
                      className="px-2 py-1 bg-white hover:bg-emerald-100/70 border border-emerald-200 rounded-lg text-emerald-900 font-bold shrink-0 transition"
                    >
                      🚚 هل التوصيل مشمول؟
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartNegotiationChat('جاهز وصامل للمعاينة والاستلام يداً بيد في بيحان اليوم.')}
                      className="px-2 py-1 bg-white hover:bg-emerald-100/70 border border-emerald-200 rounded-lg text-emerald-900 font-bold shrink-0 transition"
                    >
                      📍 جاهز للمعاينة في بيحان
                    </button>
                  </div>
                </div>

                {/* Direct Full Chat Button */}
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => handleStartNegotiationChat()}
                    className="w-full py-3 px-4 rounded-xl bg-[#07875F] hover:bg-[#06704F] active:bg-[#055c41] text-white font-extrabold text-sm transition flex items-center justify-center gap-2.5 shadow-sm"
                    title="محادثة خاصة داخل التطبيق مع صاحب الإعلان للتفاوض وسد السعر"
                  >
                    <MessageSquare className="w-4.5 h-4.5 text-white" />
                    <span>مراسلة البائع للتفاوض وسد السعر</span>
                  </button>

                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-50 py-1.5 px-3 rounded-lg border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>محادثة خاصة ومحمية داخل تطبيق رواق بدون إظهار الأرقام</span>
                  </div>
                </div>

                {/* Direct Purchase / Add to Cart */}
                {!product.isSold && (
                  <button
                    onClick={() => {
                      addToCart(product, 1);
                      onClose();
                    }}
                    className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs flex items-center justify-center gap-2 transition"
                  >
                    <ShoppingBag className="w-4 h-4 text-[#008450]" />
                    <span>إضافة إلى سلة الشراء المباشر ({product.price > 0 ? product.price.toLocaleString() + ' ر.ي' : 'السعر الحالي'})</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* HARAJ BIDS & COMMENTS SECTION (قسم الردود والسومات في حراج) */}
          {/* ======================================================== */}
          <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-gray-200 pb-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#008450]" />
                <h3 className="font-extrabold text-xs sm:text-sm text-gray-900">
                  سومات وردود السلعة ({bids.length})
                </h3>
              </div>
              <span className="text-[11px] text-gray-500">حراج بيحان المباشر</span>
            </div>

            {/* Bids list */}
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {bids.map((b) => (
                <div
                  key={b.id}
                  className="bg-white rounded-xl p-2.5 border border-gray-200 text-xs flex items-start gap-2.5"
                >
                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-[#008450] flex items-center justify-center shrink-0 font-bold text-xs">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-gray-900">{b.author}</span>
                      <span className="text-[10px] text-gray-400">{b.time}</span>
                    </div>
                    <p className="text-gray-700 leading-relaxed">{b.content}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Bid Form */}
            <form onSubmit={handleAddBid} className="pt-2 flex items-center gap-2">
              <input
                type="text"
                value={newBidText}
                onChange={(e) => setNewBidText(e.target.value)}
                placeholder="اكتب سومتك أو استفسارك للمعلن هنا..."
                className="flex-1 px-3 py-2 text-xs bg-white rounded-xl border border-gray-300 focus:outline-none focus:border-[#008450]"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl bg-[#008450] hover:bg-[#007043] text-white text-xs font-bold transition flex items-center gap-1 shadow-xs"
              >
                <span>إرسال</span>
                <Send className="w-3 h-3" />
              </button>
            </form>
          </div>

          {/* Security Box */}
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2.5 leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-0.5">أمان التعامل في منصة رواق بيحان:</span>
              <span>
                احرص دائماً على فحص السلعة ومعاينتها، والتواصل يتم حصراً عبر المحادثة الداخلية الآمنة لحماية رقمك وبياناتك الشخصية.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Store Rating Modal */}
      {isRatingModalOpen && product && (
        <StoreRatingModal
          isOpen={isRatingModalOpen}
          onClose={() => setIsRatingModalOpen(false)}
          storeId={product.storeId}
          storeName={product.storeName}
          defaultInteractionType="general"
          onReviewSuccess={() => setIsRatingModalOpen(false)}
        />
      )}
    </div>
  );
};
