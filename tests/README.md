# الاختبارات

| الأمر | ما يفحصه |
|---|---|
| `npm test` | اختبارات الوحدة (Vitest): منطق الأسبوع 4/4، السلسلة، اليوم المقترح، رسائل «تفريط»، التاريخ الهجري، محرّك الجلسة المباشرة (راحة تلقائية، «الجهاز مشغول»). |
| `npm run db:test` | ترحيلات SQL وسياسات RLS على Postgres حقيقي (PGlite): عزل كل مستخدم عن الآخر، قفل التسجيل بـ `allowed_emails`. |
| `python3 tests/e2e/run_all.py flow dark layout` | اختبار طرف إلى طرف بمتصفح حقيقي (Playwright) على خادم Supabase وهمي محلي. |

## تشغيل اختبار المتصفح

```bash
node tests/mock-supabase.mjs &                       # منفذ 54321
VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_ANON_KEY=test \
  npx vite build --outDir dist-test --emptyOutDir
npx vite preview --outDir dist-test --port 4173 &
pip install playwright && python3 tests/e2e/run_all.py flow dark layout
```

المجموعات: `flow` (تسجيل الدخول، الجلسة، تمرين اليوم، الراحة، «الجهاز مشغول»، 1/4→2/4، التقويم الهجري، الوزن، الخروج والدخول، أسبوع جديد 0/4 مع بقاء السجل)، `dark` (الوضع الداكن، PWA، العمل دون اتصال والمزامنة)، `layout` (iPhone/Android/شاشة صغيرة/لوحي بلا تمرير أفقي، خط ثمانية عبر @font-face).
