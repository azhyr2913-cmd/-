import {
  GoogleAuthProvider,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
  onAuthStateChanged,
  signInWithPopup,
  signInAnonymously,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from './config';
import { UserProfile, UserRole } from '../types';

export const ADMIN_EMAILS = [
  'azhyr2913@gmail.com',
  'alswdnyahmd281@gmail.com',
  'zhyralswdanyahmdly@gmail.com',
];

export const ADMIN_EMAIL = 'azhyr2913@gmail.com';

export function checkIsAdmin(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  return ADMIN_EMAILS.some((admin) => admin.toLowerCase().trim() === normalized);
}

export interface FriendlyAuthError {
  code: string;
  message: string;
  suggestion?: string;
  isProviderDisabled?: boolean;
  isRegionRestricted?: boolean;
  isEmailAlreadyInUse?: boolean;
}

export function getFriendlyAuthErrorMessage(error: any): FriendlyAuthError {
  const code = error?.code || '';
  const rawMsg = String(error?.message || '');

  // 1. Operation not allowed or SMS region policy restriction
  if (
    code === 'auth/operation-not-allowed' ||
    rawMsg.includes('operation-not-allowed') ||
    rawMsg.includes('SMS unable to be sent until this region enabled')
  ) {
    if (rawMsg.includes('SMS unable to be sent') || rawMsg.includes('region enabled')) {
      return {
        code: 'auth/operation-not-allowed',
        message: 'إرسال رسائل SMS برقم الهاتف مقيد لهذه الدولة/المنطقة في إعدادات Firebase.',
        suggestion: 'يُفضل تسجيل الدخول بنقرة واحدة باستخدام زر Google السريع في الأعلى.',
        isRegionRestricted: true,
      };
    }
    return {
      code: 'auth/operation-not-allowed',
      message: 'طريقة تسجيل الدخول هذه غير مفعلة بعد في لوحة تحكم Firebase (Authentication > Sign-in method).',
      suggestion: 'يمكنك استخدام تسجيل الدخول الفوري عبر Google بنقرة واحدة بدون الحاجة لتفعيلها.',
      isProviderDisabled: true,
    };
  }

  // 2. Email already registered
  if (code === 'auth/email-already-in-use' || rawMsg.includes('email-already-in-use')) {
    return {
      code: 'auth/email-already-in-use',
      message: 'هذا البريد الإلكتروني مسجل مسبقاً في رواق.',
      suggestion: 'تم تحويلك إلى نافذة الدخول؛ يمكنك كتابة كلمة المرور أو المتابعة المباشرة بحساب Google.',
      isEmailAlreadyInUse: true,
    };
  }

  // 3. Credentials mismatch
  if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return {
      code: 'auth/invalid-credential',
      message: 'بيانات تسجيل الدخول أو كلمة المرور غير صحيحة.',
      suggestion: 'إذا أنشأت حسابك مسبقاً عبر Google، يمكنك الضغط على زر Google في الأعلى للدخول فوراً.',
    };
  }

  // 4. User not found
  if (code === 'auth/user-not-found') {
    return {
      code: 'auth/user-not-found',
      message: 'لا يوجد حساب مسجل بهذا البريد الإلكتروني.',
      suggestion: 'اختر "إنشاء حساب جديد" للتسجيل مجاناً خلال ثوانٍ.',
    };
  }

  // 5. Invalid phone number format
  if (code === 'auth/invalid-phone-number') {
    return {
      code: 'auth/invalid-phone-number',
      message: 'رقم الهاتف غير صالح، يرجى كتابة الرمز الدولي الصحيح (مثال لليمن: +967783631364).',
    };
  }

  // 6. Quota exceeded
  if (code === 'auth/quota-exceeded' || rawMsg.includes('quota-exceeded')) {
    return {
      code: 'auth/quota-exceeded',
      message: 'تم تجاوز الحد المسموح به لرسائل التحقق SMS لليوم.',
      suggestion: 'استخدم الدخول الفوري عبر Google أو البريد الإلكتروني.',
    };
  }

  // 7. Invalid code
  if (code === 'auth/invalid-verification-code') {
    return {
      code: 'auth/invalid-verification-code',
      message: 'رمز التحقق SMS المدخل غير صحيح، يرجى مراجعة الرسالة والمحاولة ثانية.',
    };
  }

  // 8. Network issue
  if (code === 'auth/network-request-failed') {
    return {
      code: 'auth/network-request-failed',
      message: 'تعذر الاتصال بخادم Firebase، يرجى التحقق من اتصالك بالإنترنت والمحاولة مجدداً.',
    };
  }

  // 9. Weak password
  if (code === 'auth/weak-password') {
    return {
      code: 'auth/weak-password',
      message: 'كلمة المرور ضعيفة جداً، يرجى إدخال 6 أحرف أو أرقام على الأقل.',
    };
  }

  return {
    code,
    message: rawMsg || 'حدث خطأ أثناء المصادقة، يرجى المحاولة لاحقاً.',
  };
}

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * 1. Google Sign-In
 */
