import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { deleteAppleHealthRecord, saveAppleHealthRecord, useDB } from '../lib/store';
import { formatGreg, formatHijri, todayISO } from '../lib/dates';
import { durationLabel, timeLabel } from '../lib/format';
import { Icon } from '../components/Icon';
import { PageHeader, useToast } from '../components/ui';

function num(v: string | null): number | null {
  if (v == null || v.trim() === '') return null;
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function int(v: string | null): number | null {
  const n = num(v);
  return n == null ? null : Math.round(n);
}

function safeDate(v: string | null): string {
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : todayISO();
}

/**
 * الاختصار يفتح هذا المسار بعد قراءة Apple Health ويضيف هذه المعلمات:
 * ?apple=1&date=YYYY-MM-DD&duration=52&kcal=468&avg_hr=132&max_hr=158&distance=4.2&steps=6500&type=...
 * duration بالدقائق، أو duration_seconds بالثواني.
 */
export default function AppleHealth() {
  const nav = useNavigate();
  const loc = useLocation();
  const db = useDB();
  const { toast } = useToast();
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(loc.search);
    if (q.get('apple') !== '1') return;

    const durationSeconds = int(q.get('duration_seconds')) ?? Math.round((num(q.get('duration')) ?? 0) * 60);
    const activeKcal = num(q.get('kcal'));
    const avgHr = num(q.get('avg_hr'));
    const maxHr = num(q.get('max_hr'));
    const distance = num(q.get('distance')) ?? num(q.get('distance_km'));
    const steps = int(q.get('steps'));
    const started = q.get('started') || q.get('started_at');
    const ended = q.get('ended') || q.get('ended_at');
    const type = (q.get('type') ?? '').slice(0, 120);

    const hasData = durationSeconds > 0 || activeKcal != null || avgHr != null || maxHr != null || distance != null || steps != null;
    if (!hasData) {
      toast('وصل طلب Apple Health لكن لم توجد أرقام قابلة للاستيراد');
      nav('/apple-health', { replace: true });
      return;
    }

    saveAppleHealthRecord({
      date: safeDate(q.get('date')),
      workout_type: type,
      duration_seconds: Math.max(0, durationSeconds),
      active_kcal: activeKcal,
      avg_heart_rate: avgHr,
      max_heart_rate: maxHr,
      distance_km: distance,
      steps,
      source_started_at: started || null,
      source_ended_at: ended || null,
    });
    toast('تم استيراد بيانات Apple Health — بدون تغيير تمرينك');
    nav('/apple-health', { replace: true });
  }, [loc.search, nav, toast]);

  const records = useMemo(() => [...(db?.health ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at)), [db?.health]);

  const runShortcut = () => {
    const isAppleMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isAppleMobile) {
      toast('تشغيل اختصار Apple Health يكون من الآيفون');
      return;
    }
    // اسم الاختصار الذي سننشئه على الآيفون لاحقًا.
    window.location.href = 'shortcuts://run-shortcut?name=45%2F4%20Health';
    setTimeout(() => setHelp(true), 700);
  };

  return (
    <div className="page stack">
      <PageHeader title="Apple Health" sub="اختياري تمامًا" onBack={() => nav(-1)} />

      <section className="card apple-health-hero">
        <div className="row-between" style={{ alignItems: 'flex-start' }}>
          <div>
            <div className="apple-health-title"><span className="apple-mark big"></span> استيراد بيانات Apple</div>
            <p className="card-sub">السعرات والنبض والمدة والمسافة والخطوات — كإحصائيات فقط.</p>
          </div>
          <span className="tag tag-cold">اختياري</span>
        </div>
        <div className="note-box cold" style={{ marginTop: 14 }}>
          هذه البيانات <b>لا تغيّر نوع تمرين اليوم، ولا تُكمل جلسة، ولا تؤثر على 4/4 أو تسجيل وصولك للنادي.</b>
        </div>
        <button className="btn btn-dark btn-block" style={{ marginTop: 14 }} onClick={runShortcut}>
          <span className="apple-mark"></span> استيراد من Apple Health
        </button>
        <button className="link-btn" onClick={() => setHelp((v) => !v)} style={{ width: '100%', justifyContent: 'center' }}>
          {help ? 'إخفاء طريقة الربط' : 'الاختصار غير مركّب؟'}
        </button>
        {help && (
          <div className="apple-help">
            <b>مرة واحدة فقط:</b> سننشئ على الآيفون اختصارًا باسم <span className="en">45/4 Health</span>. بعد ذلك تضغط الزر أعلاه متى رغبت، ويعود الاختصار للموقع ومعه الأرقام. لا توجد مزامنة تلقائية في الخلفية.
          </div>
        )}
      </section>

      <section className="card">
        <div className="row-between" style={{ marginBottom: 12 }}>
          <div>
            <div className="card-title">البيانات المستوردة</div>
            <div className="card-sub">سجل مستقل عن جلسات النادي</div>
          </div>
          <span className="tag">{records.length}</span>
        </div>

        {records.length === 0 ? (
          <p className="muted center" style={{ padding: '14px 0' }}>لم تستورد أي بيانات من Apple بعد.</p>
        ) : (
          <div className="apple-health-list">
            {records.map((r) => (
              <article className="apple-health-record" key={r.id}>
                <div className="row-between">
                  <div>
                    <b>{r.workout_type || 'بيانات نشاط Apple'}</b>
                    <div className="muted" style={{ fontSize: 12.5 }}>{formatHijri(r.date)} · {formatGreg(r.date, { year: false })}</div>
                  </div>
                  <button className="icon-btn" style={{ width: 38, height: 38 }} aria-label="حذف الاستيراد" onClick={() => deleteAppleHealthRecord(r.id)}>
                    <Icon name="trash" size={17} />
                  </button>
                </div>
                <div className="apple-metrics">
                  {r.duration_seconds > 0 && <span><b>{durationLabel(r.duration_seconds)}</b><small>المدة</small></span>}
                  {r.active_kcal != null && <span><b className="num">{Math.round(r.active_kcal)}</b><small>سعرة نشطة</small></span>}
                  {r.avg_heart_rate != null && <span><b className="num">{Math.round(r.avg_heart_rate)}</b><small>متوسط النبض</small></span>}
                  {r.max_heart_rate != null && <span><b className="num">{Math.round(r.max_heart_rate)}</b><small>أعلى نبض</small></span>}
                  {r.distance_km != null && <span><b className="num">{r.distance_km.toFixed(1)} كم</b><small>المسافة</small></span>}
                  {r.steps != null && <span><b className="num">{r.steps}</b><small>خطوة</small></span>}
                </div>
                {r.source_started_at && (
                  <div className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>
                    {timeLabel(r.source_started_at)}{r.source_ended_at ? ` ← ${timeLabel(r.source_ended_at)}` : ''}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
