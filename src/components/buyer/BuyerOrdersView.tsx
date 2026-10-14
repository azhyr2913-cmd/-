import React, { useEffect, useState } from 'react';
import { ClipboardList, ShoppingBag, Star } from 'lucide-react';
import { Order, OrderStatus } from '../../types';
import { getBuyerOrders, getOrderById } from '../../services/orderService';
import { useAuth } from '../../context/AuthContext';
import { StoreRatingModal } from '../common/StoreRatingModal';

export const BuyerOrdersView: React.FC = () => {
  const { currentUser, login } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingOrder, setRatingOrder] = useState<Order | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      const allOrders: Order[] = [];

      try {
        if (currentUser) {
          const userOrders = await getBuyerOrders(currentUser.uid);
          if (userOrders) allOrders.push(...userOrders);
        }

        // Also fetch any guest orders saved locally
        const guestIds: string[] = JSON.parse(localStorage.getItem('rawaq_guest_orders') || '[]');
        for (const gId of guestIds) {
          if (!allOrders.some((o) => o.id === gId)) {
            const gOrder = await getOrderById(gId);
            if (gOrder) allOrders.push(gOrder);
          }
        }

        setOrders(allOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      } catch (err) {
        console.error('Error loading orders:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [currentUser]);

  if (!currentUser && orders.length === 0 && !loading) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center space-y-3">
        <ClipboardList className="w-12 h-12 mx-auto text-slate-300" />
        <h3 className="font-extrabold text-[#101B3D] text-base">سجل الطلبات والمشتريات</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          لم تقم بأي طلبات بعد. يمكنك تصفح سوق بيحان وتقديم طلب كزائر مباشرة أو تسجيل الدخول لحفظ طلباتك.
        </p>
        <button
          onClick={login}
          className="px-6 py-2.5 rounded-xl bg-[#07875F] hover:bg-[#06704F] text-white text-xs font-bold transition shadow-sm"
        >
          تسجيل الدخول / إنشاء حساب
        </button>
      </div>
    );
  }

  if (loading) {
    return <div className="py-16 text-center text-xs text-slate-400">جارٍ تحميل قائمة طلباتك...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4 text-right">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-[#101B3D] font-serif">طلباتي ومشترياتي</h2>
          <p className="text-xs text-slate-500">تتبع حالة طلباتك والتوصيل من المحلات</p>
        </div>
        <span className="text-xs font-bold text-[#07875F] bg-[#DDF7EC] px-3 py-1 rounded-xl">
          {orders.length} طلبات
        </span>
      </div>

      {orders.length > 0 && (
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3 flex items-center gap-2.5 text-xs text-amber-900">
          <Star className="w-4 h-4 fill-amber-500 text-amber-500 shrink-0" />
          <span>
            <strong>نظام التقييم وبناء الثقة:</strong> تقييمك للمتجر بعد كل طلب يساعد أهالي بيحان في معرفة أفضل المتاجر ويحفز التجار على جودة الخدمة.
          </span>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-500 space-y-2">
          <ShoppingBag className="w-12 h-12 mx-auto text-slate-300" />
          <h4 className="font-bold text-[#101B3D] text-sm">لم تقم بأي طلب بعد</h4>
          <p className="text-xs max-w-sm mx-auto">
            تصفح المعروضات في بيحان واطلب ما ترغب به وسيتواصل معك التاجر لتوصيله.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-[#101B3D]">متجر: {order.storeName}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getOrderStatusBadge(order.status)}`}>
                      {getOrderStatusArabic(order.status)}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    رقم الطلب: #{order.id.slice(-6)} • {new Date(order.createdAt).toLocaleDateString('ar-YE')}
                  </span>
                </div>

                <div className="text-right sm:text-left">
                  <span className="text-xs text-slate-500 block">المبلغ الإجمالي:</span>
                  <span className="text-base font-black text-[#07875F]">{order.total.toLocaleString()} ر.ي</span>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1">
                    <span className="text-slate-800 font-medium">
                      {item.title} × {item.quantity}
                    </span>
                    <span className="font-bold text-slate-700">
                      {(item.price * item.quantity).toLocaleString()} ر.ي
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span>عنوان التوصيل: {order.deliveryAddress} ({order.city})</span>
                  <span className="font-bold text-[#07875F] mr-2">• الدفع عند الاستلام</span>
                </div>

                <button
                  onClick={() => setRatingOrder(order)}
                  className="self-end sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition border border-amber-200 shadow-2xs"
                >
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <span>تقييم المتجر</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Store Rating Modal */}
      {ratingOrder && (
        <StoreRatingModal
          isOpen={!!ratingOrder}
          onClose={() => setRatingOrder(null)}
          storeId={ratingOrder.storeId}
          storeName={ratingOrder.storeName}
          orderId={ratingOrder.id}
          defaultInteractionType="purchase"
          onReviewSuccess={() => setRatingOrder(null)}
        />
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
      return 'جديد بانتظار التأكيد';
    case 'accepted':
      return 'تم قبول الطلب';
    case 'preparing':
      return 'جارٍ التجهيز بالمحل';
    case 'out_for_delivery':
      return 'خرج مع مندوب التوصيل';
    case 'completed':
      return 'تم التسليم بنجاح';
    case 'cancelled':
      return 'تم الإلغاء';
    case 'rejected':
      return 'مرفوض';
    default:
      return status;
  }
}
