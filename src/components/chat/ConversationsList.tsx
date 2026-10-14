import React, { useEffect, useState } from 'react';
import { MessageSquare, Store, User, Clock, Star, Award } from 'lucide-react';
import { Chat } from '../../types';
import { getUserChats } from '../../services/chatService';
import { useAuth } from '../../context/AuthContext';
import { StoreRatingModal } from '../common/StoreRatingModal';

interface ConversationsListProps {
  onSelectChat: (chat: Chat) => void;
}

export const ConversationsList: React.FC<ConversationsListProps> = ({ onSelectChat }) => {
  const { currentUser } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingChat, setRatingChat] = useState<Chat | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    getUserChats(currentUser.uid)
      .then((c) => setChats(c || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-3">
        <MessageSquare className="w-12 h-12 mx-auto text-slate-300" />
        <h3 className="font-extrabold text-[#101B3D] text-base">تسجيل الدخول مطلوب</h3>
        <p className="text-xs text-slate-500">
          يرجى تسجيل الدخول للوصول إلى رسائلك ومحادثاتك مع المتاجر والبائعين في رواق.
        </p>
      </div>
    );
  }

  if (loading) {
    return <div className="py-16 text-center text-xs text-slate-400">جارٍ تحميل الرسائل...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4 text-right">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-[#101B3D] font-serif">الرسائل والمحادثات</h2>
          <p className="text-xs text-slate-500">مراسلاتك المباشرة مع المتاجر والزبائن</p>
        </div>
        <span className="text-xs font-bold text-[#07875F] bg-[#DDF7EC] px-3 py-1 rounded-xl">
          {chats.length} محادثات
        </span>
      </div>

      {chats.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-500 space-y-2">
          <MessageSquare className="w-12 h-12 mx-auto text-slate-300" />
          <h4 className="font-bold text-[#101B3D] text-sm">لا توجد محادثات سابقة</h4>
          <p className="text-xs max-w-sm mx-auto">
            عند تصفحك لأي متجر أو منتج في بيحان وشبوة، اضغط على زر «مراسلة المتجر» لبدء التواصل المباشر.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {chats.map((chat) => {
            const isStoreOwner = currentUser.uid === chat.storeOwnerId;
            const title = isStoreOwner ? chat.buyerName : chat.storeName;

            return (
              <div
                key={chat.id}
                onClick={() => onSelectChat(chat)}
                className="bg-white hover:bg-slate-50 rounded-2xl p-4 border border-slate-200 shadow-2xs hover:shadow-md transition cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-[#DDF7EC] text-[#07875F] flex items-center justify-center font-bold shrink-0">
                    {isStoreOwner ? <User className="w-5 h-5" /> : <Store className="w-5 h-5" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-[#101B3D] truncate">{title}</h4>
                      {!isStoreOwner && (
                        <span className="text-[10px] bg-[#DDF7EC] text-[#07875F] px-1.5 py-0.2 rounded font-bold">
                          متجر
                        </span>
                      )}
                      {chat.productTitle && (
                        <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold truncate max-w-[140px]">
                          {chat.productTitle}
                        </span>
                      )}
                      {chat.agreedPrice && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-extrabold">
                          اتفاق: {chat.agreedPrice.toLocaleString()} ر.ي
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5 max-w-md">
                      {chat.lastMessageText || 'محادثة جديدة'}
                    </p>
                  </div>
                </div>

                <div className="text-left shrink-0 flex flex-col items-end gap-1.5">
                  <span className="text-[10px] text-slate-400 block flex items-center gap-1 justify-end">
                    <Clock className="w-3 h-3" />
                    {new Date(chat.lastMessageTimestamp).toLocaleDateString('ar-YE', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  {!isStoreOwner && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRatingChat(chat);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-[11px] font-bold transition shadow-2xs"
                      title="تقييم المتجر بعد التواصل"
                    >
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                      <span>تقييم المتجر</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Store Rating Modal */}
      {ratingChat && (
        <StoreRatingModal
          isOpen={!!ratingChat}
          onClose={() => setRatingChat(null)}
          storeId={ratingChat.storeId}
          storeName={ratingChat.storeName}
          defaultInteractionType="chat"
          onReviewSuccess={() => setRatingChat(null)}
        />
      )}
    </div>
  );
};
