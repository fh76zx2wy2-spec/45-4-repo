import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ACTIVE_PROGRAM, DAY_BY_ID, PROGRAM_WEEKS, SESSION_STRUCTURE, WEEKLY_GOAL } from '../data/program';
import { DAILY_FOCUS, pickByDate } from '../data/nutrition';
import { DURATION_PICKS, RECITERS } from '../data/audio';
import { useDerived } from '../lib/derived';
import { useStartActions } from '../lib/actions';
import { deleteGymVisit, dismiss, endGymVisit, startGymVisit, useDB } from '../lib/store';
import { useSyncInfo } from '../lib/sync';
import { addDaysISO, diffDaysISO, formatGreg, formatHijri, formatHijriMonth, hijriOf, sinceLabel, weekdayName } from '../lib/dates';
import { currentWeekMessage, monthRecapTarget, monthSummary, nudgeMessage, pastWeekMessage, sessionsWord, weekInfo } from '../lib/week';
import { CheckMark, Footer, Logo, useNow, useToast } from '../components/ui';
import { Icon } from '../components/Icon';
import { Illustration } from '../components/Illustration';
import { DayPickerSheet, ExtraSheet, ShortSheet, dayIllustrations } from '../components/pickers';
import { durationLabel, timeLabel } from '../lib/format';
import { useBuddy } from '../lib/buddy';

