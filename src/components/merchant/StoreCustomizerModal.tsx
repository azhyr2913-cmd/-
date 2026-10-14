import React, { useState } from 'react';
import { X, Palette, Image as ImageIcon, Save, Undo2, Check } from 'lucide-react';
import { Store as StoreType } from '../../types';
import { updateStoreSettings } from '../../services/storeService';
import { STORE_BACKGROUND_PRESETS } from '../../constants/defaultData';

interface StoreCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: StoreType;
  onSuccess: () => void;
}

export const StoreCustomizerModal: React.FC<StoreCustomizerModalProps> = ({
  isOpen,
  onClose,
  store,
  onSuccess,
}) => {
  const [selectedPreset, setSelectedPreset] = useState(store.backgroundTheme || 'rawaq_navy');
  const [customBannerUrl, setCustomBannerUrl] = useState(store.bannerUrl || '');
  const [logoUrl, setLogoUrl] = useState(store.logoUrl || '');
  const [description, setDescription] = useState(store.description || '');
  const [deliveryFee, setDeliveryFee] = useState(store.deliveryFee || 1000);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const currentPresetObj =
    STORE_BACKGROUND_PRESETS.find((p) => p.id === selectedPreset) || STORE_BACKGROUND_PRESETS[0];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateStoreSettings(store.id, {
        backgroundTheme: selectedPreset,
        bannerUrl: customBannerUrl.trim(),
        logoUrl: logoUrl.trim(),
        description: description.trim(),
        deliveryFee: Number(deliveryFee) || 0,
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefault = () => {
    setSelectedPreset('rawaq_navy');
    setCustomBannerUrl('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#101B3D]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-[#F4F7FA]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#DDF7EC] text-[#07875F] flex items-center justify-center">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-[#101B3D] text-base sm:text-lg">خلفية متجري وتخصيص الواجهة</h2>
              <p className="text-xs text-slate-500">متجر: {store.storeName}</p>
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
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6 text-right">
          {/* Live Preview */}
          <div>
            <span className="text-xs font-bold text-slate-700 block mb-2">معاينة مباشرة لواجهة المتجر:</span>
            <div
              className={`relative rounded-3xl overflow-hidden shadow-lg border border-slate-200/50 p-6 min-h-[170px] flex flex-col justify-end bg-gradient-to-r ${currentPresetObj.class}`}
              style={
                customBannerUrl
                  ? {
                      backgroundImage: `linear-gradient(rgba(16,27,61,0.55), rgba(16,27,61,0.85)), url(${customBannerUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }
                  : undefined
              }
            >
              <div className="flex items-center gap-4 text-white">
                <img
                  src={logoUrl || store.logoUrl || 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=200'}
                  alt={store.storeName}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-white/80 shadow-md bg-slate-800"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-lg text-white drop-shadow-sm">{store.storeName}</h3>
                    {store.isVerified && (
                      <span className="bg-[#07875F] text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                        متجر موثّق
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/90 line-clamp-2 max-w-md mt-1 drop-shadow-sm">
                    {description || store.description || 'وصف المتجر ومعلوماته الترويجية...'}
                  </p>
                  <span className="text-[11px] text-[#DDF7EC] font-medium mt-1 inline-block">
                    مدينة {store.city} • رسوم التوصيل: {deliveryFee} ر.ي
                  </span>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            {/* Presets */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">اختر من الخلفيات الجاهزة المتناسقة:</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {STORE_BACKGROUND_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setSelectedPreset(preset.id);
                      setCustomBannerUrl('');
                    }}
                    className={`relative p-3 rounded-2xl border text-right transition flex items-center justify-between overflow-hidden ${
                      selectedPreset === preset.id && !customBannerUrl
                        ? 'border-[#07875F] ring-2 ring-[#07875F]/30 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${preset.class}`}></div>
                      <span className="text-xs font-bold text-slate-800">{preset.name}</span>
                    </div>
                    {selectedPreset === preset.id && !customBannerUrl && (
                      <Check className="w-4 h-4 text-[#07875F]" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Banner URL */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                أو ضع رابط صورة خلفية خاصة بك (Banner):
              </label>
              <div className="relative">
                <ImageIcon className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                <input
                  type="url"
                  value={customBannerUrl}
                  onChange={(e) => setCustomBannerUrl(e.target.value)}
                  placeholder="https://... رابط صورة خلفية عالية الجودة"
                  className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#07875F]"
                />
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[10px] text-slate-500">
                  عند وضع صورة مخصصة، سيتم تطبيق تظليل داكن هادئ لضمان وضوح النصوص.
                </span>
                <button
                  type="button"
                  onClick={handleResetDefault}
                  className="text-[11px] text-[#07875F] font-bold hover:underline flex items-center gap-1"
                >
                  <Undo2 className="w-3 h-3" />
                  <span>العودة للافتراضي</span>
                </button>
              </div>
            </div>

            {/* Logo and Delivery fee */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">شعار أو صورة المحل</label>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://... رابط صورة الشعار"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#07875F]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رسوم التوصيل المعتمدة (ر.ي)</label>
                <input
                  type="number"
                  min="0"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#07875F]"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الوصف العام للمتجر</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="نبذة عن متجرك، وموقعه في بيحان..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#07875F]"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-[#07875F] hover:bg-[#06704F] text-white text-xs font-bold shadow-md shadow-[#07875F]/20 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'جارٍ الحفظ...' : 'حفظ إعدادات الواجهة'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
