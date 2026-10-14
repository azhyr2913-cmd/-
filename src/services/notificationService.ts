import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import { AppNotification, NotificationType } from '../types';

const NOTIFICATIONS_COLLECTION = 'notifications';

/**
 * Create a new notification for a specific user
 */
export async function createNotification(params: {
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  linkUrl?: string;
}): Promise<string> {
  const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const notifRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);

  try {
    await setDoc(notifRef, {
      notificationId,
      userId: params.userId,
      title: params.title.trim(),
      body: params.body.trim(),
      type: params.type,
      linkUrl: params.linkUrl || '',
      isRead: false,
      createdAt: serverTimestamp(),
    });
    return notificationId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, NOTIFICATIONS_COLLECTION);
  }
}

/**
 * Subscribe to user's notifications in real time
 */
export function subscribeToUserNotifications(
  userId: string,
  onUpdate: (notifications: AppNotification[]) => void,
  onError?: (err: any) => void
) {
  const q = query(
    collection(db, NOTIFICATIONS_COLLECTION),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: AppNotification[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          userId: data.userId,
          title: data.title || '',
          body: data.body || '',
          type: data.type || 'system_announcement',
          linkUrl: data.linkUrl || undefined,
          isRead: !!data.isRead,
          createdAt: data.createdAt?.toDate
            ? data.createdAt.toDate().toISOString()
            : new Date().toISOString(),
        };
      });

      // Sort newest first
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(items);
    },
    (err) => {
      console.error('Error listening to notifications:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const notifRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
  try {
    await updateDoc(notifRef, {
      isRead: true,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${NOTIFICATIONS_COLLECTION}/${notificationId}`);
  }
}

/**
 * Mark all notifications for a user as read
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  try {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      where('isRead', '==', false)
    );
    const snap = await getDocs(q);
    if (snap.empty) return;

    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      batch.update(d.ref, { isRead: true });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, NOTIFICATIONS_COLLECTION);
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  const notifRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
  try {
    await deleteDoc(notifRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${NOTIFICATIONS_COLLECTION}/${notificationId}`);
  }
}
