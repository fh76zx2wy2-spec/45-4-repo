import { useState } from 'react';
import {
  DAILY_FOCUS,
  DAILY_NUMBERS,
  DAILY_TIPS,
  FREE_MEAL_NOTE,
  LESS_OF,
  MODERATE,
  MORE_OF,
  PLATE,
  PROTEIN_NOTE,
  RESULT_NOTE,
  SAMPLE_DAY,
  SUGGEST_MEAL_IDS,
  SWAPS,
  WEIGH_NOTE,
  pickByDate,
  type FoodGroup,
} from '../data/nutrition';
import { GENERAL_DISCLAIMER } from '../data/program';
import { useDerived } from '../lib/derived';
import { setDailyLog } from '../lib/store';
import { Footer, Switch } from '../components/ui';
import { Icon } from '../components/Icon';

type Tab = 'more' | 'moderate' | 'less';
const TABS: { id: Tab; label: string; groups: FoodGroup[]; tone: 'cold' | 'sand' | 'hot' }[] = [
  { id: 'more', label: 'أكثر منها', groups: MORE_OF, tone: 'cold' },
  { id: 'moderate', label: 'باعتدال', groups: MODERATE, tone: 'sand' },
  { id: 'less', label: 'قلّل منها', groups: LESS_OF, tone: 'hot' },
];

function Plate() {
  return (
    <div className="plate">
      <svg viewBox="0 0 200 200" width="190" height="190" role="img" aria-label="الطبق: نصف خضار، ربع بروتين، ربع نشويات">
        <circle cx="100" cy="100" r="97" fill="var(--surface-2)" stroke="var(--line)" strokeWidth="2" />
        <path d="M100 100 L100 12 A88 88 0 0 0 100 188 Z" fill="var(--cold)" />
        <path d="M100 100 L100 12 A88 88 0 0 1 188 100 Z" fill="var(--hot)" />
        <path d="M100 100 L188 100 A88 88 0 0 1 100 188 Z" fill="var(--sand)" />
        <g stroke="var(--surface)" strokeWidth="3">
          <line x1="100" y1="12" x2="100" y2="188" />
          <line x1="100" y1="100" x2="188" y2="100" />
        </g>
        <text x="52" y="106" textAnchor="middle" fill="#fff" fontFamily="var(--font-display)" fontWeight="700" fontSize="24">½</text>
        <text x="146" y="66" textAnchor="middle" fill="#fff" fontFamily="var(--font-display)" fontWeight="700" fontSize="22">¼</text>
        <text x="146" y="146" textAnchor="middle" fill="#2B2016" fontFamily="var(--font-display)" fontWeight="700" fontSize="22">¼</text>
      </svg>
      <ul className="plate-legend">
        <li><i style={{ background: 'var(--cold)' }} /><div><b>{PLATE.veg.part} · {PLATE.veg.label}</b><span>{PLATE.veg.note}</span></div></li>
        <li><i style={{ background: 'var(--hot)' }} /><div><b>{PLATE.protein.part} · {PLATE.protein.label}</b><span>{PLATE.protein.note}</span></div></li>
        <li><i style={{ background: 'var(--sand)' }} /><div><b>{PLATE.starch.part} · {PLATE.starch.label}</b><span>{PLATE.starch.note}</span></div></li>
      </ul>
    </div>
  );
}

