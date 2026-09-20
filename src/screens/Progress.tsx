import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PROGRAM_WEEKS } from '../data/program';
import { STALL_NOTE, WEIGHT_TARGET_NOTE, WEIGH_NOTE } from '../data/nutrition';
import { useDerived } from '../lib/derived';
import { deleteMeasurement, saveMeasurement } from '../lib/store';
import { diffDaysISO, formatGreg, formatHijri, weekStartOf } from '../lib/dates';
import { programWeekOf, usualTime, weightSeries, weightStalled } from '../lib/week';
import { kgLabel } from '../lib/format';
import type { Measurement } from '../lib/types';
import { PageHeader, useToast } from '../components/ui';
import { Icon } from '../components/Icon';

function WeightChart({ series, startWeek, weekStartDay }: { series: Measurement[]; startWeek: string; weekStartDay: number }) {
  const W = 340;
  const H = 190;
  const pad = { l: 34, r: 12, t: 14, b: 28 };
  const pts = series.map((m) => ({ w: programWeekOf(m.week_start, startWeek, weekStartDay), v: m.weight_kg as number }));
  const maxW = Math.max(PROGRAM_WEEKS, ...pts.map((p) => p.w));
  const vals = pts.map((p) => p.v);
  const lo = Math.floor(Math.min(...vals) - 1);
  const hi = Math.ceil(Math.max(...vals) + 1);
  const x = (w: number) => pad.l + ((w - 1) / (maxW - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - lo) / Math.max(1, hi - lo)) * (H - pad.t - pad.b);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.w).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ');
  const ticks = [lo, lo + (hi - lo) / 2, hi];
  return (
    <svg className="wchart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="مخطط الوزن على 12 أسبوعًا" direction="ltr">
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeDasharray="3 4" />
          <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="10.5" fill="var(--muted)">{Math.round(t * 10) / 10}</text>
        </g>
      ))}
      {Array.from({ length: maxW }, (_, i) => i + 1)
        .filter((w) => w === 1 || w % 2 === 0 || w === maxW)
        .map((w) => (
          <text key={w} x={x(w)} y={H - 8} textAnchor="middle" fontSize="10.5" fill="var(--muted)">{w}</text>
        ))}
      {pts.length > 1 && <path d={line} fill="none" stroke="var(--hot)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={x(p.w)} cy={y(p.v)} r="5" fill="var(--surface)" stroke="var(--hot)" strokeWidth="2.6" />
          {i === pts.length - 1 && (
            <text x={Math.min(x(p.w), W - 26)} y={y(p.v) - 10} textAnchor="middle" fontSize="11.5" fontWeight="700" fill="var(--hot-ink)">{kgLabel(p.v)}</text>
          )}
        </g>
      ))}
    </svg>
  );
}

