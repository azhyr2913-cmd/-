import React from 'react';
import { Home, Grid, Plus, MessageSquare, User, Store as StoreIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface MobileBottomNavProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenPostAd: () => void;
  unreadChatsCount?: number;
  unreadNotificationsCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onNavigate,
  onOpenPostAd,
  unreadChatsCount = 0,
  unreadNotificationsCount = 0,
}) => {
  const { isMerchant } = useAuth();

  return (
    <nav
      aria-label="شريط تنقل حراج السفلي"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-2 py-1 flex items-center justify-around"
    >
      {/* 1. الرئيسية */}
      <button
        onClick={() => onNavigate('home')}
        className={`flex-1 flex flex-col items-center justify-center py-1 transition ${
          currentView === 'home' ? 'text-[#07875F] font-bold' : 'text-slate-500 hover:text-[#101B3D]'
        }`}
      >
        <Home className="w-5 h-5 mb-0.5" />
        <span className="text-[10px]">الرئيسية</span>
      </button>

      {/* 2. الأقسام */}
      <button
        onClick={() => onNavigate('categories')}
        className={`flex-1 flex flex-col items-center justify-center py-1 transition ${
          currentView === 'categories' ? 'text-[#07875F] font-bold' : 'text-slate-500 hover:text-[#101B3D]'
        }`}
      >
        <Grid className="w-5 h-5 mb-0.5" />
        <span className="text-[10px]">الأقسام</span>
      </button>

      {/* 3. زر أضف إعلانك - حراج الشهير في المنتصف */}
      <div className="flex-1 flex flex-col items-center justify-center -mt-5">
        <button
          onClick={onOpenPostAd}
          className="w-13 h-13 rounded-full bg-gradient-to-tr from-[#07875F] to-[#05A371] hover:from-[#06704F] hover:to-[#07875F] text-white flex flex-col items-center justify-center shadow-lg shadow-[#07875F]/35 border-4 border-white active:scale-95 transition-transform"
          title="أضف إعلانك في حراج بيحان"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
        <span className="text-[10px] font-black text-[#07875F] mt-0.5">أضف إعلان</span>
      </div>

      {/* 4. الرسائل */}
      <button
        onClick={() => onNavigate('chats')}
        className={`flex-1 relative flex flex-col items-center justify-center py-1 transition ${
          currentView === 'chats' ? 'text-[#07875F] font-bold' : 'text-slate-500 hover:text-[#101B3D]'
        }`}
      >
        <MessageSquare className="w-5 h-5 mb-0.5" />
        <span className="text-[10px]">الرسائل</span>
        {unreadChatsCount > 0 && (
          <span className="absolute top-0.5 right-4 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white animate-pulse"></span>
        )}
      </button>

      {/* 5. حسابي / متجري */}
      <button
        onClick={() => onNavigate(isMerchant ? 'merchant' : 'orders')}
        className={`flex-1 relative flex flex-col items-center justify-center py-1 transition ${
          currentView === 'merchant' || currentView === 'orders'
            ? 'text-[#07875F] font-bold'
            : 'text-slate-500 hover:text-[#101B3D]'
        }`}
      >
        {isMerchant ? (
          <>
            <StoreIcon className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">متجري</span>
          </>
        ) : (
          <>
            <User className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">حسابي</span>
          </>
        )}
        {unreadNotificationsCount > 0 && (
          <span className="absolute top-0.5 right-4 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white animate-pulse"></span>
        )}
      </button>
    </nav>
  );
};
