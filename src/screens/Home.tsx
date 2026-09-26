import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ACTIVE_PROGRAM, DAY_BY_ID, PROGRAM_WEEKS, SESSION_STRUCTURE, WEEKLY_GOAL } from '../data/program';
import { DAILY_FOCUS, pickByDate } from '../data/nutrition';
import { DURATION_PICKS, RECITERS } from '../data/audio';
import { useDerived } from '../lib/derived';
import { useStartActions } from '../lib/actions';
import { deleteGymVisit, dismiss, endGymVisit, startGymVisit, useDB } from '../lib/store';
import { syncNow, useSyncInfo } from '../lib/sync';
import { addDaysISO, attendanceDayLabel, diffDaysISO, formatGreg, formatHijri, formatHijriMonth, hijriOf, weekdayName } from '../lib/dates';
import { attendanceWeekInfo, monthRecapTarget, monthSummary, sessionsWord, weekInfo } from '../lib/week';
import { CheckMark, Footer, Logo, Sheet, useNow, useToast } from '../components/ui';
import { Icon } from '../components/Icon';
import { Illustration } from '../components/Illustration';
import { DayPickerSheet, ExtraSheet, ShortSheet, dayIllustrations } from '../components/pickers';
import { durationLabel, timeLabel } from '../lib/format';
import { BUDDY_REACTION_LABEL, useBuddy, type BuddyReactionKind } from '../lib/buddy';
import { buildAchievements } from '../lib/achievements';
import { coachName, dayIcon } from '../lib/profile';
import { usePrivateProfilePhoto } from '../lib/privateProfilePhoto';
import { enablePush, getPushState, notifyBuddyArrival, notifyBuddyFourOfFour, notifyBuddyLeft, notifyBuddyReaction, type PushState } from '../lib/push';
import { downloadGymSummaryCard, shareGymSummary, type GymSummaryShare } from '../lib/shareCard';

function attendanceWeekCopy(count: number) {
  const left = Math.max(0, WEEKLY_GOAL - count);
  if (left === 0) return { title: 'اكتمل حضور الأسبوع ✓', sub: 'أربعة أيام حضور من الأحد إلى السبت' };
  const title = count === 0 ? 'أسبوع جديد — أربع زيارات بانتظارك' : count === 1 ? 'أنجزت يوم حضور واحد هذا الأسبوع' : count === 2 ? 'أنجزت يومي حضور هذا الأسبوع' : `أنجزت ${count} أيام حضور هذا الأسبوع`;
  const sub = left === 1 ? 'باقي لك يوم حضور واحد' : left === 2 ? 'باقي لك يومان' : `باقي لك ${left} أيام حضور`;
  return { title, sub };
}

function attendanceNudge(count: number) {
  const left = WEEKLY_GOAL - count;
  if (left <= 0) return null;
  if (left === 1) return 'يوم حضور واحد يفصلك عن 4/4';
  if (left === 2) return 'يوما حضور يفصلانك عن 4/4';
  return `${left} أيام حضور تفصلك عن 4/4`;
}

function pastAttendanceCopy(count: number) {
  if (count >= WEEKLY_GOAL) return { title: 'اكتمل حضور الأسبوع ✓', sub: '4/4' };
  const missed = WEEKLY_GOAL - count;
  return { title: `الأسبوع الماضي: ${count} من 4 أيام حضور`, sub: missed === 1 ? 'فاتك يوم حضور واحد' : `فاتتك ${missed} أيام حضور` };
}

