import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ACTIVE_PROGRAM, SAFETY_NOTE } from '../data/program';
import { useAuth } from '../lib/auth';
import { exportAll, saveProfile, saveSettings, useDB } from '../lib/store';
import { syncNow, useSyncInfo } from '../lib/sync';
import { applyTheme, type ThemePref } from '../lib/theme';
import { isIOS, useInstall } from '../lib/pwa';
import { useDerived } from '../lib/derived';
import { Footer, PageHeader, Sheet, Switch, useToast } from '../components/ui';
import { Icon } from '../components/Icon';

export default function Settings() {
  const d = useDerived();
  const db = useDB();
  const { user, signOut, offlineSession } = useAuth();
  const sync = useSyncInfo();
  const nav = useNavigate();
  const { toast } = useToast();
  const install = useInstall();
  const s = d.settings;
  const [name, setName] = useState(db?.profile?.display_name ?? ACTIVE_PROGRAM.defaultName);
  const [outOpen, setOutOpen] = useState(false);
  const pending = db?.pending.length ?? 0;

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
        <div>
          <div className="label" style={{ marginBottom: 8 }}>بداية الأسبوع</div>
          <div className="seg" role="group" aria-label="بداية الأسبوع">
            {(
              [
                [0, 'الأحد'],
                [1, 'الاثنين'],
                [6, 'السبت'],
              ] as [number, string][]
            ).map(([k, label]) => (
              <button key={k} className={s.week_start === k ? 'on' : ''} aria-pressed={s.week_start === k} onClick={() => saveSettings({ week_start: k })}>
                {label}
              </button>
            ))}
          </div>
        </div>
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
        <div className="field">
          <label htmlFor="dn">الاسم في التحية</label>
          <div className="row" style={{ gap: 8 }}>
            <input id="dn" className="input grow" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} />
            <button className="btn btn-ghost" disabled={!name.trim() || name.trim() === (db?.profile?.display_name ?? ACTIVE_PROGRAM.defaultName)} onClick={() => { saveProfile(name.trim()); toast('تم الحفظ'); }}>حفظ</button>
          </div>
        </div>
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
