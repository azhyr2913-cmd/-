/**
 * Core domain types for Rawaq (رواق) Marketplace
 */

export type UserRole = 'buyer' | 'merchant' | 'admin';

export interface UserProfile {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  storeId?: string;
  createdAt: string;
}

export type StoreStatus = 'active' | 'suspended';

export interface WorkingHours {
  days: string[]; // e.g. ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']
  openTime: string; // "08:00"
  closeTime: string; // "22:00"
  isOpenManual: boolean; // manual toggle if owner closes early
}

export interface Store {
  id: string;
  ownerId: string;
  storeName: string;
  description: string;
  logoUrl?: string;
  bannerUrl?: string;
  backgroundTheme?: string; // preset key or custom image URL
  productTypes: string;
  city: string;
  isVerified: boolean;
  status: StoreStatus;
  isOpen: boolean;
  businessHours?: WorkingHours | string;
  deliveryFee: number;
  followersCount: number;
  productsCount: number;
  ordersCount: number;
  rating?: number;
  ratingsCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface StoreReview {
  id: string;
  storeId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number; // 1 to 5
  comment?: string;
  interactionType: 'purchase' | 'chat' | 'general';
  orderId?: string;
  createdAt: string;
}

export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface StoreApplication {
  id: string;
  ownerId: string;
  fullName: string;
  phone: string; // Strictly private! Never returned or displayed on public store pages
  storeName: string;
  storefrontImageUrl?: string;
  productTypes: string;
  city: string;
  description: string;
  status: ApplicationStatus;
  rejectionReason?: string;
  createdAt: string;
  reviewedAt?: string;
}

export type ProductCondition = 'new' | 'used';

export interface Product {
  id: string;
  storeId: string;
  storeName: string;
  ownerId: string;
  title: string;
  description: string;
  price: number; // بالريال اليمني
  priceSar?: number; // بالريال السعودي اختياري
  deliveryFee: number;
  categoryId: string;
  condition: ProductCondition;
  quantity: number;
  city: string;
  isAvailable: boolean;
  isSold: boolean;
  imageUrl: string;
  additionalImages?: string[];
  viewsCount: number;
  likesCount: number;
  ordersCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
  description?: string;
}

export type OrderStatus =
  | 'new'
  | 'pending_confirmation'
  | 'accepted'
  | 'preparing'
  | 'out_for_delivery'
  | 'completed'
  | 'cancelled'
  | 'rejected';

export interface OrderItem {
  productId: string;
  title: string;
  price: number; // snapshotted price at moment of purchase
  priceSar?: number;
  quantity: number;
  imageUrl?: string;
  additionalImages?: string[];
  currency?: string;
}

export interface Order {
  id: string;
  buyerId: string;
  buyerName: string;
  buyerPhone: string;
  storeId: string;
  storeName: string;
  storeOwnerId: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  deliveryAddress: string;
  notes?: string;
  city: string;
  parentOrderId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PriceOffer {
  amount: number; // السعر المتفق عليه أو المقترح بالريال اليمني
  status: 'pending' | 'accepted' | 'rejected';
  proposedBy: 'buyer' | 'seller';
  productTitle?: string;
  productId?: string;
}

export interface Chat {
  id: string;
  buyerId: string;
  buyerName: string;
  storeId: string;
  storeName: string;
  storeOwnerId: string;
  productId?: string;
  productTitle?: string;
  productImage?: string;
  productPrice?: number;
  agreedPrice?: number;
  lastMessageText: string;
  lastMessageTimestamp: string;
  unreadCountBuyer: number;
  unreadCountSeller: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  text: string;
  imageUrl?: string;
  priceOffer?: PriceOffer;
  isRead: boolean;
  createdAt: string;
}

export interface Favorite {
  id: string;
  userId: string;
  productId: string;
  createdAt: string;
}

export interface Like {
  id: string;
  userId: string;
  productId: string;
  createdAt: string;
}

export interface Follow {
  id: string;
  userId: string;
  storeId: string;
  createdAt: string;
}

export type NotificationType =
  | 'order_status'
  | 'new_order'
  | 'store_application_status'
  | 'new_message'
  | 'new_product_from_followed'
  | 'system_announcement';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  linkUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export interface AppSetting {
  id: string;
  developerWhatsapp: string;
  supportedCities: string[];
  announcement?: string;
  maintenanceMode?: boolean;
  updatedBy?: string;
  updatedAt?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}
