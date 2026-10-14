import React, { useState, useEffect } from 'react';
import { X, Star, MessageSquare, ShoppingBag, Award, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { submitStoreReview, getUserStoreReview } from '../../services/storeReviewService';
import { StoreReview } from '../../types';

interface StoreRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
  storeName: string;
  orderId?: string;
  defaultInteractionType?: 'purchase' | 'chat' | 'general';
  initialRating?: number;
  onReviewSuccess?: () => void;
}

export const StoreRatingModal: React.FC<StoreRatingModalProps> = ({
  isOpen,
  onClose,
  storeId,
  storeName,
  orderId,
  defaultInteractionType = 'general',
  initialRating = 5,
  onReviewSuccess,
}) => {
  const { currentUser, userProfile, login } = useAuth();
  const [rating, setRating] = useState<number>(initialRating);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [interactionType, setInteractionType] = useState<'purchase' | 'chat' | 'general'>(
    orderId ? 'purchase' : defaultInteractionType
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync initial rating if changed
  useEffect(() => {
    if (initialRating) {
      setRating(initialRating);
    }
  }, [initialRating]);

  // Load existing user review if any
  useEffect(() => {
    if (isOpen && currentUser && storeId) {
      getUserStoreReview(currentUser.uid, storeId)
        .then((existingRev) => {
          if (existingRev) {
            setRating(existingRev.rating);
            setComment(existingRev.comment || '');
            if (existingRev.interactionType) {
              setInteractionType(existingRev.interactionType);
            }
          }
        })
        .catch(console.error);
    }
  }, [isOpen, currentUser, storeId]);

  if (!isOpen) return null;

  const getRatingLabel = (val: number) => {
    switch (val) {
      case 1:
        return 'تجربة سيئة وغير مرضية';
      case 2:
        return 'دون المتوقع، تحتاج لتحسين';
      case 3:
        return 'تجربة مقبولة وجيدة';
      case 4:
        return 'متجر جيد جداً وخدمة ممتازة';
      case 5:
        return 'متجر ممتاز وموثوق 100%';
      default:
        return 'اختر عدد النجوم';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      const loggedIn = await login();
      if (!loggedIn) return;
    }

    if (!rating || rating < 1) {
      setErrorMessage('يرجى تحديد عدد النجوم لتقييم المتجر');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await submitStoreReview({
        storeId,
        userId: currentUser!.uid,
        userName: userProfile?.name || currentUser!.displayName || 'مشتري من رواق',
        userAvatar: currentUser!.photoURL || userProfile?.avatarUrl || undefined,
        rating,
        comment,
        interactionType,
        orderId,
      });

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
        if (onReviewSuccess) onReviewSuccess();
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'حدث خطأ أثناء حفظ التقييم. يرجى المحاولة ثانية.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs text-right">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-[#F4F7FA]">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-[#101B3D]">
                تقييم متجر: {storeName}
              </h3>
              <p className="text-[11px] text-slate-500">شارك رأيك لمساعدة أهالي بيحان في اختيار أفضل المتاجر</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-[#DDF7EC] text-[#07875F] flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="font-black text-base text-[#101B3D]">شكراً لك على تقييمك!</h4>
            <p className="text-xs text-slate-500">تم تسجيل تقييمك بنجاح وسيظهر الآن في صفحة المتجر العامة.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                {errorMessage}
              </div>
            )}

            {/* Star Selector */}
            <div className="text-center space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <label className="block text-xs font-bold text-slate-700">تقييمك العام للمتجر:</label>
              <div className="flex items-center justify-center gap-2 py-1" dir="ltr">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = (hoverRating || rating) >= star;
                  return (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 transition-transform hover:scale-125 focus:outline-none"
                    >
                      <Star
                        className={`w-8 h-8 sm:w-9 sm:h-9 transition-colors ${
                          active
                            ? 'text-amber-400 fill-amber-400 drop-shadow-xs'
                            : 'text-slate-200 hover:text-slate-300'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <p className="text-xs font-bold text-amber-600 h-4">
                {getRatingLabel(hoverRating || rating)}
              </p>
            </div>

            {/* Interaction Type Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">نوع التجربة مع المتجر:</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setInteractionType('purchase')}
                  className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center gap-1.5 ${
                    interactionType === 'purchase'
                      ? 'border-[#07875F] bg-[#DDF7EC]/50 text-[#07875F] font-bold shadow-2xs'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white text-xs'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span className="text-[11px]">شراء طلب</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInteractionType('chat')}
                  className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center gap-1.5 ${
                    interactionType === 'chat'
                      ? 'border-[#07875F] bg-[#DDF7EC]/50 text-[#07875F] font-bold shadow-2xs'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white text-xs'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-[11px]">تواصل واستفسار</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInteractionType('general')}
                  className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center gap-1.5 ${
                    interactionType === 'general'
                      ? 'border-[#07875F] bg-[#DDF7EC]/50 text-[#07875F] font-bold shadow-2xs'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white text-xs'
                  }`}
                >
                  <Award className="w-4 h-4" />
                  <span className="text-[11px]">تعامل عام</span>
                </button>
              </div>
            </div>

            {/* Feedback / Review Text */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                ملاحظاتك ورأيك (اختياري):
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="أخبرنا عن سرعة التوصيل، جودة المنتجات، أو أسلوب تعامل صاحب المتجر..."
                rows={3}
                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#07875F] focus:bg-white resize-none"
              />
            </div>

            {/* Submit button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-[#07875F] hover:bg-[#06704F] text-white font-black text-xs sm:text-sm shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>جارٍ الحفظ...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>إرسال التقييم</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
