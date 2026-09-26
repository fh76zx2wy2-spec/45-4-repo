import { useEffect } from 'react';
import { useDB } from './store';

export type ThemePref = 'system' | 'light' | 'dark';

const LS = '45-4:theme';

export function readThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(LS);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* ignore */
  }
  return 'system';
}

export function applyTheme(pref: ThemePref) {
  const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
  const dark = pref === 'dark' || (pref === 'system' && !!mq?.matches);
  const el = document.documentElement;
  el.dataset.theme = dark ? 'dark' : 'light';
  const meta = document.querySelector('meta[name="theme-color"]:not([media])') ?? document.querySelector('meta[name="theme-color"]');
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', dark ? '#0B0F13' : '#F5F7F8'));
  void meta;
  try {
    localStorage.setItem(LS, pref);
  } catch {
    /* ignore */
  }
}

/** يطبّق الوضع المحفوظ (الجهاز أولًا ثم الحساب) ويتابع تغيّر وضع النظام */
export function useTheme() {
  const db = useDB();
  const pref = db?.settings?.theme ?? readThemePref();
  useEffect(() => {
    applyTheme(pref);
    if (pref !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const on = () => applyTheme('system');
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [pref]);
}
