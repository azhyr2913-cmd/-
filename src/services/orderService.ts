import {
  collection,
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
import { Order, OrderItem, OrderStatus } from '../types';
import { createNotification } from './notificationService';

const ORDERS_COLLECTION = 'orders';

export interface CreateOrderInput {
  buyerId: string;
  buyerName: string;
  buyerPhone: string;
  storeId: string;
  storeName: string;
  storeOwnerId: string;
  items: OrderItem[];
  deliveryFee: number;
  deliveryAddress: string;
  notes?: string;
  city: string;
  parentOrderId?: string;
}

/**
 * Creates an order with immutable snapshot prices, database verification, and inventory adjustment
 */
export async function createOrder(input: CreateOrderInput): Promise<string> {
  const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const orderRef = doc(db, ORDERS_COLLECTION, orderId);

  if (!input.city || !input.city.includes('بيحان')) {
    throw new Error('التوصيل والطلبات مخصصة حصرياً لمنطقة بيحان ومناطقها التابعة.');
  }

  if (!input.buyerName.trim()) {
    throw new Error('يرجى إدخال اسم المستلم كاملاً');
  }

  if (!input.buyerPhone.trim() || input.buyerPhone.length < 8) {
    throw new Error('يرجى إدخال رقم هاتف صحيح للتواصل');
  }

  if (!input.items || input.items.length === 0) {
    throw new Error('لا توجد منتجات في الطلب');
  }

  // Verify products against live database documents to guarantee authentic prices and stock
  const verifiedItems: OrderItem[] = [];
  let calculatedSubtotal = 0;

  for (const item of input.items) {
    const prodRef = doc(db, 'products', item.productId);
    const prodSnap = await getDoc(prodRef);

    if (!prodSnap.exists()) {
      throw new Error(`المنتج "${item.title}" غير موجود في قاعدة البيانات.`);
    }

    const prodData = prodSnap.data();
    if (prodData.isSold || prodData.isAvailable === false) {
      throw new Error(`المنتج "${prodData.title || item.title}" مباع أو غير متوفر حالياً.`);
    }

    const availableQty = Number(prodData.quantity || 1);
    const requestedQty = Math.max(1, Number(item.quantity || 1));

    if (availableQty < requestedQty && availableQty > 0) {
      throw new Error(`الكمية المتاحة من "${prodData.title}" هي ${availableQty} قطعة فقط.`);
    }

    // Authoritative snapshot price from database
    const authoritativePrice = Number(prodData.price) || Number(item.price);
    calculatedSubtotal += authoritativePrice * requestedQty;

    let parsedAdditionalImages: string[] = [];
    if (prodData.additionalImages) {
      try {
        parsedAdditionalImages = typeof prodData.additionalImages === 'string'
          ? JSON.parse(prodData.additionalImages)
          : prodData.additionalImages;
      } catch {
        parsedAdditionalImages = [];
      }
    }

    verifiedItems.push({
      productId: item.productId,
      title: prodData.title || item.title,
      price: authoritativePrice,
      priceSar: prodData.priceSar ? Number(prodData.priceSar) : undefined,
      quantity: requestedQty,
      imageUrl: prodData.imageUrl || item.imageUrl || '',
      additionalImages: parsedAdditionalImages,
      currency: 'YER',
    });

    // Safely deduct inventory stock
    try {
      const newQty = Math.max(0, availableQty - requestedQty);
      await updateDoc(prodRef, {
        quantity: newQty,
        isSold: newQty === 0,
        isAvailable: newQty > 0,
        ordersCount: (prodData.ordersCount || 0) + 1,
        updatedAt: serverTimestamp(),
      });
    } catch (stockErr) {
      console.warn('Stock decrement note:', stockErr);
    }
  }

  const deliveryFee = Number(input.deliveryFee || 0);
  const total = calculatedSubtotal + deliveryFee;

  try {
    await setDoc(orderRef, {
      orderId,
      buyerId: input.buyerId,
      buyerName: input.buyerName.trim(),
      buyerPhone: input.buyerPhone.trim(),
      storeId: input.storeId,
      storeName: input.storeName,
      storeOwnerId: input.storeOwnerId,
      items: JSON.stringify(verifiedItems),
      subtotal: calculatedSubtotal,
      deliveryFee,
      total,
      status: 'new' as OrderStatus,
      deliveryAddress: input.deliveryAddress.trim(),
      notes: input.notes?.trim() || '',
      city: input.city,
      parentOrderId: input.parentOrderId || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Increment ordersCount on store
    try {
      const storeRef = doc(db, 'stores', input.storeId);
      const storeSnap = await getDoc(storeRef);
      if (storeSnap.exists()) {
        const cnt = (storeSnap.data().ordersCount || 0) + 1;
        await updateDoc(storeRef, { ordersCount: cnt });
      }
    } catch {
      // Non-fatal
    }

    // Send persistent notification to the store owner
    try {
      if (input.storeOwnerId && input.storeOwnerId !== input.buyerId) {
        await createNotification({
          userId: input.storeOwnerId,
          title: `طلب شراء جديد #${orderId.slice(-6)}`,
          body: `وصلك طلب جديد من ${input.buyerName.trim()} في ${input.city} بقيمة إجمالية ${total.toLocaleString()} ر.ي`,
          type: 'new_order',
          linkUrl: orderId,
        });
      }
    } catch (notifErr) {
      console.warn('Notification for order creation failed:', notifErr);
    }

    return orderId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, ORDERS_COLLECTION);
  }
}

/**
 * Get single order by ID
 */
export async function getOrderById(orderId: string): Promise<Order | null> {
  try {
    const snap = await getDoc(doc(db, ORDERS_COLLECTION, orderId));
    if (!snap.exists()) return null;
    return mapOrderDoc(snap.id, snap.data());
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${ORDERS_COLLECTION}/${orderId}`);
  }
}

/**
 * Get orders placed by a buyer
 */
export async function getBuyerOrders(buyerId: string): Promise<Order[]> {
  try {
    const q = query(collection(db, ORDERS_COLLECTION), where('buyerId', '==', buyerId));
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((d) => mapOrderDoc(d.id, d.data()))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, ORDERS_COLLECTION);
  }
}

/**
 * Get orders received by a store owner
 */
export async function getStoreOrders(storeOwnerId: string): Promise<Order[]> {
  try {
    const q = query(collection(db, ORDERS_COLLECTION), where('storeOwnerId', '==', storeOwnerId));
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((d) => mapOrderDoc(d.id, d.data()))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, ORDERS_COLLECTION);
  }
}

/**
 * Get all orders (Developer / Main Admin)
 */
export async function getAllOrders(): Promise<Order[]> {
  try {
    const snapshot = await getDocs(collection(db, ORDERS_COLLECTION));
    return snapshot.docs
      .map((d) => mapOrderDoc(d.id, d.data()))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, ORDERS_COLLECTION);
  }
}

/**
 * Update order status
 */
export async function updateOrderStatus(orderId: string, status: OrderStatus, notes?: string): Promise<void> {
  const orderRef = doc(db, ORDERS_COLLECTION, orderId);
  try {
    const payload: Record<string, any> = {
      status,
      updatedAt: serverTimestamp(),
    };
    if (notes !== undefined) {
      payload.notes = notes;
    }
    await updateDoc(orderRef, payload);

    // Notify buyer about the status update
    try {
      const snap = await getDoc(orderRef);
      if (snap.exists()) {
        const orderData = snap.data();
        const buyerId = orderData.buyerId;
        const storeName = orderData.storeName || 'المتجر';
        const statusMap: Record<OrderStatus, string> = {
          new: 'جديد بانتظار التأكيد',
          pending_confirmation: 'بانتظار تأكيد المتجر',
          accepted: 'تم قبول طلبك بنجاح',
          preparing: 'جارٍ تجهيز طلبك في المتجر',
          out_for_delivery: 'خرج طلبك مع مندوب التوصيل',
          completed: 'تم تسليم طلبك بنجاح، شكراً لتعاملك',
          cancelled: 'تم إلغاء الطلب',
          rejected: 'تم الاعتذار عن قبول الطلب',
        };

        if (buyerId) {
          await createNotification({
            userId: buyerId,
            title: `تحديث على طلبك من ${storeName}`,
            body: `حالة الطلب #${orderId.slice(-6)}: ${statusMap[status] || status}`,
            type: 'order_status',
            linkUrl: orderId,
          });
        }
      }
    } catch (notifErr) {
      console.warn('Failed to notify buyer about order status change:', notifErr);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${ORDERS_COLLECTION}/${orderId}`);
  }
}

function mapOrderDoc(id: string, data: any): Order {
  let items: OrderItem[] = [];
  if (data.items) {
    try {
      items = typeof data.items === 'string' ? JSON.parse(data.items) : data.items;
    } catch {
      items = [];
    }
  }

  return {
    id,
    buyerId: data.buyerId || '',
    buyerName: data.buyerName || '',
    buyerPhone: data.buyerPhone || '',
    storeId: data.storeId || '',
    storeName: data.storeName || '',
    storeOwnerId: data.storeOwnerId || '',
    items,
    subtotal: Number(data.subtotal) || 0,
    deliveryFee: Number(data.deliveryFee) || 0,
    total: Number(data.total) || 0,
    status: (data.status as OrderStatus) || 'new',
    deliveryAddress: data.deliveryAddress || '',
    notes: data.notes || '',
    city: data.city || 'بيحان - شبوة',
    parentOrderId: data.parentOrderId || undefined,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : undefined,
  };
}
