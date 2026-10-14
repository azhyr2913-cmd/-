import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import { Favorite, Like, Product, ProductCondition } from '../types';

const PRODUCTS_COLLECTION = 'products';
const LIKES_COLLECTION = 'likes';
const FAVORITES_COLLECTION = 'favorites';

export interface CreateProductInput {
  storeId: string;
  storeName: string;
  ownerId: string;
  title: string;
  description: string;
  price: number;
  priceSar?: number;
  deliveryFee?: number;
  categoryId: string;
  condition: ProductCondition;
  quantity?: number;
  city: string;
  imageUrl: string;
  additionalImages?: string[];
}

/**
 * Add a new product to Rawaq
 */
export async function createProduct(input: CreateProductInput): Promise<string> {
  const productId = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const productRef = doc(db, PRODUCTS_COLLECTION, productId);

  if (input.price < 0) {
    throw new Error('السعر لا يمكن أن يكون سالباً');
  }

  if (!input.city || !input.city.includes('بيحان')) {
    throw new Error('نشر المنتجات في تطبيق رواق مخصص حصرياً لمدينة بيحان ومناطقها التابعة.');
  }

  try {
    await setDoc(productRef, {
      productId,
      storeId: input.storeId,
      storeName: input.storeName,
      ownerId: input.ownerId,
      title: input.title.trim(),
      description: input.description.trim(),
      price: Number(input.price),
      priceSar: input.priceSar !== undefined && input.priceSar > 0 ? Number(input.priceSar) : null,
      deliveryFee: Number(input.deliveryFee || 0),
      categoryId: input.categoryId,
      condition: input.condition,
      quantity: Number(input.quantity || 1),
      city: input.city,
      isAvailable: true,
      isSold: false,
      imageUrl: input.imageUrl,
      additionalImages: input.additionalImages ? JSON.stringify(input.additionalImages) : '',
      viewsCount: 0,
      likesCount: 0,
      ordersCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Update store products count
    const storeRef = doc(db, 'stores', input.storeId);
    const storeSnap = await getDoc(storeRef);
    if (storeSnap.exists()) {
      const current = storeSnap.data().productsCount || 0;
      await updateDoc(storeRef, { productsCount: current + 1 });
    }

    return productId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, PRODUCTS_COLLECTION);
  }
}

/**
 * Update an existing product
 */
export async function updateProduct(
  productId: string,
  updates: Partial<Omit<Product, 'id' | 'storeId' | 'ownerId' | 'createdAt'>>
): Promise<void> {
  const productRef = doc(db, PRODUCTS_COLLECTION, productId);
  try {
    const payload: Record<string, any> = {
      ...updates,
      updatedAt: serverTimestamp(),
    };
    if (updates.additionalImages) {
      payload.additionalImages = JSON.stringify(updates.additionalImages);
    }
    await updateDoc(productRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${PRODUCTS_COLLECTION}/${productId}`);
  }
}

/**
 * Delete a product
 */
export async function deleteProduct(productId: string, storeId: string): Promise<void> {
  const productRef = doc(db, PRODUCTS_COLLECTION, productId);
  try {
    await deleteDoc(productRef);
    const storeRef = doc(db, 'stores', storeId);
    const storeSnap = await getDoc(storeRef);
    if (storeSnap.exists()) {
      const current = Math.max(0, (storeSnap.data().productsCount || 1) - 1);
      await updateDoc(storeRef, { productsCount: current });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${PRODUCTS_COLLECTION}/${productId}`);
  }
}

/**
 * Toggle product sold status
 */
export async function toggleProductSold(productId: string, isSold: boolean): Promise<void> {
  const productRef = doc(db, PRODUCTS_COLLECTION, productId);
  try {
    await updateDoc(productRef, {
      isSold,
      isAvailable: !isSold,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${PRODUCTS_COLLECTION}/${productId}`);
  }
}

/**
 * Increment view count for a product
 */
export async function incrementProductView(productId: string): Promise<void> {
  try {
    const productRef = doc(db, PRODUCTS_COLLECTION, productId);
    const snap = await getDoc(productRef);
    if (snap.exists()) {
      const views = (snap.data().viewsCount || 0) + 1;
      await updateDoc(productRef, { viewsCount: views });
    }
  } catch {
    // Non-fatal
  }
}

/**
 * Fetch a single product by ID
 */
export async function getProductById(productId: string): Promise<Product | null> {
  try {
    const snap = await getDoc(doc(db, PRODUCTS_COLLECTION, productId));
    if (!snap.exists()) return null;
    return mapProductDoc(snap.id, snap.data());
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${PRODUCTS_COLLECTION}/${productId}`);
  }
}

/**
 * Get products for a specific store
 */
export async function getStoreProducts(storeId: string): Promise<Product[]> {
  try {
    const q = query(collection(db, PRODUCTS_COLLECTION), where('storeId', '==', storeId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => mapProductDoc(d.id, d.data()));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, PRODUCTS_COLLECTION);
  }
}

/**
 * Query products with various filters
 */
export async function queryProducts(params?: {
  categoryId?: string;
  storeId?: string;
  city?: string;
  searchTerm?: string;
  sortBy?: 'newest' | 'price_asc' | 'price_desc' | 'views' | 'likes';
  onlyAvailable?: boolean;
  maxLimit?: number;
}): Promise<Product[]> {
  try {
    const snapshot = await getDocs(collection(db, PRODUCTS_COLLECTION));
    let items = snapshot.docs.map((d) => mapProductDoc(d.id, d.data()));

    if (params?.onlyAvailable) {
      items = items.filter((p) => p.isAvailable && !p.isSold);
    }
    if (params?.categoryId && params.categoryId !== 'all') {
      items = items.filter((p) => p.categoryId === params.categoryId);
    }
    if (params?.storeId) {
      items = items.filter((p) => p.storeId === params.storeId);
    }
    if (params?.city && params.city !== 'الكل') {
      items = items.filter((p) => p.city.includes(params.city!));
    }
    if (params?.searchTerm && params.searchTerm.trim() !== '') {
      const term = params.searchTerm.toLowerCase().trim();
      items = items.filter(
        (p) =>
          p.title.toLowerCase().includes(term) ||
          p.description.toLowerCase().includes(term) ||
          p.storeName.toLowerCase().includes(term) ||
          p.city.toLowerCase().includes(term)
      );
    }

    // Sort
    if (params?.sortBy === 'price_asc') {
      items.sort((a, b) => a.price - b.price);
    } else if (params?.sortBy === 'price_desc') {
      items.sort((a, b) => b.price - a.price);
    } else if (params?.sortBy === 'views') {
      items.sort((a, b) => b.viewsCount - a.viewsCount);
    } else if (params?.sortBy === 'likes') {
      items.sort((a, b) => b.likesCount - a.likesCount);
    } else {
      // Default: newest
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    if (params?.maxLimit) {
      items = items.slice(0, params.maxLimit);
    }

    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, PRODUCTS_COLLECTION);
  }
}

/**
 * Toggle like on a product
 */
export async function toggleProductLike(userId: string, productId: string): Promise<boolean> {
  const likeId = `like_${userId}_${productId}`;
  const likeRef = doc(db, LIKES_COLLECTION, likeId);
  const productRef = doc(db, PRODUCTS_COLLECTION, productId);

  try {
    const snap = await getDoc(likeRef);
    if (snap.exists()) {
      await deleteDoc(likeRef);
      const prodSnap = await getDoc(productRef);
      if (prodSnap.exists()) {
        const count = Math.max(0, (prodSnap.data().likesCount || 1) - 1);
        await updateDoc(productRef, { likesCount: count });
      }
      return false;
    } else {
      await setDoc(likeRef, {
        likeId,
        userId,
        productId,
        createdAt: serverTimestamp(),
      });
      const prodSnap = await getDoc(productRef);
      if (prodSnap.exists()) {
        const count = (prodSnap.data().likesCount || 0) + 1;
        await updateDoc(productRef, { likesCount: count });
      }
      return true;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, LIKES_COLLECTION);
  }
}

export async function checkIfUserLiked(userId: string, productId: string): Promise<boolean> {
  try {
    const likeId = `like_${userId}_${productId}`;
    const snap = await getDoc(doc(db, LIKES_COLLECTION, likeId));
    return snap.exists();
  } catch {
    return false;
  }
}

/**
 * Toggle favorite
 */
export async function toggleProductFavorite(userId: string, productId: string): Promise<boolean> {
  const favId = `fav_${userId}_${productId}`;
  const favRef = doc(db, FAVORITES_COLLECTION, favId);

  try {
    const snap = await getDoc(favRef);
    if (snap.exists()) {
      await deleteDoc(favRef);
      return false;
    } else {
      await setDoc(favRef, {
        favoriteId: favId,
        userId,
        productId,
        createdAt: serverTimestamp(),
      });
      return true;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, FAVORITES_COLLECTION);
  }
}

export async function checkIfUserFavorited(userId: string, productId: string): Promise<boolean> {
  try {
    const favId = `fav_${userId}_${productId}`;
    const snap = await getDoc(doc(db, FAVORITES_COLLECTION, favId));
    return snap.exists();
  } catch {
    return false;
  }
}

export async function getUserFavorites(userId: string): Promise<Product[]> {
  try {
    const q = query(collection(db, FAVORITES_COLLECTION), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const productIds = snapshot.docs.map((d) => d.data().productId as string);

    if (productIds.length === 0) return [];

    const products: Product[] = [];
    for (const pid of productIds) {
      const p = await getProductById(pid);
      if (p) products.push(p);
    }
    return products;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, FAVORITES_COLLECTION);
  }
}

function mapProductDoc(id: string, data: any): Product {
  let addImages: string[] = [];
  if (data.additionalImages) {
    try {
      addImages = typeof data.additionalImages === 'string' ? JSON.parse(data.additionalImages) : data.additionalImages;
    } catch {
      addImages = [];
    }
  }

  return {
    id,
    storeId: data.storeId,
    storeName: data.storeName || '',
    ownerId: data.ownerId,
    title: data.title || '',
    description: data.description || '',
    price: Number(data.price) || 0,
    priceSar: data.priceSar !== undefined && data.priceSar !== null ? Number(data.priceSar) : undefined,
    deliveryFee: Number(data.deliveryFee) || 0,
    categoryId: data.categoryId || '',
    condition: (data.condition as ProductCondition) || 'new',
    quantity: Number(data.quantity) || 0,
    city: data.city || 'بيحان - شبوة',
    isAvailable: data.isAvailable !== false,
    isSold: !!data.isSold,
    imageUrl: data.imageUrl || '',
    additionalImages: addImages,
    viewsCount: Number(data.viewsCount) || 0,
    likesCount: Number(data.likesCount) || 0,
    ordersCount: Number(data.ordersCount) || 0,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : undefined,
  };
}
