import React, { useEffect, useRef, useState } from 'react';
import {
  Send,
  ArrowRight,
  Image as ImageIcon,
  ShieldAlert,
  CheckCheck,
  User,
  Store,
  Star,
  Award,
  Handshake,
  ShoppingBag,
  CheckCircle,
  XCircle,
  Tag,
  Clock,
} from 'lucide-react';
import { Chat, Message, StoreReview } from '../../types';
import { auth } from '../../firebase/config';
import { signInAsGuest } from '../../firebase/auth';
import { sendMessage, subscribeToMessages, respondToPriceOffer } from '../../services/chatService';
import { getUserStoreReview } from '../../services/storeReviewService';
import { useAuth } from '../../context/AuthContext';
import { StoreRatingModal } from '../common/StoreRatingModal';

interface ChatWindowProps {
  chat: Chat;
  onBack: () => void;
  onOpenStorePage?: (storeId: string) => void;
  onBuyAtAgreedPrice?: (chat: Chat, price: number) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  chat,
  onBack,
  onOpenStorePage,
  onBuyAtAgreedPrice,
}) => {
  const { currentUser, userProfile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [selectedStar, setSelectedStar] = useState<number>(5);
  const [userReview, setUserReview] = useState<StoreReview | null>(null);

  // Negotiation price offer popup
  const [showOfferInput, setShowOfferInput] = useState(false);
  const [customOfferAmount, setCustomOfferAmount] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isStoreOwner = currentUser?.uid === chat.storeOwnerId;
  const otherPartyName = isStoreOwner ? chat.buyerName : chat.storeName;

  const loadUserReview = () => {
    if (!isStoreOwner && currentUser && chat.storeId) {
      getUserStoreReview(currentUser.uid, chat.storeId)
        .then((rev) => {
          setUserReview(rev);
          if (rev) setSelectedStar(rev.rating);
        })
        .catch(console.error);
    }
  };

  useEffect(() => {
    loadUserReview();
  }, [currentUser, chat.storeId, isStoreOwner]);

  useEffect(() => {
    if (!chat.id) return;

    let unsubscribe: (() => void) | undefined;
    let isMounted = true;

    const initSubscription = async () => {
      // Ensure session is initialized
      if (!auth.currentUser && !currentUser) {
        try {
          await signInAsGuest();
        } catch (e) {
          console.warn('Anonymous session init warning:', e);
        }
      }

      if (!isMounted) return;

      unsubscribe = subscribeToMessages(chat.id, (msgs) => {
        if (!isMounted) return;
        setMessages(msgs);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      });
    };

    initSubscription();

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [chat.id, currentUser]);

  const handleSend = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = (customText !== undefined ? customText : inputText).trim();
    const imgToSend = imageUrl.trim();

    const activeUser = auth.currentUser || currentUser;
    if (!activeUser || (!textToSend && !imgToSend)) return;

    setIsSending(true);
    if (customText === undefined) {
      setInputText('');
    }
    setImageUrl('');
    setShowImageInput(false);

    try {
      await sendMessage({
        chatId: chat.id,
        senderId: activeUser.uid,
        senderName: userProfile?.name || activeUser.displayName || (isStoreOwner ? chat.storeName : chat.buyerName),
        text: textToSend,
        imageUrl: imgToSend || undefined,
        isStoreOwner,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendPriceOffer = async () => {
    const raw = customOfferAmount.replace(/[^\d.]/g, '');
    const amount = Number(raw);
    if (!amount || amount <= 0 || !currentUser) return;

    setIsSending(true);
    setShowOfferInput(false);
    setCustomOfferAmount('');

    try {
      await sendMessage({
        chatId: chat.id,
        senderId: currentUser.uid,
        senderName: userProfile?.name || currentUser.displayName || (isStoreOwner ? chat.storeName : chat.buyerName),
        text: `🤝 أقترح سد السعر على ${amount.toLocaleString()} ريال يمني، هل يناسبكم؟`,
        priceOffer: {
          amount,
          status: 'pending',
          proposedBy: isStoreOwner ? 'seller' : 'buyer',
          productTitle: chat.productTitle,
          productId: chat.productId,
        },
        isStoreOwner,
      });
    } catch (err) {
      console.error('Error proposing price:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleOfferResponse = async (msgId: string, accept: boolean, amount: number) => {
    if (!currentUser) return;
    setActionLoading(msgId);
    try {
      await respondToPriceOffer({
        chatId: chat.id,
        messageId: msgId,
        accept,
        offerAmount: amount,
        responderId: currentUser.uid,
        responderName: userProfile?.name || currentUser.displayName || (isStoreOwner ? chat.storeName : chat.buyerName),
        isStoreOwner,
      });
    } catch (err) {
      console.error('Error responding to offer:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const [abuseReported, setAbuseReported] = useState(false);

  const handleReportAbuse = () => {
    setAbuseReported(true);
    setTimeout(() => setAbuseReported(false), 5000);
  };

  // Find latest agreed price from messages or chat doc
  const agreedPrice = chat.agreedPrice || messages.find(m => m.priceOffer?.status === 'accepted')?.priceOffer?.amount;

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 py-4 min-h-[80vh] flex flex-col">
      {abuseReported && (
        <div className="mb-2 p-3 bg-[#DDF7EC] border border-[#C0F0DD] text-[#056B4B] rounded-2xl text-xs text-center font-bold">
          تم استلام إبلاغك وسيقوم المشرف بمراجعة الرسائل للحفاظ على سلامة المجتمع التجاري في رواق.
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-md flex-1 flex flex-col overflow-hidden max-h-[85vh]">
        {/* Chat Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-[#F4F7FA] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1.5 rounded-xl text-slate-600 hover:bg-slate-200 transition"
              title="رجوع للمحادثات"
            >
              <ArrowRight className="w-5 h-5" />
            </button>

            <div className="w-9 h-9 rounded-full bg-[#DDF7EC] text-[#07875F] flex items-center justify-center font-bold">
              {isStoreOwner ? <User className="w-5 h-5" /> : <Store className="w-5 h-5" />}
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-sm text-[#101B3D]">{otherPartyName}</h3>
                {!isStoreOwner && (
                  <span className="text-[10px] bg-[#DDF7EC] text-[#07875F] px-1.5 rounded font-bold">متجر</span>
                )}
              </div>
              <p className="text-[10px] text-[#07875F] font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#07875F]"></span>
                محادثة مشفرة لحماية الخصوصية وسد الأسعار في بيحان
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {!isStoreOwner && (
              <button
                onClick={() => {
                  setSelectedStar(userReview?.rating || 5);
                  setIsRatingModalOpen(true);
                }}
                className="px-2.5 py-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition inline-flex items-center gap-1 shadow-2xs"
                title="تقييم المتجر بعد التواصل"
              >
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <span>{userReview ? `تقييمك (${userReview.rating}★)` : 'تقييم المتجر'}</span>
              </button>
            )}
            <button
              onClick={handleReportAbuse}
              className="p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 transition"
              title="إبلاغ عن محتوى مسيء"
            >
              <ShieldAlert className="w-4 h-4" />
            </button>
            {!isStoreOwner && onOpenStorePage && (
              <button
                onClick={() => onOpenStorePage(chat.storeId)}
                className="px-2.5 py-1 text-xs font-bold text-[#07875F] bg-[#DDF7EC] hover:bg-[#c9f1e1] rounded-xl transition"
              >
                زيارة المتجر
              </button>
            )}
          </div>
        </div>

        {/* Product Negotiation Context Banner */}
        {chat.productTitle && (
          <div className="bg-[#EBF7F2] border-b border-[#C6EAD8] px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-right">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#07875F] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                <Tag className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-gray-500 font-medium">السلعة محل التفاوض:</span>
                  <span className="text-xs font-bold text-[#101B3D] truncate">{chat.productTitle}</span>
                </div>
                {chat.productPrice ? (
                  <span className="text-[11px] font-bold text-[#07875F]">
                    السعر الأصلي: {chat.productPrice.toLocaleString()} ر.ي
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              {agreedPrice ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs bg-emerald-600 text-white font-extrabold px-2.5 py-1 rounded-xl flex items-center gap-1 shadow-2xs">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>تم سد السعر على: {agreedPrice.toLocaleString()} ر.ي</span>
                  </span>
                  {!isStoreOwner && onBuyAtAgreedPrice && (
                    <button
                      onClick={() => onBuyAtAgreedPrice(chat, agreedPrice)}
                      className="px-3 py-1 bg-[#101B3D] hover:bg-[#1a2c5f] text-white text-xs font-bold rounded-xl transition flex items-center gap-1 shadow-xs"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>شراء بالسعر المتفق</span>
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowOfferInput(true)}
                  className="px-3 py-1 bg-[#07875F] hover:bg-[#06704F] text-white text-xs font-extrabold rounded-xl transition flex items-center gap-1 shadow-2xs"
                >
                  <Handshake className="w-3.5 h-3.5" />
                  <span>اقتراح سد السعر 🤝</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Seller Rating Banner to build trust */}
        {!isStoreOwner && !chat.productTitle && (
          <div className="bg-amber-50/70 border-b border-amber-100 px-3.5 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-right">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-xs font-bold text-amber-900">
                {userReview ? `تقييمك للمتجر: ${userReview.rating}★` : 'قيّم سرعة رد وتعامل صاحب المتجر'}
              </span>
            </div>
          </div>
        )}

        {/* Message Thread */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#F4F7FA]/40 text-right">
          {messages.map((msg) => {
            const isMe = msg.senderId === currentUser?.uid;
            const hasOffer = !!msg.priceOffer;
            const offer = msg.priceOffer;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] sm:max-w-md p-3 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-2xs ${
                    hasOffer
                      ? 'bg-white border-2 border-[#07875F] text-slate-800 rounded-b-none'
                      : isMe
                      ? 'bg-[#07875F] text-white rounded-br-none'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                  }`}
                >
                  {/* Price Offer Special Card */}
                  {hasOffer && offer && (
                    <div className="mb-2 p-3 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 rounded-xl border border-emerald-200 text-slate-900 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[#07875F] font-black text-xs">
                          <Handshake className="w-4 h-4" />
                          <span>عرض سد السعر والتفاوض</span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            offer.status === 'accepted'
                              ? 'bg-emerald-600 text-white'
                              : offer.status === 'rejected'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {offer.status === 'accepted'
                            ? 'تم الاتفاق ✅'
                            : offer.status === 'rejected'
                            ? 'مرفوض ❌'
                            : 'في الانتظار ⏳'}
                        </span>
                      </div>

                      <div className="text-center py-1">
                        <div className="text-lg sm:text-xl font-black text-[#07875F]">
                          {offer.amount.toLocaleString()} <span className="text-xs">ريال يمني</span>
                        </div>
                        <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                          {isMe ? 'عرض سد السعر مقترح منك' : `عرض مقدم من ${msg.senderName}`}
                        </p>
                      </div>

                      {/* Action buttons on pending offer */}
                      {offer.status === 'pending' && (
                        <div className="pt-1 border-t border-emerald-200/70">
                          {!isMe ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={actionLoading === msg.id}
                                onClick={() => handleOfferResponse(msg.id, true, offer.amount)}
                                className="flex-1 py-1.5 bg-[#07875F] hover:bg-[#06704F] text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 shadow-xs"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>موافق ونسد بالسعر</span>
                              </button>
                              <button
                                type="button"
                                disabled={actionLoading === msg.id}
                                onClick={() => handleOfferResponse(msg.id, false, offer.amount)}
                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>رفض</span>
                              </button>
                            </div>
                          ) : (
                            <div className="text-center text-[10px] text-gray-500 italic">
                              في انتظار موافقة الطرف الآخر على السعر المقترح...
                            </div>
                          )}
                        </div>
                      )}

                      {/* Offer accepted banner */}
                      {offer.status === 'accepted' && (
                        <div className="pt-1 border-t border-emerald-200 text-center">
                          <p className="text-[11px] font-bold text-emerald-800 mb-1.5">
                            بارك الله لكما! تم سد السعر والتراضي على هذا المبلغ.
                          </p>
                          {!isStoreOwner && onBuyAtAgreedPrice && (
                            <button
                              type="button"
                              onClick={() => onBuyAtAgreedPrice(chat, offer.amount)}
                              className="w-full py-1.5 bg-[#101B3D] hover:bg-[#1a2c5f] text-white rounded-lg text-xs font-extrabold transition flex items-center justify-center gap-1.5 shadow-xs"
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span>إتمام الشراء بالسعر المتفق عليه</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {msg.imageUrl && (
                    <img
                      src={msg.imageUrl}
                      alt="صورة مرفقة"
                      className="rounded-xl mb-2 max-h-48 w-full object-cover"
                    />
                  )}
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>

                <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5 px-1">
                  <span>
                    {new Date(msg.createdAt).toLocaleTimeString('ar-YE', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {isMe && <CheckCheck className="w-3 h-3 text-[#07875F]" />}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Negotiation Quick Toolbar */}
        <div className="px-3 pt-2 bg-slate-50 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[11px]">
          <button
            type="button"
            onClick={() => setShowOfferInput(!showOfferInput)}
            className="px-2.5 py-1 bg-[#DDF7EC] hover:bg-[#c9f1e1] text-[#056B4B] font-extrabold rounded-lg shrink-0 transition flex items-center gap-1 border border-[#C0F0DD]"
          >
            <Handshake className="w-3.5 h-3.5" />
            <span>اقتراح سد السعر 🤝</span>
          </button>
          {[
            'كم حدك النهائي من الآخر؟',
            'هل يشمل التوصيل داخل بيحان؟',
            'وين موقع المعاينة ببيحان؟',
            'صامل ومستعد للمعاينة والاستلام.',
          ].map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => handleSend(undefined, chip)}
              className="px-2.5 py-1 bg-white hover:bg-slate-200 text-slate-700 font-semibold rounded-lg shrink-0 transition border border-slate-200"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Price Offer Form Modal / Popup */}
        {showOfferInput && (
          <div className="p-3 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-t border-emerald-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex items-center gap-1 text-xs font-black text-[#07875F] shrink-0">
              <Handshake className="w-4 h-4" />
              <span>تقديم عرض لسد السعر:</span>
            </div>
            <div className="relative flex-1">
              <input
                type="text"
                inputMode="numeric"
                value={customOfferAmount}
                onChange={(e) => setCustomOfferAmount(e.target.value)}
                placeholder="اكتب السعر المقترح بالريال اليمني (مثال: 20000)..."
                className="w-full px-3 py-2 bg-white rounded-xl text-xs font-bold text-gray-800 border border-emerald-300 focus:outline-none focus:ring-1 focus:ring-[#07875F] text-right"
              />
              <span className="absolute left-3 top-2 text-[10px] text-gray-400 font-bold">
                ريال يمني
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSendPriceOffer}
                disabled={isSending || !customOfferAmount.trim()}
                className="px-4 py-2 bg-[#07875F] hover:bg-[#06704F] text-white text-xs font-bold rounded-xl transition shadow-xs disabled:opacity-40"
              >
                إرسال العرض
              </button>
              <button
                type="button"
                onClick={() => setShowOfferInput(false)}
                className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        {/* Message Input Footer */}
        <div className="p-3 bg-white border-t border-slate-100">
          {showImageInput && (
            <div className="mb-2 p-2 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="ضع رابط صورة ترغب بإرسالها..."
                className="flex-1 bg-transparent text-xs outline-none"
              />
              <button
                onClick={() => setShowImageInput(false)}
                className="text-slate-400 hover:text-slate-600 text-xs px-2"
              >
                إلغاء
              </button>
            </div>
          )}

          <form onSubmit={handleSend} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowImageInput(!showImageInput)}
              className="p-2.5 rounded-xl text-slate-500 hover:text-[#07875F] hover:bg-slate-100 transition"
              title="إرفاق صورة"
            >
              <ImageIcon className="w-5 h-5" />
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="اكتب رسالتك أو استفسارك هنا..."
              className="flex-1 px-4 py-2.5 bg-slate-100 rounded-xl text-xs sm:text-sm focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#07875F] border border-transparent focus:border-[#07875F] text-right"
            />

            <button
              type="submit"
              disabled={isSending || (!inputText.trim() && !imageUrl.trim())}
              className="p-2.5 rounded-xl bg-[#07875F] hover:bg-[#06704F] text-white transition disabled:opacity-40 shadow-xs"
            >
              <Send className="w-5 h-5 rotate-180" />
            </button>
          </form>
        </div>
      </div>

      {/* Store Rating Modal */}
      {isRatingModalOpen && (
        <StoreRatingModal
          isOpen={isRatingModalOpen}
          onClose={() => setIsRatingModalOpen(false)}
          storeId={chat.storeId}
          storeName={chat.storeName}
          defaultInteractionType="chat"
          initialRating={selectedStar}
          onReviewSuccess={() => {
            setIsRatingModalOpen(false);
            loadUserReview();
          }}
        />
      )}
    </div>
  );
};
