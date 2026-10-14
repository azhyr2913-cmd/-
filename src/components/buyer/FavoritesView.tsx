import React, { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { Product } from '../../types';
import { getUserFavorites } from '../../services/productService';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

interface FavoritesViewProps {
  onOpenProductDetail: (product: Product) => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({ onOpenProductDetail }) => {
  const { currentUser, login } = useAuth();
  const { addToCart } = useCart();
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    getUserFavorites(currentUser.uid)
      .then((prods) => setFavorites(prods || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center space-y-3">
        <Heart className="w-12 h-12 mx-auto text-slate-300" />
        <h3 className="font-extrabold text-[#101B3D] text-base">قائمة المفضلة</h3>
        <p className="text-xs text-slate-500">
          سجل الدخول لحفظ المنتجات التي تعجبك في حسابك والرجوع إليها في أي وقت.
        </p>
        <button
          onClick={login}
          className="px-6 py-2.5 rounded-xl bg-[#07875F] hover:bg-[#06704F] text-white text-xs font-bold transition shadow-sm"
        >
          تسجيل الدخول
        </button>
      </div>
    );
  }

  if (loading) {
    return <div className="py-16 text-center text-xs text-slate-400">جارٍ تحميل المفضلة...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4 text-right">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-[#101B3D] font-serif">المنتجات المفضلة</h2>
          <p className="text-xs text-slate-500">السلع التي قمت بحفظها لشرائها لاحقاً</p>
        </div>
        <span className="text-xs font-bold text-[#07875F] bg-[#DDF7EC] px-3 py-1 rounded-xl">
          {favorites.length} منتجات
        </span>
      </div>

      {favorites.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-500 space-y-2">
          <Heart className="w-12 h-12 mx-auto text-slate-300" />
          <h4 className="font-bold text-[#101B3D] text-sm">قائمتك المفضلة فارغة</h4>
          <p className="text-xs max-w-sm mx-auto">
            تصفح منتجات بيحان وشبوة واضغط على علامة القلب لحفظ أي سلعة ترغب بها.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {favorites.map((product) => (
            <div
              key={product.id}
              onClick={() => onOpenProductDetail(product)}
              className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-lg transition cursor-pointer flex flex-col"
            >
              <div className="relative aspect-square overflow-hidden bg-slate-100">
                <img
                  src={product.imageUrl}
                  alt={product.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
              </div>

              <div className="p-3.5 flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-[#07875F] font-bold block truncate mb-0.5">
                    {product.storeName}
                  </span>
                  <h3 className="font-bold text-xs sm:text-sm text-[#101B3D] group-hover:text-[#07875F] transition line-clamp-2">
                    {product.title}
                  </h3>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-black text-[#07875F]">
                    {product.price.toLocaleString()} ر.ي
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(product, 1);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-[#DDF7EC] hover:bg-[#cbf2e2] text-[#056B4B] font-bold text-xs transition"
                  >
                    + سلة
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
