import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import { AppSetting, Category } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_DEVELOPER_PHONE, YEMEN_CITIES } from '../constants/defaultData';

const SETTINGS_COLLECTION = 'settings';
const CATEGORIES_COLLECTION = 'categories';
const APP_CONFIG_DOC_ID = 'app_config';

export interface AdminMetrics {
  totalUsers: number;
  verifiedStores: number;
  pendingStoreApplications: number;
  suspendedStores: number;
  totalProducts: number;
  totalOrders: number;
  completedOrders: number;
  totalCompletedRevenue: number;
  totalChats: number;
}

/**
 * Fetch real aggregate statistics for the Developer Dashboard
 */
export async function getAdminMetrics(): Promise<AdminMetrics> {
  try {
    const [usersSnap, storesSnap, appsSnap, prodsSnap, ordersSnap, chatsSnap] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'stores')),
      getDocs(collection(db, 'store_applications')),
      getDocs(collection(db, 'products')),
      getDocs(collection(db, 'orders')),
      getDocs(collection(db, 'chats')),
    ]);

    const totalUsers = usersSnap.size;

    let verifiedStores = 0;
    let suspendedStores = 0;
    storesSnap.docs.forEach((d) => {
      const data = d.data();
      if (data.isVerified && data.status === 'active') verifiedStores++;
      if (data.status === 'suspended') suspendedStores++;
    });

    let pendingStoreApplications = 0;
    appsSnap.docs.forEach((d) => {
      if (d.data().status === 'pending') pendingStoreApplications++;
    });

    const totalProducts = prodsSnap.size;
    const totalOrders = ordersSnap.size;

    let completedOrders = 0;
    let totalCompletedRevenue = 0;
    ordersSnap.docs.forEach((d) => {
      const data = d.data();
      if (data.status === 'completed') {
        completedOrders++;
        totalCompletedRevenue += Number(data.total) || 0;
      }
    });

    const totalChats = chatsSnap.size;

    return {
      totalUsers,
      verifiedStores,
      pendingStoreApplications,
      suspendedStores,
      totalProducts,
      totalOrders,
      completedOrders,
      totalCompletedRevenue,
      totalChats,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'admin_metrics');
  }
}

/**
 * Get application settings (Developer WhatsApp number, etc.)
 */
export async function getAppSettings(): Promise<AppSetting> {
  const defaultConfig: AppSetting = {
    id: APP_CONFIG_DOC_ID,
    developerWhatsapp: DEFAULT_DEVELOPER_PHONE,
    supportedCities: YEMEN_CITIES,
    announcement: 'أهلاً بكم في منصة رواق - سوق بيحان وشبوة واليمن الإلكتروني.',
    maintenanceMode: false,
  };

  const configRef = doc(db, SETTINGS_COLLECTION, APP_CONFIG_DOC_ID);
  try {
    const snap = await getDoc(configRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        id: snap.id,
        developerWhatsapp: data.developerWhatsapp || DEFAULT_DEVELOPER_PHONE,
        supportedCities: data.supportedCities || YEMEN_CITIES,
        announcement: data.announcement || '',
        maintenanceMode: !!data.maintenanceMode,
        updatedBy: data.updatedBy || '',
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : undefined,
      };
    }
    return defaultConfig;
  } catch (error) {
    console.warn('Could not fetch remote app settings, using defaults:', error);
    return defaultConfig;
  }
}

/**
 * Update app settings (Developer WhatsApp, announcement)
 */
export async function updateAppSettings(
  updates: Partial<Pick<AppSetting, 'developerWhatsapp' | 'supportedCities' | 'announcement' | 'maintenanceMode'>>,
  adminUid: string
): Promise<void> {
  const configRef = doc(db, SETTINGS_COLLECTION, APP_CONFIG_DOC_ID);
  try {
    await updateDoc(configRef, {
      ...updates,
      updatedBy: adminUid,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${SETTINGS_COLLECTION}/${APP_CONFIG_DOC_ID}`);
  }
}

/**
 * Fetch marketplace categories
 */
export async function getCategories(): Promise<Category[]> {
  try {
    const snap = await getDocs(collection(db, CATEGORIES_COLLECTION));
    if (snap.empty) {
      return DEFAULT_CATEGORIES;
    }

    return snap.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name || '',
          slug: data.slug || d.id,
          icon: data.icon || 'Package',
          sortOrder: Number(data.sortOrder) || 1,
          isActive: data.isActive !== false,
          description: data.description || '',
        };
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);
  } catch (error) {
    console.warn('Could not fetch categories from Firestore, using default categories:', error);
    return DEFAULT_CATEGORIES;
  }
}

/**
 * Seed initial categories if none exist
 */
async function seedDefaultCategories() {
  for (const cat of DEFAULT_CATEGORIES) {
    try {
      await setDoc(doc(db, CATEGORIES_COLLECTION, cat.id), {
        categoryId: cat.id,
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        sortOrder: cat.sortOrder,
        isActive: cat.isActive,
        description: cat.description,
        createdAt: serverTimestamp(),
      });
    } catch {
      // Continue seeding others
    }
  }
}

/**
 * Add or update category (Admin)
 */
export async function saveCategory(category: Category): Promise<void> {
  const catRef = doc(db, CATEGORIES_COLLECTION, category.id);
  try {
    await setDoc(
      catRef,
      {
        categoryId: category.id,
        name: category.name.trim(),
        slug: category.slug.trim(),
        icon: category.icon || 'Package',
        sortOrder: Number(category.sortOrder) || 1,
        isActive: category.isActive,
        description: category.description?.trim() || '',
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${CATEGORIES_COLLECTION}/${category.id}`);
  }
}

/**
 * Delete category (Admin)
 */
export async function deleteCategory(categoryId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, CATEGORIES_COLLECTION, categoryId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${CATEGORIES_COLLECTION}/${categoryId}`);
  }
}
