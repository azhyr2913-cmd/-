import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import { ApplicationStatus, Follow, Store, StoreApplication } from '../types';

const STORES_COLLECTION = 'stores';
const APPLICATIONS_COLLECTION = 'store_applications';
const FOLLOWS_COLLECTION = 'follows';

/**
 * Submit an application to open a store in Rawaq
 */
export async function submitStoreApplication(data: {
  ownerId: string;
  fullName: string;
  phone: string;
  storeName: string;
  storefrontImageUrl?: string;
  productTypes: string;
  city: string;
  description: string;
}): Promise<string> {
  const appId = `app_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const appRef = doc(db, APPLICATIONS_COLLECTION, appId);

  if (!data.city || !data.city.includes('بيحان')) {
    throw new Error('تطبيق رواق مخصص حصرياً لمتاجر مدينة بيحان ومناطقها التابعة.');
  }

  try {
    await setDoc(appRef, {
      applicationId: appId,
      ownerId: data.ownerId,
      fullName: data.fullName.trim(),
      phone: data.phone.trim(),
      storeName: data.storeName.trim(),
      storefrontImageUrl: data.storefrontImageUrl || '',
      productTypes: data.productTypes.trim(),
      city: data.city,
      description: data.description.trim(),
      status: 'pending' as ApplicationStatus,
      createdAt: serverTimestamp(),
    });
    return appId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, APPLICATIONS_COLLECTION);
  }
}

/**
 * Fetch application for a specific user
 */
export async function getUserStoreApplication(userId: string): Promise<StoreApplication | null> {
  try {
    const q = query(collection(db, APPLICATIONS_COLLECTION), where('ownerId', '==', userId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const docData = snapshot.docs[0].data();
    return {
      id: snapshot.docs[0].id,
      ownerId: docData.ownerId,
      fullName: docData.fullName,
      phone: docData.phone,
      storeName: docData.storeName,
      storefrontImageUrl: docData.storefrontImageUrl,
      productTypes: docData.productTypes,
      city: docData.city,
      description: docData.description,
      status: docData.status,
      rejectionReason: docData.rejectionReason,
      createdAt: docData.createdAt?.toDate ? docData.createdAt.toDate().toISOString() : new Date().toISOString(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, APPLICATIONS_COLLECTION);
  }
}

/**
 * Fetch all store applications (for Developer / Admin)
 */
export async function getAllStoreApplications(): Promise<StoreApplication[]> {
  try {
    const snapshot = await getDocs(collection(db, APPLICATIONS_COLLECTION));
    return snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ownerId: data.ownerId,
        fullName: data.fullName,
        phone: data.phone,
        storeName: data.storeName,
        storefrontImageUrl: data.storefrontImageUrl,
        productTypes: data.productTypes,
        city: data.city,
        description: data.description,
        status: data.status,
        rejectionReason: data.rejectionReason,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, APPLICATIONS_COLLECTION);
  }
}

/**
 * Admin action: Approve store application
 */
export async function approveStoreApplication(app: StoreApplication): Promise<void> {
  const appRef = doc(db, APPLICATIONS_COLLECTION, app.id);
  const storeId = `store_${app.ownerId}`;
  const storeRef = doc(db, STORES_COLLECTION, storeId);
  const userRef = doc(db, 'users', app.ownerId);

  try {
    // 1. Mark application as approved
    await updateDoc(appRef, {
      status: 'approved',
      reviewedAt: serverTimestamp(),
    });

    // 2. Create the public Store document
    // NOTE: Personal phone number is intentionally omitted to protect privacy!
    await setDoc(
      storeRef,
      {
        storeId,
        ownerId: app.ownerId,
        storeName: app.storeName,
        description: app.description,
        logoUrl: app.storefrontImageUrl || '',
        bannerUrl: '',
        backgroundTheme: 'rawaq_navy',
        productTypes: app.productTypes,
        city: app.city,
        isVerified: true,
        status: 'active',
        isOpen: true,
        businessHours: '8:00 ص - 10:00 م',
        deliveryFee: 1000, // Standard local delivery fee in Yemeni Rial
        followersCount: 0,
        productsCount: 0,
        ordersCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // 3. Update user profile to merchant
    await updateDoc(userRef, {
      role: 'merchant',
      storeId,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${APPLICATIONS_COLLECTION}/${app.id}`);
  }
}

/**
 * Admin action: Reject store application
 */
