import React, { useRef, useState } from 'react';
import { X, Store, User, Phone, MapPin, Tag, FileText, Camera, CheckCircle2, ShieldCheck, Trash2, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { submitStoreApplication } from '../../services/storeService';
import { YEMEN_CITIES } from '../../constants/defaultData';

interface StoreApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const StoreApplicationModal: React.FC<StoreApplicationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentUser, userProfile, login, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState(userProfile?.name || '');
  const [phone, setPhone] = useState('');
  const [storeName, setStoreName] = useState('');
  const [storefrontImageUrl, setStorefrontImageUrl] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [productTypes, setProductTypes] = useState('');
  const [city, setCity] = useState('بيحان - شبوة');
  const [description, setDescription] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDone, setIsDone] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!currentUser) {
      setErrorMessage('يرجى تسجيل الدخول بحسابك أولاً لإتمام تقديم طلب فتح المتجر.');
      return;
    }

    if (!fullName.trim() || fullName.trim().split(' ').length < 2) {
      setErrorMessage('يرجى كتابة الاسم الثلاثي بوضوح.');
      return;
    }

    if (!phone.trim() || phone.length < 8) {
      setErrorMessage('يرجى إدخال رقم هاتف يمني صحيح للتواصل ومطابقة الهوية.');
      return;
    }

    if (!storeName.trim()) {
      setErrorMessage('يرجى إدخال اسم المحل التجاري.');
      return;
    }

    if (!storefrontImageUrl.trim()) {
      setErrorMessage('يرجى رفع صورة حقيقية لواجهة المحل أو اللوحة التجارية.');
      return;
    }

    if (!productTypes.trim()) {
      setErrorMessage('يرجى تحديد نوع المنتجات والسلع التي يبيعها المتجر.');
      return;
    }

    if (!agreedTerms) {
      setErrorMessage('يجب الموافقة على الشروط وسياسة الخصوصية لمتابعة التسجيل.');
      return;
    }

    setIsSubmitting(true);

    try {
      await submitStoreApplication({
        ownerId: currentUser.uid,
        fullName: fullName.trim(),
        phone: phone.trim(),
        storeName: storeName.trim(),
        storefrontImageUrl: storefrontImageUrl.trim(),
        productTypes: productTypes.trim(),
        city,
        description: description.trim(),
      });

      await refreshProfile();
      setIsDone(true);
      confetti({ particleCount: 60, spread: 60 });
      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء إرسال طلب المتجر. يرجى المحاولة لاحقاً.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#101B3D]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-[#F4F7FA]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#DDF7EC] text-[#07875F] flex items-center justify-center font-bold">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-[#101B3D] text-base sm:text-lg">افتح متجرك في رواق</h2>
              <p className="text-xs text-slate-500">سوق بيحان وشبوة التجاري الموثق</p>
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
          {isDone ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-[#DDF7EC] text-[#07875F] mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h3 className="text-[#101B3D] font-extrabold text-lg">تم استلام طلب متجرك بنجاح!</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                طلبك لفتح متجر «<strong className="text-[#07875F]">{storeName}</strong>» قيد المراجعة الآن من قِبل إدارة رواق.
                سيتم تدقيق البيانات والتأكد من مطابقتها، وفور الاعتماد ستتمكن من نشر منتجاتك والحصول على علامة{' '}
                <strong className="text-[#07875F]">«متجر موثّق»</strong>.
              </p>
              <div className="pt-4">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-[#07875F] hover:bg-[#06704F] text-white text-xs font-bold transition shadow-sm"
                >
                  حسناً، فهمت ذلك
                </button>
              </div>
            </div>
          ) : !currentUser ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[#DDF7EC] text-[#07875F] mx-auto flex items-center justify-center">
                <User className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-[#101B3D] text-base">تسجيل الدخول مطلوب</h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                لربط المتجر بهويتك وحمايته، يرجى تسجيل الدخول بحساب Google المعتمد لمتابعة نموذج التسجيل.
              </p>
              <button
                onClick={login}
                className="px-6 py-3 rounded-2xl bg-[#07875F] hover:bg-[#06704F] text-white text-xs font-bold transition shadow-md shadow-[#07875F]/20"
              >
                تسجيل الدخول عبر Google
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-right">
              {errorMessage && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                  {errorMessage}
                </div>
              )}

              {/* 1. Full name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">1. الاسم الثلاثي لصاحب المحل *</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="الاسم الثلاثي واللقب"
                    className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#07875F]"
                  />
                </div>
              </div>

              {/* 2. Phone */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">2. رقم الهاتف *</label>
                  <span className="text-[11px] text-[#07875F] font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#07875F]" />
                    محمي ومخفي تماماً عن المشترين
                  </span>
                </div>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="رقم الهاتف للتحقق الداخلي من الإدارة (مثال: 771234567)"
                    className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#07875F]"
                  />
                </div>
              </div>

              {/* 3. Store name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">3. اسم المحل / المتجر *</label>
                <div className="relative">
                  <Store className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="مثال: إلكترونيات بيحان الحديثة"
                    className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#07875F]"
                  />
                </div>
              </div>

              {/* 4. Real Storefront / Signboard Photo Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  4. صورة واجهة المحل أو اللوحة التجارية من الكاميرا / الاستوديو *
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (!file.type.startsWith('image/')) {
                      setErrorMessage('يرجى اختيار ملف صورة صالح.');
                      return;
                    }
                    if (file.size > 5 * 1024 * 1024) {
                      setErrorMessage('حجم الصورة كبير جداً، الحد الأقصى 5 ميجابايت.');
                      return;
                    }
                    setIsCompressing(true);
                    setErrorMessage('');
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const img = new Image();
                      img.onload = () => {
                        try {
                          const canvas = document.createElement('canvas');
                          const MAX_DIM = 800;
                          let width = img.width;
                          let height = img.height;
                          if (width > height) {
                            if (width > MAX_DIM) {
                              height = Math.round((height * MAX_DIM) / width);
                              width = MAX_DIM;
                            }
                          } else {
                            if (height > MAX_DIM) {
                              width = Math.round((width * MAX_DIM) / height);
                              height = MAX_DIM;
                            }
                          }
                          canvas.width = width;
                          canvas.height = height;
                          const ctx = canvas.getContext('2d');
                          if (ctx) {
                            ctx.drawImage(img, 0, 0, width, height);
                            setStorefrontImageUrl(canvas.toDataURL('image/jpeg', 0.82));
                          }
                        } catch (err) {
                          console.warn('Compression error:', err);
                        } finally {
                          setIsCompressing(false);
                        }
                      };
                      img.onerror = () => setIsCompressing(false);
                      img.src = event.target?.result as string;
                    };
                    reader.onerror = () => setIsCompressing(false);
                    reader.readAsDataURL(file);
                  }}
                  className="hidden"
                />

                {storefrontImageUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border border-[#07875F]/30 bg-slate-50 p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={storefrontImageUrl}
                        alt="واجهة المحل"
                        className="w-16 h-16 rounded-xl object-cover border border-slate-200 bg-white"
                      />
                      <div>
                        <span className="text-xs font-bold text-[#101B3D] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#07875F]" />
                          تم اختيار صورة المحل بنجاح
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          صورة حقيقية موثقة لواجهة المحل أو اللوحة
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
                      >
                        تغيير
                      </button>
                      <button
                        type="button"
                        onClick={() => setStorefrontImageUrl('')}
                        className="p-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => !isCompressing && fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-[#07875F] bg-slate-50 hover:bg-[#DDF7EC]/30 rounded-2xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1.5"
                  >
                    {isCompressing ? (
                      <div className="flex items-center gap-2 text-xs font-bold text-[#07875F]">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>جارٍ معالجة وضغط الصورة...</span>
                      </div>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#07875F] shadow-2xs">
                          <Camera className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-[#101B3D]">
                          اضغط لالتقاط أو اختيار صورة المحل من الكاميرا أو الجهاز
                        </span>
                        <span className="text-[10px] text-slate-400">
                          صورة اللوحة أو مدخل المحل في بيحان للتوثيق
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* 5. Product Types & 6. City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">5. نوع المنتجات التي يبيعها المحل *</label>
                  <div className="relative">
                    <Tag className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={productTypes}
                      onChange={(e) => setProductTypes(e.target.value)}
                      placeholder="مثال: هواتف وملحقاتها، قطع غيار"
                      className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#07875F]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">6. المدينة أو المنطقة *</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#07875F] bg-white"
                    >
                      {YEMEN_CITIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 7. Short description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">7. وصف مختصر للمتجر وعنوانه الدقيق</label>
                <div className="relative">
                  <FileText className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="موقع المحل في سوق بيحان، أوقات العمل، الخدمات المقدمة..."
                    className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#07875F]"
                  />
                </div>
              </div>

              {/* 8. Terms agreement */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedTerms}
                    onChange={(e) => setAgreedTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded text-[#07875F] focus:ring-[#07875F] border-slate-300"
                  />
                  <span className="text-[11px] text-slate-600 leading-relaxed">
                    8. أوافق على شروط الاستخدام وسياسة الخصوصية الخاصة بمنصة رواق، وأتعهد بصحة بيانات المحل ومصداقية المنتجات والأسعار المعروضة.
                  </span>
                </label>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-2xl bg-[#07875F] hover:bg-[#06704F] active:bg-[#055c41] text-white text-xs font-extrabold shadow-md shadow-[#07875F]/20 transition disabled:opacity-50"
                >
                  {isSubmitting ? 'جارٍ إرسال طلب الاعتماد...' : 'إرسال طلب فتح المتجر للمراجعة'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
