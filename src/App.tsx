import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { Navbar } from './components/common/Navbar';
import { MobileBottomNav } from './components/common/MobileBottomNav';
import { CartModal } from './components/common/CartModal';
import { StoreApplicationModal } from './components/merchant/StoreApplicationModal';
import { HomeFeed } from './components/buyer/HomeFeed';
import { CategoryBrowserView } from './components/buyer/CategoryBrowserView';
import { StorePublicPage } from './components/buyer/StorePublicPage';
import { ProductDetailModal } from './components/buyer/ProductDetailModal';
import { AuthModal } from './components/common/AuthModal';
import { BuyerOrdersView } from './components/buyer/BuyerOrdersView';
import { FavoritesView } from './components/buyer/FavoritesView';
import { ConversationsList } from './components/chat/ConversationsList';
import { ChatWindow } from './components/chat/ChatWindow';
import { MerchantDashboard } from './components/merchant/MerchantDashboard';
import { DeveloperDashboard } from './components/developer/DeveloperDashboard';
import { ProductFormModal } from './components/merchant/ProductFormModal';
import { NotificationsModal } from './components/common/NotificationsModal';
import { Footer } from './components/common/Footer';
import { AppNotification, Category, Chat, Product, Store } from './types';
import { auth } from './firebase/config';
import { getCategories } from './services/adminService';
import { getOrCreateChat } from './services/chatService';
import { getProductById } from './services/productService';
import { subscribeToUserNotifications } from './services/notificationService';