export async function rejectStoreApplication(appId: string, reason: string): Promise<void> {
  const appRef = doc(db, APPLICATIONS_COLLECTION, appId);
  try {
    await updateDoc(appRef, {
      status: 'rejected',
      rejectionReason: reason.trim(),
      reviewedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${APPLICATIONS_COLLECTION}/${appId}`);
  }
}

/**
 * Admin action: Suspend or reactivate store
 */
export async function setStoreStatus(storeId: string, status: 'active' | 'suspended'): Promise<void> {
  const storeRef = doc(db, STORES_COLLECTION, storeId);
  try {
    await updateDoc(storeRef, {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${STORES_COLLECTION}/${storeId}`);
  }
}

/**
 * Fetch single store by ID (PUBLIC - without any private personal phone number)
 */
export async function getStoreById(storeId: string): Promise<Store | null> {
  try {
    const snap = await getDoc(doc(db, STORES_COLLECTION, storeId));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      id: snap.id,
      ownerId: data.ownerId,
      storeName: data.storeName,
      description: data.description || '',
      logoUrl: data.logoUrl || '',
      bannerUrl: data.bannerUrl || '',
      backgroundTheme: data.backgroundTheme || 'shabwah_gold',
      productTypes: data.productTypes || '',
      city: data.city || 'بيحان - شبوة',
      isVerified: !!data.isVerified,
      status: data.status || 'active',
      isOpen: data.isOpen !== false,
      businessHours: data.businessHours || '8:00 ص - 10:00 م',
      deliveryFee: data.deliveryFee || 0,
      followersCount: data.followersCount || 0,
      productsCount: data.productsCount || 0,
      ordersCount: data.ordersCount || 0,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${STORES_COLLECTION}/${storeId}`);
  }
}

/**
 * Fetch store by owner ID
 */
export async function getStoreByOwnerId(ownerId: string): Promise<Store | null> {
  try {
    const q = query(collection(db, STORES_COLLECTION), where('ownerId', '==', ownerId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const docSnap = snapshot.docs[0];
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ownerId: data.ownerId,
      storeName: data.storeName,
      description: data.description || '',
      logoUrl: data.logoUrl || '',
      bannerUrl: data.bannerUrl || '',
      backgroundTheme: data.backgroundTheme || 'shabwah_gold',
      productTypes: data.productTypes || '',
      city: data.city || 'بيحان - شبوة',
      isVerified: !!data.isVerified,
      status: data.status || 'active',
      isOpen: data.isOpen !== false,
      businessHours: data.businessHours || '8:00 ص - 10:00 م',
      deliveryFee: data.deliveryFee || 0,
      followersCount: data.followersCount || 0,
      productsCount: data.productsCount || 0,
      ordersCount: data.ordersCount || 0,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, STORES_COLLECTION);
  }
}

/**
 * Fetch all active stores (public)
 */
export async function getActiveStores(): Promise<Store[]> {
  try {
    const snapshot = await getDocs(collection(db, STORES_COLLECTION));
    return snapshot.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ownerId: data.ownerId,
          storeName: data.storeName,
          description: data.description || '',
          logoUrl: data.logoUrl || '',
          bannerUrl: data.bannerUrl || '',
          backgroundTheme: data.backgroundTheme || 'shabwah_gold',
          productTypes: data.productTypes || '',
          city: data.city || 'بيحان - شبوة',
          isVerified: !!data.isVerified,
          status: data.status || 'active',
          isOpen: data.isOpen !== false,
          businessHours: data.businessHours || '8:00 ص - 10:00 م',
          deliveryFee: data.deliveryFee || 0,
          followersCount: data.followersCount || 0,
          productsCount: data.productsCount || 0,
          ordersCount: data.ordersCount || 0,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        };
      })
      .filter((s) => s.status === 'active');
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, STORES_COLLECTION);
  }
}

/**
 * Update store presentation (custom background, logo, banner, working hours)
 */
export async function updateStoreSettings(
  storeId: string,
  updates: Partial<Pick<Store, 'storeName' | 'description' | 'logoUrl' | 'bannerUrl' | 'backgroundTheme' | 'businessHours' | 'deliveryFee' | 'isOpen'>>
): Promise<void> {
  const storeRef = doc(db, STORES_COLLECTION, storeId);
  try {
    await updateDoc(storeRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${STORES_COLLECTION}/${storeId}`);
  }
}

/**
 * Follow or unfollow a store
 */
export async function toggleStoreFollow(userId: string, storeId: string): Promise<boolean> {
  const followId = `follow_${userId}_${storeId}`;
  const followRef = doc(db, FOLLOWS_COLLECTION, followId);
  const storeRef = doc(db, STORES_COLLECTION, storeId);

  try {
    const snap = await getDoc(followRef);
    if (snap.exists()) {
      await deleteDoc(followRef);
      // decrement count
      const storeSnap = await getDoc(storeRef);
      if (storeSnap.exists()) {
        const count = Math.max(0, (storeSnap.data().followersCount || 1) - 1);
        await updateDoc(storeRef, { followersCount: count });
      }
      return false;
    } else {
      await setDoc(followRef, {
        followId,
        userId,
        storeId,
        createdAt: serverTimestamp(),
      });
      const storeSnap = await getDoc(storeRef);
      if (storeSnap.exists()) {
        const count = (storeSnap.data().followersCount || 0) + 1;
        await updateDoc(storeRef, { followersCount: count });
      }
      return true;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, FOLLOWS_COLLECTION);
  }
}

/**
 * Check if user follows store
 */
export async function checkIfUserFollows(userId: string, storeId: string): Promise<boolean> {
  try {
    const followId = `follow_${userId}_${storeId}`;
    const snap = await getDoc(doc(db, FOLLOWS_COLLECTION, followId));
    return snap.exists();
  } catch {
    return false;
  }
}