export async function signInWithGoogle(): Promise<UserProfile | null> {
  if (auth.currentUser) {
    return await syncUserProfile(auth.currentUser);
  }

  try {
    const cred = await signInWithPopup(auth, googleProvider);
    const fbUser = cred.user;
    return await syncUserProfile(fbUser);
  } catch (error: any) {
    if (
      error?.code === 'auth/cancelled-popup-request' ||
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/popup-blocked' ||
      error?.message?.includes('cancelled-popup-request') ||
      error?.message?.includes('popup-closed-by-user') ||
      error?.message?.includes('popup-blocked') ||
      error?.message?.includes('INTERNAL ASSERTION FAILED')
    ) {
      return null;
    }
    throw error;
  }
}

/**
 * 2. Email & Password Sign Up
 */
export async function signUpWithEmail(email: string, pass: string, displayName: string): Promise<UserProfile> {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  if (displayName.trim()) {
    try {
      await updateProfile(cred.user, { displayName: displayName.trim() });
    } catch {
      // non-blocking
    }
  }
  return await syncUserProfile(cred.user, displayName.trim());
}

/**
 * 3. Email & Password Sign In
 */
export async function signInWithEmail(email: string, pass: string): Promise<UserProfile> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
  return await syncUserProfile(cred.user);
}

/**
 * 4. Phone Authentication - setup Recaptcha
 */
export function setupRecaptcha(containerId: string): RecaptchaVerifier {
  // Clear any existing verifier if needed
  if ((window as any).recaptchaVerifier) {
    try {
      (window as any).recaptchaVerifier.clear();
    } catch {
      // ignore
    }
  }

  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved
    },
    'expired-callback': () => {
      console.warn('reCAPTCHA expired');
    },
  });

  (window as any).recaptchaVerifier = verifier;
  return verifier;
}

/**
 * 5. Send Phone SMS verification code
 */
export async function sendPhoneVerificationCode(
  phoneNumber: string,
  verifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  return await signInWithPhoneNumber(auth, phoneNumber.trim(), verifier);
}

/**
 * 6. Confirm SMS Code
 */
export async function confirmPhoneCode(
  confirmationResult: ConfirmationResult,
  code: string,
  displayName?: string
): Promise<UserProfile> {
  const cred = await confirmationResult.confirm(code.trim());
  if (displayName && displayName.trim()) {
    try {
      await updateProfile(cred.user, { displayName: displayName.trim() });
    } catch {
      // ignore
    }
  }
  return await syncUserProfile(cred.user, displayName);
}

export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * 7. Anonymous Guest Sign-In
 * Allows visitors to browse, cart, and place orders without forcing registration
 */
export async function signInAsGuest(): Promise<UserProfile> {
  const cred = await signInAnonymously(auth);
  return await syncUserProfile(cred.user, 'زائر بيحان');
}

export async function syncUserProfile(fbUser: FirebaseUser, fallbackName?: string): Promise<UserProfile> {
  const userRef = doc(db, 'users', fbUser.uid);
  const isAdmin = checkIsAdmin(fbUser.email);

  try {
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      const data = snap.data();
      const rawRole = data.role as UserRole;
      const safeRole: UserRole = isAdmin ? 'admin' : (rawRole === 'admin' ? 'buyer' : (rawRole || 'buyer'));
      const profile: UserProfile = {
        userId: fbUser.uid,
        name: data.name || fbUser.displayName || fallbackName || (fbUser.isAnonymous ? 'زائر' : (fbUser.phoneNumber ? `مستخدم ${fbUser.phoneNumber.slice(-4)}` : 'مستخدم رواق')),
        email: fbUser.email || '',
        role: safeRole,
        avatarUrl: data.avatarUrl || fbUser.photoURL || undefined,
        storeId: data.storeId || undefined,
        createdAt: data.createdAt || new Date().toISOString(),
      };
      return profile;
    } else {
      // First time registration
      const newProfile: UserProfile = {
        userId: fbUser.uid,
        name: fbUser.displayName || fallbackName || (fbUser.isAnonymous ? 'زائر' : (fbUser.phoneNumber ? `مستخدم ${fbUser.phoneNumber.slice(-4)}` : 'مستخدم جديد')),
        email: fbUser.email || '',
        role: isAdmin ? 'admin' : 'buyer',
        avatarUrl: fbUser.photoURL || undefined,
        createdAt: new Date().toISOString(),
      };

      try {
        await setDoc(userRef, {
          userId: newProfile.userId,
          name: newProfile.name,
          email: newProfile.email,
          role: newProfile.role,
          avatarUrl: newProfile.avatarUrl || null,
          createdAt: serverTimestamp(),
        });
      } catch (writeErr) {
        console.warn('Could not save user profile to Firestore:', writeErr);
      }

      return newProfile;
    }
  } catch (error) {
    console.warn('Could not read user profile from Firestore, falling back to auth user info:', error);
    return {
      userId: fbUser.uid,
      name: fbUser.displayName || fallbackName || (fbUser.isAnonymous ? 'زائر' : (fbUser.phoneNumber ? `مستخدم ${fbUser.phoneNumber.slice(-4)}` : 'مستخدم رواق')),
      email: fbUser.email || '',
      role: isAdmin ? 'admin' : 'buyer',
      avatarUrl: fbUser.photoURL || undefined,
      createdAt: new Date().toISOString(),
    };
  }
}

export function subscribeToAuth(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}
