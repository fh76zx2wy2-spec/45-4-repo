import { memo, useEffect, useRef, useState } from 'react';
import { ILLUSTRATIONS } from '../data/illustrations.generated';

/**
 * رسم الجهاز (SVG متجهي مستخرج من PDF). الألوان عبر متغيرات CSS فتتبدّل مع الوضع الداكن.
 * lazy: لا يُرسَم إلا عند اقترابه من الشاشة (مفيد في شبكة دليل الأجهزة).
 */
export const Illustration = memo(function Illustration({
  id,
  className = '',
  lazy = false,
  label,
}: {
  id: string;
  className?: string;
  lazy?: boolean;
  label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(!lazy);

  useEffect(() => {
    if (!lazy || visible) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '240px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [lazy, visible]);

  const ill = ILLUSTRATIONS[id];
  return (
    <div ref={ref} className={`ill ${className}`} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {visible && ill ? (
        <svg viewBox={ill.vb} preserveAspectRatio="xMidYMid meet" dangerouslySetInnerHTML={{ __html: ill.body }} />
      ) : null}
    </div>
  );
});
