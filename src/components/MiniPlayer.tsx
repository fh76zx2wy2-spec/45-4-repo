import { useLocation } from 'react-router-dom';
import { Icon } from './Icon';
import { setCollapsed, stopPlayer, usePlayer, withAutoplay } from '../lib/player';

/** مشغّل عائم يبقى أثناء التنقل بين الصفحات وأثناء التمرين */
export function MiniPlayer() {
  const p = usePlayer();
  const loc = useLocation();
  if (!p) return null;
  const onLive = loc.pathname.startsWith('/live');
  return (
    <div className={`mini ${p.collapsed ? 'collapsed' : ''} ${onLive ? 'on-live' : ''}`}>
      <div className="mini-in">
        <div className="mini-bar">
          <span className="ic dot" style={{ background: 'var(--hot)' }} />
          <div className="grow">
            <div className="t" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
            {p.sub && <div className="s">{p.sub}</div>}
          </div>
          <button className="icon-btn" onClick={() => setCollapsed(!p.collapsed)} aria-label={p.collapsed ? 'إظهار المشغّل' : 'إخفاء المشغّل مع إبقاء الصوت'}>
            <Icon name={p.collapsed ? 'headphones' : 'minus'} />
          </button>
          <button className="icon-btn" onClick={stopPlayer} aria-label="إيقاف وإغلاق">
            <Icon name="x" />
          </button>
        </div>
        <div className="mini-frame">
          <iframe
            key={p.src}
            title={p.title}
            src={withAutoplay(p.src)}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
}