export default function Food() {
  const d = useDerived();
  const [tab, setTab] = useState<Tab>('more');
  const focus = pickByDate(DAILY_FOCUS, d.today);
  const tip = pickByDate(DAILY_TIPS, d.today, 5);
  const mealId = pickByDate(SUGGEST_MEAL_IDS, d.today);
  const meal = SAMPLE_DAY.find((m) => m.id === mealId)!;
  const pre = SAMPLE_DAY.find((m) => m.id === 'pre')!;
  const post = SAMPLE_DAY.find((m) => m.id === 'post')!;
  const log = d.db?.logs.find((l) => l.date === d.today);
  const cups = log?.water_cups ?? 0;
  const free = log?.free_meal ?? false;
  const cur = TABS.find((t) => t.id === tab)!;

  return (
    <div className="page stack">
      <div className="topbar">
        <div>
          <h1>الأكل</h1>
          <div className="eyebrow">توجيه عام بلا حساب سعرات ولا حمية قاسية</div>
        </div>
        <span className="badge-guide">إرشادي</span>
      </div>

      {/* اقتراح اليوم */}
      <section className="card card-cold food-today">
        <div className="row-between" style={{ marginBottom: 6 }}>
          <div className="card-title">اقتراح اليوم</div>
          <span className="badge-guide" style={{ background: 'var(--surface)' }}>إرشادي</span>
        </div>
        <div className="food-line"><span className="food-k more">ركّز على</span><span>{focus.focus}</span></div>
        <div className="food-line"><span className="food-k less">خفّف من</span><span>{focus.reduce}</span></div>
        <div className="food-line"><span className="food-k neutral">{meal.when}</span><span>{meal.text}</span></div>
        <div className="food-line"><span className="food-k neutral">{pre.when}</span><span>{pre.text}</span></div>
        <div className="food-line"><span className="food-k neutral">{post.when}</span><span>{post.text}</span></div>
      </section>

      {/* نصيحة اليوم */}
      <section className="card tipcard">
        <span className="ic-round"><Icon name="sparkle" /></span>
        <div>
          <div className="eyebrow">نصيحة اليوم</div>
          <p style={{ fontSize: 16, lineHeight: 1.85 }}>{tip}</p>
        </div>
      </section>

      {/* متابعة خفيفة */}
      <section className="card">
        <div className="row-between">
          <div>
            <div className="card-title">ماء اليوم</div>
            <div className="card-sub">الهدف تقريبًا 2.5–3 لتر (نحو 10 أكواب)</div>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <button className="icon-btn" style={{ width: 42, height: 42 }} aria-label="أنقص كوبًا" disabled={cups <= 0} onClick={() => setDailyLog(d.today, { water_cups: Math.max(0, cups - 1) })}><Icon name="minus" /></button>
            <span className="disp num" style={{ fontSize: 26, minWidth: 30, textAlign: 'center' }}>{cups}</span>
            <button className="icon-btn" style={{ width: 42, height: 42 }} aria-label="أضف كوبًا" onClick={() => setDailyLog(d.today, { water_cups: cups + 1 })}><Icon name="plus" /></button>
          </div>
        </div>
        <div className="cups" aria-hidden="true">
          {Array.from({ length: 10 }, (_, i) => (
            <i key={i} className={i < cups ? 'on' : ''} />
          ))}
        </div>
        <div className="divider" style={{ margin: '14px 0' }} />
        <div className="row-between">
          <div>
            <div className="t" style={{ fontWeight: 700 }}>وجبتي الحرة</div>
            <div className="card-sub">{FREE_MEAL_NOTE.split('.')[0]}.</div>
          </div>
          <Switch checked={free} onChange={(v) => setDailyLog(d.today, { free_meal: v })} label="وجبة حرة اليوم" />
        </div>
      </section>

      {/* الطبق */}
      <section className="card">
        <div className="card-title" style={{ marginBottom: 12 }}>قاعدة الطبق</div>
        <Plate />
        <p className="muted" style={{ fontSize: 14, marginTop: 12 }}>{PLATE.note}</p>
      </section>

      {/* الأقسام */}
      <div>
        <div className="seg" role="tablist" aria-label="أقسام الأكل">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} aria-pressed={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="stack" style={{ marginTop: 14 }} role="tabpanel">
          {cur.groups.map((g) => (
            <section key={g.title} className={`card foodgroup ${cur.tone}`}>
              <div className="card-title" style={{ marginBottom: 8 }}>{g.title}</div>
              <ul className="stack" style={{ gap: 10 }}>
                {g.items.map((it) => (
                  <li key={it.label}>
                    <b>{it.label}:</b> <span className="muted" style={{ color: 'var(--ink-2)' }}>{it.text}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {tab === 'more' && <div className="note-box">{PROTEIN_NOTE}</div>}
        </div>
      </div>

      {/* بدائل */}
      <section className="card">
        <div className="card-title" style={{ marginBottom: 10 }}>بدائل ذكية</div>
        <div className="stack" style={{ gap: 0 }}>
          {SWAPS.map((s) => (
            <div key={s.instead} className="swap-row">
              <span className="muted">بدل: {s.instead}</span>
              <b>خذ: {s.take}</b>
            </div>
          ))}
        </div>
      </section>

      {/* يوم نموذجي */}
      <section className="card">
        <div className="card-title" style={{ marginBottom: 10 }}>يوم نموذجي</div>
        <div className="stack" style={{ gap: 0 }}>
          {SAMPLE_DAY.map((m) => (
            <div key={m.id} className="swap-row">
              <b>{m.when}</b>
              <span className="muted" style={{ color: 'var(--ink-2)' }}>{m.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* أرقام تقريبية */}
      <details className="card">
        <summary className="card-title" style={{ cursor: 'pointer', listStyle: 'none' }}>أرقام تقريبية من الخطة</summary>
        <div className="stack" style={{ gap: 10, marginTop: 12 }}>
          {DAILY_NUMBERS.map((n) => (
            <div key={n.key} className="swap-row">
              <b>{n.label}: <span className="muted" style={{ color: 'var(--ink-2)', fontWeight: 400 }}>{n.value}</span></b>
              <span className="muted">{n.note}</span>
            </div>
          ))}
        </div>
      </details>

      <div className="note-box cold">{WEIGH_NOTE}</div>
      <div className="note-box">{RESULT_NOTE}</div>
      <p className="muted center" style={{ fontSize: 12.5 }}>{GENERAL_DISCLAIMER}</p>
      <Footer />
    </div>
  );
}
