import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { MACHINES, type MachineId } from '../data/machines';
import { deleteSession, updateSessionNotes } from '../lib/store';
import { useDerived } from '../lib/derived';
import { formatGreg, formatHijri, weekdayName } from '../lib/dates';
import { DIFFICULTY_LABEL, kgLabel, minutesLabel } from '../lib/format';
import { machineName } from '../lib/live';
import type { Difficulty } from '../lib/types';
import { PageHeader, Sheet, useToast } from '../components/ui';
import { Icon } from '../components/Icon';
import { sessionLabel } from './History';

const STATUS: Record<string, { label: string; cls: string }> = {
  done: { label: 'مكتمل', cls: 'tag-solid' },
  partial: { label: 'جزئي', cls: 'tag-hot' },
  skipped: { label: 'تخطّيته', cls: '' },
  substituted: { label: 'ببديل', cls: 'tag-cold' },
};

export default function SessionDetail() {
  const { id } = useParams();
  const d = useDerived();
  const nav = useNavigate();
  const { toast } = useToast();
  const s = d.sessions.find((x) => x.id === id);
  const [notes, setNotes] = useState(s?.notes ?? '');
  const [confirm, setConfirm] = useState(false);
  useEffect(() => setNotes(s?.notes ?? ''), [s?.id, s?.notes]);
  if (!s) return <Navigate to="/history" replace />;

  const exs = [...s.exercises].sort((a, b) => a.position - b.position);

  return (
    <div className="page stack">
      <PageHeader title="تفاصيل الجلسة" onBack={() => nav('/history')} />

      <section className="card stack" style={{ gap: 6 }}>
        <div className="eyebrow">{weekdayName(s.date)}</div>
        <h2 className="disp" style={{ fontSize: 24 }}>{formatHijri(s.date)}</h2>
        <div className="muted" style={{ fontSize: 14 }}>{formatGreg(s.date)} م</div>
        <div className="divider" style={{ margin: '10px 0' }} />
        <div className="card-title">{sessionLabel(s)}</div>
        <div className="chips">
          {s.session_type === 'short' && <span className="tag tag-hot">مختصرة {s.short_minutes} د</span>}
          {s.session_type === 'extra' && <span className="tag tag-hot">جلسة إضافية</span>}
          {s.early_finish && <span className="tag">إنهاء مبكر</span>}
          {s.completed && <span className="tag tag-solid"><Icon name="check" size={14} /> مكتملة</span>}
          <span className="tag">الأسبوع {s.program_week}</span>
        </div>
        <div className="fstats" style={{ marginTop: 12 }}>
          <div><b className="num">{minutesLabel(s.duration_seconds)}</b><span>المدة</span></div>
          <div><b className="num">{s.cardio_seconds ? minutesLabel(s.cardio_seconds) : '—'}</b><span>كارديو</span></div>
          <div><b>{s.difficulty ? DIFFICULTY_LABEL[s.difficulty] : '—'}</b><span>التقييم</span></div>
        </div>
      </section>

      {exs.length > 0 && (
        <section className="card pad-0">
          <div className="card-title" style={{ padding: '16px 18px 4px' }}>الأجهزة</div>
          {exs.map((e) => {
            const st = STATUS[e.status] ?? STATUS.done;
            const m = MACHINES[e.exercise_id as MachineId];
            const isTimed = m?.group === 'cardio' || m?.group === 'water' || !m;
            return (
              <div key={e.id} className="list-row" style={{ alignItems: 'flex-start' }}>
                <div className="grow">
                  <div className="t" style={{ fontSize: 16 }}>{machineName(e.exercise_id).ar}</div>
                  <div className="s">
                    {isTimed ? e.reps : `${e.sets_done}/${e.sets_planned} × ${e.reps}`}
                    {e.weight_kg != null && ` · ${kgLabel(e.weight_kg)} كجم`}
                    {e.substituted_for && ` · بديل عن ${machineName(e.substituted_for).ar}`}
                  </div>
                </div>
                <span className={`tag ${st.cls}`}>{st.label}</span>
              </div>
            );
          })}
        </section>
      )}

      <section className="card stack">
        <div className="card-title">التقييم والملاحظة</div>
        <div className="seg" role="group">
          {(['easy', 'good', 'hard'] as Difficulty[]).map((k) => (
            <button key={k} className={s.difficulty === k ? 'on' : ''} aria-pressed={s.difficulty === k} onClick={() => updateSessionNotes(s.id, { difficulty: s.difficulty === k ? null : k })}>
              {DIFFICULTY_LABEL[k]}
            </button>
          ))}
        </div>
        <textarea className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="أضف ملاحظة…" maxLength={500} aria-label="ملاحظة" />
        {notes !== s.notes && (
          <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => { updateSessionNotes(s.id, { notes: notes.trim() }); toast('تم حفظ الملاحظة'); }}>حفظ الملاحظة</button>
        )}
      </section>

      <button className="btn btn-danger btn-block" onClick={() => setConfirm(true)}><Icon name="trash" /> حذف هذه الجلسة</button>

      <Sheet open={confirm} onClose={() => setConfirm(false)} title="حذف الجلسة؟">
        <p className="muted">ستُحذف من سجلك ومن العدّاد الأسبوعي. لا يمكن التراجع.</p>
        <button className="btn btn-danger btn-block" onClick={() => { deleteSession(s.id); nav('/history', { replace: true }); }}>نعم، احذف</button>
        <button className="btn btn-ghost btn-block" onClick={() => setConfirm(false)}>إلغاء</button>
      </Sheet>
    </div>
  );
}
