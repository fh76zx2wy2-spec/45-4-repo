import { useMemo } from 'react';
import { ACTIVE_PROGRAM } from '../data/program';
import { todayISO } from '../lib/dates';
import { motivationForDate } from '../lib/profile';
import { usePrivateProfilePhoto } from '../lib/privateProfilePhoto';
import { Logo } from './ui';

export function EntryGate({ onEnter }: { onEnter: () => void }) {
  const photo = usePrivateProfilePhoto();
  const quote = useMemo(() => motivationForDate(todayISO()), []);
  const name = ACTIVE_PROGRAM.defaultName;
  return (
    <main className={`entry-gate ${ACTIVE_PROGRAM.key}`}>
      <span className="entry-orb a" aria-hidden="true" />
      <span className="entry-orb b" aria-hidden="true" />
      <div className="entry-card">
        <Logo size={56} />
        <div className="entry-photo-wrap">
          {photo ? <img className="entry-photo" src={photo} alt={`صورة الكوتش ${name}`} /> : <div className="entry-photo entry-placeholder">{name.slice(0, 1)}</div>}
        </div>
        <div className="entry-coach">الكوتش <span>/</span> {name}</div>
        <blockquote>«{quote}»</blockquote>
        <button type="button" className="btn btn-primary btn-lg entry-button" onClick={onEnter}>دخول</button>
        <small>4 أيام · {ACTIVE_PROGRAM.key === 'ziyad' ? '45' : '60'} دقيقة</small>
      </div>
    </main>
  );
}
