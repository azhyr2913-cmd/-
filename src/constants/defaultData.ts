import { Category } from '../types';

export const DEFAULT_DEVELOPER_PHONE = '+967783631364';
export const DEFAULT_DEVELOPER_WA_MSG = 'السلام عليكم، أتواصل معك بخصوص تطبيق رواق. لدي استفسار أو ملاحظة وأرغب في الحصول على المساعدة.';

export const YEMEN_CITIES = [
  'بيحان (الكل)',
  'بيحان - شبوة',
  'بيحان — العلياء',
  'بيحان — القصاب',
  'بيحان — الروضة',
  'بيحان — الحزم',
  'بيحان — الجدفرة',
];

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'cat-automotive',
    name: 'حراج السيارات والمركبات',
    slug: 'automotive',
    icon: 'Car',
    sortOrder: 1,
    isActive: true,
    description: 'سيارات، شاصات، هايلوكسات، شاحنات، ودراجات نارية',
  },
  {
    id: 'cat-realestate',
    name: 'حراج العقار والأراضي',
    slug: 'realestate',
    icon: 'Home',
    sortOrder: 2,
    isActive: true,
    description: 'أراضي زراعية، مخططات سكنية، بيوت، ومحلات للإيجار والبيع',
  },
  {
    id: 'cat-electronics',
    name: 'الأجهزة والجوالات',
    slug: 'electronics',
    icon: 'Smartphone',
    sortOrder: 3,
    isActive: true,
    description: 'جوالات آيفون وسامسونج، شاشات، لابتوبات، وإلكترونيات',
  },
  {
    id: 'cat-livestock',
    name: 'مواشي وأغنام وإبل',
    slug: 'livestock',
    icon: 'Package',
    sortOrder: 4,
    isActive: true,
    description: 'ضأن، ماعز بلدي بيحاني، إبل، وأبقار وأعلاف',
  },
  {
    id: 'cat-solar-energy',
    name: 'الطاقة الشمسية والبطاريات',
    slug: 'solar-energy',
    icon: 'Zap',
    sortOrder: 5,
    isActive: true,
    description: 'ألواح شمسية، بطاريات جيل وليثيوم، ومحولات وإنفرترات',
  },
  {
    id: 'cat-autoparts',
    name: 'قطع الغيار والملحقات',
    slug: 'autoparts',
    icon: 'Wrench',
    sortOrder: 6,
    isActive: true,
    description: 'قطع غيار تويوتا، إطارات، زيوت، وإكسسوارات مركبات',
  },
  {
    id: 'cat-home-furniture',
    name: 'الأثاث والمنزليات',
    slug: 'home-furniture',
    icon: 'Armchair',
    sortOrder: 7,
    isActive: true,
    description: 'مجالس يمنية، غرف نوم، مكيفات، ثلاجات، وأفران',
  },
  {
    id: 'cat-honey-agri',
    name: 'عسل بيحان والتمور والزراعة',
    slug: 'honey-agri',
    icon: 'ShoppingBag',
    sortOrder: 8,
    isActive: true,
    description: 'عسل سدر دوعني وبيحاني أصلي، حبوب، تمور، ومنتجات زراعية',
  },
  {
    id: 'cat-services',
    name: 'خدمات ومقاولات ونقل',
    slug: 'services',
    icon: 'Truck',
    sortOrder: 9,
    isActive: true,
    description: 'نقل وشحن بضائع، حفريات، مقاولات، وصيانة عامة',
  },
  {
    id: 'cat-other',
    name: 'حراج وسلع متنوعة',
    slug: 'other',
    icon: 'Package',
    sortOrder: 10,
    isActive: true,
    description: 'سلع شخصية، أدوات، أسلحة مرخصة، ومقتنيات منوعة',
  },
];

export const STORE_BACKGROUND_PRESETS = [
  {
    id: 'rawaq_navy',
    name: 'كحلي رواق الأصيل',
    class: 'from-[#101B3D] via-[#182A5E] to-[#0D152F]',
    accentColor: '#101B3D',
  },
  {
    id: 'rawaq_emerald',
    name: 'زمرد رواق الأخضر',
    class: 'from-[#07875F] via-[#056B4B] to-[#101B3D]',
    accentColor: '#07875F',
  },
  {
    id: 'beihan_sky',
    name: 'سماء بيحان الصافية',
    class: 'from-slate-800 via-sky-900 to-[#101B3D]',
    accentColor: '#0284c7',
  },
  {
    id: 'yemeni_coffee',
    name: 'بُن يافعي عريق',
    class: 'from-stone-800 via-stone-900 to-[#101B3D]',
    accentColor: '#57534e',
  },
  {
    id: 'damask_crimson',
    name: 'العقيق اليماني',
    class: 'from-rose-900 via-rose-950 to-[#101B3D]',
    accentColor: '#be123c',
  },
];