export default function Home() {
  const d = useDerived();
  const db = useDB();
  const nav = useNavigate();
  const act = useStartActions(d);
  const sync = useSyncInfo();
  const [pickOpen, setPickOpen] = useState(false);
  const [shortOpen, setShortOpen] = useState(false);
  const [extraOpen, setExtraOpen] = useState(false);
  const [exitSummary, setExitSummary] = useState<GymSummaryShare | null>(null);
  const { toast } = useToast();
  const buddy = useBuddy();

  const name = coachName();
  const { today, info, attendanceInfo, suggested, position, stats, settings, curWeekStart, trainedToday } = d;
  const live = db?.live ?? null;
  const activeVisit = db?.visits.find((v) => !v.left_at) ?? null;
  const nowMs = useNow(15_000, !!activeVisit);
  const activeVisitSeconds = activeVisit ? Math.max(0, Math.floor((nowMs - Date.parse(activeVisit.arrived_at)) / 1000)) : 0;
  const todayVisits = (db?.visits ?? []).filter((v) => v.date === today);
  const lastEndedToday = todayVisits.find((v) => !!v.left_at) ?? null;
  const buddyMe = buddy.me;
  const buddyMate = buddy.buddy;
  const coachPhoto = usePrivateProfilePhoto();
  const [pushState, setPushState] = useState<PushState>('prompt');
  const achievements = buildAchievements(db?.sessions ?? [], db?.visits ?? [], buddyMe?.streak_4of4 ?? stats.streak.current, stats.weeksComplete);
  const isRestDay = d.advice.kind === 'rest' && !trainedToday && !info.complete;
  const todayIcon = dayIcon(suggested, isRestDay);

  useEffect(() => { void getPushState().then(setPushState); }, []);

  const arriveAtGym = async () => {
    const wasAttendanceCount = attendanceInfo.count;
    const alreadyCountedToday = attendanceInfo.dates.includes(today);
    const v = startGymVisit();
    toast(`بدأ الوقت، الله يقويك · وصلت ${timeLabel(v.arrived_at)}`);
    // الحضور مستقل عن برنامج التمارين: لا نبدأ جلسة ولا ننقل المستخدم تلقائيًا.
    try {
      await syncNow();
      await notifyBuddyArrival(v.id);
      const newCount = Math.min(WEEKLY_GOAL, wasAttendanceCount + (alreadyCountedToday ? 0 : 1));
      if (wasAttendanceCount < WEEKLY_GOAL && newCount >= WEEKLY_GOAL) await notifyBuddyFourOfFour(curWeekStart);
    } catch {
      // تسجيل الحضور يبقى محفوظًا محليًا حتى لو تعذّر إرسال الإشعار الآن.
    }
    void buddy.refresh();
  };
  const leaveGym = () => {
    if (!activeVisit) return;
    const liveSnapshot = db?.live;
    const latestSaved = (db?.sessions ?? []).filter((s) => s.date === today).sort((a, b) => b.ended_at.localeCompare(a.ended_at))[0];
    const exercises = liveSnapshot
      ? liveSnapshot.stages.filter((s) => s.kind === 'exercise' && s.status !== 'pending').length
      : latestSaved?.exercises.filter((e) => e.status === 'done' || e.status === 'partial').length ?? 0;
    const sets = liveSnapshot
      ? liveSnapshot.stages.filter((s) => s.kind === 'exercise').reduce((sum, s) => sum + s.setsDone, 0)
      : latestSaved?.exercises.reduce((sum, e) => sum + e.sets_done, 0) ?? 0;
    const v = endGymVisit(activeVisit.id);
    if (v) {
      const summary: GymSummaryShare = {
        coach: name,
        dateLabel: `${weekdayName(today)} · ${formatGreg(today)} م`,
        durationLabel: durationLabel(v.duration_seconds),
        exercises,
        sets,
        weekCount: attendanceInfo.count,
      };
      setExitSummary(summary);
      void (async () => {
        try {
          await syncNow();
          await notifyBuddyLeft(v.id, v.duration_seconds);
        } catch { /* الزيارة محفوظة؛ الإشعار لا يمنع الخروج */ }
        void buddy.refresh();
      })();
      toast(`تم تسجيل خروجك · جلست في النادي ${summary.durationLabel}`);
    }
  };
  const undoArrival = () => {
    if (!activeVisit) return;
    if (!window.confirm('إلغاء تسجيل الوصول الحالي؟ سيُحذف وقت الوصول وكأنك لم تضغط «وصلت النادي».')) return;
    deleteGymVisit(activeVisit.id);
    void syncNow();
    toast('تم التراجع عن تسجيل الوصول');
  };
  const sendBuddyReaction = async (kind: BuddyReactionKind) => {
    try {
      const who = await buddy.sendReaction(kind);
      try { await notifyBuddyReaction(kind); } catch { /* يبقى التشجيع داخل 45/4 حتى لو تعذّر Push */ }
      toast(`أرسلت ${BUDDY_REACTION_LABEL[kind]} إلى ${who}`);
    } catch {
      toast('تعذّر إرسال التشجيع الآن');
    }
  };

  const enableNotifications = async () => {
    try {
      const state = await enablePush();
      setPushState(state);
      toast(state === 'enabled' ? 'تم تفعيل إشعارات 45/4 🔔' : state === 'denied' ? 'الإشعارات مرفوضة من إعدادات الجهاز' : 'تعذر تفعيل الإشعارات على هذا الجهاز');
    } catch {
      toast('تعذر تفعيل الإشعارات الآن');
    }
  };

  const day = suggested ? DAY_BY_ID[suggested] : null;
  const msg = attendanceWeekCopy(attendanceInfo.count);
  const nudge = attendanceNudge(attendanceInfo.count);

  const pendingCount = db?.pending.length ?? 0;
  const offline = sync.state === 'offline' || (typeof navigator !== 'undefined' && !navigator.onLine);

  /* ---------- بطاقة تنبيه واحدة على الأكثر ---------- */
  const gap = stats.lastSessionDate ? diffDaysISO(stats.lastSessionDate, today) : 0;
  const prevWeekStart = addDaysISO(d.curWeekStart, -7);
  const prevAttendance = attendanceWeekInfo(db?.visits ?? [], prevWeekStart);
  const prevKey = `wk:${prevWeekStart}`;
  const hasPrevWeek = prevWeekStart >= position.startWeek && (db?.visits ?? []).length > 0;
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
  } else if (hasPrevWeek && !prevAttendance.complete && !settings.dismissed[prevKey] && prevAttendance.visits.length > 0) {
    const pm = pastAttendanceCopy(prevAttendance.count);
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
              {ms.base} جلسة خطة{ms.extra ? ` + ${ms.extra} إضافية` : ''} · ملخص التمارين فقط
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
      {/* هوية الكوتش */}
      <header className={`coach-hero ${ACTIVE_PROGRAM.key}`}>
        <span className="coach-orb orb-a" aria-hidden="true" />
        <span className="coach-orb orb-b" aria-hidden="true" />
        <div className="coach-top row-between">
          <Logo size={40} />
          <div className="row home-head-actions">
            {activeVisit && (
              <button type="button" className="gym-exit-chip" onClick={leaveGym}>
                خرجت من النادي
              </button>
            )}
            {(offline || pendingCount > 0) && (
              <span className="tag coach-sync" title="حالة المزامنة">
                <Icon name="cloud" size={16} />
                {offline ? 'بدون اتصال' : 'جارٍ المزامنة'}
              </span>
            )}
          </div>
        </div>
        <div className="coach-main">
          <div className="coach-copy">
            <h1 className="coach-name">الكوتش <span>/</span> {name}</h1>
            <div className="coach-date">
              <b>{formatHijri(today)}</b>
              <span>{weekdayName(today)} · {formatGreg(today)} م</span>
            </div>
          </div>
          <div className="coach-photo-wrap">
            {coachPhoto ? (
              <img src={coachPhoto} alt={`صورة الكوتش ${name}`} className="coach-photo" />
            ) : (
              <div className="coach-photo coach-photo-placeholder" aria-label={`صورة الكوتش ${name}`}>{name.slice(0, 1)}</div>
            )}
            <span className="coach-photo-badge">45/4</span>
          </div>
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
            <div className="gym-checkin-meta">اضغطها عند وصولك فقط — الحضور مستقل عن برنامج التمارين، و4/4 يُحسب من أيام حضورك.</div>
            {lastEndedToday && (
              <div className="gym-last-visit">
                آخر زيارة اليوم: {timeLabel(lastEndedToday.arrived_at)} ← {timeLabel(lastEndedToday.left_at)} · <b>{durationLabel(lastEndedToday.duration_seconds)}</b>
              </div>
            )}
          </>
        )}
      </section>



      <section className="push-home-card">
        <span className="push-home-icon"><Icon name="bolt" /></span>
        <div className="grow">
          <b>تنبيهات 45/4</b>
          <small>{pushState === 'enabled' ? 'مفعّلة على هذا الجهاز ✓' : pushState === 'denied' ? 'الإشعارات مرفوضة من إعدادات الجهاز' : pushState === 'unsupported' ? 'افتح 45/4 من أيقونة الشاشة الرئيسية ثم اضغط تحقق' : 'دخول رفيقك، 4/4، التشجيعات، وتنبيها 45 دقيقة والساعة'}</small>
        </div>
        {pushState === 'prompt' && <button className="btn btn-sm btn-primary" onClick={() => void enableNotifications()}>تفعيل</button>}
        {pushState === 'unsupported' && <button className="btn btn-sm btn-ghost" onClick={() => void getPushState().then(setPushState)}>تحقق</button>}
        {pushState === 'enabled' && <span className="tag tag-cold">مفعّلة</span>}
      </section>

      {/* اليوم باختصار */}
      <section className={`today-brief ${isRestDay ? 'rest' : attendanceInfo.complete ? 'complete' : ''}`}>
        <span className="today-brief-icon"><Icon name={todayIcon} /></span>
        <div className="grow">
          <div className="eyebrow">اليوم باختصار</div>
          <div className="today-brief-title">
            {attendanceInfo.complete ? 'حضورك مكتمل 4/4 ✅' : isRestDay ? 'راحة واستشفاء 🌿' : day ? `اليوم ${day.id} — ${day.focus}` : 'جاهز للأسبوع'}
          </div>
          <div className="today-brief-meta">
            {attendanceInfo.complete
              ? 'أكملت أربعة أيام حضور هذا الأسبوع — برنامج التمرين يبقى اختياريًا' 
              : isRestDay
                ? `تمرينك القادم: ${day?.focus ?? 'حسب خطتك'} · ${SESSION_STRUCTURE.total} دقيقة`
                : `${SESSION_STRUCTURE.total} دقيقة · ${activeVisit ? 'أنت في النادي الآن' : trainedToday ? 'تمرين اليوم مكتمل' : 'بانتظار حضورك'}`}
          </div>
        </div>
        <span className="today-brief-score num">{attendanceInfo.count}/4</span>
      </section>

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
        <section className="ticket" aria-label="اكتملت أيام خطة التمرين">
          <div className="ticket-top cold center">
            <div className="ticket-blob" />
            <div className="celebrate"><CheckMark size={92} /></div>
            <h2 className="ticket-title">أنهيت أيام خطة التمرين ✓</h2>
            <div className="ticket-sub">أنهيت الأيام الأربعة المقترحة{info.extras.length ? ' + جلسة إضافية' : ''} — والحضور 4/4 يُحسب مستقلًا من زيارات النادي.</div>
            <div className="ticket-stripe" />
          </div>
          <div className="ticket-bottom">
            <button className="btn btn-teal btn-lg btn-block" onClick={() => setExtraOpen(true)}><Icon name="leaf" /> جلسة إضافية اختيارية</button>
            <button className="btn btn-ghost btn-block" onClick={() => setPickOpen(true)}>إعادة أحد التمارين</button>
          </div>
        </section>
      )}

      {/* 2) تقدّم الأسبوع — الأحد إلى السبت دائمًا */}
      <section className={`card week-card ${attendanceInfo.complete ? 'is-complete' : ''}`} aria-label="تقدّم الأسبوع">
        {attendanceInfo.complete && (
          <div className="week-confetti" aria-hidden="true">
            {Array.from({ length: 10 }, (_, i) => <i key={i} />)}
          </div>
        )}
        <div className="row-between">
          <div>
            <div className="eyebrow">هذا الأسبوع · الأحد ← السبت</div>
            <div className="week-big disp">
              <span className="num">{attendanceInfo.count}/{WEEKLY_GOAL}</span>
            </div>
            <div className="week-range">{formatGreg(curWeekStart)} — {formatGreg(addDaysISO(curWeekStart, 6))}</div>
          </div>
          <div className="week-msg">
            <div className="t">{attendanceInfo.complete ? 'أسبوع كامل ✅' : msg.title}</div>
            <div className="muted" style={{ fontSize: 13.5 }}>{attendanceInfo.complete ? '4 أيام من الأحد إلى السبت — ممتاز' : msg.sub}</div>
          </div>
        </div>
        <div className="bar" style={{ marginTop: 14 }} role="progressbar" aria-valuemin={0} aria-valuemax={WEEKLY_GOAL} aria-valuenow={attendanceInfo.count}>
          <i style={{ width: `${(attendanceInfo.count / WEEKLY_GOAL) * 100}%` }} />
        </div>
        <div className="week-dots" style={{ marginTop: 16 }}>
          {Array.from({ length: WEEKLY_GOAL }, (_, i) => {
            const visitDate = attendanceInfo.dates[i];
            const doneDot = i < attendanceInfo.count;
            const next = i === attendanceInfo.count;
            return (
              <div key={i} className={`wdot ${doneDot ? 'done' : ''} ${next ? 'next' : ''}`}>
                <div className="c">{doneDot ? <Icon name="check" /> : <span className="num">{i + 1}</span>}</div>
                <span>{visitDate ? weekdayName(visitDate) : doneDot ? 'حضور' : ' '}</span>
              </div>
            );
          })}
        </div>
        {nudge && !attendanceInfo.complete && attendanceInfo.count > 0 && <p className="muted" style={{ fontSize: 13.5, marginTop: 12 }}>{nudge}</p>}
        <div className="divider" style={{ margin: '14px 0 12px' }} />
        <div className="stack" style={{ gap: 8 }}>
          <div className="stat-line">
            <Icon name="clock" />
            <span>
              {(db?.visits ?? []).length ? (() => {
                const last = [...(db?.visits ?? [])].sort((a, b) => b.arrived_at.localeCompare(a.arrived_at))[0];
                return <>آخر حضور: <b>{attendanceDayLabel(last.arrived_at, today)} · {timeLabel(last.arrived_at)}</b></>;
              })() : (
                <>لم تسجّل حضورًا بعد — أول زيارة هي البداية</>
              )}
            </span>
          </div>
          {(buddyMe?.streak_4of4 ?? 0) > 0 && (
            <div className="stat-line">
              <Icon name="flag" />
              <span>
                سلسلة حضور 4/4: <b>{buddyMe?.streak_4of4 ?? 0}</b> {(buddyMe?.streak_4of4 ?? 0) === 1 ? 'أسبوع' : 'أسابيع'}
              </span>
            </div>
          )}
        </div>
      </section>

      {notice}

      {/* الإنجازات — تحفيز خفيف بلا تسجيل أوزان أو بيانات صحية */}
      <section className="card achievement-card" aria-label="الإنجازات والشارات">
        <div className="row-between" style={{ marginBottom: 12 }}>
          <div>
            <div className="eyebrow">شاراتك</div>
            <div className="card-title">إنجازات 45/4 🏆</div>
          </div>
          <span className="tag tag-cold">{achievements.filter((a) => a.unlocked).length}/{achievements.length}</span>
        </div>
        <div className="achievement-grid">
          {achievements.map((a) => (
            <div key={a.id} className={`achievement ${a.unlocked ? 'on' : 'off'}`}>
              <span className="achievement-icon"><Icon name={a.icon} /></span>
              <div><b>{a.title}</b><small>{a.detail}</small></div>
              {a.unlocked && <span className="achievement-check"><Icon name="check" size={13} /></span>}
            </div>
          ))}
        </div>
      </section>

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
            {buddy.latestReaction.sender_name} أرسل لك: {BUDDY_REACTION_LABEL[buddy.latestReaction.kind]}
          </div>
        )}

        {buddy.loading ? (
          <div className="muted" style={{ fontSize: 13.5 }}>جاري تحميل التحدي…</div>
        ) : buddy.error || !buddyMe || !buddyMate ? (
          <div className="muted" style={{ fontSize: 13.5 }}>تعذّر تحميل التحدي الآن. جرّب التحديث بعد قليل.</div>
        ) : (
          <>
            {buddyMate.in_gym ? (
              <div className="buddy-live-banner">
                <span className="buddy-live-dot" />
                <b>{buddyMate.display_name} في النادي الآن 🔥</b>
                <span>منذ {buddyMate.active_arrived_at ? timeLabel(buddyMate.active_arrived_at) : 'قليل'}</span>
              </div>
            ) : buddyMate.last_left_at ? (
              <div className="buddy-last-banner">
                {buddyMate.display_name} أنهى آخر زيارة · {durationLabel(buddyMate.last_visit_seconds)} 👏
              </div>
            ) : null}

            <div className="buddy-grid">
              {[buddyMe, buddyMate].map((b) => (
                <div className={`buddy-person ${b.in_gym ? 'active' : ''}`} key={b.user_id}>
                  <div className="buddy-name">{b.user_id === buddyMe.user_id ? 'أنت' : b.display_name}{b.in_gym ? ' · بالنادي' : ''}</div>
                  <div className="buddy-score num">{b.weekly_sessions}/4</div>
                  <div className="buddy-mini"><span>الزيارات</span><b className="num">{b.weekly_visits}</b></div>
                  <div className="buddy-mini"><span>وقت النادي</span><b>{durationLabel(b.weekly_visit_seconds)}</b></div>
                  <div className="buddy-mini"><span>آخر حضور</span><b>{b.last_arrived_at ? `${attendanceDayLabel(b.last_arrived_at, today)} · ${timeLabel(b.last_arrived_at)}` : '—'}</b></div>
                  <div className="buddy-mini"><span>سلسلة 4/4 🔥</span><b className="num">{b.streak_4of4}</b></div>
                </div>
              ))}
            </div>
            <div className="buddy-challenge">
              <span className="buddy-challenge-label">تحدي الأسبوع · أول من يصل 4/4</span>
              {buddyMe.weekly_sessions === 4 && buddyMate.weekly_sessions === 4
                ? '🏆 أنتم الاثنين أكملتوا 4/4 هذا الأسبوع'
                : buddyMe.weekly_sessions === buddyMate.weekly_sessions
                  ? `التحدي متعادل ${buddyMe.weekly_sessions}/4 — من يكمل التالي؟`
                  : buddyMe.weekly_sessions > buddyMate.weekly_sessions
                    ? `أنت متقدم ${buddyMe.weekly_sessions} مقابل ${buddyMate.weekly_sessions} — حافظ على التقدم 💪`
                    : `${buddyMate.display_name} متقدم ${buddyMate.weekly_sessions} مقابل ${buddyMe.weekly_sessions} — الحق به 😄`}
            </div>
            <div className="buddy-actions buddy-actions-many">
              {(['kfu','fire','beatme','yourturn','beast4'] as BuddyReactionKind[]).map((kind) => (
                <button key={kind} type="button" className="buddy-react-btn" disabled={!!buddy.sending} onClick={() => void sendBuddyReaction(kind)}>
                  {BUDDY_REACTION_LABEL[kind]}
                </button>
              ))}
            </div>
            <div className="buddy-privacy">المشاركة هنا للحضور والالتزام فقط — الوزن والقياسات والنبض والسعرات تبقى خاصة تمامًا.</div>
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

      <Sheet open={!!exitSummary} onClose={() => setExitSummary(null)} title="ملخص زيارتك">
        {exitSummary && (
          <div className="exit-summary-sheet">
            <div className="exit-summary-card">
              <div className="exit-summary-brand">45/4</div>
              <div className="exit-summary-coach">الكوتش / {exitSummary.coach}</div>
              <div className="exit-summary-duration">{exitSummary.durationLabel}</div>
              <div className="exit-summary-caption">وقت النادي اليوم</div>
              <div className="exit-summary-stats">
                {exitSummary.exercises > 0 && <span><b className="num">{exitSummary.exercises}</b><small>تمارين</small></span>}
                {exitSummary.sets > 0 && <span><b className="num">{exitSummary.sets}</b><small>سيت</small></span>}
                <span><b className="num">{exitSummary.weekCount}/4</b><small>هذا الأسبوع</small></span>
              </div>
              <div className="exit-summary-date">{exitSummary.dateLabel}</div>
            </div>
            <div className="exit-summary-actions">
              <button className="btn btn-teal" onClick={() => { downloadGymSummaryCard(exitSummary); toast('تم تجهيز بطاقة للتحميل'); }}><Icon name="download" /> حفظ صورة</button>
              <button className="btn btn-primary" onClick={() => { void shareGymSummary(exitSummary).then((r) => toast(r === 'shared' ? 'تم فتح المشاركة' : 'تم نسخ الملخص')).catch(() => toast('تعذّرت المشاركة الآن')); }}><Icon name="share" /> مشاركة</button>
            </div>
            <p className="muted center" style={{ fontSize: 12.5 }}>بطاقة مختصرة فقط — لا تحتوي وزنًا أو نبضًا أو بيانات صحية خاصة.</p>
          </div>
        )}
      </Sheet>

      <DayPickerSheet open={pickOpen} onClose={() => setPickOpen(false)} d={d} onPick={(id) => act.startDay(id)} />
      <ShortSheet open={shortOpen} onClose={() => setShortOpen(false)} d={d} onStart={(id, m) => act.startDay(id, m)} />
      <ExtraSheet open={extraOpen} onClose={() => setExtraOpen(false)} onStart={act.startExtra} />
    </div>
  );
}
