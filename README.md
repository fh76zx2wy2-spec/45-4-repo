# 45/4

تطبيق ويب شخصي (PWA) عربي RTL لمتابعة برنامج النادي: ٤ أيام · ٤٥ دقيقة.

© 2026 زياد بن محمد البابطين — جميع الحقوق محفوظة

## التقنية
Vite + React + TypeScript، Supabase (Auth بالبريد + Postgres مع RLS)، PWA عبر vite-plugin-pwa. البيانات تُحفظ محليًا أولًا ثم تُزامَن، فيعمل التطبيق دون اتصال.

## التشغيل محليًا
```bash
npm install
cp .env.example .env.local     # ضع VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY (المفتاح العام فقط)
npm run dev
```
> لا تضع Service Role Key في الواجهة أبدًا. الأمان قائم على RLS.

## إعداد Supabase
1. أنشئ مشروعًا في supabase.com.
2. شغّل: `SUPABASE_ACCESS_TOKEN=... SUPABASE_PROJECT_REF=... SITE_URL=https://موقعك node scripts/configure-supabase.mjs`
   يطبّق الجداول وRLS، ويضبط رمز الدخول (6 خانات) وقالب البريد الذي يحوي `{{ .Token }}` (ضروري لأن iPhone يفصل تخزين Safari عن التطبيق المثبّت، فلا يصلح رابط سحري وحده).
3. **قفل التسجيل:** أول بريد يسجّل يصبح المالك، وبعده لا يدخل إلا من في `public.allowed_emails`.

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
