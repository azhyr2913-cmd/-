import React, { useState } from 'react';
import {
  ShoppingBag,
  Store as StoreIcon,
  ShieldAlert,
  Search,
  MapPin,
  LogIn,
  LogOut,
  CheckCircle,
  Plus,
  ChevronDown,
  Bell,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { YEMEN_CITIES } from '../../constants/defaultData';

interface NavbarProps {
  onOpenStoreModal: () => void;
  onOpenCartModal: () => void;
  onOpenMerchantDashboard: () => void;
  onOpenDeveloperDashboard: () => void;
  onSelectCategory: (categoryId: string) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedCity: string;
  onCityChange: (city: string) => void;
  currentView: string;
  onNavigateHome: () => void;
  onOpenPostAd: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenStoreModal,
  onOpenCartModal,
  onOpenMerchantDashboard,
  onOpenDeveloperDashboard,
  searchTerm,
  onSearchChange,
  selectedCity,
  onCityChange,
  currentView,
  onNavigateHome,
  onOpenPostAd,
  onOpenNotifications,
  unreadNotificationsCount = 0,
}) => {
  const { currentUser, userProfile, isMerchant, isAdmin, login, logout } = useAuth();
  const { totalItems } = useCart();
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18 gap-2 sm:gap-4">
          {/* Logo & City Selector */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Rawaq Brand Logo */}
            <div
              onClick={onNavigateHome}
              className="flex items-center gap-2.5 cursor-pointer group select-none"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#101B3D] to-[#1E2E5D] text-white flex items-center justify-center shadow-xs border border-slate-700/30 group-hover:scale-105 transition-transform">
                <StoreIcon className="w-5 h-5 text-[#34D399]" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xl sm:text-2xl font-black text-[#101B3D] tracking-tight">
                    رواق
                  </span>
                  <span className="text-[10px] sm:text-xs font-bold text-white bg-[#07875F] px-1.5 py-0.5 rounded-md shadow-2xs">
                    بيحان
                  </span>
                </div>
                <span className="text-[9px] text-slate-500 font-medium">
                  سوق بيحان الإلكتروني الموحد
                </span>
              </div>
            </div>

            {/* City Selector Pill */}
            <div className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 border border-slate-200 transition"
              >
                <MapPin className="w-3.5 h-3.5 text-[#07875F]" />
                <span>{selectedCity === 'الكل' ? 'بيحان — شبوة' : selectedCity.replace('بيحان — ', '')}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isCityDropdownOpen && (
                <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-right animate-in fade-in slide-in-from-top-1 duration-150">
                  <button
                    onClick={() => {
                      onCityChange('الكل');
                      setIsCityDropdownOpen(false);
                    }}
                    className="w-full text-right px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                  >
                    <span>كل مناطق بيحان وشبوة</span>
                    {selectedCity === 'الكل' && <CheckCircle className="w-3.5 h-3.5 text-[#07875F]" />}
                  </button>
                  {YEMEN_CITIES.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        onCityChange(c);
                        setIsCityDropdownOpen(false);
                      }}
                      className="w-full text-right px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 flex items-center justify-between"
                    >
                      <span>{c}</span>
                      {selectedCity === c && <CheckCircle className="w-3.5 h-3.5 text-[#07875F]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-xl mx-2 hidden md:flex items-center">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="ابحث في متاجر بيحان عن سلعة، متجر، سيارة، عقار، إلكترونيات..."
                className="w-full pr-10 pl-4 py-2 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white rounded-xl border border-slate-200 focus:border-[#07875F] focus:ring-2 focus:ring-[#07875F]/20 focus:outline-none transition-all text-slate-800 placeholder-slate-400"
              />
              {searchTerm && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs px-1"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Open Store / Merchant Dashboard Button */}
            {isMerchant ? (
              <button
                onClick={onOpenMerchantDashboard}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition shadow-2xs ${
                  currentView === 'merchant'
                    ? 'bg-[#101B3D] text-white'
                    : 'bg-[#DDF7EC] text-[#056B4B] hover:bg-[#cbf2e2] border border-[#C0F0DD]'
                }`}
                title="لوحة إدارة متجري"
              >
                <StoreIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">متجري</span>
              </button>
            ) : (
              <button
                onClick={onOpenStoreModal}
                className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                title="افتتاح متجر جديد في بيحان"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#07875F]" />
                <span>افتتاح متجر</span>
              </button>
            )}

            {/* Post Ad / Product Button */}
            <button
              onClick={onOpenPostAd}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#07875F] hover:bg-[#06704F] active:bg-[#055c41] text-white transition shadow-sm hover:shadow"
              title="أضف إعلاناً أو منتجاً جديداً"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>أضف منتج / إعلان</span>
            </button>

            {/* Developer / Admin Dashboard Link */}
            {isAdmin && (
              <button
                onClick={onOpenDeveloperDashboard}
                className={`p-2 rounded-xl text-xs font-bold transition ${
                  currentView === 'developer'
                    ? 'bg-[#101B3D] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                title="لوحة الإدارة والمطوّر"
              >
                <ShieldAlert className="w-4 h-4 text-[#07875F]" />
              </button>
            )}

            {/* Notifications Bell */}
            {currentUser && onOpenNotifications && (
              <button
                onClick={onOpenNotifications}
                className="relative p-2 rounded-xl bg-slate-100 hover:bg-[#DDF7EC] text-slate-700 hover:text-[#07875F] transition"
                title="الإشعارات والتنبيهات"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse shadow-xs">
                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                  </span>
                )}
              </button>
            )}

            {/* Cart Button */}
            <button
              onClick={onOpenCartModal}
              className="relative p-2 rounded-xl bg-slate-100 hover:bg-[#DDF7EC] text-slate-700 hover:text-[#07875F] transition"
              title="عربة التسوق"
            >
              <ShoppingBag className="w-4 h-4" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -left-1 w-4 h-4 bg-[#07875F] text-white text-[9px] font-black rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </button>

            {/* User Auth Menu */}
            {currentUser ? (
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1 rounded-xl bg-slate-100 border border-slate-200">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || ''}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[#101B3D] text-white flex items-center justify-center text-xs font-bold">
                      {currentUser.displayName ? currentUser.displayName[0] : 'U'}
                    </div>
                  )}
                  <span className="text-xs font-bold text-slate-800 hidden lg:inline max-w-[80px] truncate">
                    {userProfile?.name || currentUser.displayName}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 text-slate-400 hover:text-rose-600 transition rounded-xl hover:bg-rose-50"
                  title="تسجيل الخروج"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={login}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>دخول</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Search Bar & City Selector */}
        <div className="md:hidden pb-2.5 pt-1 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="ابحث في متاجر بيحان..."
              className="w-full pr-8 pl-3 py-1.5 text-xs bg-slate-100 rounded-xl border border-transparent focus:border-[#07875F] focus:bg-white focus:outline-none text-slate-800"
            />
          </div>
          <div className="relative shrink-0">
            <select
              value={selectedCity}
              onChange={(e) => onCityChange(e.target.value)}
              className="px-2 py-1.5 text-xs bg-slate-100 rounded-xl border border-slate-200 text-slate-700 font-bold focus:outline-none"
            >
              <option value="الكل">كل بيحان</option>
              {YEMEN_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace('بيحان — ', '')}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};
