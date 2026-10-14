import React, { useState } from 'react';
import { X, Clock, Save } from 'lucide-react';
import { Store as StoreType } from '../../types';
import { updateStoreSettings } from '../../services/storeService';

interface WorkingHoursModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: StoreType;
  onSuccess: () => void;
}

export const WorkingHoursModal: React.FC<WorkingHoursModalProps> = ({
  isOpen,
  onClose,
  store,
  onSuccess,
}) => {
  const [isOpenManual, setIsOpenManual] = useState(store.isOpen !== false);
  const [openTime, setOpenTime] = useState('08:00');
  const [closeTime, setCloseTime] = useState('22:00');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const hoursText = `${openTime} - ${closeTime}`;
      await updateStoreSettings(store.id, {
        isOpen: isOpenManual,
        businessHours: hoursText,
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#101B3D]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-[#F4F7FA]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#DDF7EC] text-[#07875F] flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-[#101B3D] text-base sm:text-lg">ساعات العمل وحالة النشاط</h2>
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
        <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-5 text-right">
          {/* Open Status Toggle */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-slate-800">حالة المتجر الحالية</h4>
              <p className="text-[11px] text-slate-500">
                {isOpenManual ? 'يظهر المتجر للمشترين بعلامة «مفتوح الآن»' : 'يظهر المتجر بعلامة «مغلق الآن»'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpenManual(!isOpenManual)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition shadow-xs ${
                isOpenManual
                  ? 'bg-[#07875F] text-white'
                  : 'bg-slate-300 text-slate-700'
              }`}
            >
              {isOpenManual ? 'مفتوح الآن' : 'مغلق مؤقتاً'}
            </button>
          </div>

          {/* Time Picker */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">وقت الفتح اليومي</label>
              <input
                type="time"
                value={openTime}
                onChange={(e) => setOpenTime(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#07875F] bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">وقت الإغلاق اليومي</label>
              <input
                type="time"
                value={closeTime}
                onChange={(e) => setCloseTime(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#07875F] bg-white"
              />
            </div>
          </div>

          <div className="p-3 bg-[#DDF7EC] text-[#056B4B] rounded-xl text-[11px] leading-relaxed border border-[#C0F0DD]">
            أيام العمل الاعتيادية في بيحان: من السبت إلى الخميس (مع عطلة الجمعة أو بحسب رغبتك). يتم عرض المواعيد بوضوح في صفحة المتجر العامة.
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
              <span>{isSaving ? 'جارٍ الحفظ...' : 'حفظ المواعيد'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
