import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MACHINE_LIST, type MachineGroup } from '../data/machines';
import { machineUsage } from '../data/program';
import { Illustration } from '../components/Illustration';
import { PageHeader } from '../components/ui';
import { Icon } from '../components/Icon';

const GROUPS: { id: MachineGroup | 'all'; label: string }[] = [
  { id: 'all', label: 'الكل' },
  { id: 'strength', label: 'حديد' },
  { id: 'cardio', label: 'كارديو' },
  { id: 'core', label: 'بطن وحوض' },
  { id: 'water', label: 'مسبح' },
];

/** توحيد النص للبحث: إزالة التشكيل وتوحيد الألف والياء والتاء المربوطة */
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه');

export default function Devices() {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<MachineGroup | 'all'>('all');
  const list = useMemo(() => {
    const nq = norm(q.trim());
    return MACHINE_LIST.filter((m) => (group === 'all' || m.group === group) && (!nq || norm([m.ar, m.en, m.muscles, ...(m.keywords ?? [])].join(' ')).includes(nq)));
  }, [q, group]);

  return (
    <div className="page stack">
      <PageHeader title="دليل الأجهزة" onBack={() => nav('/more')} sub={`${MACHINE_LIST.length} جهازًا وتمرينًا من خطتك`} />
      <div className="search">
        <Icon name="search" />
        <input className="input" type="search" placeholder="ابحث بالاسم أو العضلة… (Chest, ظهر, أرجل)" value={q} onChange={(e) => setQ(e.target.value)} aria-label="بحث في الأجهزة" />
      </div>
      <div className="chips no-scrollbar" style={{ overflowX: 'auto', flexWrap: 'nowrap', paddingBottom: 2 }}>
        {GROUPS.map((g) => (
          <button key={g.id} className={`chip-btn ${group === g.id ? 'on' : ''}`} onClick={() => setGroup(g.id)} style={{ flex: 'none' }}>
            {g.label}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <div className="card center muted">لا نتائج مطابقة.</div>
      ) : (
        <div className="dev-grid">
          {list.map((m) => (
            <Link key={m.id} to={`/devices/${m.id}`} className="card pad-0 dev-card">
              <Illustration id={m.illustration} lazy className="dev-ill" />
              <div className="dev-body">
                <div className="t">{m.ar}</div>
                <div className="en muted" style={{ fontSize: 12.5 }}>{m.en}</div>
                <div className="s muted" style={{ fontSize: 12.5, marginTop: 4 }}>
                  {machineUsage(m.id).length ? `يُستخدم: ${machineUsage(m.id).map((d) => `يوم ${d}`).join('، ')}` : 'ضمن الخطة'}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
