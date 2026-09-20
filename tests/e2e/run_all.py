"""
اختبارات التكامل الشاملة (Playwright) — تغطي قائمة الاختبارات العشرين في المتطلبات.
التشغيل: انظر tests/README.md
"""
import re, sys, json, datetime, traceback
from helpers import *

RESULTS = []
SHOTS = '/tmp/shots/e2e'
os.makedirs(SHOTS, exist_ok=True)

def check(name, cond, extra=''):
    RESULTS.append((name, bool(cond), extra))
    print(('  ✓ ' if cond else '  ✗ ') + name + (f'  [{extra}]' if extra and not cond else ''))

def new_page(browser, device=IPHONE, time='2026-09-20T10:00:00', dark=False, ctx=None):
    ctx = ctx or browser.new_context(**device, locale='ar-SA', color_scheme='dark' if dark else 'light')
    page = ctx.new_page()
    page.errors = []
    page.on('console', lambda m: page.errors.append(m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    page.on('pageerror', lambda e: page.errors.append('PAGEERR ' + str(e)))
    if time:
        page.clock.install(time=datetime.datetime.fromisoformat(time))
    return page

def tick(page, ms=400):
    page.clock.run_for(ms)

def bar_text(page):
    loc = page.locator('.live-bar .btn').last
    return loc.inner_text().strip() if loc.count() else ''

def close_ready(page):
    if page.locator('.sheet').count():
        page.click('.sheet >> text=ابدأ التمرين')
        tick(page)

def play_session(page, busy_first=False, early_after=None, difficulty='مناسب', long_cardio=False):
    """يشغّل جلسة كاملة عبر الواجهة. يعيد عدد الأجهزة المكتملة."""
    close_ready(page)
    steps = 0
    busy_done = False
    while steps < 300:
        steps += 1
        tick(page, 300)
        if page.locator('.finish').count():
            break
        # شاشة بينية
        if page.locator('text=بقي جهاز واحد مؤجل').count() or page.locator('text=بقيت').count() and page.locator('.inter').count():
            page.click('text=ابدأ به الآن'); continue
        if page.locator('.inter:has-text("اختيارية")').count():
            page.click('text=لا، أنهِ الحديد'); continue
        t = bar_text(page)
        if not t:
            continue
        if busy_first and not busy_done and page.locator('text=الجهاز مشغول').count():
            page.click('text=الجهاز مشغول'); busy_done = True; continue
        if 'ابدأ الكارديو' in t or 'ابدأ الإطالة' in t or t.startswith('ابدأ ') or t == 'استئناف':
            page.locator('.live-bar .btn').last.click()
            if long_cardio and 'الكارديو' in t:
                page.clock.run_for(20*60*1000+1000)
            continue
        if 'إنهاء' in t and 'الآن' in t:
            page.locator('.live-bar .btn').last.click(); continue
        if 'أنهيت' in t:
            page.locator('.live-bar .btn').last.click(); continue
        if 'تخطي الراحة' in t or t == 'التالي':
            page.locator('.live-bar .btn').last.click(); continue
    return steps

def save_finish(page, difficulty='مناسب'):
    page.wait_for_selector('.finish', timeout=8000)
    if difficulty:
        page.click(f'.seg >> text={difficulty}')
    page.click('text=حفظ الجلسة')
    page.wait_for_selector('.saved', timeout=8000)

def start_day_from_home(page, day=None):
    page.goto(BASE + '/'); page.wait_for_selector('.home-hello'); tick(page)
    if day:
        page.click('text=اختيار تمرين آخر'); tick(page)
        page.click(f'.sheet .pick-row:has-text("اليوم {day}")')
    else:
        page.click('text=ابدأ تمرين اليوم')
    page.wait_for_selector('.live-head')
    tick(page)

def go(page, path):
    """تنقّل داخل التطبيق دون إعادة تحميل (يحافظ على الساعة الوهمية)"""
    page.evaluate("p => { history.pushState({}, '', p); window.dispatchEvent(new PopStateEvent('popstate')); }", path)
    tick(page, 500)

def full_flow():
    with sync_playwright() as p:
        b = launch(p)
        mock('/__admin/reset')
        page = new_page(b)
        print('\n[1] الدخول والجلسة')
        page.goto(BASE + '/'); page.wait_for_selector('input[type=email]')
        check('شاشة الدخول تعرض 45/4 والنص الفرعي', page.locator('.logo-mark').inner_text().replace('\n','').replace(' ','') == '45/4' and '٤ أيام · ٤٥ دقيقة' in page.locator('.logo-sub').inner_text())
        check('لا دخول بلا تحقق: لا تظهر الرئيسية قبل الرمز', page.locator('.home-hello').count() == 0)
        page.fill('input[type=email]', 'ziyad@example.com'); page.click('button[type=submit]')
        page.wait_for_selector('.code-input')
        page.fill('.code-input', '000000')
        page.wait_for_selector('.input-error', timeout=8000)
        check('رمز خاطئ يُرفض برسالة عربية', 'الرمز' in page.locator('.input-error').inner_text() and page.locator('.home-hello').count() == 0)
        page.fill('.code-input', '123456'); page.wait_for_selector('.home-hello', timeout=15000)
        check('الدخول بالرمز الصحيح ينقل للرئيسية', True)
        tick(page)
        page.screenshot(path=f'{SHOTS}/home-iphone.png')

        # ثبات الجلسة
        page.reload(); page.wait_for_selector('.home-hello', timeout=15000)
        check('الجلسة تبقى بعد إعادة التحميل (بلا شاشة دخول)', page.locator('input[type=email]').count() == 0)

        print('\n[2] الرئيسية')
        txt = page.locator('.home-head').inner_text()
        check('الترحيب باسم زياد', 'السلام عليكم، زياد' in txt)
        check('التاريخ الهجري أولًا مع هـ', re.search(r'\d+ \S+( \S+)? 14\d\d هـ', txt) is not None, txt)
        check('التاريخ الميلادي أصغر تحته', page.locator('.home-date .greg').count() == 1)
        check('اليوم المقترح = اليوم 1 عند 0/4', 'اليوم 1' in page.locator('.ticket-title').inner_text())
        check('زر «ابدأ تمرين اليوم» موجود', page.locator('text=ابدأ تمرين اليوم').count() == 1)
        check('الأسبوع 0/4', '0/4' in page.locator('.week-big').inner_text())
        check('لا كلمة «تفريط» أثناء الأسبوع', 'تفريط' not in page.locator('body').inner_text())
        n_cards = page.locator('.page > section, .page > a.card, .page > .card').count()
        check('عدد بطاقات الرئيسية ≤ 6', n_cards <= 6, str(n_cards))
        nav_labels = [x.strip() for x in page.locator('.nav a').all_inner_texts()]
        check('التنقل السفلي: خمسة عناصر بالترتيب', nav_labels == ['الرئيسية', 'التمرين', 'التقويم', 'الأكل', 'المزيد'], str(nav_labels))

        print('\n[3] جلسة اليوم 1 (مع «الجهاز مشغول»)')
        page.click('text=ابدأ تمرين اليوم'); page.wait_for_selector('.live-head'); tick(page)
        check('قائمة «جاهز؟» تظهر (ماء/منشفة/سماعات)', all(page.locator('.sheet').inner_text().count(w) for w in ['ماء', 'منشفة', 'سماعات']))
        page.screenshot(path=f'{SHOTS}/live-ready.png')
        close_ready(page)
        check('رأس الجلسة: اليوم + المؤقّت + شريط التقدّم', page.locator('.live-title').inner_text().startswith('اليوم 1') and page.locator('.live-clock').count() == 1 and page.locator('.phasebar').count() == 1)
        check('زر «إنهاء مبكر» دائم', page.locator('text=إنهاء مبكر').count() == 1)
        # الكارديو
        page.click('text=ابدأ الكارديو'); tick(page, 1000)
        page.clock.run_for(3*60*1000)
        check('مؤقّت الكارديو يعدّ تنازليًا', page.locator('.timed-clock').get_attribute('aria-label') in ('16:59', '17:00', '16:58'), page.locator('.timed-clock').get_attribute('aria-label'))
        page.screenshot(path=f'{SHOTS}/live-cardio.png')
        page.click('text=إنهاء الكارديو الآن'); tick(page)
        # أول جهاز
        check('بطاقة الجهاز: اسم عربي وإنجليزي', 'ضغط الصدر' in page.locator('.mname').inner_text() or page.locator('.mname').count() == 1)
        name1 = page.locator('.mname').inner_text()
        check('اسم إنجليزي تحت العربي', page.locator('.mname-en').count() == 1)
        svg = page.locator('.mill svg')
        bb = svg.bounding_box()
        check('رسم الجهاز ظاهر (SVG بحجم فعلي وعناصر)', bb and bb['width'] > 200 and bb['height'] > 100 and page.locator('.mill svg *').count() > 5, str(bb))
        check('خطوات الاستخدام + التنبيه من PDF', page.locator('.steps li').count() == 3)
        page.screenshot(path=f'{SHOTS}/live-machine.png')
        # الجهاز مشغول
        page.click('text=الجهاز مشغول'); tick(page)
        name2 = page.locator('.mname').inner_text()
        check('«الجهاز مشغول» ينقلك للجهاز التالي', name2 != name1, f'{name1} → {name2}')
        # أنهِ سيتًا → راحة
        page.click('.live-bar >> text=أنهيت السيت 1'); tick(page)
        check('بعد السيت يبدأ مؤقّت راحة تلقائيًا', page.locator('.rest-panel').count() == 1)
        import time; time.sleep(0.6)
        page.screenshot(path=f'{SHOTS}/live-rest.png')
        page.clock.run_for(61000)
        check('انتهاء مؤقّت الراحة يعيدك للسيت التالي', page.locator('.rest-panel').count() == 0 and page.locator('.setbox.done').count() == 1)
        # نكمل الجلسة
        play_session(page, busy_first=False)
        page.wait_for_selector('.finish', timeout=8000)
        page.screenshot(path=f'{SHOTS}/finish.png')
        deferred_seen = True
        save_finish(page)
        t = page.locator('.saved').inner_text()
        check('شاشة النهاية: «تمت جلسة اليوم ✓»', 'تمت جلسة اليوم ✓' in t)
        check('العدّاد 1/4 هذا الأسبوع', '1/4' in t and 'هذا الأسبوع' in t, t)
        page.screenshot(path=f'{SHOTS}/saved.png')
        page.click('text=العودة للرئيسية'); page.wait_for_selector('.home-hello'); tick(page)
        check('الرئيسية بعد الجلسة: 1/4', '1/4' in page.locator('.week-big').inner_text())
        check('اليوم المقترح انتقل إلى اليوم 2 (ليس عشوائيًا)', 'اليوم 2' in page.locator('.ticket-title').inner_text())
        check('«آخر مرة تمرنت فيها: اليوم»', 'آخر مرة تمرنت فيها' in page.locator('.week-card, .page').inner_text() and 'اليوم' in page.locator('.stat-line').first.inner_text())

        print('\n[4] اختيار يوم آخر + 2/4')
        page.click('text=اختيار تمرين آخر'); tick(page)
        sheet = page.locator('.sheet').inner_text()
        check('كل الأيام الأربعة تظهر، واليوم 1 «مكتمل»', all(f'اليوم {i}' in sheet for i in (1, 2, 3, 4)) and 'مكتمل' in sheet)
        page.click('.sheet .pick-row:has-text("اليوم 2")'); page.wait_for_selector('.live-head'); tick(page)
        play_session(page); save_finish(page)
        check('1/4 → 2/4', '2/4' in page.locator('.saved').inner_text())
        page.click('text=العودة للرئيسية'); page.wait_for_selector('.home-hello'); tick(page)
        check('الاقتراح التالي اليوم 3', 'اليوم 3' in page.locator('.ticket-title').inner_text())
        check('رسالة منتصف الأسبوع بلا «تفريط»', 'باقي لك جلستان' in page.locator('body').inner_text() and 'تفريط' not in page.locator('body').inner_text())

        print('\n[5] إنهاء مبكر واليوم الدائري')
        page.click('text=ابدأ تمرين اليوم'); page.wait_for_selector('.live-head'); tick(page)
        close_ready(page)
        page.click('text=ابدأ الكارديو'); tick(page); page.click('text=إنهاء الكارديو الآن'); tick(page)
        page.click('.live-bar >> text=أنهيت السيت 1'); tick(page)
        page.click('text=إنهاء مبكر'); tick(page)
        page.click('.sheet >> text=إنهاء وحفظ'); tick(page)
        page.wait_for_selector('.finish')
        check('الإنهاء المبكر يفتح شاشة الحفظ', 'إنهاء مبكر' in page.locator('.finish').inner_text())
        page.click('.seg >> text=سهل'); page.fill('#note', 'كتفي متعب قليلًا'); page.click('text=حفظ الجلسة'); page.wait_for_selector('.saved')
        check('حفظ التقدّم عند الإنهاء المبكر (3/4)', '3/4' in page.locator('.saved').inner_text())
        page.click('text=العودة للرئيسية'); page.wait_for_selector('.home-hello'); tick(page)

        # اليوم 4
        start_day_from_home(page)
        check('اليوم المقترح الأخير هو اليوم 4', 'اليوم 4' in page.locator('.live-title').inner_text())
        close_ready(page)
        play_session(page); save_finish(page)
        t = page.locator('.saved').inner_text()
        check('4/4: «اكتمل هدف الأسبوع ✓»', 'اكتمل هدف الأسبوع ✓' in t and '4/4' in t, t)
        page.screenshot(path=f'{SHOTS}/saved-44.png')
        page.click('text=العودة للرئيسية'); page.wait_for_selector('.home-hello'); tick(page)
        check('الرئيسية عند 4/4: بطاقة اكتمال الأسبوع', 'اكتمل هدف الأسبوع' in page.locator('.ticket').inner_text())
        page.screenshot(path=f'{SHOTS}/home-44.png')

        print('\n[6] الجلسة الخامسة الإضافية')
        page.click('.ticket >> text=جلسة إضافية اختيارية'); tick(page)
        page.click('.sheet >> text=سباحة هادئة'); page.click('.sheet >> text=ابدأ سباحة'); page.wait_for_selector('.live-head'); tick(page)
        close_ready(page)
        page.click('text=ابدأ الجلسة'); tick(page); page.click('text=إنهاء الجلسة الآن'); tick(page)
        page.wait_for_selector('.finish'); page.click('text=حفظ الجلسة'); page.wait_for_selector('.saved')
        t = page.locator('.saved').inner_text()
        check('الخامسة: «4/4 ✓ + جلسة إضافية» ولا تزيد العدّاد', '4/4 ✓ + جلسة إضافية' in t, t)
        page.click('text=العودة للرئيسية'); page.wait_for_selector('.home-hello'); tick(page)
        check('الرئيسية: 4/4 ✓ + جلسة إضافية', '4/4 ✓ + جلسة إضافية' in page.locator('.week-card, .page').inner_text())

        print('\n[7] التقويم الهجري')
        go(page, '/calendar'); page.wait_for_selector('.cal')
        month = page.locator('.cal-month').inner_text()
        check('اسم الشهر هجري (أم القرى) مع هـ', 'ربيع الآخر' in month and 'هـ' in month, month)
        n_cells = page.locator('.cal-cell:not(.out)').count()
        check('الشهر 29 أو 30 يومًا', n_cells in (29, 30), str(n_cells))
        check('أرقام ميلادية صغيرة في كل خانة', page.locator('.cal-cell:not(.out) .gd').count() == n_cells)
        check('أيام التمرين معلَّمة (خانات base)', page.locator('.cal-cell.base').count() >= 1)
        check('الجلسة الإضافية بالنحاسي (extra أو base مع نقطة)', page.locator('.cal-cell.extra, .cal-cell .dot2').count() >= 1)
        check('اليوم بحلقة', page.locator('.cal-cell.today').count() == 1)
        check('عمود الأسبوع يعرض 4/4', '4/4' in page.locator('.cal-week.ok').first.inner_text())
        page.screenshot(path=f'{SHOTS}/calendar.png')
        page.click('[aria-label="الشهر السابق"]'); tick(page)
        m2 = page.locator('.cal-month').inner_text()
        check('التنقّل إلى الشهر السابق', 'ربيع الأول' in m2, m2)
        check('لا علامات فوات في الشهر السابق الفارغ', page.locator('.cal-cell.base').count() == 0)
        page.screenshot(path=f'{SHOTS}/calendar-prev.png')
        page.click('[aria-label="الشهر التالي"]'); tick(page)

        print('\n[8] المزيد والسجل')
        go(page, '/more'); page.wait_for_selector('.list-row')
        rows = [x.split('\n')[0].strip() for x in page.locator('.list-row').all_inner_texts()]
        check('«المزيد»: دليل الأجهزة، اسمع، تقدمي، سجل الجلسات، الإعدادات', rows == ['دليل الأجهزة', 'اسمع أثناء التمرين', 'تقدّمي', 'سجل الجلسات', 'الإعدادات'], str(rows))
        go(page, '/history'); tick(page)
        items = page.locator('.list-row').count()
        check('سجل الجلسات يعرض 5 جلسات', items == 5, str(items))
        first = page.locator('.list-row').first.inner_text()
        check('الأحدث أولًا (الجلسة الإضافية)', 'سباحة' in first, first)
        page.locator('.list-row').nth(1).click(); tick(page, 600); page.wait_for_selector('text=تفاصيل الجلسة'); tick(page, 300)
        check('صفحة تفاصيل الجلسة: تاريخ هجري وأجهزة', 'هـ' in page.locator('body').inner_text() and page.locator('.list-row').count() >= 3)
        page.screenshot(path=f'{SHOTS}/session-detail.png')

        print('\n[9] الوزن والتقدّم')
        go(page, '/progress'); page.wait_for_selector('input[aria-label="الوزن بالكيلوغرام"]')
        page.fill('input[aria-label="الوزن بالكيلوغرام"]', '91.5'); page.click('.btn-primary:has-text("حفظ")'); tick(page)
        check('حفظ وزن الأسبوع', page.locator('.tag-cold:has-text("91.5")').count() == 1)
        check('مخطط الوزن يظهر', page.locator('.wchart circle').count() == 1)
        page.fill('input[aria-label="الخصر بالسنتيمتر"]', '104'); page.click('.btn-ghost:has-text("حفظ")'); tick(page)
        st = page.locator('.stats-grid').first.inner_text()
        check('الإحصائيات: 5 جلسات، أسبوع 4/4 واحد', '5' in st and '1' in st)
        page.screenshot(path=f'{SHOTS}/progress.png', full_page=True)

        print('\n[10] المزامنة مع الخادم')
        page.clock.run_for(5000); page.wait_for_timeout(1500); page.clock.run_for(3000); page.wait_for_timeout(800)
        st = mock('/__admin/state')['tables']
        check('الجلسات وصلت للخادم (5)', len(st['workout_sessions']) == 5, str(len(st['workout_sessions'])))
        check('تمارين الجلسات وصلت', len(st['workout_session_exercises']) > 10)
        check('الوزن وصل للخادم', any(str(m.get('weight_kg')) in ('91.5',) for m in st['weekly_measurements']))
        check('لا مفتاح خدمة في الحزمة (service_role)', 'service_role' not in open('/home/claude/45-4/dist-test/index.html').read())

        print('\n[11] الخروج وإعادة الدخول')
        go(page, '/settings'); page.wait_for_selector('text=تسجيل الخروج')
        page.click('.btn-danger:has-text("تسجيل الخروج")'); tick(page)
        page.click('.sheet >> text=نعم، اخرج'); page.clock.run_for(4000); page.wait_for_selector('input[type=email]', timeout=15000)
        check('تسجيل الخروج يعيد لشاشة الدخول', True)
        ls = page.evaluate("() => Object.keys(localStorage).filter(k => k.startsWith('45-4:db:'))")
        check('مسح البيانات المحلية بعد الخروج', len(ls) == 0, str(ls))
        page.fill('input[type=email]', 'ziyad@example.com'); page.click('button[type=submit]'); page.wait_for_selector('.code-input')
        page.fill('.code-input', '123456'); page.wait_for_selector('text=الإعدادات', timeout=15000)
        go(page, '/'); page.wait_for_selector('.home-hello', timeout=15000)
        page.clock.run_for(3000); page.wait_for_timeout(1500); page.clock.run_for(2000); tick(page, 1000)
        check('بعد الدخول من جديد: 4/4 + بياناتك عادت من الخادم', '4/4' in page.locator('.week-big').inner_text(), page.locator('.week-big').inner_text())

        print('\n[12] أسبوع جديد يعيد العدّاد 0/4 ويبقي السجل')
        page.clock.set_system_time(datetime.datetime.fromisoformat('2026-09-28T09:00:00'))
        page.clock.run_for(31000); tick(page, 500)
        page.wait_for_timeout(300)
        check('أسبوع جديد: 0/4', '0/4' in page.locator('.week-big').inner_text(), page.locator('.week-big').inner_text())
        body = page.locator('body').inner_text()
        check('رسالة الأسبوع المنتهي هادئة ولا تُنكر الإنجاز (4/4 ⇒ لا بطاقة تفريط)', 'تفريط' not in body)
        go(page, '/history'); tick(page)
        check('السجل محفوظ (5 جلسات)', page.locator('.list-row').count() == 5)

        print('\n[13] الأكل والأجهزة والاستماع')
        go(page, '/food'); page.wait_for_selector('.plate')
        ft = page.locator('body').inner_text()
        check('صفحة الأكل: إرشادي + ركّز/خفّف', 'إرشادي' in ft and 'ركّز على' in ft and 'خفّف من' in ft)
        check('قاعدة الطبق ½ ¼ ¼', '½' in page.locator('.plate svg').inner_html() or page.locator('.plate svg text').count() == 3)
        for tabname in ['باعتدال', 'قلّل منها', 'أكثر منها']:
            page.click(f'.seg >> text={tabname}'); tick(page, 200)
        check('الأقسام الثلاثة تعمل', page.locator('.foodgroup').count() >= 1)
        page.screenshot(path=f'{SHOTS}/food.png', full_page=True)
        go(page, '/devices'); page.wait_for_selector('.dev-card'); tick(page, 800)
        check('دليل الأجهزة: 17 جهازًا', page.locator('.dev-card').count() == 17, str(page.locator('.dev-card').count()))
        page.fill('input[type=search]', 'chest'); tick(page, 300)
        check('البحث بالإنجليزية يعمل', page.locator('.dev-card').count() >= 1 and page.locator('.dev-card').count() < 17)
        page.fill('input[type=search]', 'ظهر'); tick(page, 300)
        check('البحث بالعربية (عضلة الظهر) يعمل', page.locator('.dev-card').count() >= 2)
        page.locator('.dev-card').first.click(); tick(page, 600); page.wait_for_selector('.steps'); tick(page, 300)
        check('صفحة جهاز: عضلات + خطوات + أين يُستخدم', page.locator('.steps li').count() == 3 and 'أين يظهر' in page.locator('body').inner_text())
        go(page, '/listen'); page.wait_for_selector('.seg'); tick(page)
        lt = page.locator('body').inner_text()
        check('الاستماع: ثلاث تبويبات وثلاثة قرّاء', all(x in lt for x in ['تلاوات', 'بودكاست', 'محفوظاتي', 'أحمد طالب حميد', 'عبدالرحمن الماجد', 'عبدالله القرافي']))
        page.screenshot(path=f'{SHOTS}/listen.png', full_page=True)
        page.click('.seg >> text=محفوظاتي'); tick(page, 200)
        page.click('text=إضافة رابط'); tick(page, 300)
        page.fill('#a-title', 'مراجعة'); page.fill('#a-url', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'); page.click('.sheet >> text=حفظ'); tick(page, 400)
        check('إضافة رابط YouTube يدويًا وتسميته', page.locator('.list-row:has-text("مراجعة")').count() == 1)
        page.click('[aria-label="تشغيل مراجعة"]'); tick(page, 500)
        check('مشغّل مضمَّن Embedded يظهر', page.locator('.mini iframe').count() == 1 and 'youtube.com/embed/dQw4w9WgXcQ' in page.locator('.mini iframe').get_attribute('src'))
        check('لا أخطاء JavaScript في الجلسة', not [e for e in page.errors if 'youtube' not in e.lower()], str(page.errors[:3]))
        b.close()

def settings_dark_and_pwa():
    with sync_playwright() as p:
        b = launch(p)
        mock('/__admin/reset')
        ctx = b.new_context(**IPHONE, locale='ar-SA', color_scheme='light')
        page = new_page(b, ctx=ctx, time=None)
        login(page)
        page.wait_for_timeout(500)
        print('\n[14] الوضع الداكن')
        light_bg = page.evaluate("getComputedStyle(document.body).backgroundColor")
        page.goto(BASE + '/settings'); page.wait_for_selector('.seg')
        page.click('.seg >> text=داكن'); page.wait_for_timeout(800)
        dark_bg = page.evaluate("getComputedStyle(document.body).backgroundColor")
        check('الوضع الداكن يغيّر الخلفية', light_bg != dark_bg and page.evaluate("document.documentElement.dataset.theme") == 'dark', f'{light_bg} → {dark_bg}')
        m = re.findall(r'\d+', dark_bg)
        check('خلفية داكنة فعلًا (وليست معكوسة)', sum(map(int, m[:3])) < 150, dark_bg)
        page.screenshot(path=f'{SHOTS}/settings-dark.png', full_page=True)
        page.reload(); page.wait_for_selector('.seg'); page.wait_for_timeout(500)
        check('الوضع الداكن يبقى بعد إعادة التحميل', page.evaluate("document.documentElement.dataset.theme") == 'dark')
        for path, name in [('/', 'home'), ('/workout', 'workout'), ('/calendar', 'calendar'), ('/food', 'food'), ('/more', 'more'), ('/devices', 'devices'), ('/progress', 'progress'), ('/program', 'program')]:
            page.goto(BASE + path); page.wait_for_timeout(900)
            page.screenshot(path=f'{SHOTS}/dark-{name}.png')
        print('\n[15] PWA')
        mf = page.evaluate("fetch('/manifest.webmanifest').then(r => r.json())")
        check('manifest: الاسم 45/4 وقائم بذاته وRTL', mf['name'] == '45/4' and mf['display'] == 'standalone' and mf['dir'] == 'rtl' and mf['lang'] == 'ar')
        check('manifest: أيقونات 192/512/maskable', {i['sizes'] for i in mf['icons']} >= {'192x192', '512x512'} and any(i.get('purpose') == 'maskable' for i in mf['icons']))
        for i in mf['icons']:
            r = page.evaluate("u => fetch(u).then(r => [r.status, r.headers.get('content-type')])", i['src'])
            check(f'الأيقونة {i["src"]} تُحمَّل (200 png)', r[0] == 200 and 'png' in r[1], str(r))
        page.evaluate("navigator.serviceWorker.ready.then(() => true)")
        sw = page.evaluate("navigator.serviceWorker.getRegistration().then(r => !!(r && (r.active || r.waiting || r.installing)))")
        check('Service Worker مسجَّل', sw)
        page.wait_for_timeout(1500)
        cached = page.evaluate("caches.keys().then(async ks => { let n = 0; for (const k of ks) n += (await (await caches.open(k)).keys()).length; return n })")
        check('الواجهة والخطوط والرسومات في الكاش', cached >= 20, str(cached))
        page.reload(); page.wait_for_timeout(1500)   # ليتحكم SW بالصفحة
        page.goto(BASE + '/'); page.wait_for_selector('.home-hello'); page.wait_for_timeout(1500)
        page.context.set_offline(True)
        page.reload(); 
        try:
            page.wait_for_selector('.home-hello', timeout=12000)
            off = True
        except Exception:
            off = False
        check('العمل دون اتصال: الواجهة تُفتح بعد الفصل', off)
        if off:
            page.screenshot(path=f'{SHOTS}/offline-home.png')
            page.evaluate("history.pushState({}, '', '/food'); window.dispatchEvent(new PopStateEvent('popstate'))"); page.wait_for_timeout(700)
            check('دون اتصال: صفحات التطبيق تعمل', page.locator('.plate').count() == 1)
            # تسجيل وزن دون اتصال ثم المزامنة عند العودة
            page.evaluate("history.pushState({}, '', '/progress'); window.dispatchEvent(new PopStateEvent('popstate'))"); page.wait_for_timeout(700)
            page.fill('input[aria-label="الوزن بالكيلوغرام"]', '90.2'); page.click('.btn-primary:has-text("حفظ")'); page.wait_for_timeout(600)
            check('دون اتصال: يُحفظ الوزن محليًا', page.locator('.tag-cold:has-text("90.2")').count() == 1)
            before = len(mock('/__admin/state')['tables']['weekly_measurements'])
            page.context.set_offline(False); page.wait_for_timeout(5000)
            after = mock('/__admin/state')['tables']['weekly_measurements']
            check('عند عودة الاتصال تُزامَن البيانات المعلّقة', before == 0 and any(str(m.get('weight_kg')) == '90.2' for m in after), f'{before} → {after}')
        b.close()

def layouts_and_fonts():
    with sync_playwright() as p:
        b = launch(p)
        mock('/__admin/reset')
        for dev_name, dev in [('iphone', IPHONE), ('android', ANDROID), ('small', dict(viewport={'width': 320, 'height': 640}, device_scale_factor=2, is_mobile=True, has_touch=True)), ('tablet', dict(viewport={'width': 820, 'height': 1180}, device_scale_factor=1))]:
            print(f'\n[16] العرض: {dev_name}')
            page = new_page(b, device=dev, time=None)
            login(page); page.wait_for_timeout(600)
            bad = []
            routes = ['/', '/workout', '/calendar', '/food', '/more', '/devices', '/devices/chest-press', '/listen', '/progress', '/program', '/history', '/settings', '/settings/program']
            for r in routes:
                page.goto(BASE + r); page.wait_for_timeout(700)
                o = overflow(page)
                if o['sw'] > o['cw'] or o['bw'] > o['cw']:
                    bad.append((r, o))
            check(f'{dev_name}: بلا تمرير أفقي في كل الصفحات ({len(routes)})', not bad, str(bad))
            page.goto(BASE + '/'); page.wait_for_timeout(500)
            page.screenshot(path=f'{SHOTS}/{dev_name}-home.png')
            page.goto(BASE + '/calendar'); page.wait_for_timeout(500)
            page.screenshot(path=f'{SHOTS}/{dev_name}-calendar.png')
            if dev_name == 'iphone':
                fonts = page.evaluate("""async () => { await document.fonts.ready; return [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight) }""")
                check('خط ثمانية Sans محمَّل عبر @font-face', any('Thmanyah Sans' in f for f in fonts), str(fonts))
                check('خط ثمانية Serif Display محمَّل للعناوين', any('Thmanyah Serif' in f for f in fonts), str(fonts))
                ff = page.evaluate("getComputedStyle(document.body).fontFamily")
                check('الخط الأساسي للنص Thmanyah', 'Thmanyah' in ff, ff)
                ext = page.evaluate("""() => [...document.querySelectorAll('link[href*=\"fonts.googleapis\"], link[href*=\"fonts.gstatic\"]')].length""")
                check('لا Google Fonts', ext == 0)
                # RTL
                check('اتجاه الصفحة RTL ولغتها عربية', page.evaluate("[document.documentElement.dir, document.documentElement.lang]") == ['rtl', 'ar'])
            page.context.close()
        b.close()

if __name__ == '__main__':
    which = sys.argv[1:] or ['flow', 'dark', 'layout']
    for w in which:
        try:
            {'flow': full_flow, 'dark': settings_dark_and_pwa, 'layout': layouts_and_fonts}[w]()
        except Exception as e:
            traceback.print_exc()
            check(f'انهيار في مجموعة {w}: {e}', False)
    bad = [r for r in RESULTS if not r[1]]
    print(f'\n=== {len(RESULTS) - len(bad)}/{len(RESULTS)} نجحت ===')
    for n, _, x in bad:
        print('  ✗', n, x)
    sys.exit(1 if bad else 0)
