import React from 'react';
import {
  Smartphone,
  Shirt,
  Armchair,
  Utensils,
  ShoppingBag,
  Car,
  Wrench,
  Package,
  Layers,
  ChevronLeft,
  Home,
  Laptop,
  Truck,
  Sparkles,
  Building,
  Briefcase,
  Heart,
} from 'lucide-react';
import { Category } from '../../types';

interface CategoryBrowserViewProps {
  categories: Category[];
  onSelectCategory: (categoryId: string) => void;
}

export const CategoryBrowserView: React.FC<CategoryBrowserViewProps> = ({
  categories,
  onSelectCategory,
}) => {
  const getCategoryIcon = (iconName?: string, catName?: string) => {
    const name = catName || '';
    if (name.includes('سيار') || name.includes('مركبات') || iconName === 'Car') {
      return <Car className="w-5 h-5 text-[#07875F]" />;
    }
    if (name.includes('عقار') || name.includes('أراضي') || iconName === 'Building' || iconName === 'Home') {
      return <Building className="w-5 h-5 text-amber-600" />;
    }
    if (name.includes('جوال') || name.includes('أجهز') || iconName === 'Smartphone' || iconName === 'Laptop') {
      return <Smartphone className="w-5 h-5 text-blue-600" />;
    }
    if (name.includes('أثاث') || name.includes('منزل') || iconName === 'Armchair') {
      return <Armchair className="w-5 h-5 text-purple-600" />;
    }
    if (name.includes('مواشي') || name.includes('أغنام') || name.includes('إبل')) {
      return <Sparkles className="w-5 h-5 text-emerald-600" />;
    }
    if (name.includes('خدمات') || name.includes('نقل') || iconName === 'Wrench' || iconName === 'Truck') {
      return <Truck className="w-5 h-5 text-orange-600" />;
    }
    if (name.includes('ملابس') || iconName === 'Shirt') {
      return <Shirt className="w-5 h-5 text-rose-600" />;
    }
    if (name.includes('مطاعم') || name.includes('أغذية') || iconName === 'Utensils') {
      return <Utensils className="w-5 h-5 text-red-600" />;
    }
    return <Package className="w-5 h-5 text-[#07875F]" />;
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 text-right">
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-xl font-black text-[#101B3D] flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#07875F]" />
            <span>أقسام سوق ومنصة رواق — بيحان</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">اختر القسم لتصفح المتاجر والمنتجات والسلع المعروضة مباشرة في شبوة وبيحان</p>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
          {categories.length} قسم
        </span>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {categories.map((cat) => (
          <div
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className="group bg-white rounded-2xl p-4 border border-slate-200/80 hover:border-[#07875F] shadow-2xs hover:shadow-md transition cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-100 group-hover:bg-[#DDF7EC]/50 group-hover:border-[#C0F0DD] flex items-center justify-center shrink-0 group-hover:scale-105 transition-all">
                {getCategoryIcon(cat.icon, cat.name)}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-xs sm:text-sm text-[#101B3D] group-hover:text-[#07875F] transition truncate">
                  {cat.name}
                </h3>
                <span className="text-[11px] text-slate-400">تصفح الإعلانات</span>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-[#07875F] font-bold">
              <span>عرض الإعلانات</span>
              <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
