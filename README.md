# 45/4

تطبيق ويب شخصي (PWA) عربي RTL لمتابعة برنامج النادي: ٤ أيام · ٤٥ دقيقة.

© 2026 زياد بن محمد البابطين — جميع الحقوق محفوظة

## التقنية
Vite + React + TypeScript، Supabase (Auth عبر Google + Postgres مع RLS)، PWA عبر vite-plugin-pwa. البيانات تُحفظ محليًا أولًا ثم تُزامَن، فيعمل التطبيق دون اتصال.

## التشغيل محليًا
```bash
npm install
cp .env.example .env.local     # ضع VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY (المفتاح العام فقط)
npm run dev
```
> لا تضع Service Role Key في الواجهة أبدًا. الأمان قائم على RLS.

## تسجيل الدخول: Google فقط، لمالك واحد
الدخول بزر «الدخول باستخدام Google» (`supabase.auth.signInWithOAuth({ provider: 'google' })`) بنطاقات `openid email profile` فقط — لا Gmail ولا صلاحية لقراءة البريد. الجلسة تُحفظ في الجهاز وتُجدَّد تلقائيًا، فلا تسجّل الدخول كل مرة.

**من يدخل؟** حساب Google المحدَّد مسبقًا فقط (`OWNER_EMAIL`)، وليس «أول من يسجّل». يُفرض ذلك في قاعدة البيانات لا في الواجهة:
- مشغّل على `auth.users` يرفض إنشاء أي حساب ليس بريده في `public.allowed_emails` أو ليس مزوّده `google`. القائمة الفارغة = لا يدخل أحد.
- سياسات RLS مقيِّدة (`owner_only`) على كل الجداول تتحقق أن بريد الجلسة هو المالك؛ فتغيير المالك يقطع وصول الحساب القديم فورًا.
- تعيين المالك: `select public.set_owner_email('you@gmail.com');` (من محرر SQL في Supabase، أو تلقائيًا عبر السكربت أدناه). **عيّنه قبل أول دخول.**

## إعداد Supabase
1. أنشئ مشروعًا في supabase.com.
2. **Google Cloud Console** ← APIs & Services ← Credentials ← Create OAuth client ID (Web application):
   أضف في Authorized redirect URIs العنوان `https://<PROJECT_REF>.supabase.co/auth/v1/callback`، وانسخ Client ID وSecret.
3. شغّل من جهازك:
   ```bash
   SUPABASE_ACCESS_TOKEN=sbp_... SUPABASE_PROJECT_REF=<PROJECT_REF> \
   SITE_URL=https://موقعك OWNER_EMAIL=you@gmail.com \
   GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... \
   node scripts/configure-supabase.mjs
   ```
   يطبّق الجداول وRLS، ويعيّن المالك، ويفعّل Google، ويعطّل الدخول بالبريد والرمز والدخول المجهول.
   (بدون السكربت: شغّل ملفات `supabase/migrations` بالترتيب في محرر SQL، ثم `set_owner_email`، ثم فعّل Google من Authentication ← Providers، وأضف عنوان موقعك في URL Configuration.)

## النشر (Vercel)
استورد المستودع، وأضف متغيري البيئة `VITE_SUPABASE_URL` و`VITE_SUPABASE_ANON_KEY`. ملف `vercel.json` جاهز (إعادة توجيه SPA، ترويسات الأمان، كاش الخطوط).

## تعديل البرنامج بدون إعادة بناء المنطق
- `src/data/program.ts` — الأيام الأربعة والتمارين والسيتات والتكرارات والراحة ومراحل الـ12 أسبوعًا.
- `src/data/machines.ts` — الأجهزة والخطوات والتحذيرات.
- `src/data/nutrition.ts` — دليل الأكل والنصائح.
- `src/data/audio.ts` — القرّاء والبودكاست الافتراضي.
- كما يمكن تعديل السيتات والتكرارات والراحة من داخل التطبيق: الإعدادات ← تعديل البرنامج (تُحفظ فوق الأصل ويمكن التراجع).

## الترحيلات
`supabase/migrations/*.sql` إضافية فقط (`if not exists`، بلا حذف) فلا تمسح بيانات المستخدم.

## الاختبار
انظر `tests/README.md`.
