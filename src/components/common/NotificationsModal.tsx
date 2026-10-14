import React from 'react';
import {
  Bell,
  X,
  CheckCheck,
  MessageSquare,
  ShoppingBag,
  Truck,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { AppNotification } from '../../types';
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from '../../services/notificationService';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  userId: string;
  onNavigate: (view: string, targetId?: string) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  userId,
  onNavigate,
}) => {
  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleItemClick = async (notif: AppNotification) => {
    if (!notif.isRead) {
      await markNotificationAsRead(notif.id);
    }
    onClose();

    if (notif.type === 'new_message') {
      onNavigate('chats', notif.linkUrl);
    } else if (notif.type === 'new_order') {
      onNavigate('merchant');
    } else if (notif.type === 'order_status') {
      onNavigate('orders');
    }
  };

  const handleMarkAllRead = async () => {
    if (userId) {
      await markAllNotificationsAsRead(userId);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteNotification(id);
  };

  const formatRelativeTime = (isoString: string) => {
    const diff = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 2) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    if (days === 1) return 'أمس';
    if (days < 30) return `منذ ${days} أيام`;
    return new Date(isoString).toLocaleDateString('ar-YE');
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'new_message':
        return (
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
        );
      case 'new_order':
        return (
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-4 h-4" />
          </div>
        );
      case 'order_status':
        return (
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Truck className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center sm:justify-end sm:p-4 bg-slate-900/40 backdrop-blur-xs text-right">
      <div
        className="w-full sm:max-w-md bg-white sm:rounded-3xl shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-4 sm:slide-in-from-right-4 duration-200 mt-2 sm:mt-14 sm:ml-4"
        dir="rtl"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-[#F4F7FA] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#DDF7EC] text-[#07875F] flex items-center justify-center font-bold">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-[#101B3D]">
                الإشعارات والتنبيهات
              </h3>
              <p className="text-[11px] text-slate-400">
                {unreadCount > 0 ? `${unreadCount} إشعار غير مقروء` : 'جميع الإشعارات مقروءة'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-bold text-[#07875F] hover:underline flex items-center gap-1 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs"
                title="تحديد كل الإشعارات كمقروءة"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>قراءة الكل</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 sm:p-3 space-y-1">
          {notifications.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <Bell className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-[#101B3D]">لا توجد إشعارات حالياً</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                ستصلك التنبيهات هنا فور تلقي رسالة في المحادثات أو تحديث على طلبات الشراء.
              </p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleItemClick(notif)}
                className={`group p-3 sm:p-3.5 rounded-2xl transition cursor-pointer flex items-start gap-3 relative ${
                  notif.isRead
                    ? 'bg-white hover:bg-slate-50 text-slate-600'
                    : 'bg-emerald-50/50 hover:bg-emerald-50 text-[#101B3D] border border-emerald-100/80 shadow-2xs'
                }`}
              >
                {getIcon(notif.type)}

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4
                      className={`text-xs sm:text-sm font-bold truncate ${
                        notif.isRead ? 'text-slate-800' : 'text-[#07875F]'
                      }`}
                    >
                      {notif.title}
                    </h4>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {formatRelativeTime(notif.createdAt)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {notif.body}
                  </p>

                  <div className="pt-1 flex items-center justify-between text-[11px]">
                    <span className="text-[#07875F] font-semibold flex items-center gap-1 group-hover:underline">
                      <span>عرض التفاصيل</span>
                      <ExternalLink className="w-3 h-3" />
                    </span>

                    <button
                      onClick={(e) => handleDelete(e, notif.id)}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition opacity-0 group-hover:opacity-100"
                      title="حذف الإشعار"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {!notif.isRead && (
                  <span className="w-2 h-2 rounded-full bg-[#07875F] shrink-0 mt-2" />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
