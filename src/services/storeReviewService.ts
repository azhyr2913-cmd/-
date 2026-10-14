import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import { StoreReview } from '../types';

const REVIEWS_COLLECTION = 'store_reviews';
const STORES_COLLECTION = 'stores';

/**
 * Submit or update a store rating/review
 */
export async function submitStoreReview(data: {
  storeId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number; // 1 to 5
  comment?: string;
  interactionType: 'purchase' | 'chat' | 'general';
  orderId?: string;
}): Promise<string> {
  const reviewId = data.orderId
    ? `rev_${data.storeId}_${data.userId}_${data.orderId}`
    : `rev_${data.storeId}_${data.userId}`;

  const reviewRef = doc(db, REVIEWS_COLLECTION, reviewId);

  try {
    const payload = {
      reviewId,
      storeId: data.storeId,
      userId: data.userId,
      userName: data.userName.trim(),
      userAvatar: data.userAvatar || '',
      rating: Math.min(5, Math.max(1, Math.round(data.rating))),
      comment: (data.comment || '').trim(),
      interactionType: data.interactionType,
      orderId: data.orderId || '',
      createdAt: serverTimestamp(),
    };

    await setDoc(reviewRef, payload, { merge: true });

    // Recalculate and update the store's average rating
    await updateStoreAggregateRating(data.storeId);

    return reviewId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, REVIEWS_COLLECTION);
  }
}

/**
 * Recalculate average rating & ratings count for a store
 */
export async function updateStoreAggregateRating(storeId: string): Promise<{ rating: number; count: number }> {
  try {
    const q = query(collection(db, REVIEWS_COLLECTION), where('storeId', '==', storeId));
    const snap = await getDocs(q);

    if (snap.empty) {
      try {
        const storeRef = doc(db, STORES_COLLECTION, storeId);
        await updateDoc(storeRef, { rating: 5, ratingsCount: 0 });
      } catch {
        // Ignore if store update fails due to owner permissions
      }
      return { rating: 5, count: 0 };
    }

    let total = 0;
    snap.docs.forEach((d) => {
      const r = d.data().rating;
      if (typeof r === 'number') total += r;
    });

    const count = snap.docs.length;
    const avg = Number((total / count).toFixed(1));

    try {
      const storeRef = doc(db, STORES_COLLECTION, storeId);
      await updateDoc(storeRef, { rating: avg, ratingsCount: count });
    } catch {
      // Ignore if store update fails due to permissions; aggregate is returned for display
    }

    return { rating: avg, count };
  } catch (err) {
    console.error('Failed to update store aggregate rating:', err);
    return { rating: 5, count: 0 };
  }
}

/**
 * Get all reviews for a store
 */
export async function getStoreReviews(storeId: string): Promise<StoreReview[]> {
  try {
    const q = query(collection(db, REVIEWS_COLLECTION), where('storeId', '==', storeId));
    const snapshot = await getDocs(q);

    const reviews: StoreReview[] = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        storeId: data.storeId,
        userId: data.userId,
        userName: data.userName,
        userAvatar: data.userAvatar,
        rating: data.rating || 5,
        comment: data.comment || '',
        interactionType: data.interactionType || 'general',
        orderId: data.orderId || undefined,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
      };
    });

    // Sort descending by date
    return reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, REVIEWS_COLLECTION);
  }
}

/**
 * Check if user already reviewed a store (and return their review)
 */
export async function getUserStoreReview(userId: string, storeId: string): Promise<StoreReview | null> {
  try {
    const reviewId = `rev_${storeId}_${userId}`;
    const snap = await getDoc(doc(db, REVIEWS_COLLECTION, reviewId));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      id: snap.id,
      storeId: data.storeId,
      userId: data.userId,
      userName: data.userName,
      userAvatar: data.userAvatar,
      rating: data.rating || 5,
      comment: data.comment || '',
      interactionType: data.interactionType || 'general',
      orderId: data.orderId || undefined,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Delete a review
 */
export async function deleteStoreReview(reviewId: string, storeId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, REVIEWS_COLLECTION, reviewId));
    await updateStoreAggregateRating(storeId);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${REVIEWS_COLLECTION}/${reviewId}`);
  }
}
