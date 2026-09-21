import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { mmss } from '../lib/format';

/* ------------------------------ الشعار ------------------------------ */
export function Logo({ size = 44, subtitle = false, className = '' }: { size?: number; subtitle?: boolean; className?: string }) {
  return (
    <div className={`logo ${className}`} style={{ ['--logo' as string]: `${size}px` }} aria-label="45/4">
      <span className="logo-mark ltr" aria-hidden="true">
        <span className="l45">45</span>
        <span className="lslash">/</span>
        <span className="l4">4</span>
      </span>
      {subtitle && <span className="logo-sub">٤ أيام · خطتك الشخصية</span>}
    </div>
  );
}

/* ------------------------------ الأرقام الثابتة العرض ------------------------------ */
export function Digits({ text, className = '', style }: { text: string; className?: string; style?: React.CSSProperties }) {
  return (
    <span className={`digits ${className}`} style={style} aria-label={text}>
      {[...text].map((c, i) => (c === ':' ? <b key={i}>:</b> : <i key={i}>{c}</i>))}
    </span>
  );
}

export function Clock({ seconds, className = '', style }: { seconds: number; className?: string; style?: React.CSSProperties }) {
  return <Digits text={mmss(seconds)} className={className} style={style} />;
}

/* ------------------------------ الوقت الحالي ------------------------------ */
export function useNow(intervalMs = 250, active = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    const vis = () => setNow(Date.now());
    document.addEventListener('visibilitychange', vis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', vis);
    };
  }, [intervalMs, active]);
  return now;
}

/* ------------------------------ نافذة سفلية ------------------------------ */
export function Sheet({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', esc);
    };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="grab" />
        {title && <h2>{title}</h2>}
        <div className="stack" style={{ marginTop: title ? 12 : 0 }}>{children}</div>
        {footer && <div style={{ marginTop: 16 }}>{footer}</div>}
      </div>
    </>,
    document.body,
  );
}

/* ------------------------------ إشعارات لطيفة داخل الموقع ------------------------------ */
interface ToastCtx {
  toast: (msg: string) => void;
}
const ToastContext = createContext<ToastCtx>({ toast: () => {} });
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<{ id: number; text: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useCallback((text: string) => {
    setMsg({ id: Date.now(), text });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 3200);
  }, []);
  const value = useMemo(() => ({ toast }), [toast]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      {msg && (
        <div className="toast-wrap" role="status" aria-live="polite">
          <div className="toast" key={msg.id}>{msg.text}</div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

/* ------------------------------ عنصر تبديل ------------------------------ */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className="switch" onClick={() => onChange(!checked)} />;
}

/* ------------------------------ عدّاد بأزرار كبيرة ------------------------------ */
export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 999,
  unit,
  format,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
  format?: (v: number) => string;
  label?: string;
}) {
  const round = (n: number) => Math.round(n * 100) / 100;
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" className="icon-btn" aria-label="أنقص" onClick={() => onChange(Math.max(min, round(value - step)))} disabled={value <= min}>
        <Icon name="minus" />
      </button>
      <div className="stepper-v">
        <span className="num disp">{format ? format(value) : value}</span>
        {unit && <span className="muted"> {unit}</span>}
      </div>
      <button type="button" className="icon-btn" aria-label="زِد" onClick={() => onChange(Math.min(max, round(value + step)))} disabled={value >= max}>
        <Icon name="plus" />
      </button>
    </div>
  );
}

/* ------------------------------ تذييل الحقوق ------------------------------ */
export function Footer({ short = false }: { short?: boolean }) {
  return (
    <footer className="footer">
      {short ? '© زياد بن محمد البابطين' : '© 2026 زياد بن محمد البابطين — جميع الحقوق محفوظة'}
    </footer>
  );
}

/* ------------------------------ رأس صفحة داخلية ------------------------------ */
export function PageHeader({ title, onBack, right, sub }: { title: string; onBack?: () => void; right?: ReactNode; sub?: string }) {
  return (
    <div className="pagehead">
      {onBack ? (
        <button type="button" className="icon-btn" onClick={onBack} aria-label="رجوع">
          <Icon name="chevR" />
        </button>
      ) : (
        <span style={{ width: 46 }} />
      )}
      <div className="grow center">
        <h1>{title}</h1>
        {sub && <div className="eyebrow">{sub}</div>}
      </div>
      <div style={{ width: 46, display: 'flex', justifyContent: 'flex-end' }}>{right}</div>
    </div>
  );
}

/* ------------------------------ علامة ✓ متحركة ------------------------------ */
export function CheckMark({ size = 96, stroke = '#fff', ring = true, className = '' }: { size?: number; stroke?: string; ring?: boolean; className?: string }) {
  return (
    <svg className={`checkmark ${className}`} viewBox="0 0 120 120" width={size} height={size} fill="none" aria-hidden="true">
      {ring && <circle cx="60" cy="60" r="54" stroke={stroke} strokeOpacity=".9" strokeWidth="5" strokeLinecap="round" strokeDasharray="340" className="ck-ring" />}
      <path d="M36 62l16 16 32-34" stroke={stroke} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="60" className="ck-tick" />
    </svg>
  );
}
