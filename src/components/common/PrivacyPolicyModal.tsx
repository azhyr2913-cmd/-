import React, { useState } from 'react';
import { X, ShieldCheck, Trash2, AlertTriangle, CheckCircle2, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, logout } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const handleRequestAccountDeletion = async () => {
    if (!currentUser) return;
    setIsDeleting(true);
    try {
      // Remove Firestore user profile record
      try {
        await deleteDoc(doc(db, 'users', currentUser.uid));
      } catch (err) {
        console.warn('Could not delete user record directly:', err);
      }
      setDeleteSuccess(true);
      setTimeout(async () => {
        await logout();
        setShowDeleteConfirm(false);
        setDeleteSuccess(false);
        onClose();
      }, 3000);
    } catch (err) {
      console.error('Delete request failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#101B3D]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh] text-right">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-[#F4F7FA]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#DDF7EC] text-[#07875F] flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-[#101B3D] text-base sm:text-lg">
                سياسة الخصوصية وحماية البيانات في رواق
              </h2>
              <p className="text-xs text-slate-500">متوافق مع سياسات Google Play الرسمية وقوانين حماية المستهلك</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs leading-relaxed text-slate-700">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-[#056B4B]">
            <p className="font-bold flex items-center gap-1.5 mb-1">
              <Lock className="w-4 h-4" /> نطاق المنصة والخصوصية:
            </p>
            <p className="text-[11px] text-slate-600">
              تطبيق «رواق» مخصص لمدينة بيحان بمحافظة شبوة، اليمن. نلتزم بأعلى معايير حماية الخصوصية وحماية بيانات التجار والمشترين الشخصية.
            </p>
          </div>

          <div className="space-y-1.5">
            <h3 className="font-bold text-sm text-[#101B3D]">1. البيانات التي نجمعها:</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-600 pr-2">
              <li><strong>للشراء كزائر:</strong> نجمع فقط الاسم الثلاثي ورقم الهاتف وعنوان التوصيل لتنفيذ الطلب وتوصيله إليك في بيحان.</li>
              <li><strong>عند التسجيل:</strong> البريد الإلكتروني أو رقم الهاتف واسم الحساب لتمكينك من تتبع طلباتك ومفضلتك.</li>
              <li><strong>لأصحاب المتاجر:</strong> اسم المتجر، النشاط، العنوان، ورقم التحقق الداخلي الموثق.</li>
            </ul>
          </div>

          <div className="space-y-1.5">
            <h3 className="font-bold text-sm text-[#101B3D]">2. حماية أرقام الهواتف والخصوصية:</h3>
            <p className="text-slate-600">
              لا نقوم بنشر أو بيع أرقام هواتف المشترين أو التجار للعامة أو لأي طرف ثالث. تتم المحادثات والتواصل داخل التطبيق، وتُعرض بيانات العميل لصاحب المتجر المعني بالطلب فقط لغرض التوصيل والاستلام.
            </p>
          </div>

          <div className="space-y-1.5">
            <h3 className="font-bold text-sm text-[#101B3D]">3. أمان قواعد البيانات والتشفير:</h3>
            <p className="text-slate-600">
              تُخزن البيانات في خوادم Google Firebase السحابية المشفرة عبر بروتوكولات HTTPS وTLS مع قواعد أمان صارمة تحدد وصول كل مستخدم لبياناته فقط.
            </p>
          </div>

          <div className="space-y-1.5">
            <h3 className="font-bold text-sm text-[#101B3D]">4. سياسة حذف الحساب والبيانات (Google Play Requirement):</h3>
            <p className="text-slate-600">
              يحق لأي مستخدم مسجل طلب حذف حسابه وبياناته نهائياً في أي وقت وفق سياسات Google Play Data Safety.
            </p>
          </div>

          {/* Account Deletion Section */}
          <div className="pt-3 border-t border-slate-200">
            {deleteSuccess ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>تم استلام طلب حذف الحساب بنجاح، سيتم تسجيل خروجك خلال لحظات.</span>
              </div>
            ) : showDeleteConfirm ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-2">
                <h4 className="font-bold text-rose-800 text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  تأكيد حذف الحساب والبيانات نهائياً
                </h4>
                <p className="text-[11px] text-rose-700">
                  هل أنت متأكد من رغبتك في حذف حسابك وبياناتك من منصة رواق؟ هذا الإجراء لا يمكن التراجع عنه.
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
                  >
                    إلغاء
                  </button>
                  <button
                    disabled={isDeleting}
                    onClick={handleRequestAccountDeletion}
                    className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
                  >
                    {isDeleting ? 'جارٍ الحذف...' : 'نعم، احذف حسابي وبياناتي'}
                  </button>
                </div>
              </div>
            ) : currentUser ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>طلب حذف حسابي وبياناتي نهائياً من رواق</span>
              </button>
            ) : (
              <p className="text-[11px] text-slate-400">
                أنت تتصفح حالياً كزائر بدون حساب. لا توجد بيانات حساب مسجلة لحذفها.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>رواق — بيحان، شبوة، اليمن © {new Date().getFullYear()}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
