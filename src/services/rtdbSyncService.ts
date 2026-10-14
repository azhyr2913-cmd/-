import { ref, set, get } from 'firebase/database';
import { rtdb } from '../firebase/config';
import { Product, Store, Category } from '../types';

export interface RtdbSyncStatus {
  connected: boolean;
  lastSyncTime: string | null;
  rtdbUrl: string;
  error?: string;
}

const RTDB_URL = 'https://gen-lang-client-0811131917-default-rtdb.firebaseio.com/';

/**
 * Safely tests and updates app info in Firebase Realtime Database
 */
export async function syncAppMetadataToRtdb(
  stats?: { storesCount?: number; productsCount?: number; categoriesCount?: number }
): Promise<boolean> {
  if (!rtdb) return false;

  try {
    const metaRef = ref(rtdb, 'rawaq_system/status');
    await set(metaRef, {
      appName: 'رواق بيحان وشبوة',
      status: 'active_and_connected',
      database: 'Firebase Realtime Database + Firestore',
      rtdbUrl: RTDB_URL,
      lastUpdated: new Date().toISOString(),
      stats: {
        stores: stats?.storesCount ?? 0,
        products: stats?.productsCount ?? 0,
        categories: stats?.categoriesCount ?? 0,
      },
    });
    return true;
  } catch (err: any) {
    // If RTDB rules are currently locked (.read: false / .write: false) in Firebase console
    if (err?.code === 'PERMISSION_DENIED' || err?.message?.includes('Permission denied')) {
      console.warn('Firebase Realtime Database write permission notice: Rules in Firebase Console require update.');
    } else {
      console.warn('RTDB sync notice:', err?.message || err);
    }
    return false;
  }
}

/**
 * Syncs categories list to RTDB for immediate visibility
 */
export async function syncCategoriesToRtdb(categories: Category[]): Promise<boolean> {
  if (!rtdb || !categories.length) return false;
  try {
    const catRef = ref(rtdb, 'rawaq_data/categories');
    const simpleList = categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      icon: c.icon,
    }));
    await set(catRef, simpleList);
    return true;
  } catch {
    return false;
  }
}

/**
 * Syncs featured stores to RTDB
 */
export async function syncStoresToRtdb(stores: Store[]): Promise<boolean> {
  if (!rtdb || !stores.length) return false;
  try {
    const storesRef = ref(rtdb, 'rawaq_data/stores');
    const simpleList = stores.slice(0, 20).map((s) => ({
      id: s.id,
      storeName: s.storeName,
      productTypes: s.productTypes,
      city: s.city,
      isVerified: s.isVerified,
      isOpen: s.isOpen,
    }));
    await set(storesRef, simpleList);
    return true;
  } catch {
    return false;
  }
}

/**
 * Syncs active products to RTDB
 */
export async function syncProductsToRtdb(products: Product[]): Promise<boolean> {
  if (!rtdb || !products.length) return false;
  try {
    const prodRef = ref(rtdb, 'rawaq_data/products');
    const simpleList = products.slice(0, 30).map((p) => ({
      id: p.id,
      title: p.title,
      price: p.price,
      categoryId: p.categoryId,
      storeName: p.storeName,
      city: p.city,
    }));
    await set(prodRef, simpleList);
    return true;
  } catch {
    return false;
  }
}
