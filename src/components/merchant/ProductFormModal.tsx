import React, { useRef, useState } from 'react';
import {
  X,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Camera,
  Trash2,
  Loader2,
  Star,
  Plus,
} from 'lucide-react';
import { Category, Product, ProductCondition } from '../../types';
import { CreateProductInput, createProduct, updateProduct } from '../../services/productService';
import { checkProductWithAI } from '../../services/aiService';
import { YEMEN_CITIES } from '../../constants/defaultData';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  storeId: string;
  storeName: string;
  ownerId: string;
  categories: Category[];
  productToEdit?: Product | null;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  storeId,
  storeName,
  ownerId,
  categories,
  productToEdit,
}) => {
  const [title, setTitle] = useState(productToEdit?.title || '');
  const [description, setDescription] = useState(productToEdit?.description || '');
  const [isSom, setIsSom] = useState(productToEdit ? productToEdit.price === 0 : false);
  const [price, setPrice] = useState<number | string>(
    productToEdit?.price && productToEdit.price > 0 ? productToEdit.price : ''
  );
  const [priceSar, setPriceSar] = useState<number | string>(
    productToEdit?.priceSar && productToEdit.priceSar > 0 ? productToEdit.priceSar : ''
  );
  const [deliveryFee, setDeliveryFee] = useState<number | string>(productToEdit?.deliveryFee || 0);
  const [deliveryFeeType, setDeliveryFeeType] = useState<'order' | 'item'>('order');
  const [categoryId, setCategoryId] = useState(productToEdit?.categoryId || (categories[0]?.id || 'cat-other'));
  const [condition, setCondition] = useState<ProductCondition>(productToEdit?.condition || 'used');
  const [quantity, setQuantity] = useState<number | string>(productToEdit?.quantity || 1);
  const [city, setCity] = useState(productToEdit?.city || 'بيحان — العلياء');

  // Support 1 to 4 real photos uploaded from camera/gallery
  const initialImages: string[] = [];
  if (productToEdit?.imageUrl) initialImages.push(productToEdit.imageUrl);
  if (productToEdit?.additionalImages && Array.isArray(productToEdit.additionalImages)) {
    initialImages.push(...productToEdit.additionalImages);
  }

  const [images, setImages] = useState<string[]>(initialImages);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // AI Quality Check
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReport, setAiReport] = useState<{
    notes: string[];
    discrepancies: string[];
    suggestedDesc?: string;
  } | null>(null);

  if (!isOpen) return null;

  const compressAndProcessFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        return reject(new Error('يرجى اختيار ملف صورة صالح فقط (JPEG/PNG/WebP).'));
      }
      // Validate file size: 5MB limit
      if (file.size > 5 * 1024 * 1024) {
        return reject(new Error('حجم الصورة كبير جداً، الحد الأقصى المسموح 5 ميجابايت.'));
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 900;
            const MAX_HEIGHT = 900;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height = Math.round((height * MAX_WIDTH) / width);
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width = Math.round((width * MAX_HEIGHT) / height);
                height = MAX_HEIGHT;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
              resolve(compressedDataUrl);
            } else {
              reject(new Error('فشل معالجة أبعاد الصورة'));
            }
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = () => reject(new Error('تعذر قراءة ملف الصورة المحدد.'));
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject(new Error('تعذر فتح ملف الصورة.'));
      reader.readAsDataURL(file);
    });
  };

  const handleFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 4 - images.length;
    if (remainingSlots <= 0) {
      setErrorMessage('الحد الأقصى لصور المنتج هو 4 صور فقط.');
      return;
    }

    setIsCompressing(true);
    setErrorMessage('');

    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    const newCompressedImages: string[] = [];

    try {
      for (const file of filesToProcess) {
        const compressed = await compressAndProcessFile(file);
        newCompressedImages.push(compressed);
      }
      setImages((prev) => [...prev, ...newCompressedImages]);
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء معالجة الصور.');
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSetPrimaryImage = (index: number) => {
    if (index === 0) return;
    setImages((prev) => {
      const copy = [...prev];
      const [selected] = copy.splice(index, 1);
      return [selected, ...copy];
    });
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRunAICheck = async () => {
    if (!title.trim() || !description.trim()) {
      setErrorMessage('يرجى كتابة عنوان ووصف المنتج أولاً لتشغيل الفحص الذكي.');
      return;
    }

    setAiLoading(true);
    setErrorMessage('');

    try {
      const activeCat = categories.find((c) => c.id === categoryId);
      const res = await checkProductWithAI({
        title,
        description,
        categoryName: activeCat?.name || 'عام',
        price: Number(price) || 0,
        condition,
      });

      setAiReport({
        notes: res.qualityNotes,
        discrepancies: res.discrepancies,
        suggestedDesc: res.suggestedDescription,
      });
    } catch (err) {
      console.warn('AI check error:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplySuggestedDesc = () => {
    if (aiReport?.suggestedDesc) {
      setDescription(aiReport.suggestedDesc);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!title.trim()) {
      setErrorMessage('يرجى إدخال اسم أو عنوان المنتج.');
      return;
    }

    const numPrice = isSom ? 0 : Number(price);
    if (!isSom && (isNaN(numPrice) || numPrice <= 0)) {
      setErrorMessage('يرجى إدخال سعر صحيح بالريال اليمني (مثل: 7000، 8000، 20000) أو اختيار "على السوم".');
      return;
    }

    if (images.length === 0) {
      setErrorMessage('يجب رفع صورة واحدة على الأقل للمنتج من الكاميرا أو معرض الصور.');
      return;
    }

    if (!description.trim()) {
      setErrorMessage('يرجى كتابة وصف نصي للمنتج لتوضيح حالته ومواصفاته للمشتري.');
      return;
    }

    if (!city || !city.includes('بيحان')) {
      setErrorMessage('التطبيق ونشر المنتجات مخصص حصرياً لمدينة بيحان ومناطقها التابعة.');
      return;
    }

    const primaryImageUrl = images[0];
    const extraImages = images.slice(1);
    const parsedPriceSar = priceSar !== '' && Number(priceSar) > 0 ? Number(priceSar) : undefined;
    const finalQuantity = Math.max(1, Number(quantity) || 1);

    setIsSubmitting(true);

    try {
      if (productToEdit) {
        await updateProduct(productToEdit.id, {
          title: title.trim(),
          description: description.trim(),
          price: numPrice,
          priceSar: parsedPriceSar,
          deliveryFee: Number(deliveryFee) || 0,
          categoryId,
          condition,
          quantity: finalQuantity,
          city,
          imageUrl: primaryImageUrl,
          additionalImages: extraImages,
        });
      } else {
        const input: CreateProductInput = {
          storeId,
          storeName,
          ownerId,
          title: title.trim(),
          description: description.trim(),
          price: numPrice,
          priceSar: parsedPriceSar,
          deliveryFee: Number(deliveryFee) || 0,
          categoryId,
          condition,
          quantity: finalQuantity,
          city,
          imageUrl: primaryImageUrl,
          additionalImages: extraImages,
        };
        await createProduct(input);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء حفظ المنتج. يرجى المحاولة ثانية.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#101B3D]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-[#F4F7FA]">
          <div>
            <h2 className="font-extrabold text-[#101B3D] text-base sm:text-lg">
              {productToEdit ? 'تعديل بيانات المنتج' : 'إضافة منتج جديد للمتجر (+)'}
            </h2>
            <p className="text-xs text-slate-500">متجر: {storeName} (بيحان، شبوة)</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="space-y-4 text-right">
            {errorMessage && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                {errorMessage}
              </div>
            )}

            {/* AI Assistant Banner */}
            <div className="p-3.5 bg-[#DDF7EC] rounded-2xl border border-[#C0F0DD] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-[#056B4B] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#07875F]" />
                  مساعد الذكاء الاصطناعي لفحص جودة المنتج
                </h4>
                <p className="text-[11px] text-[#066e4d]">
                  يفحص بيانات المنتج ويكتشف أي أخطاء ويقترح صياغة تسويقية أفضل.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRunAICheck}
                disabled={aiLoading}
                className="px-3 py-1.5 rounded-xl bg-[#07875F] hover:bg-[#06704F] text-white text-xs font-bold transition flex items-center gap-1 shrink-0 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{aiLoading ? 'جارٍ الفحص...' : 'فحص بالذكاء الاصطناعي'}</span>
              </button>
            </div>

            {/* AI Report */}
            {aiReport && (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">نتيجة الفحص الذكي:</span>
                  {aiReport.discrepancies.length === 0 ? (
                    <span className="text-[#07875F] font-bold flex items-center gap-1 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> بيانات متناسقة وسليمة
                    </span>
                  ) : (
                    <span className="text-amber-700 font-bold flex items-center gap-1 text-[11px]">
                      <AlertCircle className="w-3.5 h-3.5" /> تنبيهات محتملة
                    </span>
                  )}
                </div>

                {aiReport.discrepancies.length > 0 && (
                  <ul className="text-red-700 list-disc list-inside space-y-0.5 text-[11px]">
                    {aiReport.discrepancies.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                )}

                {aiReport.notes.length > 0 && (
                  <ul className="text-slate-600 list-disc list-inside space-y-0.5 text-[11px]">
                    {aiReport.notes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                )}

                {aiReport.suggestedDesc && aiReport.suggestedDesc !== description && (
                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <span className="text-[11px] font-bold text-slate-700 block mb-1">الوصف المحسن المقترح:</span>
                    <p className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200 whitespace-pre-wrap">
                      {aiReport.suggestedDesc}
                    </p>
                    <button
                      type="button"
                      onClick={handleApplySuggestedDesc}
                      className="mt-1 text-[10px] text-[#07875F] font-bold hover:underline"
                    >
                      استبدال الوصف بهذا النص المحسن
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 1. Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">1. اسم المنتج *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: شاص تايوتا 2022 نظيف أو جوال سامسونج A54"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#07875F]"
              />
            </div>

            {/* 2. Category & Condition */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">2. القسم أو الفئة *</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#07875F] bg-white"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">3. حالة المنتج *</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCondition('new')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition border ${
                      condition === 'new'
                        ? 'bg-[#07875F] text-white border-[#07875F]'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    جديد
                  </button>
                  <button
                    type="button"
                    onClick={() => setCondition('used')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition border ${
                      condition === 'used'
                        ? 'bg-[#07875F] text-white border-[#07875F]'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    مستعمل
                  </button>
                </div>
              </div>
            </div>

            {/* 4. Price (YER) & Optional (SAR) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">4. السعر بالريال اليمني (YER) *</label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-bold text-[#07875F]">
                  <input
                    type="checkbox"
                    checked={isSom}
                    onChange={(e) => {
                      setIsSom(e.target.checked);
                      if (e.target.checked) setPrice('');
                    }}
                    className="w-4 h-4 rounded text-[#07875F] focus:ring-[#07875F]"
                  />
                  <span>على السوم (مزاد / قابل للتفاوض)</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      disabled={isSom}
                      required={!isSom}
                      value={isSom ? '' : price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder={isSom ? 'على السوم (بدون حد)' : 'مثال: 7000 أو 20000 أو 50000'}
                      className={`w-full pr-3 pl-14 py-2 text-xs rounded-xl border ${
                        isSom ? 'bg-slate-100 text-slate-400 border-slate-200' : 'border-slate-200 focus:outline-none focus:border-[#07875F]'
                      }`}
                    />
                    <span className="absolute left-2.5 top-2.5 text-[10px] font-bold text-slate-400">
                      ريال يمني
                    </span>
                  </div>
                </div>

                <div>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      disabled={isSom}
                      value={priceSar}
                      onChange={(e) => setPriceSar(e.target.value)}
                      placeholder="سعر إضافي بالريال السعودي (اختياري)"
                      className="w-full pr-3 pl-14 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#07875F]"
                    />
                    <span className="absolute left-2.5 top-2.5 text-[10px] font-bold text-slate-400">
                      ر.س اختياري
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Quantity & Delivery Fee */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">5. الكمية المتوفرة بالمخزون *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="مثال: 1 أو 3 أو 5 أو 20 قطعة"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#07875F]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">6. سعر التوصيل إن وجد (ر.ي)</label>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <label className="cursor-pointer">
                      <input
                        type="radio"
                        name="deliveryFeeType"
                        checked={deliveryFeeType === 'order'}
                        onChange={() => setDeliveryFeeType('order')}
                        className="ml-1 text-[#07875F]"
                      />
                      لكل طلب
                    </label>
                    <label className="cursor-pointer">
                      <input
                        type="radio"
                        name="deliveryFeeType"
                        checked={deliveryFeeType === 'item'}
                        onChange={() => setDeliveryFeeType('item')}
                        className="ml-1 text-[#07875F]"
                      />
                      لكل قطعة
                    </label>
                  </div>
                </div>
                <input
                  type="number"
                  min="0"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(e.target.value)}
                  placeholder="0 للاستلام من المحل / مجاني"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#07875F]"
                />
              </div>
            </div>

            {/* 7. City / Area in Beihan */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">7. المنطقة في بيحان *</label>
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

            {/* 8. Real Product Photos Upload (1 to 4 photos) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  8. صور المنتج الحقيقية (من 1 إلى 4 صور كحد أقصى) *
                </label>
                <span className="text-[11px] font-bold text-[#07875F]">
                  {images.length}/4 صور
                </span>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFilesSelect}
                className="hidden"
              />

              {/* Photos Gallery */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {images.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    className="relative group rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-100 aspect-square flex flex-col justify-between"
                  >
                    <img
                      src={imgUrl}
                      alt={`صورة ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />

                    {/* Top status */}
                    <div className="absolute top-1.5 right-1.5 left-1.5 flex items-center justify-between pointer-events-none">
                      {idx === 0 ? (
                        <span className="bg-[#07875F] text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-current" />
                          الرئيسية
                        </span>
                      ) : (
                        <span className="bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded-full">
                          إضافية #{idx + 1}
                        </span>
                      )}
                    </div>

                    {/* Actions overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5 p-2">
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => handleSetPrimaryImage(idx)}
                          className="p-1.5 rounded-xl bg-white text-[#07875F] text-[10px] font-bold shadow hover:bg-slate-50 transition"
                          title="تعيين كصورة رئيسية"
                        >
                          كرئيسية
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="p-1.5 rounded-xl bg-rose-600 text-white shadow hover:bg-rose-700 transition"
                        title="حذف الصورة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Upload More Box if < 4 */}
                {images.length < 4 && (
                  <button
                    type="button"
                    disabled={isCompressing}
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-2xl border-2 border-dashed border-slate-300 hover:border-[#07875F] bg-slate-50 hover:bg-[#DDF7EC]/30 aspect-square flex flex-col items-center justify-center gap-1.5 p-2 text-center transition cursor-pointer disabled:opacity-50"
                  >
                    {isCompressing ? (
                      <>
                        <Loader2 className="w-6 h-6 text-[#07875F] animate-spin" />
                        <span className="text-[10px] font-bold text-slate-600">معالجة...</span>
                      </>
                    ) : (
                      <>
                        <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#07875F] shadow-2xs">
                          {images.length === 0 ? <Camera className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        </div>
                        <span className="text-[11px] font-bold text-slate-700">
                          {images.length === 0 ? 'رفع صورة أولى' : 'إضافة صورة'}
                        </span>
                        <span className="text-[9px] text-slate-400">كاميرا أو استوديو</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* 9. Description (at end of form) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                9. وصف المنتج ومواصفاته الكاملة *
              </label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="اذكر حالة المنتج بدقة، الملحقات المتوفرة، مدة الاستخدام أو الضمان، وأي تفاصيل تهم مشتري بيحان..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#07875F] leading-relaxed"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || isCompressing}
                className="w-full py-3 rounded-2xl bg-[#07875F] hover:bg-[#06704F] active:bg-[#055c41] text-white text-xs font-extrabold shadow-md shadow-[#07875F]/20 transition disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting
                  ? 'جارٍ حفظ المنتج ونشره...'
                  : productToEdit
                  ? 'تحديث بيانات المنتج ✓'
                  : 'نشر المنتج الآن في سوق رواق (+)'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
