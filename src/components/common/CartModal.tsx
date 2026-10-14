import React, { useState } from 'react';
import { X, Trash2, ShoppingBag, MapPin, Phone, User, CheckCircle2, ArrowLeft, Star, Award } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { createOrder } from '../../services/orderService';
import { YEMEN_CITIES } from '../../constants/defaultData';
import { StoreRatingModal } from './StoreRatingModal';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: (orderId: string) => void;
}

export const CartModal: React.FC<CartModalProps> = ({ isOpen, onClose, onOrderSuccess }) => {
  const { items, removeFromCart, updateQuantity, clearCart, subtotal, estimatedDelivery, totalPrice } = useCart();
  const { currentUser, userProfile, loginAsGuest } = useAuth();

  const [step, setStep] = useState<'review' | 'checkout' | 'success'>('review');
  const [buyerName, setBuyerName] = useState(userProfile?.name || '');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [city, setCity] = useState(YEMEN_CITIES[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [createdOrderId, setCreatedOrderId] = useState('');
  const [lastOrderedStore, setLastOrderedStore] = useState<{ id: string; name: string } | null>(null);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [selectedRating, setSelectedRating] = useState<number>(5);

  if (!isOpen) return null;

  // Group items by store
  const storeGroups = items.reduce((acc, item) => {
    const storeId = item.product.storeId;
    if (!acc[storeId]) {
      acc[storeId] = {
        storeName: item.product.storeName,
        storeOwnerId: item.product.ownerId,
        deliveryFee: item.product.deliveryFee || 1000,
        items: [],
      };
    }
    acc[storeId].items.push(item);
    return acc;
  }, {} as Record<string, { storeName: string; storeOwnerId: string; deliveryFee: number; items: typeof items }>);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent double-clicking
    setErrorMessage('');

    if (!buyerName.trim()) {
      setErrorMessage('يرجى كتابة اسم المستلم كاملاً.');
      return;
    }

    if (!buyerPhone.trim() || buyerPhone.length < 8) {
      setErrorMessage('يرجى إدخال رقم هاتف يمني صحيح للتواصل عند التوصيل.');
      return;
    }

    if (!deliveryAddress.trim()) {
      setErrorMessage('يرجى إدخال عنوان التوصيل بالتفصيل (الحي / الشارع / معلم معروف في بيحان).');
      return;
    }

    setIsSubmitting(true);

    try {
      // Allow visitor guest checkout without forced registration
      let activeBuyerUid = currentUser?.uid;
      if (!activeBuyerUid) {
        const guestSuccess = await loginAsGuest();
        if (!guestSuccess && !currentUser) {
          throw new Error('تعذر بدء جلسة زائر، يرجى إعادة المحاولة.');
        }
        activeBuyerUid = currentUser?.uid || `guest_${Date.now()}`;
      }

      const storeIds = Object.keys(storeGroups);
      if (storeIds.length === 0) {
        throw new Error('سلة المشتريات فارغة.');
      }

      const parentOrderId = storeIds.length > 1 ? `ord_group_${Date.now()}` : undefined;
      const createdOrderIds: string[] = [];

      for (const storeId of storeIds) {
        const group = storeGroups[storeId];
        const orderItems = group.items.map((item) => ({
          productId: item.product.id,
          title: item.product.title,
          price: item.product.price,
          priceSar: item.product.priceSar,
          quantity: item.quantity,
          imageUrl: item.product.imageUrl,
          additionalImages: item.product.additionalImages,
        }));

        const orderId = await createOrder({
          buyerId: activeBuyerUid,
          buyerName: buyerName.trim(),
          buyerPhone: buyerPhone.trim(),
          storeId,
          storeName: group.storeName,
          storeOwnerId: group.storeOwnerId,
          items: orderItems,
          deliveryFee: group.deliveryFee,
          deliveryAddress: deliveryAddress.trim(),
          notes: notes.trim(),
          city,
          parentOrderId,
        });

        createdOrderIds.push(orderId);
      }

      // Save guest order IDs in localStorage for guest tracking
      try {
        const prev = JSON.parse(localStorage.getItem('rawaq_guest_orders') || '[]');
        localStorage.setItem('rawaq_guest_orders', JSON.stringify([...prev, ...createdOrderIds]));
      } catch {
        // Non-blocking
      }

      const lastOrderId = createdOrderIds[createdOrderIds.length - 1];
      const firstStoreKey = storeIds[0];
      if (firstStoreKey && storeGroups[firstStoreKey]) {
        setLastOrderedStore({
          id: firstStoreKey,
          name: storeGroups[firstStoreKey].storeName,
        });
      }

      setCreatedOrderId(lastOrderId);
      clearCart();
      setStep('success');
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      onOrderSuccess(lastOrderId);
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء إرسال الطلب. يرجى المحاولة ثانية.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#101B3D]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-[#F4F7FA]">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#DDF7EC] text-[#07875F] flex items-center justify-center font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-[#101B3D] text-base sm:text-lg">سلة المشتريات</h2>
              <p className="text-xs text-slate-500">
                {items.length === 0 ? 'السلة فارغة' : `${items.length} منتجات في السلة`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {items.length === 0 && step !== 'success' ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h3 className="text-[#101B3D] font-bold mb-1">سلتك فارغة حالياً</h3>
              <p className="text-xs text-slate-500 mb-5">تصفح متاجر بيحان وشبوة وأضف المنتجات التي ترغب بشرائها</p>
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-[#07875F] hover:bg-[#06704F] text-white font-bold text-sm transition"
              >
                تصفح المنتجات الآن
              </button>
            </div>
          ) : step === 'review' ? (
            <div className="space-y-6">
              {/* Grouped by Store */}
              {Object.entries(storeGroups).map(([storeId, group]) => (
                <div key={storeId} className="border border-slate-200 rounded-2xl p-3.5 sm:p-4 bg-slate-50/70">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                    <span className="font-bold text-xs sm:text-sm text-[#101B3D] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#07875F]"></span>
                      متجر: {group.storeName}
                    </span>
                    <span className="text-[11px] text-slate-500">توصيل المتجر: {group.deliveryFee.toLocaleString()} ر.ي</span>
                  </div>

                  <div className="space-y-3">
                    {group.items.map((item) => (
                      <div key={item.product.id} className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-100">
                        <img
                          src={item.product.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200'}
                          alt={item.product.title}
                          className="w-14 h-14 rounded-lg object-cover bg-slate-100"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-xs sm:text-sm text-[#101B3D] truncate">
                            {item.product.title}
                          </h4>
                          <p className="text-xs font-bold text-[#07875F] mt-0.5">
                            {item.product.price.toLocaleString()} ر.ي
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-lg">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="w-5 h-5 flex items-center justify-center text-slate-600 font-bold hover:text-red-600"
                          >
                            -
                          </button>
                          <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            className="w-5 h-5 flex items-center justify-center text-slate-600 font-bold hover:text-[#07875F]"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Price Summary */}
              <div className="bg-[#F4F7FA] rounded-2xl p-4 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>مجموع المنتجات:</span>
                  <span className="font-semibold">{subtotal.toLocaleString()} ر.ي</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>رسوم التوصيل المجمعة:</span>
                  <span className="font-semibold">{estimatedDelivery.toLocaleString()} ر.ي</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-[#101B3D] text-sm">
                  <span>الإجمالي النهائي:</span>
                  <span className="text-[#07875F] font-extrabold">{totalPrice.toLocaleString()} ر.ي</span>
                </div>
              </div>
            </div>
          ) : step === 'checkout' ? (
            <form onSubmit={handleSubmitOrder} className="space-y-4 text-right">
              {errorMessage && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                  {errorMessage}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الثلاثي للمستلم *</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="مثال: صالح أحمد هادي"
                    className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#07875F]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف اليمني للتواصل *</label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                  <input
                    type="tel"
                    required
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    placeholder="مثال: 771234567"
                    className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#07875F]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المدينة / المنطقة *</label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#07875F] bg-white"
                  >
                    {YEMEN_CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">طريقة الدفع المعلنة</label>
                  <div className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-600 font-medium">
                    الدفع نقداً عند الاستلام (COD)
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">عنوان التوصيل بالتفصيل *</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                  <textarea
                    required
                    rows={2}
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="الحي، جوار مسجد كذا، أو شارع رئيسي..."
                    className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#07875F]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات إضافية للمتجر (اختياري)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="وقت التسليم المفضل، أو أي تفاصيل خاصة..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#07875F]"
                />
              </div>

              <div className="p-3 bg-slate-100 rounded-xl text-xs space-y-1 text-slate-600">
                <div className="flex justify-between">
                  <span>إجمالي المنتجات:</span>
                  <span>{subtotal.toLocaleString()} ر.ي</span>
                </div>
                <div className="flex justify-between">
                  <span>رسوم التوصيل:</span>
                  <span>{estimatedDelivery.toLocaleString()} ر.ي</span>
                </div>
                <div className="flex justify-between font-bold text-[#101B3D] border-t border-slate-200 pt-1">
                  <span>المبلغ المطلوب عند الاستلام:</span>
                  <span className="text-[#07875F]">{totalPrice.toLocaleString()} ر.ي</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('review')}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100"
                >
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#07875F] hover:bg-[#06704F] text-white text-xs font-bold shadow-md transition disabled:opacity-50"
                >
                  {isSubmitting ? 'جارٍ تأكيد الطلب...' : 'تأكيد وإرسال الطلب للمتجر'}
                </button>
              </div>
            </form>
          ) : (
            /* Success Step */
            <div className="py-8 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-[#DDF7EC] text-[#07875F] mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h3 className="text-[#101B3D] font-extrabold text-lg">تم إرسال طلبك بنجاح!</h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                تم تسجيل طلبك وإرسال الإشعار لمتجر البائع لتجهيزه وتوصيله إليك في {city}. رقم الطلب:
                <br />
                <span className="font-mono font-bold text-[#07875F] bg-[#DDF7EC] px-2 py-0.5 rounded text-xs">
                  {createdOrderId}
                </span>
              </p>

              {/* Star Rating System for Seller to build trust */}
              {lastOrderedStore && (
                <div className="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-right space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                      <Award className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs sm:text-sm text-[#101B3D]">
                        تقييم متجر: {lastOrderedStore.name} ⭐
                      </h4>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        ساعد زبائن بيحان في معرفة جودة البائعين وساهم في بناء الثقة داخل المنصة!
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 border-t border-amber-100">
                    <div className="flex items-center gap-1.5 justify-center sm:justify-start" dir="ltr">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => {
                            setSelectedRating(star);
                            setIsRatingModalOpen(true);
                          }}
                          className="p-1 hover:scale-125 transition-transform"
                          title={`تقييم ${star} نجوم`}
                        >
                          <Star
                            className={`w-6 h-6 transition-colors ${
                              selectedRating >= star
                                ? 'text-amber-400 fill-amber-400 drop-shadow-2xs'
                                : 'text-slate-300 hover:text-amber-400'
                            }`}
                          />
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        setSelectedRating(5);
                        setIsRatingModalOpen(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs shadow-xs transition inline-flex items-center justify-center gap-1.5"
                    >
                      <Star className="w-3.5 h-3.5 fill-white" />
                      <span>تقييم المتجر الآن</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-center gap-3">
                <button
                  onClick={() => {
                    setStep('review');
                    onClose();
                  }}
                  className="px-6 py-2.5 rounded-xl bg-[#07875F] hover:bg-[#06704F] text-white text-xs font-bold transition shadow-sm"
                >
                  العودة للتسوق
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Store Rating Modal */}
        {isRatingModalOpen && lastOrderedStore && (
          <StoreRatingModal
            isOpen={isRatingModalOpen}
            onClose={() => setIsRatingModalOpen(false)}
            storeId={lastOrderedStore.id}
            storeName={lastOrderedStore.name}
            orderId={createdOrderId}
            defaultInteractionType="purchase"
            initialRating={selectedRating}
            onReviewSuccess={() => setIsRatingModalOpen(false)}
          />
        )}

        {/* Footer Actions */}
        {items.length > 0 && step === 'review' && (
          <div className="p-4 border-t border-slate-100 bg-[#F4F7FA] flex items-center justify-between gap-3">
            <div>
              <span className="text-[11px] text-slate-500 block">الإجمالي الكلي:</span>
              <span className="font-extrabold text-[#101B3D] text-base">{totalPrice.toLocaleString()} ر.ي</span>
            </div>
            <button
              onClick={() => setStep('checkout')}
              className="px-6 py-2.5 rounded-xl bg-[#07875F] hover:bg-[#06704F] active:bg-[#055c41] text-white text-xs font-bold shadow-md shadow-[#07875F]/20 transition"
            >
              متابعة تأكيد الطلب ←
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
