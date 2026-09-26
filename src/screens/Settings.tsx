import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ACTIVE_PROGRAM, SAFETY_NOTE } from '../data/program';
import { useAuth } from '../lib/auth';
import { exportAll, saveSettings, useDB } from '../lib/store';
import { syncNow, useSyncInfo } from '../lib/sync';
import { applyTheme, type ThemePref } from '../lib/theme';
import { isIOS, useInstall } from '../lib/pwa';
import { useDerived } from '../lib/derived';
import { Footer, PageHeader, Sheet, Switch, useToast } from '../components/ui';
import { Icon } from '../components/Icon';
import { disablePush, enablePush, getPushState, sendTestPush, type PushState } from '../lib/push';

export default function Settings() {
  const d = useDerived();
  const db = useDB();
  const { user, signOut, offlineSession } = useAuth();
  const sync = useSyncInfo();
  const nav = useNavigate();
  const { toast } = useToast();
  const install = useInstall();
  const s = d.settings;
  const [outOpen, setOutOpen] = useState(false);
  const [pushState, setPushState] = useState<PushState>('prompt');
  const [pushBusy, setPushBusy] = useState(false);
  const pending = db?.pending.length ?? 0;

  useEffect(() => { void getPushState().then(setPushState); }, []);

  const setTheme = (t: ThemePref) => {
    applyTheme(t);
    saveSettings({ theme: t });
  };

  function doExport() {
    const blob = new Blob([exportAll()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `45-4-backup-${d.today}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  async function turnOnPush() {
    setPushBusy(true);
    try {
      const next = await enablePush();
      setPushState(next);
      toast(next === 'enabled' ? 'تم تفعيل الإشعارات على هذا الجهاز' : next === 'denied' ? 'الإشعارات مرفوضة من إعدادات الجهاز' : 'تعذر التفعيل');
    } catch {
      toast('تعذر تفعيل الإشعارات الآن');
    } finally {
      setPushBusy(false);
    }
  }

  async function testPush() {
    setPushBusy(true);
    try {
      const delivered = await sendTestPush();
      toast(delivered > 0 ? 'أُرسل إشعار تجريبي حقيقي — يمكنك إغلاق 45/4 الآن' : 'لم نجد جهازًا مشتركًا بالإشعارات؛ اضغط تفعيل الإشعارات أولًا');
    } catch {
      toast('تعذر إرسال الإشعار التجريبي. تأكد أن Edge Function مفعّلة.');
    } finally {
      setPushBusy(false);
    }
  }

  async function turnOffPush() {
    setPushBusy(true);
    try {
      await disablePush();
      setPushState('prompt');
      toast('تم إيقاف إشعارات هذا الجهاز');
    } finally {
      setPushBusy(false);
    }
  }

  const syncLabel =
    sync.state === 'syncing' ? 'جارٍ المزامنة…' : sync.state === 'offline' ? 'بدون اتصال' : sync.state === 'error' ? 'تعذّرت المزامنة' : pending > 0 ? `${pending} تغيير بانتظار الرفع` : 'كل بياناتك محفوظة';

  return (
    <div className="page stack">
      <PageHeader title="الإعدادات" onBack={() => nav('/more')} />

      <div className="note-box cold" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Icon name="shield" style={{ width: 22, height: 22, flex: 'none', marginTop: 4 }} />
        <span>{SAFETY_NOTE}</span>
      </div>

      <section className="card stack">
        <div className="card-title">المظهر</div>
        <div className="seg" role="group" aria-label="المظهر">
          {(
            [
              ['system', 'تلقائي'],
              ['light', 'فاتح'],
              ['dark', 'داكن'],
            ] as [ThemePref, string][]
          ).map(([k, label]) => (
            <button key={k} className={s.theme === k ? 'on' : ''} aria-pressed={s.theme === k} onClick={() => setTheme(k)}>
              {label}
            </button>
          ))}
        </div>
        <div className="note-box cold">
          <div className="label">أسبوع 45/4</div>
          <b>الأحد ← السبت</b>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>الهدف ثابت: إكمال 4 أيام قبل نهاية السبت، ثم يبدأ أسبوع جديد صباح الأحد.</div>
        </div>
      </section>

      <section className="card stack">
        <div className="row-between">
          <div>
            <div className="card-title">الإشعارات 🔔</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 3 }}>تعمل حتى لو كان 45/4 مقفلًا بعد تثبيته على الشاشة الرئيسية.</div>
          </div>
          <span className={`tag ${pushState === 'enabled' ? 'tag-cold' : ''}`}>{pushState === 'enabled' ? 'مفعّلة' : pushState === 'denied' ? 'مرفوضة' : pushState === 'unsupported' ? 'غير مدعومة' : 'غير مفعّلة'}</span>
        </div>
        {pushState === 'enabled' ? (
          <>
            <div className="note-box cold">
              <b>تنبيهات 45/4:</b> دخول رفيقك وخروجه، إكمال 4/4، التشجيعات بينكما، وتنبيهك عند 45 دقيقة ثم عند الساعة إذا بقيت الزيارة مفتوحة.
            </div>
            <button className="btn btn-primary btn-block" disabled={pushBusy} onClick={() => void testPush()}><Icon name="bolt" /> أرسل لي إشعارًا تجريبيًا حقيقيًا</button>
            <button className="btn btn-ghost btn-block" disabled={pushBusy} onClick={() => void turnOffPush()}>إيقاف إشعارات هذا الجهاز</button>
          </>
        ) : pushState === 'prompt' ? (
          <button className="btn btn-primary btn-block" disabled={pushBusy} onClick={() => void turnOnPush()}><Icon name="bolt" /> تفعيل إشعارات 45/4</button>
        ) : pushState === 'denied' ? (
          <p className="muted" style={{ fontSize: 13 }}>اسمح بالإشعارات من إعدادات iPhone الخاصة بـ45/4 ثم ارجع لهذه الصفحة.</p>
        ) : (
          <>
            <p className="muted" style={{ fontSize: 13 }}>على iPhone افتح 45/4 من أيقونته في الشاشة الرئيسية، ثم اضغط «تحقق مرة أخرى».</p>
            <button className="btn btn-primary btn-block" disabled={pushBusy} onClick={() => void turnOnPush()}><Icon name="bolt" /> تحقق مرة أخرى</button>
          </>
        )}
      </section>

      <section className="card pad-0">
        <div className="card-title" style={{ padding: '16px 18px 4px' }}>أثناء التمرين</div>
        <div className="list-row">
          <div className="grow"><div className="t">الاهتزاز</div><div className="s">عند انتهاء الراحة وتغيّر الفترات (حيث يدعمه جهازك)</div></div>
          <Switch checked={s.vibration} onChange={(v) => saveSettings({ vibration: v })} label="الاهتزاز" />
        </div>
        <div className="list-row">
          <div className="grow"><div className="t">صوت التنبيه</div><div className="s">نغمة قصيرة هادئة</div></div>
          <Switch checked={s.sound} onChange={(v) => saveSettings({ sound: v })} label="صوت التنبيه" />
        </div>
        <div className="list-row">
          <div className="grow"><div className="t">إبقاء الشاشة مضاءة</div><div className="s">أثناء الجلسة فقط</div></div>
          <Switch checked={s.wake_lock} onChange={(v) => saveSettings({ wake_lock: v })} label="إبقاء الشاشة مضاءة" />
        </div>
        <div className="list-row">
          <div className="grow"><div className="t">قائمة «جاهز؟»</div><div className="s">ماء · منشفة · سماعات قبل كل جلسة</div></div>
          <Switch checked={!s.hide_ready_checklist} onChange={(v) => saveSettings({ hide_ready_checklist: !v })} label="قائمة جاهز" />
        </div>
      </section>

      <section className="card pad-0">
        <Link to="/settings/program" className="list-row">
          <span className="ic"><Icon name="edit" /></span>
          <div className="grow"><div className="t">تعديل البرنامج</div><div className="s">السيتات والتكرارات والراحة ومدة الكارديو</div></div>
          <Icon name="chevL" className="chev" />
        </Link>
        <Link to="/program" className="list-row">
          <span className="ic cold"><Icon name="target" /></span>
          <div className="grow"><div className="t">برنامج 12 أسبوعًا</div><div className="s">المراحل والقواعد</div></div>
          <Icon name="chevL" className="chev" />
        </Link>
        <button className="list-row" onClick={() => { saveSettings({ comeback_sessions_left: s.comeback_sessions_left > 0 ? 0 : 2 }); toast(s.comeback_sessions_left > 0 ? 'أُلغيت البداية الخفيفة' : 'ستبدأ بأوزان خفيفة في أول جلستين'); }}>
          <span className="ic"><Icon name="sparkle" /></span>
          <div className="grow"><div className="t">رجعت للنادي</div><div className="s">{s.comeback_sessions_left > 0 ? `مفعّلة — باقي ${s.comeback_sessions_left} جلسات خفيفة (اضغط للإلغاء)` : 'ابدأ بأوزان خفيفة جدًا بعد انقطاع'}</div></div>
        </button>
      </section>

      <section className="card stack">
        <div className="card-title">الحساب</div>
        <div className="stat-line"><Icon name="target" /><span>الهوية: <b>الكوتش / {ACTIVE_PROGRAM.defaultName}</b></span></div>
        <div className="stat-line"><Icon name="link" /><span className="ltr" dir="ltr" style={{ overflowWrap: 'anywhere' }}>{user?.email}</span></div>
        <div className="row-between">
          <div className="stat-line"><Icon name="cloud" /><span>{syncLabel}{offlineSession ? ' · جلسة محفوظة' : ''}</span></div>
          <button className="link-btn" onClick={() => { void syncNow().then(() => toast('اكتملت المزامنة')); }}>مزامنة الآن</button>
        </div>
        <button className="btn btn-ghost btn-block" onClick={doExport}><Icon name="download" /> تنزيل نسخة احتياطية من بياناتي</button>
        <button className="btn btn-danger btn-block" onClick={() => setOutOpen(true)}><Icon name="logout" /> تسجيل الخروج</button>
      </section>

      <section className="card stack">
        <div className="card-title">تثبيت التطبيق</div>
        {install.state === 'installed' ? (
          <p className="muted">التطبيق مثبّت على جهازك ✓</p>
        ) : install.state === 'available' ? (
          <button className="btn btn-primary btn-block" onClick={() => void install.install()}>ثبّت 45/4 على شاشتك</button>
        ) : isIOS() ? (
          <p className="muted" style={{ fontSize: 14 }}>في iPhone: اضغط زر المشاركة <Icon name="share" size={16} style={{ display: 'inline', verticalAlign: '-3px' }} /> في Safari ثم «إضافة إلى الشاشة الرئيسية».</p>
        ) : (
          <p className="muted" style={{ fontSize: 14 }}>من قائمة المتصفح اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».</p>
        )}
      </section>

      <Footer />

      <Sheet open={outOpen} onClose={() => setOutOpen(false)} title="تسجيل الخروج؟">
        <p className="muted">
          {pending > 0
            ? `لديك ${pending} تغييرًا لم يُرفع بعد. سنحاول رفعه الآن قبل الخروج، وإن لم يتوفر الاتصال ستُحذف من هذا الجهاز.`
            : 'ستدخل مرة أخرى بحساب Google عند الحاجة. بياناتك تبقى محفوظة في حسابك.'}
        </p>
        <button className="btn btn-danger btn-block" onClick={() => void signOut()}>نعم، اخرج</button>
        <button className="btn btn-ghost btn-block" onClick={() => setOutOpen(false)}>إلغاء</button>
      </Sheet>
    </div>
  );
}
