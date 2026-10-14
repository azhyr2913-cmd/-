# دليل تجهيز وإصدار تطبيق «رواق» الرسمي على Google Play
## Rawaq Android Production & Google Play Release Guide

تم تصميم وبرمجة تطبيق «رواق» كمنظومة تجارة إلكترونية حقيقية متوافقة مع أجهزة Android عبر بنية الويب التقدمية PWA وتقنية Trusted Web Activity (TWA) الرسمية من Google.

---

### 1. بيانات التطبيق الأساسية (Application Metadata)
- **اسم التطبيق (العربية):** رواق
- **اسم التطبيق (الإنجليزية):** Rawaq
- **معرّف الحزمة المعتمد (Application ID / Package Name):**
  `com.rawaq.beihan.app`
- **الإصدار الأولي:** `1.0.0` (Version Code: `1`)
- **نطاق التطبيق:** مدينة بيحان، محافظة شبوة، الجمهورية اليمنية فقط.
- **اللغة الافتراضية:** العربية (Arabic - ar-YE)
- **اتجاه الواجهة:** RTL (من اليمين إلى اليسار)

---

### 2. متطلبات سياسات Google Play الرسمية (Play Console Policies)
1. **سياسة الخصوصية وحماية البيانات (Privacy Policy):**
   - تم تضمين سياسة خصوصية عربية متكاملة داخل التطبيق عبر نافذة `PrivacyPolicyModal` ورابط ثابت في التذييل `Footer`.
   - الرابط العام المعتمد للإدخال في Google Play Console:
     `https://ais-pre-3bjtkofr5hsxwv6llpt6lb-938494945372.europe-west2.run.app`
2. **سياسة حذف الحساب والبيانات (Account & Data Deletion URL):**
   - مدمجة فعلياً داخل التطبيق: تتيح للمستخدم المسجل طلب حذف حسابه وبياناته نهائياً وفق معايير Google Play Data Safety.
3. **تصنيف المحتوى (Content Rating):**
   - التطبيق مصنف كتجارة وتسوق إلكتروني عام (Shopping / E-commerce).
   - الفئة العمرية: للجميع (Everyone / 3+).

---

### 3. توليد مفتاح التوقيع الرقمي الآمن (Keystore Generation)
لإنشاء مفتاح التوقيع المشفر الخاص برفع التطبيق إلى Google Play (دون كشف كلمة المرور أو الأسرار):

```bash
keytool -genkeypair -v \
  -keystore rawaq-release-key.jks \
  -alias rawaq \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -dname "CN=Rawaq App, OU=Beihan Shabwah, O=Rawaq Market, L=Beihan, ST=Shabwah, C=YE"
```

> **ملاحظة أمنية هامة:** احتفظ بملف `rawaq-release-key.jks` وكلمة المرور في مكان آمن وخاص بك؛ ولا ترفعه أبداً إلى المستودعات العامة أو كود الواجهة.

---

### 4. بناء حزمة Android App Bundle (.aab) الرسمية
يتم توليد ملف `.aab` عبر أداة Google TWA الرسمية (`@bubblewrap/cli`):

```bash
# 1. تثبيت أداة Bubblewrap الرسمية من Google
npm install -g @bubblewrap/cli

# 2. تهيئة مشروع TWA
bubblewrap init --manifest="https://ais-pre-3bjtkofr5hsxwv6llpt6lb-938494945372.europe-west2.run.app/manifest.webmanifest"

# 3. بناء ملف AAB الموقّع للإصدار النهائي
bubblewrap build --signingKeyPath=./rawaq-release-key.jks --signingKeyAlias=rawaq
```

ينتج عن ذلك ملف:
`app-release-bundle.aab`
وهو الملف المعتمد للرفع مباشرة إلى **Google Play Console** > **Production Track**.

---

### 5. حماية أمان Firebase وقواعد البيانات
- تم تأمين قواعد البيانات في Firestore Rules لحظر الوصول غير المصرح به.
- صلاحيات الإدارة (Admin) محصورة بحساب Google المعتمد للمطور (`azhyr2913@gmail.com`).
- بيانات المشترين وأرقام هواتفهم لا تظهر للعامة ومحصورة في إطار تنفيذ الطلبات من المتجر المعني فقط.
- التحقق من الأسعار والمخزون ونطاق مدينة بيحان يتم على مستوى قاعدة البيانات والخادم.