function MainApp() {
  const {
    store,
    refreshProfile,
    currentUser,
    login,
    loginAsGuest,
    isAuthModalOpen,
    closeAuthModal,
    authNotice,
    clearAuthNotice,
  } = useAuth();

  const { addToCart } = useCart();

  // Navigation views: 'home' | 'categories' | 'store' | 'favorites' | 'orders' | 'chats' | 'merchant' | 'developer'
  const [currentView, setCurrentView] = useState<string>('home');
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  // Categories & Filters
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('الكل');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals state
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [isPostAdModalOpen, setIsPostAdModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // In-app notifications state
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Active chat state
  const [activeChat, setActiveChat] = useState<Chat | null>(null);

  // Subscribe to real-time notifications for the current user
  useEffect(() => {
    if (!currentUser?.uid) {
      setNotifications([]);
      return;
    }
    const unsubscribe = subscribeToUserNotifications(currentUser.uid, (notifs) => {
      setNotifications(notifs);
    });
    return () => unsubscribe();
  }, [currentUser?.uid]);

  const unreadNotificationsCount = notifications.filter((n) => !n.isRead).length;

  const handleOpenPostAd = async () => {
    if (!currentUser) {
      const loggedIn = await login();
      if (!loggedIn && !currentUser) return;
    }
    setIsPostAdModalOpen(true);
  };

  useEffect(() => {
    getCategories()
      .then((cats) => setCategories(cats || []))
      .catch(console.error);
  }, []);

  const handleOpenStorePage = (storeId: string) => {
    setSelectedStoreId(storeId);
    setCurrentView('store');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartChatFromStore = async (targetStore: Store) => {
    let uid = currentUser?.uid;
    let name = currentUser?.displayName || 'مشتري رواق';
    if (!uid) {
      const loggedIn = await login();
      if (!loggedIn || !currentUser) return;
      uid = currentUser.uid;
      name = currentUser.displayName || 'مشتري رواق';
    }
    try {
      const chat = await getOrCreateChat({
        buyerId: uid,
        buyerName: name,
        storeId: targetStore.id,
        storeName: targetStore.storeName,
        storeOwnerId: targetStore.ownerId,
      });
      setActiveChat(chat);
      setCurrentView('chats');
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartChatFromProduct = async (
    product: Product,
    initialProposal?: { price?: number; customMessage?: string }
  ) => {
    let activeUser = auth.currentUser || currentUser;
    if (!activeUser) {
      await loginAsGuest();
      activeUser = auth.currentUser;
    }
    if (!activeUser) {
      await login();
      activeUser = auth.currentUser;
    }
    if (!activeUser) return;

    const uid = activeUser.uid;
    const name = activeUser.displayName || (activeUser.isAnonymous ? 'مشتري من بيحان' : 'مشتري رواق');

    try {
      const chat = await getOrCreateChat({
        buyerId: uid,
        buyerName: name,
        storeId: product.storeId,
        storeName: product.storeName,
        storeOwnerId: product.ownerId,
        productId: product.id,
        productTitle: product.title,
        productImage: product.imageUrl,
        productPrice: product.price,
        initialOfferPrice: initialProposal?.price,
        initialMessageText: initialProposal?.customMessage,
      });
      setActiveChat(chat);
      setCurrentView('chats');
    } catch (err) {
      console.error(err);
    }
  };

  const handleBuyAtAgreedPrice = async (chat: Chat, price: number) => {
    let targetProduct: Product | undefined;
    if (chat.productId) {
      try {
        const fetched = await getProductById(chat.productId);
        if (fetched) targetProduct = fetched;
      } catch (e) {
        console.warn(e);
      }
    }

    if (!targetProduct) {
      targetProduct = {
        id: chat.productId || `prod_agreed_${Date.now()}`,
        storeId: chat.storeId,
        storeName: chat.storeName,
        ownerId: chat.storeOwnerId,
        title: chat.productTitle || 'منتج بسعر متفق عليه',
        description: 'تم التفاوض وسد السعر عبر المحادثة الداخلية في بيحان',
        price,
        deliveryFee: 1000,
        categoryId: 'cat-general',
        condition: 'used',
        quantity: 1,
        imageUrl: chat.productImage || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
        city: 'بيحان - شبوة',
        isAvailable: true,
        isSold: false,
        viewsCount: 1,
        likesCount: 0,
        ordersCount: 0,
        createdAt: new Date().toISOString(),
      };
    } else {
      targetProduct = {
        ...targetProduct,
        price,
      };
    }

    addToCart(targetProduct, 1);
    setIsCartModalOpen(true);
  };

  const handleOpenChatWithBuyer = async (buyerId: string, buyerName: string) => {
    if (!store) return;
    try {
      const chat = await getOrCreateChat({
        buyerId,
        buyerName,
        storeId: store.id,
        storeName: store.storeName,
        storeOwnerId: store.ownerId,
      });
      setActiveChat(chat);
      setCurrentView('chats');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FA] text-[#101B3D] flex flex-col font-sans" dir="rtl">
      {/* Top Navigation */}
      <Navbar
        onOpenStoreModal={() => setIsStoreModalOpen(true)}
        onOpenCartModal={() => setIsCartModalOpen(true)}
        onOpenMerchantDashboard={() => setCurrentView('merchant')}
        onOpenDeveloperDashboard={() => setCurrentView('developer')}
        onSelectCategory={(catId) => {
          setSelectedCategory(catId);
          setCurrentView('home');
        }}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedCity={selectedCity}
        onCityChange={setSelectedCity}
        currentView={currentView}
        onNavigateHome={() => {
          setCurrentView('home');
          setSelectedCategory('all');
        }}
        onOpenPostAd={handleOpenPostAd}
        onOpenNotifications={() => setIsNotificationsModalOpen(true)}
        unreadNotificationsCount={unreadNotificationsCount}
      />

      {/* Browser Popup Notice if needed */}
      {authNotice && (
        <div className="bg-[#DDF7EC] border-b border-[#C0F0DD] text-[#056B4B] px-4 py-2.5 text-xs text-center flex items-center justify-between max-w-7xl mx-auto w-full">
          <span>{authNotice}</span>
          <button
            onClick={clearAuthNotice}
            className="text-[#056B4B] font-bold hover:underline px-2"
          >
            إغلاق ✕
          </button>
        </div>
      )}

      {/* Main View Router */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {currentView === 'home' && (
          <HomeFeed
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={(catId) => setSelectedCategory(catId)}
            onOpenProductDetail={(prod) => setSelectedProduct(prod)}
            onOpenStorePage={handleOpenStorePage}
            selectedCity={selectedCity}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onOpenPostAd={handleOpenPostAd}
            onOpenStoreModal={() => setIsStoreModalOpen(true)}
            onStartChatWithProduct={handleStartChatFromProduct}
            onStartChatWithStore={handleStartChatFromStore}
          />
        )}

        {currentView === 'categories' && (
          <CategoryBrowserView
            categories={categories}
            onSelectCategory={(catId) => {
              setSelectedCategory(catId);
              setCurrentView('home');
            }}
          />
        )}

        {currentView === 'store' && selectedStoreId && (
          <StorePublicPage
            storeId={selectedStoreId}
            onBack={() => setCurrentView('home')}
            onOpenProductDetail={(prod) => setSelectedProduct(prod)}
            onStartChat={handleStartChatFromStore}
          />
        )}

        {currentView === 'favorites' && (
          <FavoritesView onOpenProductDetail={(prod) => setSelectedProduct(prod)} />
        )}

        {currentView === 'orders' && <BuyerOrdersView />}

        {currentView === 'chats' && (
          activeChat ? (
            <ChatWindow
              chat={activeChat}
              onBack={() => setActiveChat(null)}
              onOpenStorePage={handleOpenStorePage}
              onBuyAtAgreedPrice={handleBuyAtAgreedPrice}
            />
          ) : (
            <ConversationsList onSelectChat={(c) => setActiveChat(c)} />
          )
        )}

        {currentView === 'merchant' && store && (
          <MerchantDashboard
            store={store}
            categories={categories}
            onOpenChatWithBuyer={handleOpenChatWithBuyer}
            onRefreshStore={refreshProfile}
          />
        )}

        {currentView === 'developer' && <DeveloperDashboard />}
      </main>

      {!activeChat && (
        <Footer
          onOpenStoreModal={() => setIsStoreModalOpen(true)}
          onNavigateCategories={() => {
            setCurrentView('categories');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        currentView={currentView}
        onNavigate={(view) => {
          setCurrentView(view);
          if (view !== 'chats') setActiveChat(null);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenPostAd={handleOpenPostAd}
        unreadNotificationsCount={unreadNotificationsCount}
      />

      {/* In-App Notifications Modal */}
      <NotificationsModal
        isOpen={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
        notifications={notifications}
        userId={currentUser?.uid || ''}
        onNavigate={(view) => {
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Haraj Post Ad Modal (متاح لجميع المستخدمين لنشر إعلان فوري في حراج بيحان) */}
      {isPostAdModalOpen && (
        <ProductFormModal
          isOpen={isPostAdModalOpen}
          onClose={() => setIsPostAdModalOpen(false)}
          onSuccess={() => {
            setIsPostAdModalOpen(false);
            setCurrentView('home');
          }}
          storeId={store?.id || `haraj_${currentUser?.uid || 'user'}`}
          storeName={store?.storeName || currentUser?.displayName || 'معلن حراج بيحان'}
          ownerId={currentUser?.uid || ''}
          categories={categories}
        />
      )}

      {/* Modals */}
      <CartModal
        isOpen={isCartModalOpen}
        onClose={() => setIsCartModalOpen(false)}
        onOrderSuccess={() => {
          setCurrentView('orders');
        }}
      />

      <StoreApplicationModal
        isOpen={isStoreModalOpen}
        onClose={() => setIsStoreModalOpen(false)}
        onSuccess={() => {
          refreshProfile();
        }}
      />

      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onOpenStorePage={handleOpenStorePage}
        onStartChatWithProduct={handleStartChatFromProduct}
      />

      {/* Unified Authentication Modal (Google, Email/Password, Phone SMS) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <MainApp />
      </CartProvider>
    </AuthProvider>
  );
}
