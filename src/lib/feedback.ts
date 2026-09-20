/**
 * الاهتزاز والصوت وإبقاء الشاشة مضاءة أثناء التمرين.
 * كل شيء اختياري ويفشل بهدوء إن لم يدعمه الجهاز (iOS Safari لا يدعم vibrate).
 */
let ctx: AudioContext | null = null;

/** يُستدعى عند أول لمسة لتفعيل الصوت على iOS */
export function unlockAudio() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = ctx ?? new AC();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    /* ignore */
  }
}

export function vibrate(pattern: number | number[], enabled = true) {
  if (!enabled) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* ignore */
  }
}

export function beep(kind: 'soft' | 'done' | 'switch' = 'soft', enabled = true) {
  if (!enabled || !ctx) return;
  try {
    const seq: [number, number][] = kind === 'done' ? [[660, 0], [880, 0.16], [1046, 0.32]] : kind === 'switch' ? [[740, 0], [740, 0.14]] : [[880, 0]];
    for (const [f, t] of seq) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      const t0 = ctx.currentTime + t;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.16, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
      o.connect(g).connect(ctx.destination);
      o.start(t0);
      o.stop(t0 + 0.3);
    }
  } catch {
    /* ignore */
  }
}

type WakeSentinel = { release: () => Promise<void> } | null;
let sentinel: WakeSentinel = null;

export async function keepAwake(on: boolean) {
  try {
    if (on) {
      const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<WakeSentinel> } };
      if (nav.wakeLock && !sentinel) sentinel = await nav.wakeLock.request('screen');
    } else if (sentinel) {
      await sentinel.release();
      sentinel = null;
    }
  } catch {
    sentinel = null;
  }
}
