import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  Phone,
  User,
  AlertCircle,
  Loader2,
  CheckCircle,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ConfirmationResult } from 'firebase/auth';
import { getFriendlyAuthErrorMessage } from '../../firebase/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthTab = 'email' | 'phone';
type EmailMode = 'login' | 'register';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const {
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    startPhoneAuth,
    completePhoneAuth,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<AuthTab>('email');
  const [emailMode, setEmailMode] = useState<EmailMode>('login');

  // Email form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  // Phone form state
  const [phone, setPhone] = useState('+967');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [phoneUserName, setPhoneUserName] = useState('');
  const [codeSent, setCodeSent] = useState(false);

  // Status state
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorSuggestion, setErrorSuggestion] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetState = () => {
    setErrorMessage(null);
    setErrorSuggestion(null);
    setSuccessMessage(null);
    setLoading(false);
    setCodeSent(false);
    setConfirmationResult(null);
    setVerificationCode('');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setErrorSuggestion(null);
    setLoading(true);
    try {
      const ok = await loginWithGoogle();
      if (ok) {
        handleClose();
      }
    } catch (err: any) {
      console.warn('Google sign-in error:', err);
      const friendly = getFriendlyAuthErrorMessage(err);
      setErrorMessage(friendly.message);
      setErrorSuggestion(friendly.suggestion || null);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setErrorSuggestion(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('كلمة المرور يجب أن تتكون من 6 خانات على الأقل');
      return;
    }
    if (emailMode === 'register' && !displayName.trim()) {
      setErrorMessage('يرجى إدخال اسمك أو اسم متجرك');
      return;
    }

    setLoading(true);
    try {
      if (emailMode === 'login') {
        const ok = await loginWithEmail(email.trim(), password);
        if (ok) handleClose();
      } else {
        const ok = await registerWithEmail(email.trim(), password, displayName.trim());
        if (ok) handleClose();
      }
    } catch (err: any) {
      console.warn('Email auth error:', err);
      const friendly = getFriendlyAuthErrorMessage(err);

      // Graceful Auto-Recovery for existing accounts
      if (err.code === 'auth/email-already-in-use') {
        setEmailMode('login');
        try {
          const autoLoginOk = await loginWithEmail(email.trim(), password);
          if (autoLoginOk) {
            handleClose();
            return;
          }
        } catch {
          // If login with current password doesn't match
          setErrorMessage('هذا الحساب مسجل مسبقاً في رواق! تم تحويلك لشاشة الدخول.');
          setErrorSuggestion('أدخل كلمة المرور الصحيحة أو اضغط على تسجيل الدخول السريع عبر Google في الأعلى.');
          return;
        }
      }

      setErrorMessage(friendly.message);
      setErrorSuggestion(friendly.suggestion || null);
    } finally {
      setLoading(false);
    }
  };

  const handleSendPhoneCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setErrorSuggestion(null);

    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone === '+967') {
      setErrorMessage('يرجى كتابة رقم الهاتف مع الرمز الدولي (مثال: +967783631364)');
      return;
    }

    setLoading(true);
    try {
      const confirmation = await startPhoneAuth(cleanPhone, 'recaptcha-container');
      setConfirmationResult(confirmation);
      setCodeSent(true);
      setSuccessMessage('تم إرسال رمز التحقق عبر الرسائل القصيرة SMS');
    } catch (err: any) {
      console.warn('Phone SMS verification error:', err);
      const friendly = getFriendlyAuthErrorMessage(err);
      setErrorMessage(friendly.message);
      setErrorSuggestion(friendly.suggestion || null);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPhoneCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult || !verificationCode.trim()) {
      setErrorMessage('يرجى إدخال رمز التحقق');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setErrorSuggestion(null);
    try {
      const ok = await completePhoneAuth(confirmationResult, verificationCode, phoneUserName.trim());
      if (ok) handleClose();
    } catch (err: any) {
      console.warn('Confirm phone code error:', err);
      const friendly = getFriendlyAuthErrorMessage(err);
      setErrorMessage(friendly.message);
      setErrorSuggestion(friendly.suggestion || null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      {/* Invisible reCAPTCHA container always mounted */}
      <div id="recaptcha-container"></div>

      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#101B3D] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#07875F] flex items-center justify-center text-white font-black text-lg shadow-sm">
              ر
            </div>
            <div>
              <h3 className="font-extrabold text-base">تسجيل الدخول إلى رواق</h3>
              <p className="text-[11px] text-slate-300">سوق بيحان وشبوة للتجارة المباشرة</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Prominent Recommended 1-Click Google Sign-In */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-[#DDF7EC]/40 border border-slate-200/80 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#101B3D] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#07875F]" />
                تسجيل الدخول السريع
              </span>
              <span className="text-[10px] bg-[#DDF7EC] text-[#07875F] px-2 py-0.5 rounded-full font-extrabold">
                موصى به • فوري
              </span>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3 px-4 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200 hover:border-[#07875F] rounded-2xl text-xs font-black shadow-xs flex items-center justify-center gap-2.5 transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#07875F]" />
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>المتابعة بنقرة واحدة عبر حساب Google</span>
                </>
              )}
            </button>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="shrink-0 mx-3 text-[10px] font-bold text-slate-400">
              أو استخدم الطرق الأخرى
            </span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Sub Tabs: Email vs Phone */}
          <div className="grid grid-cols-2 bg-slate-100 p-1 gap-1 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setActiveTab('email');
                setErrorMessage(null);
                setErrorSuggestion(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition ${
                activeTab === 'email'
                  ? 'bg-white text-[#101B3D] shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Mail className="w-3.5 h-3.5 text-[#07875F]" />
              <span>البريد الإلكتروني</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('phone');
                setErrorMessage(null);
                setErrorSuggestion(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition ${
                activeTab === 'phone'
                  ? 'bg-white text-[#101B3D] shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Phone className="w-3.5 h-3.5 text-[#07875F]" />
              <span>رقم الهاتف (SMS)</span>
            </button>
          </div>

          {/* Alerts / Error Handling */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">{errorMessage}</p>
                  {errorSuggestion && (
                    <p className="text-[11px] text-red-700 leading-relaxed font-normal">
                      {errorSuggestion}
                    </p>
                  )}
                </div>
              </div>

              {/* Direct 1-Click Fallback Button in Error Box */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-2 px-3 bg-white hover:bg-slate-50 text-slate-800 border border-red-200 rounded-xl text-[11px] font-black flex items-center justify-center gap-2 transition"
              >
                <span>دخول فوري بحساب Google الآن</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#07875F]" />
              </button>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-2xl bg-[#DDF7EC] border border-[#C0F0DD] text-[#056B4B] text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-[#07875F]" />
              <span className="font-bold">{successMessage}</span>
            </div>
          )}

          {/* TAB 1: EMAIL & PASSWORD */}
          {activeTab === 'email' && (
            <div className="space-y-3.5">
              <div className="flex border-b border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setEmailMode('login');
                    setErrorMessage(null);
                    setErrorSuggestion(null);
                  }}
                  className={`pb-2 px-4 transition ${
                    emailMode === 'login'
                      ? 'border-b-2 border-[#07875F] text-[#07875F]'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  تسجيل الدخول
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmailMode('register');
                    setErrorMessage(null);
                    setErrorSuggestion(null);
                  }}
                  className={`pb-2 px-4 transition ${
                    emailMode === 'register'
                      ? 'border-b-2 border-[#07875F] text-[#07875F]'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  إنشاء حساب جديد
                </button>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-3">
                {emailMode === 'register' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الكامل</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="اسمك أو اسم المتجر"
                        required
                        className="w-full pr-10 pl-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#07875F] focus:outline-hidden"
                      />
                      <User className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="azhyr2913@gmail.com"
                      required
                      dir="ltr"
                      className="w-full pr-10 pl-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-left focus:ring-2 focus:ring-[#07875F] focus:outline-hidden font-mono"
                    />
                    <Mail className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور</label>
                  <div className="relative">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      dir="ltr"
                      className="w-full pr-10 pl-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-left focus:ring-2 focus:ring-[#07875F] focus:outline-hidden"
                    />
                    <Lock className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 bg-[#07875F] hover:bg-[#06704F] text-white rounded-xl text-xs font-bold shadow-md shadow-[#07875F]/20 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : emailMode === 'login' ? (
                    <>
                      <span>دخول</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span>إنشاء الحساب والبدء</span>
                      <CheckCircle className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: PHONE (SMS) */}
          {activeTab === 'phone' && (
            <div className="space-y-3.5">
              {!codeSent ? (
                <form onSubmit={handleSendPhoneCode} className="space-y-3.5">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    أدخل رقم هاتفك مع الرمز الدولي لتلقي رمز التحقق عبر رسالة SMS.
                  </p>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف الدولي</label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+967783631364"
                        required
                        dir="ltr"
                        className="w-full pr-10 pl-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-left focus:ring-2 focus:ring-[#07875F] focus:outline-hidden font-mono"
                      />
                      <Phone className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      مثال لليمن: +967783631364
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-[#07875F] hover:bg-[#06704F] text-white rounded-xl text-xs font-bold shadow-md shadow-[#07875F]/20 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>إرسال رمز التحقق SMS</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleConfirmPhoneCode} className="space-y-3.5">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 flex items-center justify-between">
                    <span>
                      الرقم: <strong dir="ltr">{phone}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setCodeSent(false)}
                      className="text-[#07875F] font-bold hover:underline"
                    >
                      تغيير الرقم
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">اسمك (اختياري)</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={phoneUserName}
                        onChange={(e) => setPhoneUserName(e.target.value)}
                        placeholder="اسم المستخدم أو المتجر"
                        className="w-full pr-10 pl-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#07875F] focus:outline-hidden"
                      />
                      <User className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">رمز التحقق (6 أرقام)</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        placeholder="123456"
                        required
                        dir="ltr"
                        className="w-full pr-10 pl-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs tracking-widest text-center focus:ring-2 focus:ring-[#07875F] focus:outline-hidden font-mono"
                      />
                      <ShieldCheck className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-[#07875F] hover:bg-[#06704F] text-white rounded-xl text-xs font-bold shadow-md shadow-[#07875F]/20 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>تأكيد والدخول</span>
                        <CheckCircle className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 text-center shrink-0">
          <p className="text-[11px] text-slate-500">
            بياناتك مشفرة ومحمية بقواعد أمان Firebase السحابية في رواق بيحان.
          </p>
        </div>
      </div>
    </div>
  );
};
