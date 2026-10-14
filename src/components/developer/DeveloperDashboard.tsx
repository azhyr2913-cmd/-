import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Users,
  Store,
  Clock,
  Package,
  ShoppingBag,
  TrendingUp,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Plus,
  Trash2,
  Phone,
  Save,
  Check,
  Ban,
  Layers,
  Settings,
} from 'lucide-react';
import { AppSetting, Category, StoreApplication, Order } from '../../types';
import { getAllOrders } from '../../services/orderService';
import {
  AdminMetrics,
  deleteCategory,
  getAdminMetrics,
  getAppSettings,
  getCategories,
  saveCategory,
  updateAppSettings,
} from '../../services/adminService';
import {
  syncAppMetadataToRtdb,
  syncCategoriesToRtdb,
  syncStoresToRtdb,
} from '../../services/rtdbSyncService';
import {
  approveStoreApplication,
  getAllStoreApplications,
  rejectStoreApplication,
  setStoreStatus,
  getActiveStores,
} from '../../services/storeService';
import { Store as StoreType } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const DeveloperDashboard: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'metrics' | 'stores' | 'categories' | 'orders' | 'settings'>('metrics');
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [applications, setApplications] = useState<StoreApplication[]>([]);
  const [stores, setStores] = useState<StoreType[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [, setAppSettings] = useState<AppSetting | null>(null);
  const [loading, setLoading] = useState(true);

  // Rejection modal
  const [rejectingAppId, setRejectingAppId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Category modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  // Settings form
  const [devWhatsapp, setDevWhatsapp] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSavedSuccess, setSettingsSavedSuccess] = useState(false);

  // RTDB sync state
  const [rtdbSyncing, setRtdbSyncing] = useState(false);
  const [rtdbSyncSuccess, setRtdbSyncSuccess] = useState(false);

  const handleSyncRtdb = async () => {
    setRtdbSyncing(true);
    setRtdbSyncSuccess(false);
    try {
      await syncAppMetadataToRtdb({
        storesCount: metrics?.verifiedStores || stores.length,
        productsCount: metrics?.totalProducts || 0,
        categoriesCount: categories.length,
      });
      if (categories.length) await syncCategoriesToRtdb(categories);
      if (stores.length) await syncStoresToRtdb(stores);
      setRtdbSyncSuccess(true);
      setTimeout(() => setRtdbSyncSuccess(false), 4000);
    } catch (err) {
      console.warn('Manual RTDB sync error:', err);
    } finally {
      setRtdbSyncing(false);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [m, apps, sList, cats, cfg, ords] = await Promise.all([
        getAdminMetrics(),
        getAllStoreApplications(),
        getActiveStores(),
        getCategories(),
        getAppSettings(),
        getAllOrders(),
      ]);
      setMetrics(m || null);
      setApplications(apps || []);
      setStores(sList || []);
      setCategories(cats || []);
      setAppSettings(cfg || null);
      setAllOrders(ords || []);
      if (cfg) {
        setDevWhatsapp(cfg.developerWhatsapp);
        setAnnouncement(cfg.announcement || '');
      }

      // Automatically sync metadata to RTDB
      syncAppMetadataToRtdb({
        storesCount: m?.verifiedStores || (sList ? sList.length : 0),
        productsCount: m?.totalProducts || 0,
        categoriesCount: cats ? cats.length : 0,
      }).catch(() => {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadAll();
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-red-100 text-red-600 mx-auto flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-[#101B3D]">غير مصرح بالدخول</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          لوحة المطوّر والإدارة محمية بنظام التحقق السحابي عبر حسابات الإدارة المعتمدة.
        </p>
      </div>
    );
  }

  const handleApprove = async (app: StoreApplication) => {
    try {
      await approveStoreApplication(app);
      await loadAll();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingAppId || !rejectionReason.trim()) return;
    try {
      await rejectStoreApplication(rejectingAppId, rejectionReason.trim());
      setRejectingAppId(null);
      setRejectionReason('');
      await loadAll();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleStoreStatus = async (storeId: string, currentStatus: string) => {
    try {
      await setStoreStatus(storeId, currentStatus === 'active' ? 'suspended' : 'active');
      await loadAll();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;
    try {
      const newCat: Category = {
        id: `cat_${Date.now()}`,
        name: categoryName.trim(),
        slug: categoryName.trim().replace(/\s+/g, '-'),
        icon: 'Package',
        sortOrder: categories.length + 1,
        isActive: true,
        description: categoryDescription.trim(),
      };
      await saveCategory(newCat);
      setCategoryName('');
      setCategoryDescription('');
      setIsCategoryModalOpen(false);
      await loadAll();
    } catch (err) {
      console.error(err);
    }
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    try {
      await deleteCategory(categoryToDelete.id);
      setCategoryToDelete(null);
      await loadAll();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSavingSettings(true);
    setSettingsSavedSuccess(false);
    try {
      await updateAppSettings(
        {
          developerWhatsapp: devWhatsapp.trim(),
          announcement: announcement.trim(),
        },
        currentUser.uid
      );
      setSettingsSavedSuccess(true);
      setTimeout(() => setSettingsSavedSuccess(false), 3000);
      await loadAll();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 text-right">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#101B3D] via-[#182A5E] to-[#0A1128] text-white rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#182A5E]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#07875F] animate-pulse"></span>
            <span className="text-xs text-[#DDF7EC] font-bold tracking-wider">لوحة تحكم المطوّر والمدير الرئيسي</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black font-serif">منظومة رواق المركزية (Rawaq Console)</h1>
          <p className="text-xs text-slate-300 mt-1">
            متصل بحساب: <strong className="text-[#DDF7EC] font-mono">{currentUser?.email}</strong> • مزامنة حية سحابية متوافقة مع جميع الأجهزة
          </p>
        </div>

        <button
          onClick={loadAll}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition border border-white/15 w-fit shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>مزامنة البيانات الحية</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('metrics')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition shrink-0 flex items-center gap-1.5 ${
            activeTab === 'metrics'
              ? 'bg-[#101B3D] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-[#07875F]" />
          <span>المؤشرات والإحصائيات</span>
        </button>

        <button
          onClick={() => setActiveTab('stores')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition shrink-0 flex items-center gap-1.5 ${
            activeTab === 'stores'
              ? 'bg-[#101B3D] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Store className="w-4 h-4 text-[#07875F]" />
          <span>طلبات واعتماد المتاجر ({applications.filter((a) => a.status === 'pending').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition shrink-0 flex items-center gap-1.5 ${
            activeTab === 'categories'
              ? 'bg-[#101B3D] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4 text-[#07875F]" />
          <span>إدارة التصنيفات ({categories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition shrink-0 flex items-center gap-1.5 ${
            activeTab === 'orders'
              ? 'bg-[#101B3D] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShoppingBag className="w-4 h-4 text-[#07875F]" />
          <span>إدارة كافة الطلبات ({allOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition shrink-0 flex items-center gap-1.5 ${
            activeTab === 'settings'
              ? 'bg-[#101B3D] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Settings className="w-4 h-4 text-[#07875F]" />
          <span>إعدادات النظام وواتساب المطوّر</span>
        </button>
      </div>

      {/* Tab: Metrics */}
      {activeTab === 'metrics' && metrics && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold">الحسابات المسجلة</span>
                <Users className="w-4 h-4 text-[#101B3D]" />
              </div>
              <div className="text-2xl font-black text-[#101B3D]">{metrics.totalUsers}</div>
              <span className="text-[11px] text-slate-400 mt-1 block">مستخدم مسجل في المنظومة</span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold">المتاجر المعتمدة</span>
                <Store className="w-4 h-4 text-[#07875F]" />
              </div>
              <div className="text-2xl font-black text-[#07875F]">{metrics.verifiedStores}</div>
              <span className="text-[11px] text-[#07875F] font-semibold mt-1 block">
                {metrics.pendingStoreApplications} طلبات قيد المراجعة
              </span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold">المنتجات النشطة</span>
                <Package className="w-4 h-4 text-[#101B3D]" />
              </div>
              <div className="text-2xl font-black text-[#101B3D]">{metrics.totalProducts}</div>
              <span className="text-[11px] text-slate-400 mt-1 block">معروضة في أسواق شبوة وبيحان</span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold">إجمالي المبيعات المكتملة</span>
                <TrendingUp className="w-4 h-4 text-[#07875F]" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-[#07875F]">
                {metrics.totalCompletedRevenue.toLocaleString()} <span className="text-xs">ر.ي</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {metrics.completedOrders} طلب تم تسليمه بنجاح
              </span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3">
            <h3 className="font-extrabold text-[#101B3D] text-sm">حالة الخدمات السحابية وقواعد البيانات</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-[#DDF7EC] rounded-2xl border border-[#C0F0DD] text-[#056B4B] flex items-center justify-between">
                <span>قاعدة بيانات Firestore:</span>
                <span className="font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-[#07875F]" /> متصلة وسليمة
                </span>
              </div>
              <div className="p-3 bg-[#DDF7EC] rounded-2xl border border-[#C0F0DD] text-[#056B4B] flex items-center justify-between">
                <span>Realtime Database:</span>
                <span className="font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-[#07875F]" /> مربوطة تلقائياً
                </span>
              </div>
              <div className="p-3 bg-[#DDF7EC] rounded-2xl border border-[#C0F0DD] text-[#056B4B] flex items-center justify-between">
                <span>Firebase Authentication:</span>
                <span className="font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-[#07875F]" /> نشطة
                </span>
              </div>
              <div className="p-3 bg-[#DDF7EC] rounded-2xl border border-[#C0F0DD] text-[#056B4B] flex items-center justify-between">
                <span>مشروع Firebase:</span>
                <span className="font-bold text-[#101B3D] truncate max-w-[120px]" title="gen-lang-client-0811131917">
                  0811131917
                </span>
              </div>
            </div>

            {/* Realtime Database Direct Sync Panel */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="font-bold text-[#101B3D] flex items-center gap-2">
                  <span>عنوان Realtime Database:</span>
                  <a
                    href="https://gen-lang-client-0811131917-default-rtdb.firebaseio.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#07875F] hover:underline font-mono text-[11px]"
                  >
                    gen-lang-client-0811131917-default-rtdb.firebaseio.com
                  </a>
                </div>
                <p className="text-[11px] text-slate-500">
                  البيانات متصلة وتتزامن تلقائياً بين Firestore و Realtime Database.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSyncRtdb}
                disabled={rtdbSyncing}
                className="px-4 py-2 bg-[#101B3D] hover:bg-[#1a2b5e] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 disabled:opacity-50 shrink-0 cursor-pointer"
              >
                {rtdbSyncing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#07875F]" />
                    <span>جارٍ المزامنة...</span>
                  </>
                ) : rtdbSyncSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#07875F]" />
                    <span>تمت المزامنة بنجاح!</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-[#07875F]" />
                    <span>تحديث ومزامنة البيانات إلى RTDB</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Stores Management */}
      {activeTab === 'stores' && (
        <div className="space-y-6">
          {/* Pending Applications Section */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-4">
            <h3 className="font-extrabold text-[#101B3D] text-sm sm:text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#07875F]" />
              طلبات فتح المتاجر الجديدة (قيد المراجعة والاعتماد)
            </h3>

            {applications.filter((a) => a.status === 'pending').length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                لا توجد طلبات معلقة بانتظار المراجعة.
              </div>
            ) : (
              <div className="space-y-3">
                {applications
                  .filter((a) => a.status === 'pending')
                  .map((app) => (
                    <div
                      key={app.id}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-[#101B3D] text-sm">متجر: {app.storeName}</h4>
                            <span className="bg-[#DDF7EC] text-[#07875F] px-2 py-0.5 rounded text-[10px] font-bold">
                              قيد المراجعة
                            </span>
                          </div>
                          <p className="text-slate-500 text-[11px] mt-0.5">
                            مقدم الطلب: {app.fullName} • هاتف صاحب المحل: <strong className="font-mono text-slate-800">{app.phone}</strong> • {app.city}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApprove(app)}
                            className="px-3.5 py-1.5 rounded-xl bg-[#07875F] hover:bg-[#06704F] text-white font-bold transition flex items-center gap-1 shadow-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>قبول واعتماد المتجر ✓</span>
                          </button>
                          <button
                            onClick={() => setRejectingAppId(app.id)}
                            className="px-3 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 font-bold transition flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>رفض مع السبب</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-400 block">نوع السلع والمنتجات:</span>
                          <span className="text-slate-800 font-semibold">{app.productTypes}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">الوصف وموقع المحل:</span>
                          <span className="text-slate-800">{app.description || 'لم يُحدد'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Active Stores List */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-4">
            <h3 className="font-extrabold text-[#101B3D] text-sm sm:text-base flex items-center gap-2">
              <Store className="w-4 h-4 text-[#07875F]" />
              المتاجر المسجلة والمعتمدة ({stores.length})
            </h3>

            {stores.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                لا توجد متاجر نشطة بعد.
              </div>
            ) : (
              <div className="space-y-3">
                {stores.map((s) => (
                  <div
                    key={s.id}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#101B3D] text-sm">{s.storeName}</span>
                        {s.isVerified && (
                          <span className="text-[#07875F] font-bold text-[10px] bg-[#DDF7EC] px-2 py-0.5 rounded-full">
                            موثّق
                          </span>
                        )}
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            s.status === 'active' ? 'bg-[#DDF7EC] text-[#07875F]' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {s.status === 'active' ? 'نشط' : 'موقوف'}
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        {s.city} • المنتجات: {s.productsCount || 0} • المتابعون: {s.followersCount || 0}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleStoreStatus(s.id, s.status)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                          s.status === 'active'
                            ? 'bg-red-50 text-red-700 hover:bg-red-100'
                            : 'bg-[#DDF7EC] text-[#07875F] hover:bg-[#c9f1e1]'
                        }`}
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>{s.status === 'active' ? 'تعليق المتجر' : 'إعادة تفعيل المتجر'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Categories Management */}
      {activeTab === 'categories' && (
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-[#101B3D] text-base">إدارة تصنيفات السوق</h3>
              <p className="text-xs text-slate-500">إضافة وتعديل الأقسام الرئيسية دون إعادة بناء التطبيق</p>
            </div>
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#07875F] hover:bg-[#06704F] text-white text-xs font-bold transition flex items-center gap-1 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة تصنيف جديد</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
              >
                <div>
                  <h4 className="font-bold text-[#101B3D] text-sm">{cat.name}</h4>
                  <p className="text-slate-500 text-[11px] mt-0.5">{cat.description || cat.slug}</p>
                </div>
                <button
                  onClick={() => setCategoryToDelete(cat)}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition"
                  title="حذف التصنيف"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: All Platform Orders */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div>
              <h3 className="font-extrabold text-[#101B3D] text-base">سجل كافة طلبات المنصة في بيحان</h3>
              <p className="text-xs text-slate-500">إشراف وتدقيق العمليات والطلبات بين المشترين والمتاجر</p>
            </div>
            <div className="text-xs font-bold text-[#07875F] bg-[#DDF7EC] px-3 py-1 rounded-xl">
              إجمالي {allOrders.length} طلبات
            </div>
          </div>

          {allOrders.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              لا توجد طلبات مسجلة في المنظومة حتى الآن.
            </div>
          ) : (
            <div className="space-y-3">
              {allOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">طلب #{ord.id.slice(-6)}</span>
                      <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-slate-200 text-slate-700">
                        متجر: {ord.storeName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">
                        {new Date(ord.createdAt).toLocaleString('ar-YE')}
                      </span>
                      <span className="font-black text-[#07875F]">{ord.total.toLocaleString()} ر.ي</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-600">
                    <div>
                      <span className="text-slate-400">العميل:</span>{' '}
                      <strong className="text-slate-800">{ord.buyerName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">هاتف العميل:</span>{' '}
                      <span className="font-mono">{ord.buyerPhone}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">المنطقة والتسليم:</span>{' '}
                      <span>{ord.deliveryAddress} ({ord.city})</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 pt-1">
                    <span className="font-bold text-slate-700">المنتجات:</span>{' '}
                    {ord.items.map((it, idx) => (
                      <span key={idx} className="ml-2">
                        {it.title} × {it.quantity}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: App Settings & WhatsApp Configuration */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-5">
          <div>
            <h3 className="font-extrabold text-[#101B3D] text-base">إعدادات التطبيق وواتساب المطوّر</h3>
            <p className="text-xs text-slate-500">
              تعديل رقم واتساب المعتمد لمطوّر المنصة والإعلانات العامة في الواجهة
            </p>
          </div>

          {settingsSavedSuccess && (
            <div className="p-3 bg-[#DDF7EC] text-[#056B4B] text-xs rounded-xl border border-[#C0F0DD] flex items-center gap-2">
              <Check className="w-4 h-4 text-[#07875F]" />
              <span>تم حفظ الإعدادات على الخادم وتطبيقها بنجاح على كافة الأجهزة.</span>
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                رقم واتساب مطوّر رواق المعتمد (مع الرمز الدولي) *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  value={devWhatsapp}
                  onChange={(e) => setDevWhatsapp(e.target.value)}
                  placeholder="+967783631364"
                  className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#07875F] font-mono"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                الرقم الحالي: +967 783 631 364 — يُسمح للمدير الرئيسي فقط بتعديله، ولا يظهر في صفحات المتاجر العامة.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                نص الإعلان الشريطي في أعلى التطبيق
              </label>
              <textarea
                rows={2}
                value={announcement}
                onChange={(e) => setAnnouncement(e.target.value)}
                placeholder="أهلاً بكم في منصة رواق..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#07875F]"
              />
            </div>

            <button
              type="submit"
              disabled={savingSettings}
              className="px-6 py-2.5 rounded-xl bg-[#07875F] hover:bg-[#06704F] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-[#07875F]/20 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{savingSettings ? 'جارٍ الحفظ...' : 'حفظ الإعدادات في قاعدة البيانات'}</span>
            </button>
          </form>
        </div>
      )}

      {/* Reject Application Modal */}
      {rejectingAppId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#101B3D]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-5 border border-slate-100 shadow-2xl space-y-4">
            <h3 className="font-extrabold text-sm text-[#101B3D]">رفض طلب اعتماد المتجر</h3>
            <p className="text-xs text-slate-500">
              يرجى توضيح سبب الرفض لصاحب الطلب ليتمكن من معالجته وإعادة التقديم:
            </p>
            <form onSubmit={handleReject} className="space-y-3">
              <textarea
                rows={3}
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="مثال: يرجى إرفاق صورة واضحة للوحة المحل، أو التأكد من مطابقة النشاط..."
                className="w-full p-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-red-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectingAppId(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white"
                >
                  تأكيد الرفض مع السبب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#101B3D]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-5 border border-slate-100 shadow-2xl space-y-4">
            <h3 className="font-extrabold text-sm text-[#101B3D]">إضافة تصنيف جديد</h3>
            <form onSubmit={handleSaveCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم التصنيف *</label>
                <input
                  type="text"
                  required
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="مثال: مستلزمات الطاقة الشمسية"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#07875F]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">وصف مختصر</label>
                <input
                  type="text"
                  value={categoryDescription}
                  onChange={(e) => setCategoryDescription(e.target.value)}
                  placeholder="ألواح، بطاريات، محولات..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#07875F]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#07875F] hover:bg-[#06704F] text-white"
                >
                  إضافة التصنيف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Category Confirmation Modal */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#101B3D]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 border border-slate-100 shadow-2xl space-y-3 text-right">
            <h3 className="font-extrabold text-sm text-[#101B3D]">تأكيد حذف التصنيف</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف التصنيف «<strong>{categoryToDelete.name}</strong>» من المنصة؟
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={confirmDeleteCategory}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-sm"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
