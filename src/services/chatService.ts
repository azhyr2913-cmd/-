import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import { Chat, Message, PriceOffer } from '../types';
import { createNotification } from './notificationService';

const CHATS_COLLECTION = 'chats';

/**
 * Get or create a conversation between a buyer and store owner.
 * Allows passing an optional initial negotiated price offer or custom message.
 */
export async function getOrCreateChat(params: {
  buyerId: string;
  buyerName: string;
  storeId: string;
  storeName: string;
  storeOwnerId: string;
  productId?: string;
  productTitle?: string;
  productImage?: string;
  productPrice?: number;
  initialOfferPrice?: number;
  initialMessageText?: string;
}): Promise<Chat> {
  const currentAuthUser = auth.currentUser;
  const isSeller = currentAuthUser?.uid === params.storeOwnerId;

  // Crucial: ensure buyerId matches current authenticated user if buyer is calling
  const effectiveBuyerId = isSeller ? params.buyerId : (currentAuthUser?.uid || params.buyerId);
  const effectiveBuyerName = isSeller ? params.buyerName : (currentAuthUser?.displayName || params.buyerName || 'مشتري رواق');
  const effectiveStoreOwnerId = isSeller ? (currentAuthUser?.uid || params.storeOwnerId) : params.storeOwnerId;

  const chatId = `chat_${effectiveBuyerId}_${params.storeId}`;
  const chatRef = doc(db, CHATS_COLLECTION, chatId);

  const senderId = currentAuthUser?.uid || (isSeller ? effectiveStoreOwnerId : effectiveBuyerId);
  const senderName = currentAuthUser?.displayName || (isSeller ? params.storeName : effectiveBuyerName);

  try {
    let snap;
    try {
      snap = await getDoc(chatRef);
    } catch (readErr) {
      console.warn('Chat existence check returned non-fatal error:', readErr);
    }

    if (snap && snap.exists()) {
      const data = snap.data();
      // If user came with a specific price offer or custom negotiation message, send it to the existing thread
      if (params.initialOfferPrice || params.initialMessageText) {
        const offerText = params.initialMessageText || (
          params.initialOfferPrice
            ? `السلام عليكم، بخصوص سلعة "${params.productTitle || 'المعروضة'}"، أقترح سد السعر على ${params.initialOfferPrice.toLocaleString()} ريال يمني، هل يناسبكم؟`
            : `السلام عليكم، أود الاستفسار والتفاوض على سعر: ${params.productTitle || ''}`
        );
        await sendMessage({
          chatId,
          senderId,
          senderName,
          text: offerText,
          priceOffer: params.initialOfferPrice
            ? {
                amount: params.initialOfferPrice,
                status: 'pending',
                proposedBy: isSeller ? 'seller' : 'buyer',
                productTitle: params.productTitle,
                productId: params.productId,
              }
            : undefined,
          isStoreOwner: isSeller,
        });
      }
      return mapChatDoc(snap.id, data);
    }

    const defaultInitialText = params.initialMessageText || (
      params.initialOfferPrice
        ? `السلام عليكم، بخصوص سلعة "${params.productTitle || 'المعروضة'}"، أقترح سد السعر على ${params.initialOfferPrice.toLocaleString()} ريال يمني، هل يناسبكم؟`
        : params.productTitle
          ? `السلام عليكم، أود الاستفسار والتفاوض على سعر: ${params.productTitle}`
          : 'السلام عليكم ورحمة الله، أتواصل معكم عبر تطبيق رواق بيحان.'
    );

    const newChat: Record<string, any> = {
      chatId,
      buyerId: effectiveBuyerId,
      buyerName: effectiveBuyerName,
      storeId: params.storeId,
      storeName: params.storeName,
      storeOwnerId: effectiveStoreOwnerId,
      productId: params.productId || '',
      productTitle: params.productTitle || '',
      productImage: params.productImage || '',
      productPrice: params.productPrice || 0,
      agreedPrice: null,
      lastMessageText: defaultInitialText,
      lastMessageTimestamp: serverTimestamp(),
      unreadCountBuyer: isSeller ? 1 : 0,
      unreadCountSeller: isSeller ? 0 : 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(chatRef, newChat);

    // Initial message
    const msgId = `msg_${Date.now()}`;
    const initialMsgData: Record<string, any> = {
      messageId: msgId,
      chatId,
      senderId,
      senderName,
      text: defaultInitialText,
      imageUrl: '',
      isRead: false,
      createdAt: serverTimestamp(),
    };

    if (params.initialOfferPrice) {
      initialMsgData.priceOffer = {
        amount: params.initialOfferPrice,
        status: 'pending',
        proposedBy: isSeller ? 'seller' : 'buyer',
        productTitle: params.productTitle || '',
        productId: params.productId || '',
      };
    }

    await setDoc(doc(db, CHATS_COLLECTION, chatId, 'messages', msgId), initialMsgData);

    return {
      id: chatId,
      buyerId: params.buyerId,
      buyerName: params.buyerName,
      storeId: params.storeId,
      storeName: params.storeName,
      storeOwnerId: params.storeOwnerId,
      productId: params.productId,
      productTitle: params.productTitle,
      productImage: params.productImage,
      productPrice: params.productPrice,
      lastMessageText: defaultInitialText,
      lastMessageTimestamp: new Date().toISOString(),
      unreadCountBuyer: isSeller ? 1 : 0,
      unreadCountSeller: isSeller ? 0 : 1,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${CHATS_COLLECTION}/${chatId}`);
  }
}

/**
 * Fetch all chats for a user (as buyer or store owner)
 */
export async function getUserChats(userId: string): Promise<Chat[]> {
  try {
    const buyerQ = query(collection(db, CHATS_COLLECTION), where('buyerId', '==', userId));
    const sellerQ = query(collection(db, CHATS_COLLECTION), where('storeOwnerId', '==', userId));

    const [buyerSnaps, sellerSnaps] = await Promise.all([getDocs(buyerQ), getDocs(sellerQ)]);

    const chatMap = new Map<string, Chat>();

    buyerSnaps.docs.forEach((d) => chatMap.set(d.id, mapChatDoc(d.id, d.data())));
    sellerSnaps.docs.forEach((d) => chatMap.set(d.id, mapChatDoc(d.id, d.data())));

    return Array.from(chatMap.values()).sort(
      (a, b) => new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime()
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, CHATS_COLLECTION);
  }
}

/**
 * Send a message inside a chat, optionally with a PriceOffer payload
 */
export async function sendMessage(params: {
  chatId: string;
  senderId: string;
  senderName: string;
  text: string;
  imageUrl?: string;
  priceOffer?: PriceOffer;
  isStoreOwner: boolean;
}): Promise<void> {
  const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const msgRef = doc(db, CHATS_COLLECTION, params.chatId, 'messages', msgId);
  const chatRef = doc(db, CHATS_COLLECTION, params.chatId);

  try {
    const msgPayload: Record<string, any> = {
      messageId: msgId,
      chatId: params.chatId,
      senderId: params.senderId,
      senderName: params.senderName,
      text: params.text.trim(),
      imageUrl: params.imageUrl || '',
      isRead: false,
      createdAt: serverTimestamp(),
    };

    if (params.priceOffer) {
      msgPayload.priceOffer = params.priceOffer;
    }

    await setDoc(msgRef, msgPayload);

    const updatePayload: Record<string, any> = {
      lastMessageText: params.priceOffer
        ? `🤝 اقتراح سد السعر: ${params.priceOffer.amount.toLocaleString()} ر.ي`
        : (params.text.trim() || 'صورة مرفقة'),
      lastMessageTimestamp: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (params.isStoreOwner) {
      updatePayload.unreadCountBuyer = 1;
    } else {
      updatePayload.unreadCountSeller = 1;
    }

    await updateDoc(chatRef, updatePayload);

    // Send in-app notification to the recipient
    try {
      const chatSnap = await getDoc(chatRef);
      if (chatSnap.exists()) {
        const cData = chatSnap.data();
        const recipientId = params.isStoreOwner ? cData.buyerId : cData.storeOwnerId;
        if (recipientId && recipientId !== params.senderId) {
          await createNotification({
            userId: recipientId,
            title: `رسالة جديدة من ${params.senderName}`,
            body: params.priceOffer
              ? `أرسل لك اقتراحاً لسد السعر: ${params.priceOffer.amount.toLocaleString()} ر.ي`
              : (params.text.trim() || 'أرسل لك رسالة في محادثة رواق'),
            type: 'new_message',
            linkUrl: params.chatId,
          });
        }
      }
    } catch (notifErr) {
      console.warn('Notification creation skipped:', notifErr);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${CHATS_COLLECTION}/${params.chatId}/messages`);
  }
}

/**
 * Respond to a price offer (Accept or Reject to reach price agreement "سد السعر")
 */
export async function respondToPriceOffer(params: {
  chatId: string;
  messageId: string;
  accept: boolean;
  offerAmount: number;
  responderId: string;
  responderName: string;
  isStoreOwner: boolean;
}): Promise<void> {
  const msgRef = doc(db, CHATS_COLLECTION, params.chatId, 'messages', params.messageId);
  const chatRef = doc(db, CHATS_COLLECTION, params.chatId);

  try {
    const newStatus = params.accept ? 'accepted' : 'rejected';
    await updateDoc(msgRef, {
      'priceOffer.status': newStatus,
      updatedAt: serverTimestamp(),
    });

    if (params.accept) {
      // Mark agreedPrice on chat document
      await updateDoc(chatRef, {
        agreedPrice: params.offerAmount,
        lastMessageText: `✅ تم سد السعر والاتفاق على: ${params.offerAmount.toLocaleString()} ر.ي`,
        lastMessageTimestamp: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Send confirmation announcement message in thread
      await sendMessage({
        chatId: params.chatId,
        senderId: params.responderId,
        senderName: params.responderName,
        text: `🤝 تم الاتفاق وسد السعر رسمياً على ${params.offerAmount.toLocaleString()} ريال يمني! بارك الله للبائع والمشتري. يمكنك الآن إتمام الطلب مباشرة أو ترتيب المعاينة.`,
        isStoreOwner: params.isStoreOwner,
      });
    } else {
      // Send polite counter notice
      await sendMessage({
        chatId: params.chatId,
        senderId: params.responderId,
        senderName: params.responderName,
        text: `تم الاعتذار عن السعر المقترح (${params.offerAmount.toLocaleString()} ر.ي). يمكن اقتراح سعر آخر للوصول لاتفاق مناسب للطرفين.`,
        isStoreOwner: params.isStoreOwner,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${CHATS_COLLECTION}/${params.chatId}/messages/${params.messageId}`);
  }
}

/**
 * Subscribe to messages in a conversation
 */
export function subscribeToMessages(
  chatId: string,
  onUpdate: (messages: Message[]) => void,
  onError?: (err: any) => void
) {
  const q = query(collection(db, CHATS_COLLECTION, chatId, 'messages'), orderBy('createdAt', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const msgs: Message[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          chatId: data.chatId || chatId,
          senderId: data.senderId || '',
          senderName: data.senderName || '',
          text: data.text || '',
          imageUrl: data.imageUrl || '',
          priceOffer: data.priceOffer || undefined,
          isRead: !!data.isRead,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        };
      });
      onUpdate(msgs);
    },
    (error) => {
      if (onError) onError(error);
      if (error?.code === 'permission-denied' && !auth.currentUser) {
        console.warn('Chat messages subscription waiting for auth session (non-fatal):', error?.message);
      } else {
        handleFirestoreError(error, OperationType.GET, `${CHATS_COLLECTION}/${chatId}/messages`);
      }
    }
  );
}

function mapChatDoc(id: string, data: any): Chat {
  return {
    id,
    buyerId: data.buyerId || '',
    buyerName: data.buyerName || '',
    storeId: data.storeId || '',
    storeName: data.storeName || '',
    storeOwnerId: data.storeOwnerId || '',
    productId: data.productId || undefined,
    productTitle: data.productTitle || undefined,
    productImage: data.productImage || undefined,
    productPrice: typeof data.productPrice === 'number' ? data.productPrice : undefined,
    agreedPrice: typeof data.agreedPrice === 'number' ? data.agreedPrice : undefined,
    lastMessageText: data.lastMessageText || '',
    lastMessageTimestamp: data.lastMessageTimestamp?.toDate
      ? data.lastMessageTimestamp.toDate().toISOString()
      : new Date().toISOString(),
    unreadCountBuyer: Number(data.unreadCountBuyer) || 0,
    unreadCountSeller: Number(data.unreadCountSeller) || 0,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : undefined,
  };
}
