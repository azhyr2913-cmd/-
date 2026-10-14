import React, { useEffect, useState } from 'react';
import {
  Plus,
  Package,
  ShoppingBag,
  TrendingUp,
  Eye,
  Heart,
  Palette,
  Clock,
  CheckCircle,
  MessageSquare,
  Edit,
  Trash2,
  RefreshCw,
  Search,
  Phone,
  MapPin,
  X,
  FileText,
} from 'lucide-react';
import { Category, Order, OrderStatus, Product, Store } from '../../types';
import { deleteProduct, getStoreProducts, toggleProductSold } from '../../services/productService';
import { getStoreOrders, updateOrderStatus } from '../../services/orderService';
import { ProductFormModal } from './ProductFormModal';
import { StoreCustomizerModal } from './StoreCustomizerModal';
import { WorkingHoursModal } from './WorkingHoursModal';

interface MerchantDashboardProps {
  store: Store;
  categories: Category[];
  onOpenChatWithBuyer: (buyerId: string, buyerName: string) => void;
  onRefreshStore: () => void;
}

export const MerchantDashboard: React.FC<MerchantDashboardProps> = ({
  store,
  categories,
  onOpenChatWithBuyer,
  onRefreshStore,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'analytics'>(
    'overview'
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [, setLoading] = useState(true);

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [isHoursModalOpen, setIsHoursModalOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);

  // Search & Filter
  const [productSearch, setProductSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, ords] = await Promise.all([
        getStoreProducts(store.id),
        getStoreOrders(store.ownerId),
      ]);
      setProducts(prods || []);
      setOrders(ords || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [store.id]);

  // Statistics calculation
  const totalProductsCount = products.length;
  const availableProductsCount = products.filter((p) => p.isAvailable && !p.isSold).length;
  const soldProductsCount = products.filter((p) => p.isSold).length;

  const totalOrdersCount = orders.length;
  const newOrdersCount = orders.filter((o) => o.status === 'new').length;
  const completedOrders = orders.filter((o) => o.status === 'completed');
  const completedOrdersCount = completedOrders.length;
  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);

  const totalViews = products.reduce((sum, p) => sum + (p.viewsCount || 0), 0);
  const totalLikes = products.reduce((sum, p) => sum + (p.likesCount || 0), 0);

  const mostViewedProducts = [...products].sort((a, b) => b.viewsCount - a.viewsCount).slice(0, 3);
  const mostLikedProducts = [...products].sort((a, b) => b.likesCount - a.likesCount).slice(0, 3);

  const handleToggleSold = async (product: Product) => {
    try {
      await toggleProductSold(product.id, !product.isSold);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      await deleteProduct(productToDelete.id, store.id);
      setProductToDelete(null);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, status);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredProducts = products.filter((p) =>
    productSearch.trim() ? p.title.toLowerCase().includes(productSearch.toLowerCase()) : true
  );

  const filteredOrders = orders.filter((o) =>
    orderStatusFilter === 'all' ? true : o.status === orderStatusFilter
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 text-right">
      {/* Top Merchant Store Banner */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={store.logoUrl || 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=200'}
            alt={store.storeName}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover bg-slate-100 border border-slate-200 shadow-xs"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-[#101B3D] font-serif">{store.storeName}</h1>
              {store.isVerified && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#DDF7EC] text-[#07875F] text-xs font-bold">
                  <CheckCircle className="w-3.5 h-3.5" />
                  متجر موثّق
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              مدينة {store.city} • رسوم التوصيل: {store.deliveryFee.toLocaleString()} ر.ي
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs">
              <span className={`inline-flex items-center gap-1 font-bold ${store.isOpen ? 'text-[#07875F]' : 'text-slate-500'}`}>
                <span className={`w-2 h-2 rounded-full ${store.isOpen ? 'bg-[#07875F] animate-pulse' : 'bg-slate-400'}`}></span>
                {store.isOpen ? 'مفتوح الآن' : 'مغلق حالياً'}
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-600 font-medium">ساعات العمل: {typeof store.businessHours === 'string' ? store.businessHours : '8:00 ص - 10:00 م'}</span>
            </div>
          </div>
        </div>

        {/* Quick Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setEditingProduct(null);
              setIsProductModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#07875F] hover:bg-[#06704F] text-white text-xs font-extrabold shadow-md shadow-[#07875F]/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة منتج جديد (+)</span>
          </button>
          <button
            onClick={() => setIsCustomizerOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition border border-slate-200"
          >
            <Palette className="w-4 h-4 text-[#07875F]" />
            <span>خلفية المتجر</span>
          </button>
          <button
            onClick={() => setIsHoursModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition border border-slate-200"
          >
            <Clock className="w-4 h-4 text-[#07875F]" />
            <span>ساعات العمل</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition shrink-0 ${
            activeTab === 'overview'
              ? 'bg-[#07875F] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          نظرة عامة
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition shrink-0 flex items-center gap-1.5 ${
            activeTab === 'products'
              ? 'bg-[#07875F] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>إدارة المنتجات ({totalProductsCount})</span>
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition shrink-0 flex items-center gap-1.5 ${
            activeTab === 'orders'
              ? 'bg-[#07875F] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>الطلبات الواردة ({orders.length})</span>
          {newOrdersCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
              {newOrdersCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition shrink-0 flex items-center gap-1.5 ${
            activeTab === 'analytics'
              ? 'bg-[#07875F] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>الإحصائيات الدقيقة</span>
        </button>
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold">المنتجات المعروضة</span>
                <Package className="w-4 h-4 text-[#07875F]" />
              </div>
              <div className="text-2xl font-black text-[#101B3D]">{totalProductsCount}</div>
              <span className="text-[11px] text-[#07875F] font-medium mt-1 inline-block">
                {availableProductsCount} متاح للبيع • {soldProductsCount} مباع
              </span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold">الطلبات الجديدة</span>
                <ShoppingBag className="w-4 h-4 text-[#101B3D]" />
              </div>
              <div className="text-2xl font-black text-[#101B3D]">{newOrdersCount}</div>
              <span className="text-[11px] text-slate-500 font-medium mt-1 inline-block">
                من إجمالي {totalOrdersCount} طلب مسجل
              </span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold">المبيعات المكتملة</span>
                <TrendingUp className="w-4 h-4 text-[#07875F]" />
              </div>
              <div className="text-2xl font-black text-[#07875F]">{totalRevenue.toLocaleString()} <span className="text-xs">ر.ي</span></div>
              <span className="text-[11px] text-slate-500 font-medium mt-1 inline-block">
                تم تسليم {completedOrdersCount} طلب بنجاح
              </span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold">المشاهدات والإعجابات</span>
                <Eye className="w-4 h-4 text-[#07875F]" />
              </div>
              <div className="text-2xl font-black text-[#101B3D]">{totalViews}</div>
              <span className="text-[11px] text-rose-600 font-medium mt-1 inline-block">
                ❤️ {totalLikes} إعجاب بالمنتجات
              </span>
            </div>
          </div>

          {/* Recent Orders Overview */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-[#101B3D] text-sm sm:text-base flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[#07875F]" />
                أحدث طلبات المشترين
              </h3>
              <button
                onClick={() => setActiveTab('orders')}
                className="text-xs text-[#07875F] font-bold hover:underline"
              >
                عرض الكل ({orders.length})
              </button>
            </div>

            {orders.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                لا توجد طلبات جديدة واردة حتى الآن.
              </div>
            ) : (
              <div className="space-y-3">
                {orders.slice(0, 3).map((order) => (
                  <div
                    key={order.id}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#101B3D]">طلب من: {order.buyerName}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getOrderStatusBadge(order.status)}`}>
                          {getOrderStatusArabic(order.status)}
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        {order.items.length} أصناف • {order.total.toLocaleString()} ر.ي • {order.city}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpenChatWithBuyer(order.buyerId, order.buyerName)}
                        className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center gap-1 font-semibold"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-[#07875F]" />
                        <span>مراسلة المشتري</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Products */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="ابحث في منتجات متجرك..."
                className="w-full pr-9 pl-3 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-[#07875F]"
              />
            </div>
            <button
              onClick={() => {
                setEditingProduct(null);
                setIsProductModalOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#07875F] hover:bg-[#06704F] text-white text-xs font-bold shadow-md shadow-[#07875F]/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة منتج (+)</span>
            </button>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-500 space-y-3">
              <Package className="w-12 h-12 mx-auto text-slate-300" />
              <h4 className="font-bold text-[#101B3D] text-sm">لا توجد منتجات مسجلة</h4>
              <p className="text-xs max-w-sm mx-auto">
                ابدأ بإضافة أول منتج في متجرك ليعرض مباشرة للمشترين في بيحان وشبوة.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl border border-slate-200 p-3.5 flex flex-col justify-between shadow-2xs hover:shadow-md transition"
                >
                  <div className="flex gap-3">
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      className="w-20 h-20 rounded-xl object-cover bg-slate-100 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        {product.isSold ? (
                          <span className="bg-red-100 text-red-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded">
                            تم البيع
                          </span>
                        ) : product.isAvailable ? (
                          <span className="bg-[#DDF7EC] text-[#07875F] text-[10px] font-bold px-1.5 py-0.5 rounded">
                            متاح ({product.quantity})
                          </span>
                        ) : (
                          <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                            غير متوفر
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500">{product.condition === 'new' ? 'جديد' : 'مستعمل'}</span>
                      </div>
                      <h4 className="font-bold text-xs text-[#101B3D] line-clamp-1">{product.title}</h4>
                      <p className="text-xs font-extrabold text-[#07875F] mt-1">
                        {product.price.toLocaleString()} ر.ي
                      </p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1">
                        <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" /> {product.viewsCount || 0}</span>
                        <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" /> {product.likesCount || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 mt-3 flex items-center justify-between gap-1 text-xs">
                    <button
                      onClick={() => handleToggleSold(product)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                        product.isSold
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          : 'bg-[#DDF7EC] hover:bg-[#cbf2e2] text-[#056B4B]'
                      }`}
                    >
                      {product.isSold ? 'إلغاء البيع' : 'تحديد كمباع ✓'}
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingProduct(product);
                          setIsProductModalOpen(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-[#07875F] rounded-lg hover:bg-slate-100 transition"
                        title="تعديل المنتج"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setProductToDelete(product)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                        title="حذف المنتج"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Orders */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
              <button
                onClick={() => setOrderStatusFilter('all')}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  orderStatusFilter === 'all' ? 'bg-white shadow-2xs text-[#101B3D]' : 'text-slate-500'
                }`}
              >
                الكل ({orders.length})
              </button>
              <button
                onClick={() => setOrderStatusFilter('new')}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  orderStatusFilter === 'new' ? 'bg-white shadow-2xs text-[#07875F]' : 'text-slate-500'
                }`}
              >
                الجديدة ({orders.filter((o) => o.status === 'new').length})
              </button>
              <button
                onClick={() => setOrderStatusFilter('accepted')}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  orderStatusFilter === 'accepted' ? 'bg-white shadow-2xs text-blue-600' : 'text-slate-500'
                }`}
              >
                المقبولة
              </button>
              <button
                onClick={() => setOrderStatusFilter('completed')}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  orderStatusFilter === 'completed' ? 'bg-white shadow-2xs text-emerald-600' : 'text-slate-500'
                }`}
              >
                المكتملة
              </button>
            </div>
            <button
              onClick={loadData}
              className="p-2 text-slate-500 hover:text-[#101B3D] rounded-xl hover:bg-slate-100 transition"
              title="تحديث قائمة الطلبات"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-500">
              لا توجد طلبات تطابق هذا التصنيف.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-[#101B3D]">طلب: #{order.id.slice(-6)}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getOrderStatusBadge(order.status)}`}>
                          {getOrderStatusArabic(order.status)}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 mt-0.5 block">
                        تاريخ الطلب: {new Date(order.createdAt).toLocaleString('ar-YE')}
                      </span>
                    </div>

                    <div className="text-right sm:text-left">
                      <span className="text-xs text-slate-500 block">المبلغ الإجمالي:</span>
                      <span className="text-base font-black text-[#07875F]">{order.total.toLocaleString()} ر.ي</span>
                    </div>
                  </div>

                  {/* Buyer details */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl text-xs text-slate-700">
                    <div>
                      <span className="text-slate-400 block text-[10px]">اسم المشتري:</span>
                      <span className="font-bold">{order.buyerName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">هاتف التوصيل:</span>
                      <span className="font-bold font-mono">{order.buyerPhone}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">عنوان التسليم:</span>
                      <span className="font-medium">{order.deliveryAddress} ({order.city})</span>
                    </div>
                  </div>

                  {/* Order items */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-slate-500">المنتجات المطلوبة:</span>
                    {order.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                        <span className="text-slate-800 font-medium">{it.title} × {it.quantity}</span>
                        <span className="font-bold text-slate-700">{(it.price * it.quantity).toLocaleString()} ر.ي</span>
                      </div>
                    ))}
                  </div>

                  {/* Order Workflow Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectedOrderDetails(order)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 border border-slate-200 text-xs font-bold hover:bg-slate-200 transition flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-600" />
                        <span>تفاصيل الطلب الكاملة</span>
                      </button>

                      <button
                        onClick={() => onOpenChatWithBuyer(order.buyerId, order.buyerName)}
                        className="px-3 py-1.5 rounded-xl bg-[#DDF7EC] text-[#056B4B] border border-[#C0F0DD] text-xs font-bold hover:bg-[#cbf2e2] transition flex items-center gap-1"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>محادثة المشتري</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {order.status === 'new' && (
                        <>
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'accepted')}
                            className="px-3 py-1.5 rounded-xl bg-[#07875F] hover:bg-[#06704F] text-white text-xs font-bold transition"
                          >
                            قبول الطلب ✓
                          </button>
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'rejected')}
                            className="px-3 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold transition"
                          >
                            رفض الطلب ✕
                          </button>
                        </>
                      )}

                      {order.status === 'accepted' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(order.id, 'preparing')}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition"
                        >
                          تجهيز الطلب ⏳
                        </button>
                      )}

                      {order.status === 'preparing' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(order.id, 'out_for_delivery')}
                          className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition"
                        >
                          خرج للتوصيل 🛵
                        </button>
                      )}

                      {order.status === 'out_for_delivery' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(order.id, 'completed')}
                          className="px-3 py-1.5 rounded-xl bg-[#07875F] hover:bg-[#06704F] text-white text-xs font-bold transition"
                        >
                          تم التسليم واكتمال البيع ✓✓
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Analytics */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-[#101B3D] text-base">إحصائيات الأداء الحقيقية</h3>
              <div className="text-xs text-slate-500 font-medium bg-slate-100 px-3 py-1 rounded-xl">
                بيانات دقيقة ومحدثة من قاعدة البيانات
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-xs text-slate-500 block mb-1">إجمالي المنتجات المنشورة</span>
                <span className="text-2xl font-black text-[#101B3D]">{totalProductsCount}</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-xs text-slate-500 block mb-1">المنتجات المتوفرة</span>
                <span className="text-2xl font-black text-[#07875F]">{availableProductsCount}</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-xs text-slate-500 block mb-1">المنتجات المباعة</span>
                <span className="text-2xl font-black text-[#101B3D]">{soldProductsCount}</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-xs text-slate-500 block mb-1">إجمالي الطلبات</span>
                <span className="text-2xl font-black text-[#101B3D]">{totalOrdersCount}</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-xs text-slate-500 block mb-1">المبيعات المكتملة</span>
                <span className="text-2xl font-black text-[#07875F]">{completedOrdersCount}</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-xs text-slate-500 block mb-1">إجمالي إيراد المبيعات</span>
                <span className="text-2xl font-black text-[#07875F]">{totalRevenue.toLocaleString()} <span className="text-xs">ر.ي</span></span>
              </div>
            </div>

            {/* Most viewed & liked list */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              <div>
                <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-[#07875F]" />
                  أكثر المنتجات مشاهدة في متجرك
                </h4>
                {mostViewedProducts.length === 0 ? (
                  <p className="text-xs text-slate-400">لا توجد بيانات مشاهدات بعد.</p>
                ) : (
                  <div className="space-y-2">
                    {mostViewedProducts.map((p) => (
                      <div key={p.id} className="p-2.5 rounded-xl bg-slate-50 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 truncate max-w-[200px]">{p.title}</span>
                        <span className="font-bold text-[#07875F]">{p.viewsCount || 0} مشاهدة</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-rose-600" />
                  أكثر المنتجات إعجاباً من الزوار
                </h4>
                {mostLikedProducts.length === 0 ? (
                  <p className="text-xs text-slate-400">لا توجد إعجابات مسجلة بعد.</p>
                ) : (
                  <div className="space-y-2">
                    {mostLikedProducts.map((p) => (
                      <div key={p.id} className="p-2.5 rounded-xl bg-slate-50 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 truncate max-w-[200px]">{p.title}</span>
                        <span className="font-bold text-rose-700">{p.likesCount || 0} إعجاب</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {isProductModalOpen && (
        <ProductFormModal
          isOpen={isProductModalOpen}
          onClose={() => setIsProductModalOpen(false)}
          onSuccess={loadData}
          storeId={store.id}
          storeName={store.storeName}
          ownerId={store.ownerId}
          categories={categories}
          productToEdit={editingProduct}
        />
      )}

      {isCustomizerOpen && (
        <StoreCustomizerModal
          isOpen={isCustomizerOpen}
          onClose={() => setIsCustomizerOpen(false)}
          store={store}
          onSuccess={() => {
            onRefreshStore();
            loadData();
          }}
        />
      )}

      {isHoursModalOpen && (
        <WorkingHoursModal
          isOpen={isHoursModalOpen}
          onClose={() => setIsHoursModalOpen(false)}
          store={store}
          onSuccess={() => {
            onRefreshStore();
            loadData();
          }}
        />
      )}

      {/* Delete Product Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#101B3D]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 border border-slate-100 shadow-2xl space-y-3 text-right">
            <h3 className="font-extrabold text-sm text-[#101B3D]">تأكيد حذف المنتج</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف المنتج «<strong>{productToDelete.title}</strong>» نهائياً من متجرك؟
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={confirmDeleteProduct}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-sm"
              >
                حذف المنتج
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Order Details Modal */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#101B3D]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh] text-right">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-[#F4F7FA]">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#DDF7EC] text-[#07875F] flex items-center justify-center font-bold">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-[#101B3D] text-sm sm:text-base">
                    تفاصيل الطلب: #{selectedOrderDetails.id.slice(-6)}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{new Date(selectedOrderDetails.createdAt).toLocaleString('ar-YE')}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getOrderStatusBadge(selectedOrderDetails.status)}`}>
                      {getOrderStatusArabic(selectedOrderDetails.status)}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrderDetails(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs">
              {/* Buyer Contact Card (Private to this store) */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="font-bold text-slate-800 text-xs">بيانات العميل المستلم (سرية للمتجر):</span>
                  <a
                    href={`tel:${selectedOrderDetails.buyerPhone}`}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-[#07875F] text-white rounded-xl font-bold text-[11px] hover:bg-[#06704F] transition"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>اتصال بالعميل</span>
                  </a>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                  <div>
                    <span className="text-slate-400 block text-[10px]">اسم العميل:</span>
                    <span className="font-bold text-slate-900">{selectedOrderDetails.buyerName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">رقم هاتف التواصل:</span>
                    <span className="font-bold font-mono text-slate-900">{selectedOrderDetails.buyerPhone}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">منطقة التسليم في بيحان:</span>
                    <span className="font-medium text-slate-800">{selectedOrderDetails.city}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">عنوان التوصيل بالتفصيل:</span>
                    <span className="font-medium text-slate-800">{selectedOrderDetails.deliveryAddress}</span>
                  </div>
                </div>
                {selectedOrderDetails.notes && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-slate-400 block text-[10px]">ملاحظات العميل:</span>
                    <p className="text-slate-800 italic">{selectedOrderDetails.notes}</p>
                  </div>
                )}
              </div>

              {/* Requested Products Items */}
              <div className="space-y-3">
                <span className="font-bold text-slate-800 text-xs block">المنتجات المطلوبة:</span>
                <div className="space-y-2.5">
                  {selectedOrderDetails.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-14 h-14 rounded-xl object-cover border border-slate-200 bg-slate-50 shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                            <Package className="w-6 h-6" />
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs">{item.title}</h4>
                          <span className="text-[10px] text-slate-400 block">معرّف المنتج: {item.productId}</span>
                          <span className="text-[11px] text-[#07875F] font-bold">
                            {item.price.toLocaleString()} ر.ي {item.priceSar ? `(${item.priceSar} ر.س)` : ''} × {item.quantity} قطعة
                          </span>
                        </div>
                      </div>

                      <div className="text-left sm:text-right w-full sm:w-auto">
                        <span className="text-[10px] text-slate-400 block">الإجمالي:</span>
                        <span className="font-black text-slate-800 text-xs">
                          {(item.price * item.quantity).toLocaleString()} ر.ي
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="bg-[#F4F7FA] rounded-2xl p-4 border border-slate-200 space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>قيمة المنتجات:</span>
                  <span className="font-semibold">{selectedOrderDetails.subtotal.toLocaleString()} ر.ي</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>رسوم التوصيل:</span>
                  <span className="font-semibold">{selectedOrderDetails.deliveryFee.toLocaleString()} ر.ي</span>
                </div>
                <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold text-[#101B3D]">
                  <span className="text-sm">المبلغ الإجمالي للطلب:</span>
                  <span className="text-base font-black text-[#07875F]">
                    {selectedOrderDetails.total.toLocaleString()} ر.ي
                  </span>
                </div>
              </div>

              {/* Workflow Actions */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <span className="font-bold text-slate-700 block text-[11px]">تحديث حالة الطلب:</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      handleUpdateOrderStatus(selectedOrderDetails.id, 'accepted');
                      setSelectedOrderDetails((prev) => (prev ? { ...prev, status: 'accepted' } : null));
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold transition ${
                      selectedOrderDetails.status === 'accepted'
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                    }`}
                  >
                    قبول الطلب ✓
                  </button>
                  <button
                    onClick={() => {
                      handleUpdateOrderStatus(selectedOrderDetails.id, 'preparing');
                      setSelectedOrderDetails((prev) => (prev ? { ...prev, status: 'preparing' } : null));
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold transition ${
                      selectedOrderDetails.status === 'preparing'
                        ? 'bg-purple-600 text-white'
                        : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
                    }`}
                  >
                    تجهيز الطلب ⏳
                  </button>
                  <button
                    onClick={() => {
                      handleUpdateOrderStatus(selectedOrderDetails.id, 'out_for_delivery');
                      setSelectedOrderDetails((prev) => (prev ? { ...prev, status: 'out_for_delivery' } : null));
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold transition ${
                      selectedOrderDetails.status === 'out_for_delivery'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
                    }`}
                  >
                    خرج للتوصيل 🛵
                  </button>
                  <button
                    onClick={() => {
                      handleUpdateOrderStatus(selectedOrderDetails.id, 'completed');
                      setSelectedOrderDetails((prev) => (prev ? { ...prev, status: 'completed' } : null));
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold transition ${
                      selectedOrderDetails.status === 'completed'
                        ? 'bg-[#07875F] text-white'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    }`}
                  >
                    تم التسليم واكتمال البيع ✓✓
                  </button>
                  <button
                    onClick={() => {
                      handleUpdateOrderStatus(selectedOrderDetails.id, 'rejected');
                      setSelectedOrderDetails((prev) => (prev ? { ...prev, status: 'rejected' } : null));
                    }}
                    className="px-3 py-1.5 rounded-xl font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 transition"
                  >
                    اعتذار / رفض الطلب ✕
                  </button>
                </div>
              </div>

              {/* Chat with buyer */}
              <div className="pt-2">
                <button
                  onClick={() => {
                    onOpenChatWithBuyer(selectedOrderDetails.buyerId, selectedOrderDetails.buyerName);
                    setSelectedOrderDetails(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#DDF7EC] text-[#056B4B] border border-[#C0F0DD] font-bold hover:bg-[#cbf2e2] transition flex items-center justify-center gap-1.5"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>فتح محادثة مباشرة مع العميل</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function getOrderStatusBadge(status: OrderStatus): string {
  switch (status) {
    case 'new':
      return 'bg-[#DDF7EC] text-[#07875F]';
    case 'accepted':
      return 'bg-blue-100 text-blue-800';
    case 'preparing':
      return 'bg-purple-100 text-purple-800';
    case 'out_for_delivery':
      return 'bg-indigo-100 text-indigo-800';
    case 'completed':
      return 'bg-emerald-100 text-emerald-800';
    case 'cancelled':
    case 'rejected':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function getOrderStatusArabic(status: OrderStatus): string {
  switch (status) {
    case 'new':
      return 'جديد';
    case 'pending_confirmation':
      return 'قيد التأكيد';
    case 'accepted':
      return 'مقبول';
    case 'preparing':
      return 'قيد التجهيز';
    case 'out_for_delivery':
      return 'خرج للتوصيل';
    case 'completed':
      return 'مكتمل ومسلّم';
    case 'cancelled':
      return 'ملغى';
    case 'rejected':
      return 'مرفوض';
    default:
      return status;
  }
}
