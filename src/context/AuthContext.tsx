import React, { createContext, useContext, useEffect, useState } from 'react';
import { ConfirmationResult, User as FirebaseUser } from 'firebase/auth';
import {
  ADMIN_EMAIL,
  checkIsAdmin,
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  setupRecaptcha,
  sendPhoneVerificationCode,
  confirmPhoneCode,
  signOutUser,
  subscribeToAuth,
  syncUserProfile,
  signInAsGuest,
} from '../firebase/auth';
import { Store, StoreApplication, UserProfile } from '../types';
import { getStoreByOwnerId, getUserStoreApplication } from '../services/storeService';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  store: Store | null;
  application: StoreApplication | null;
  loading: boolean;
  isAdmin: boolean;
  isMerchant: boolean;
  isBuyer: boolean;
  authNotice: string | null;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  clearAuthNotice: () => void;
  loginWithGoogle: () => Promise<boolean>;
  loginWithEmail: (email: string, pass: string) => Promise<boolean>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<boolean>;
  startPhoneAuth: (phoneNumber: string, containerId: string) => Promise<ConfirmationResult>;
  completePhoneAuth: (confirmationResult: ConfirmationResult, code: string, name?: string) => Promise<boolean>;
  login: () => Promise<boolean>;
  loginAsGuest: () => Promise<boolean>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [application, setApplication] = useState<StoreApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const isLoggingInRef = React.useRef(false);

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);
  const clearAuthNotice = () => setAuthNotice(null);

  // Security: Admin role is strictly locked to verified authorized developer emails
  const isAdmin = checkIsAdmin(currentUser?.email);

  const isMerchant = !isAdmin && (userProfile?.role === 'merchant' || !!store);
  const isBuyer = !isAdmin && !isMerchant;

  const loadUserData = async (fbUser: FirebaseUser) => {
    try {
      const profile = await syncUserProfile(fbUser);
      setUserProfile(profile);

      // Fetch user's store if any
      const userStore = await getStoreByOwnerId(fbUser.uid);
      setStore(userStore || null);

      // Fetch user's store application if any
      const userApp = await getUserStoreApplication(fbUser.uid);
      setApplication(userApp || null);
    } catch (err) {
      console.error('Error loading user profile:', err);
    }
  };

  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (fbUser) => {
      setCurrentUser(fbUser);
      if (fbUser) {
        await loadUserData(fbUser);
      } else {
        setUserProfile(null);
        setStore(null);
        setApplication(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async (): Promise<boolean> => {
    if (isLoggingInRef.current) return false;
    isLoggingInRef.current = true;
    setLoading(true);
    try {
      const profile = await signInWithGoogle();
      if (profile && profile.userId) {
        setUserProfile(profile);
        setAuthNotice(null);
        const userStore = await getStoreByOwnerId(profile.userId);
        setStore(userStore || null);
        const userApp = await getUserStoreApplication(profile.userId);
        setApplication(userApp || null);
        setIsAuthModalOpen(false);
        return true;
      }
      return false;
    } catch (err: any) {
      console.warn('Google login failed:', err);
      throw err;
    } finally {
      isLoggingInRef.current = false;
      setLoading(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string): Promise<boolean> => {
    setLoading(true);
    try {
      const profile = await signInWithEmail(email, pass);
      if (profile && profile.userId) {
        setUserProfile(profile);
        const userStore = await getStoreByOwnerId(profile.userId);
        setStore(userStore || null);
        const userApp = await getUserStoreApplication(profile.userId);
        setApplication(userApp || null);
        setIsAuthModalOpen(false);
        return true;
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const registerWithEmail = async (email: string, pass: string, name: string): Promise<boolean> => {
    setLoading(true);
    try {
      const profile = await signUpWithEmail(email, pass, name);
      if (profile && profile.userId) {
        setUserProfile(profile);
        setIsAuthModalOpen(false);
        return true;
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const startPhoneAuth = async (phoneNumber: string, containerId: string) => {
    const verifier = setupRecaptcha(containerId);
    return await sendPhoneVerificationCode(phoneNumber, verifier);
  };

  const completePhoneAuth = async (
    confirmationResult: ConfirmationResult,
    code: string,
    name?: string
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const profile = await confirmPhoneCode(confirmationResult, code, name);
      if (profile && profile.userId) {
        setUserProfile(profile);
        const userStore = await getStoreByOwnerId(profile.userId);
        setStore(userStore || null);
        const userApp = await getUserStoreApplication(profile.userId);
        setApplication(userApp || null);
        setIsAuthModalOpen(false);
        return true;
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  // General login method opens modal or starts login
  const login = async (): Promise<boolean> => {
    openAuthModal();
    return true;
  };

  const loginAsGuest = async (): Promise<boolean> => {
    setLoading(true);
    try {
      const profile = await signInAsGuest();
      setUserProfile(profile);
      return true;
    } catch (err) {
      console.warn('Anonymous guest login error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOutUser();
      setUserProfile(null);
      setStore(null);
      setApplication(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (currentUser) {
      await loadUserData(currentUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        store,
        application,
        loading,
        isAdmin,
        isMerchant,
        isBuyer,
        authNotice,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        clearAuthNotice,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        startPhoneAuth,
        completePhoneAuth,
        login,
        loginAsGuest,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