export default function Home() {
  const d = useDerived();
  const db = useDB();
  const nav = useNavigate();
  const act = useStartActions(d);
  const sync = useSyncInfo();
  const [pickOpen, setPickOpen] = useState(false);
  const [shortOpen, setShortOpen] = useState(false);
  const [extraOpen, setExtraOpen] = useState(false);
  const { toast } = useToast();
  const buddy = useBuddy();

  const name = db?.profile?.display_name?.trim() || ACTIVE_PROGRAM.defaultName;
  const { today, info, suggested, position, stats, settings } = d;
  const live = db?.live ?? null;
  const activeVisit = db?.visits.find((v) => !v.left_at) ?? null;
  const nowMs = useNow(15_000, !!activeVisit);
  const activeVisitSeconds = activeVisit ? Math.max(0, Math.floor((nowMs - Date.parse(activeVisit.arrived_at)) / 1000)) : 0;
  const todayVisits = (db?.visits ?? []).filter((v) => v.date === today);
  const lastEndedToday = todayVisits.find((v) => !!v.left_at) ?? null;
  const lastHealthToday = (db?.health ?? []).find((h) => h.date === today) ?? null;
  const buddyMe = buddy.me;
  const buddyMate = buddy.buddy;

  const arriveAtGym = () => {
    const v = startGymVisit();
    toast(`تم تسجيل وصولك · ${timeLabel(v.arrived_at)}`);
  };
  const leaveGym = () => {
    if (!activeVisit) return;
    const v = endGymVisit(activeVisit.id);
    if (v) toast(`تم تسجيل خروجك · جلست في النادي ${durationLabel(v.duration_seconds)}`);
  };
  const undoArrival = () => {
    if (!activeVisit) return;
    if (!window.confirm('إلغاء تسجيل الوصول الحالي؟ سيُحذف وقت الوصول وكأنك لم تضغط «وصلت النادي».')) return;
    deleteGymVisit(activeVisit.id);
    toast('تم التراجع عن تسجيل الوصول');
  };
  const sendBuddyReaction = async (kind: 'kfu' | 'fire') => {
    try {
      const who = await buddy.sendReaction(kind);
      toast(kind === 'kfu' ? `أرسلت 👏 كفو إلى ${who}` : `أرسلت 🔥 شد حيلك إلى ${who}`);
    } catch {
      toast('تعذّر إرسال التشجيع الآن');
    }
  };

  const day = suggested ? DAY_BY_ID[suggested] : null;
  const msg = currentWeekMessage(info.count);
  const nudge = nudgeMessage(info.count);

  const pendingCount = db?.pending.length ?? 0;
  const offline = sync.state === 'offline' || (typeof navigator !== 'undefined' && !navigator.onLine);

  /* ---------- بطاقة تنبيه واحدة على الأكثر ---------- */
  const gap = stats.lastSessionDate ? diffDaysISO(stats.lastSessionDate, today) : 0;
  const prevWeekStart = addDaysISO(d.curWeekStart, -7);
  const prevInfo = weekInfo(d.sessions, prevWeekStart);
  const prevKey = `wk:${prevWeekStart}`;
  const hasPrevWeek = prevWeekStart >= position.startWeek && d.sessions.length > 0;
  const recap = monthRecapTarget(today);
  const recapKey = recap ? `recap:${recap.monthStart}` : '';

  let notice: JSX.Element | null = null;
  if (settings.comeback_sessions_left > 0) {
    notice = (
      <div className="card card-cold">
        <div className="row-between">
          <div>
            <div className="card-title">بداية خفيفة</div>
            <div className="card-sub" style={{ color: 'var(--cold-ink)' }}>
              باقي {sessionsWord(settings.comeback_sessions_left)} بأوزان خفيفة جدًا — لا تُعوّض ما فات.
            </div>
          </div>
          <button className="link-btn" onClick={act.cancelComeback}>إلغاء</button>
        </div>
      </div>
    );
  } else if (stats.lastSessionDate && gap >= 10) {
    notice = (
      <div className="card card-hot">
        <div className="card-title">غبتَ فترة؟ لا بأس</div>
        <div className="card-sub" style={{ color: 'var(--hot-ink)' }}>ابدأ بأوزان خفيفة جدًا في أول جلستين، دون محاولة تعويض ما فات.</div>
        <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => { act.comeback(); }}>
          رجعت للنادي
        </button>
      </div>
    );
  } else if (hasPrevWeek && !prevInfo.complete && !settings.dismissed[prevKey] && prevInfo.counted.length + prevInfo.extras.length > 0) {
    const pm = pastWeekMessage(prevInfo.count);
    notice = (
      <div className="card card-flat">
        <div className="row-between" style={{ alignItems: 'flex-start' }}>
          <div>
            <div className="eyebrow">الأسبوع الماضي</div>
            <div className="card-title">{pm.title}</div>
            <div className="card-sub">{pm.sub}. أسبوع جديد وفرصة جديدة — ابدأ من اليوم.</div>
          </div>
          <button className="icon-btn" style={{ width: 38, height: 38 }} onClick={() => dismiss(prevKey)} aria-label="إخفاء"><Icon name="x" size={18} /></button>
        </div>
      </div>
    );
  } else if (recap && !settings.dismissed[recapKey] && d.sessions.length > 0) {
    const ms = monthSummary(d.sessions, recap.monthStart, d.weekStartDay, today);
    const h = hijriOf(recap.monthStart);
    notice = (
      <div className="card card-flat">
        <div className="row-between" style={{ alignItems: 'flex-start' }}>
          <div>
            <div className="eyebrow">{recap.label === 'ending' ? 'الشهر على وشك الانتهاء' : 'ملخص الشهر'} · {formatHijriMonth(h.y, h.m)}</div>
            <div className="card-title">{ms.visits === 0 ? 'لا زيارات مسجّلة هذا الشهر' : `${ms.visits} ${ms.visits === 1 ? 'زيارة' : 'زيارات'} للنادي`}</div>
            <div className="card-sub">
              {ms.base} أساسية{ms.extra ? ` + ${ms.extra} إضافية` : ''} · {ms.weeksComplete} {ms.weeksComplete === 1 ? 'أسبوع' : 'أسابيع'} 4/4
            </div>
            <Link to="/calendar" className="link-btn" style={{ paddingInline: 0 }}>عرض التقويم</Link>
          </div>
          <button className="icon-btn" style={{ width: 38, height: 38 }} onClick={() => dismiss(recapKey)} aria-label="إخفاء"><Icon name="x" size={18} /></button>
        </div>
      </div>
    );
  }

  /* ---------- الاقتراحات اليومية ---------- */
  const focus = pickByDate(DAILY_FOCUS, today);
  const reciter = pickByDate(RECITERS, today);
  const pick = pickByDate(DURATION_PICKS, today, 3);
  const phase = position.phase;
  const shown = position.shown;

  const liveDay = live?.day ? DAY_BY_ID[live.day] : null;

  return (
    <div className="page stack">
      {/* الرأس */}
      <header className="home-head">
        <div className="row-between">
          <Logo size={40} />
          <div className="row home-head-actions">
            {activeVisit && (
              <button type="button" className="gym-exit-chip" onClick={leaveGym}>
                خرجت من النادي
              </button>
            )}
            {(offline || pendingCount > 0) && (
              <span className="tag" title="حالة المزامنة">
                <Icon name="cloud" size={16} />
                {offline ? 'بدون اتصال — تُحفظ محليًا' : 'جارٍ المزامنة'}
              </span>
            )}
          </div>
        </div>
        <h1 className="home-hello">السلام عليكم، {name}</h1>
        <div className="home-date">
          <div className="hijri">{formatHijri(today)}</div>
          <div className="greg muted">{weekdayName(today)} · {formatGreg(today)} م</div>
        </div>
      </header>

      {/* تسجيل الحضور مستقل عن نوع التمرين */}
      <section className={`gym-checkin ${activeVisit ? 'active' : ''}`} aria-label="تسجيل الحضور في النادي">
        {activeVisit ? (
          <>
            <div className="gym-checkin-row">
              <div>
                <div className="gym-checkin-kicker">أنت في النادي الآن</div>
                <div className="gym-checkin-time num">{durationLabel(activeVisitSeconds)}</div>
              </div>
              <span className="gym-checkin-dot" aria-hidden="true" />
            </div>
            <div className="gym-checkin-meta">
              وصلت {timeLabel(activeVisit.arrived_at)} · يمكنك إغلاق الموقع، فالمدة تُحسب من وقت الوصول المحفوظ.
            </div>
            <button type="button" className="gym-undo-btn" onClick={undoArrival}>تراجع عن الوصول</button>
          </>
        ) : (
          <>
            <button type="button" className="gym-arrive-btn" onClick={arriveAtGym}>
              <span>وصلت النادي</span><Icon name="check" size={26} strokeWidth={3} />
            </button>
            <div className="gym-checkin-meta">اضغطها عند وصولك فقط — ولا تؤثر على تمرين اليوم أو احتساب 4/4.</div>
            {lastEndedToday && (
              <div className="gym-last-visit">
                آخر زيارة اليوم: {timeLabel(lastEndedToday.arrived_at)} ← {timeLabel(lastEndedToday.left_at)} · <b>{durationLabel(lastEndedToday.duration_seconds)}</b>
              </div>
            )}
          </>
        )}
      </section>

      <Link to="/apple-health" className="apple-optional">
        <span className="apple-mark"></span>
        <span className="grow">
          <b>بيانات Apple Health</b>
          <small>{lastHealthToday ? `آخر استيراد اليوم · ${durationLabel(lastHealthToday.duration_seconds)}` : 'استيراد اختياري — لا يغيّر نشاطك ولا تمرينك'}</small>
        </span>
        <span className="tag tag-cold">اختياري</span>
        <Icon name="chevL" className="chev" />
      </Link>

      {/* 1) تمرين اليوم */}
      {live ? (
        <section className="ticket" aria-label="جلسة جارية">
          <div className="ticket-top cold">
            <div className="ticket-blob" />
            <div className="ticket-eyebrow">جلسة جارية</div>
            <h2 className="ticket-title">{liveDay ? `اليوم ${liveDay.id} — ${liveDay.focus}` : 'جلسة إضافية'}</h2>
            <div className="ticket-sub">لديك جلسة لم تنتهِ — أكملها من حيث توقفت.</div>
            <div className="ticket-stripe" />
          </div>
          <div className="ticket-bottom">
            <button className="btn btn-teal btn-lg btn-block" onClick={() => nav('/live')}>متابعة الجلسة <Icon name="chevL" /></button>
          </div>
        </section>
      ) : day ? (
        <section className="ticket" aria-label="تمرينك المقترح اليوم">
          <div className="ticket-top">
            <div className="ticket-blob" />
            <div className="ticket-eyebrow">تمرينك المقترح اليوم</div>
            <h2 className="ticket-title">اليوم {day.id}<span style={{ opacity: .6 }}> — </span>{day.focus}</h2>
            <div className="ticket-sub">{day.subtitle}</div>
            <div className="ticket-tags">
              <span className="tag tag-ghost"><Icon name="clock" size={14} /> {SESSION_STRUCTURE.total} دقيقة</span>
              <span className="tag tag-ghost">{phase.badge}</span>
              <span className="tag tag-ghost">{d.advice.label}</span>
            </div>
            <div className="ticket-ill">
              {dayIllustrations(day).slice(0, 3).map((id) => (
                <Illustration key={id} id={id} className="sm" />
              ))}
            </div>
            <div className="ticket-stripe" />
          </div>
          <div className="ticket-bottom">
            <button className="btn btn-primary btn-lg btn-block" onClick={() => act.startDay(day.id)}>
              <Icon name="play" /> ابدأ تمرين اليوم
            </button>
            <button className="btn btn-ghost btn-block" onClick={() => setPickOpen(true)}>اختيار تمرين آخر</button>
            <div className="ticket-links">
              <button className="link-btn" onClick={() => setShortOpen(true)}><Icon name="bolt" size={18} /> وقتي اليوم قصير</button>
              <button className="link-btn" onClick={() => setExtraOpen(true)}><Icon name="leaf" size={18} /> جلسة إضافية</button>
            </div>
            <div className="muted center" style={{ fontSize: 13 }}>{d.advice.detail}</div>
          </div>
        </section>
      ) : (
        <section className="ticket" aria-label="اكتمل هدف الأسبوع">
          <div className="ticket-top cold center">
            <div className="ticket-blob" />
            <div className="celebrate"><CheckMark size={92} /></div>
            <h2 className="ticket-title">اكتمل هدف الأسبوع ✓</h2>
            <div className="ticket-sub">4/4{info.extras.length ? ' ✓ + جلسة إضافية' : ''} — أحسنت، الباقي راحة أو جلسة خفيفة اختيارية.</div>
            <div className="ticket-stripe" />
          </div>
          <div className="ticket-bottom">
            <button className="btn btn-teal btn-lg btn-block" onClick={() => setExtraOpen(true)}><Icon name="leaf" /> جلسة إضافية اختيارية</button>
            <button className="btn btn-ghost btn-block" onClick={() => setPickOpen(true)}>إعادة أحد التمارين</button>
          </div>
        </section>
      )}

      {/* 2) تقدّم الأسبوع */}
      <section className="card" aria-label="تقدّم الأسبوع">
        <div className="row-between">
          <div>
            <div className="eyebrow">هذا الأسبوع</div>
            <div className="week-big disp">
              <span className="num">{info.count}/{WEEKLY_GOAL}</span>
            </div>
          </div>
          <div className="week-msg">
            <div className="t">{msg.title}</div>
            <div className="muted" style={{ fontSize: 13.5 }}>{info.complete && info.extras.length ? '4/4 ✓ + جلسة إضافية' : msg.sub}</div>
          </div>
        </div>
        <div className="bar" style={{ marginTop: 14 }} role="progressbar" aria-valuemin={0} aria-valuemax={WEEKLY_GOAL} aria-valuenow={info.count}>
          <i style={{ width: `${(info.count / WEEKLY_GOAL) * 100}%` }} />
        </div>
        <div className="week-dots" style={{ marginTop: 16 }}>
          {Array.from({ length: WEEKLY_GOAL }, (_, i) => {
            const s = info.counted[i];
            const doneDot = i < info.count;
            const next = i === info.count;
            return (
              <div key={i} className={`wdot ${doneDot ? 'done' : ''} ${next ? 'next' : ''}`}>
                <div className="c">{doneDot ? <Icon name="check" /> : <span className="num">{i + 1}</span>}</div>
                <span>{s?.workout_day ? `اليوم ${s.workout_day}` : doneDot ? 'مكتملة' : ' '}</span>
              </div>
            );
          })}
        </div>
        {nudge && !info.complete && info.count > 0 && <p className="muted" style={{ fontSize: 13.5, marginTop: 12 }}>{nudge}</p>}
        <div className="divider" style={{ margin: '14px 0 12px' }} />
        <div className="stack" style={{ gap: 8 }}>
          <div className="stat-line">
            <Icon name="clock" />
            <span>
              {stats.lastSessionDate ? (
                <>آخر مرة تمرنت فيها: <b>{sinceLabel(stats.lastSessionDate, today)}</b></>
              ) : (
                <>لم تبدأ بعد — جلستك الأولى هي الأهم</>
              )}
            </span>
          </div>
          {(stats.streak.current > 0 || stats.streak.best > 0) && (
            <div className="stat-line">
              <Icon name="flag" />
              <span>
                سلسلة الالتزام: <b>{stats.streak.current}</b> {stats.streak.current === 1 ? 'أسبوع' : 'أسابيع'}
                {stats.streak.best > stats.streak.current ? <span className="muted"> · أفضل سلسلة سابقة: {stats.streak.best}</span> : null}
              </span>
            </div>
          )}
        </div>
      </section>

      {notice}

      {/* أنا وعبدالسلام — تحفيز فقط، دون أي بيانات صحية خاصة */}
      <section className="card buddy-card" aria-label="أنا وعبدالسلام">
        <div className="row-between buddy-head">
          <div>
            <div className="eyebrow">رفيق التمرين</div>
            <div className="card-title">أنا و{buddyMate?.display_name ?? 'رفيق التمرين'} 👥</div>
          </div>
          <button type="button" className="icon-btn" onClick={() => void buddy.refresh()} aria-label="تحديث"><Icon name="undo" size={18} /></button>
        </div>

        {buddy.latestReaction && (
          <div className="buddy-received">
            {buddy.latestReaction.kind === 'kfu' ? '👏' : '🔥'} {buddy.latestReaction.sender_name} أرسل لك {buddy.latestReaction.kind === 'kfu' ? 'كفو' : 'شد حيلك'}
          </div>
        )}

        {buddy.loading ? (
          <div className="muted" style={{ fontSize: 13.5 }}>جاري تحميل التحدي…</div>
        ) : buddy.error || !buddyMe || !buddyMate ? (
          <div className="muted" style={{ fontSize: 13.5 }}>تعذّر تحميل التحدي الآن. جرّب التحديث بعد قليل.</div>
        ) : (
          <>
            <div className="buddy-grid">
              {[buddyMe, buddyMate].map((b) => (
                <div className="buddy-person" key={b.user_id}>
                  <div className="buddy-name">{b.user_id === buddyMe.user_id ? 'أنت' : b.display_name}</div>
                  <div className="buddy-score num">{b.weekly_sessions}/4</div>
                  <div className="buddy-mini"><span>الزيارات</span><b className="num">{b.weekly_visits}</b></div>
                  <div className="buddy-mini"><span>وقت النادي</span><b>{durationLabel(b.weekly_visit_seconds)}</b></div>
                  <div className="buddy-mini"><span>آخر حضور</span><b>{b.last_arrived_at ? timeLabel(b.last_arrived_at) : '—'}</b></div>
                  <div className="buddy-mini"><span>سلسلة 4/4 🔥</span><b className="num">{b.streak_4of4}</b></div>
                </div>
              ))}
            </div>
            <div className="buddy-challenge">
              {buddyMe.weekly_sessions === 4 && buddyMate.weekly_sessions === 4
                ? '🏆 أنتم الاثنين أكملتوا 4/4 هذا الأسبوع'
                : buddyMe.weekly_sessions === buddyMate.weekly_sessions
                  ? `التحدي متعادل ${buddyMe.weekly_sessions}/4 — من يكمل التالي؟`
                  : buddyMe.weekly_sessions > buddyMate.weekly_sessions
                    ? `أنت متقدم ${buddyMe.weekly_sessions} مقابل ${buddyMate.weekly_sessions} — حافظ على التقدم 💪`
                    : `${buddyMate.display_name} متقدم ${buddyMate.weekly_sessions} مقابل ${buddyMe.weekly_sessions} — الحق به 😄`}
            </div>
            <div className="buddy-actions">
              <button type="button" className="btn btn-soft" disabled={!!buddy.sending} onClick={() => void sendBuddyReaction('kfu')}>👏 كفو</button>
              <button type="button" className="btn btn-soft" disabled={!!buddy.sending} onClick={() => void sendBuddyReaction('fire')}>🔥 شد حيلك</button>
            </div>
            <div className="buddy-privacy">المشاركة هنا للحضور والالتزام فقط — الوزن والقياسات والنبض وApple Health تبقى خاصة.</div>
          </>
        )}
      </section>

      {/* 4) اقتراح الأكل */}
      <Link to="/food" className="card tap" aria-label="اقتراح الأكل">
        <div className="row-between" style={{ marginBottom: 8 }}>
          <div className="row" style={{ gap: 10 }}>
            <span className="ic-round"><Icon name="plate" /></span>
            <div className="card-title">اقتراح الأكل اليوم</div>
          </div>
          <span className="badge-guide">إرشادي</span>
        </div>
        <div className="food-line"><span className="food-k more">ركّز على</span><span>{focus.focus}</span></div>
        <div className="food-line"><span className="food-k less">خفّف من</span><span>{focus.reduce}</span></div>
      </Link>

      {/* 5) اقتراح الاستماع */}
      <Link to="/listen" className="card tap" aria-label="اقتراح الاستماع">
        <div className="row-between" style={{ marginBottom: 6 }}>
          <div className="row" style={{ gap: 10 }}>
            <span className="ic-round cold"><Icon name="headphones" /></span>
            <div className="card-title">للاستماع أثناء التمرين</div>
          </div>
          <Icon name="chevL" className="chev" />
        </div>
        <div style={{ fontWeight: 700 }}>{reciter.name}</div>
        <div className="muted" style={{ fontSize: 14 }}>{pick.title} · {pick.approx}</div>
      </Link>

      {/* 6) المرحلة */}
      <section className="card" aria-label="مرحلة الـ 12 أسبوعًا">
        <div className="row-between" style={{ marginBottom: 12 }}>
          <div>
            <div className="eyebrow">برنامج {PROGRAM_WEEKS} أسبوعًا</div>
            <div className="card-title">{position.beyond ? `أنهيت ${PROGRAM_WEEKS} أسبوعًا` : `الأسبوع ${shown} من ${PROGRAM_WEEKS}`} · {phase.name}</div>
          </div>
          <Link to="/program" className="link-btn">التفاصيل</Link>
        </div>
        <div className="segbar" aria-hidden="true">
          {Array.from({ length: PROGRAM_WEEKS }, (_, i) => (
            <i key={i} className={i + 1 < shown || position.beyond ? 'done' : i + 1 === shown ? 'cur' : ''} />
          ))}
        </div>
        <p className="muted" style={{ fontSize: 14, marginTop: 12 }}>
          {position.beyond ? 'واصل بنفس مرحلة التثبيت والشدّ، وارفع الوزن تدريجيًا.' : phase.short}
        </p>
      </section>

      <Footer />

      <DayPickerSheet open={pickOpen} onClose={() => setPickOpen(false)} d={d} onPick={(id) => act.startDay(id)} />
      <ShortSheet open={shortOpen} onClose={() => setShortOpen(false)} d={d} onStart={(id, m) => act.startDay(id, m)} />
      <ExtraSheet open={extraOpen} onClose={() => setExtraOpen(false)} onStart={act.startExtra} />
    </div>
  );
}
