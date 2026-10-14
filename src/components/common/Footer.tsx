import React, { useState } from 'react';
import { ShieldCheck, Store, MapPin, Heart } from 'lucide-react';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';

interface FooterProps {
  onOpenStoreModal?: () => void;
  onNavigateCategories?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenStoreModal, onNavigateCategories }) => {
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  return (
    <>
      <footer className="mt-12 bg-white border-t border-slate-200/90 py-8 text-right text-xs text-slate-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#07875F]"></span>
                <span className="font-black text-[#101B3D] text-base font-serif">رواق | Rawaq</span>
              </div>
              <p className="text-slate-500 text-[11px] max-w-md">
                السوق التجاري الإلكتروني الموحد لمدينة بيحان ومحافظة شبوة — يربط المتاجر المعتمدة بالمشترين مباشرة بكل أمان وخصوصية.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
              {onOpenStoreModal && (
                <button
                  onClick={onOpenStoreModal}
                  className="px-3.5 py-2 rounded-xl bg-[#DDF7EC] text-[#056B4B] hover:bg-[#cbf2e2] transition flex items-center gap-1.5"
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>فتح متجر في بيحان</span>
                </button>
              )}

              <button
                onClick={() => setIsPrivacyOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 transition flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#07875F]" />
                <span>سياسة الخصوصية وحذف الحساب</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#07875F]" />
              <span>مخصص حصرياً لمدينة بيحان — شبوة، اليمن</span>
            </div>
            <div>
              <span>جميع الحقوق محفوظة لمنصة رواق © {new Date().getFullYear()}</span>
            </div>
          </div>
        </div>
      </footer>

      {isPrivacyOpen && (
        <PrivacyPolicyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
      )}
    </>
  );
};