export default function Progress() {
  const d = useDerived();
  const nav = useNavigate();
  const { toast } = useToast();
  const { today, weekStartDay, position, stats, sessions } = d;
  const measurements = d.db?.measurements ?? [];
  const series = useMemo(() => weightSeries(measurements), [measurements]);
  const thisWeek = weekStartOf(today, weekStartDay);
  const current = measurements.find((m) => m.week_start === thisWeek);
  const lastWaist = [...measurements].filter((m) => m.waist_cm != null).sort((a, b) => b.measured_on.localeCompare(a.measured_on))[0];
  const waistDue = !lastWaist || diffDaysISO(lastWaist.measured_on, today) >= 14;

  const [w, setW] = useState(current?.weight_kg != null ? String(current.weight_kg) : '');
  const [waist, setWaist] = useState(current?.waist_cm != null ? String(current.waist_cm) : '');

  const first = series[0]?.weight_kg ?? null;
  const last = series[series.length - 1]?.weight_kg ?? null;
  const change = first != null && last != null && series.length > 1 ? Math.round((last - first) * 10) / 10 : null;
  const usual = usualTime(sessions);

  function parseNum(s: string): number | null {
    const n = Number(s.replace(',', '.').trim());
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  function saveWeight() {
    const v = parseNum(w);
    if (v == null || v < 25 || v > 350) {
      toast('أدخل وزنًا صحيحًا بالكيلوغرام');
      return;
    }
    saveMeasurement({ week_start: thisWeek, measured_on: today, weight_kg: v, waist_cm: null, program_week: position.week, notes: current?.notes ?? '' });
    toast('تم حفظ وزن هذا الأسبوع');
  }
  function saveWaist() {
    const v = parseNum(waist);
    if (v == null || v < 30 || v > 250) {
      toast('أدخل قياس خصر صحيحًا بالسنتيمتر');
      return;
    }
    saveMeasurement({ week_start: thisWeek, measured_on: today, weight_kg: null, waist_cm: v, program_week: position.week, notes: current?.notes ?? '' });
    toast('تم حفظ قياس الخصر');
  }

  const S = stats;
  return (
    <div className="page stack">
      <PageHeader title="تقدّمي" onBack={() => nav('/more')} />

      {/* الوزن */}
      <section className="card stack">
        <div className="row-between">
          <div>
            <div className="card-title">وزن هذا الأسبوع</div>
            <div className="card-sub">مرة واحدة في الأسبوع، في اليوم نفسه صباحًا</div>
          </div>
          {current?.weight_kg != null && <span className="tag tag-cold"><Icon name="check" size={14} /> {kgLabel(current.weight_kg)} كجم</span>}
        </div>
        <div className="row" style={{ gap: 10 }}>
          <input className="input input-num grow" inputMode="decimal" placeholder="0.0" value={w} onChange={(e) => setW(e.target.value)} aria-label="الوزن بالكيلوغرام" style={{ fontSize: 26 }} />
          <span className="muted">كجم</span>
          <button className="btn btn-primary" onClick={saveWeight}>{current?.weight_kg != null ? 'تحديث' : 'حفظ'}</button>
        </div>
        <p className="muted" style={{ fontSize: 13 }}>{WEIGH_NOTE}</p>
      </section>

      {series.length > 0 ? (
        <section className="card">
          <div className="row-between" style={{ marginBottom: 8 }}>
            <div className="card-title">الوزن عبر الأسابيع</div>
            <span className="eyebrow">الأسبوع 1 ← {Math.max(PROGRAM_WEEKS, position.week)}</span>
          </div>
          <WeightChart series={series} startWeek={position.startWeek} weekStartDay={weekStartDay} />
          {series.length < 2 && <p className="muted" style={{ fontSize: 13.5 }}>سيظهر الخط بعد تسجيل وزنين أو أكثر.</p>}
        </section>
      ) : (
        <section className="card center muted">لا أوزان مسجّلة بعد — ابدأ بتسجيل وزنك هذا الأسبوع.</section>
      )}

      {weightStalled(series) && <div className="note-box hot">{STALL_NOTE}</div>}

      {/* الخصر */}
      <section className="card stack">
        <div className="row-between">
          <div>
            <div className="card-title">الخصر <span className="muted" style={{ fontWeight: 400, fontSize: 14 }}>(اختياري)</span></div>
            <div className="card-sub">{waistDue ? 'حان موعد القياس — كل أسبوعين' : `آخر قياس: ${lastWaist.waist_cm} سم · ${formatHijri(lastWaist.measured_on, { year: false })}`}</div>
          </div>
          {waistDue && <span className="tag tag-hot">موعده</span>}
        </div>
        <div className="row" style={{ gap: 10 }}>
          <input className="input input-num grow" inputMode="decimal" placeholder="0" value={waist} onChange={(e) => setWaist(e.target.value)} aria-label="الخصر بالسنتيمتر" style={{ fontSize: 26 }} />
          <span className="muted">سم</span>
          <button className="btn btn-ghost" onClick={saveWaist}>حفظ</button>
        </div>
      </section>

      {/* الإحصائيات */}
      <section className="card">
        <div className="card-title" style={{ marginBottom: 12 }}>إحصائياتك</div>
        <div className="stats-grid">
          <div className="stat"><b className="num">{S.totalSessions}</b><span>إجمالي الجلسات</span></div>
          <div className="stat"><b className="num">{S.weeksComplete}</b><span>أسابيع 4/4</span></div>
          <div className="stat"><b className="num">{S.cardioMinutes}</b><span>دقائق كارديو</span></div>
          <div className="stat"><b className="num">{S.adherence != null ? `${S.adherence}%` : '—'}</b><span>نسبة الالتزام</span></div>
          <div className="stat"><b className="num">{S.streak.current}</b><span>سلسلة حالية (أسابيع)</span></div>
          <div className="stat"><b className="num">{S.streak.best}</b><span>أفضل سلسلة</span></div>
          <div className="stat"><b className="num">{S.avgDurationMin != null ? `${S.avgDurationMin} د` : '—'}</b><span>متوسط مدة الجلسة</span></div>
          <div className="stat"><b className="num">{S.extraSessions}</b><span>جلسات إضافية</span></div>
        </div>
        {(first != null || last != null) && (
          <div className="stats-grid" style={{ marginTop: 10 }}>
            <div className="stat"><b className="num">{kgLabel(first)}</b><span>أول وزن</span></div>
            <div className="stat"><b className="num">{kgLabel(last)}</b><span>آخر وزن</span></div>
            <div className="stat" style={{ gridColumn: '1 / -1' }}>
              <b className="num" style={{ color: change != null && change < 0 ? 'var(--cold-ink)' : undefined }}>
                {change == null ? '—' : `${change > 0 ? '+' : change < 0 ? '−' : ''}${kgLabel(Math.abs(change))}`}
              </b>
              <span>التغيّر (كجم)</span>
            </div>
          </div>
        )}
        {usual && <p className="note-box cold" style={{ marginTop: 12 }}>{usual}</p>}
      </section>

      <p className="muted center" style={{ fontSize: 12.5 }}>{WEIGHT_TARGET_NOTE}</p>

      {/* السجل */}
      {measurements.length > 0 && (
        <section className="card pad-0">
          <div className="card-title" style={{ padding: '16px 18px 4px' }}>قياساتك</div>
          {[...measurements].sort((a, b) => b.week_start.localeCompare(a.week_start)).map((m) => (
            <div key={m.id} className="list-row" style={{ minHeight: 56 }}>
              <div className="grow">
                <div className="t" style={{ fontSize: 15.5 }}>
                  {m.weight_kg != null && <span>{kgLabel(m.weight_kg)} كجم</span>}
                  {m.weight_kg != null && m.waist_cm != null && <span className="muted"> · </span>}
                  {m.waist_cm != null && <span>خصر {m.waist_cm} سم</span>}
                </div>
                <div className="s">{formatHijri(m.measured_on)} · {formatGreg(m.measured_on, { year: false })}</div>
              </div>
              <button className="icon-btn" style={{ width: 40, height: 40 }} aria-label="حذف القياس" onClick={() => deleteMeasurement(m.id)}><Icon name="trash" size={18} /></button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
