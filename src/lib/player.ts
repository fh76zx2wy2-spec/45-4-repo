/**
 * المشغّل العام (اسمع أثناء التمرين): مشغّل مضمَّن Embedded فقط (YouTube / Spotify).
 * لا تنزيل ولا استخراج للصوت — إن لم يسمح الرابط بالتضمين نفتحه في التطبيق/المتصفح.
 */
import { useSyncExternalStore } from 'react';
import type { SavedAudio } from './types';

export interface PlayerState {
  src: string;
  title: string;
  sub?: string;
  provider: 'youtube' | 'spotify';
  collapsed: boolean;
}

let state: PlayerState | null = null;
const ls = new Set<() => void>();
const emit = () => ls.forEach((l) => l());

export function usePlayer(): PlayerState | null {
  return useSyncExternalStore(
    (f) => {
      ls.add(f);
      return () => ls.delete(f);
    },
    () => state,
    () => state,
  );
}

export function play(p: Omit<PlayerState, 'collapsed'>) {
  state = { ...p, collapsed: false };
  emit();
}

export function setCollapsed(collapsed: boolean) {
  if (!state) return;
  state = { ...state, collapsed };
  emit();
}

export function stopPlayer() {
  state = null;
  emit();
}

export interface ParsedLink {
  kind: SavedAudio['kind'];
  /** رابط التضمين إن أمكن، وإلا null */
  embed: string | null;
  /** رابط الفتح الخارجي */
  url: string;
  provider: 'youtube' | 'spotify' | 'other';
}

/** يحلّل رابط YouTube / قائمة تشغيل / Spotify أو نص بحث */
export function parseLink(raw: string): ParsedLink | null {
  const text = raw.trim();
  if (!text) return null;
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\.|^m\./, '');
  if (host === 'youtube.com' || host === 'youtu.be' || host === 'music.youtube.com') {
    const list = u.searchParams.get('list');
    let vid = u.searchParams.get('v');
    if (host === 'youtu.be') vid = u.pathname.slice(1).split('/')[0] || null;
    if (!vid && u.pathname.startsWith('/shorts/')) vid = u.pathname.split('/')[2] ?? null;
    if (!vid && u.pathname.startsWith('/embed/')) vid = u.pathname.split('/')[2] ?? null;
    if (list && !vid) {
      return { kind: 'playlist', embed: `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(list)}&playsinline=1&rel=0`, url: text, provider: 'youtube' };
    }
    if (vid) {
      const extra = list ? `&list=${encodeURIComponent(list)}` : '';
      return { kind: list ? 'playlist' : 'youtube', embed: `https://www.youtube.com/embed/${encodeURIComponent(vid)}?playsinline=1&rel=0${extra}`, url: text, provider: 'youtube' };
    }
    // قناة أو نتائج بحث: لا تُضمَّن
    return { kind: 'youtube', embed: null, url: u.toString(), provider: 'youtube' };
  }
  if (host === 'open.spotify.com') {
    const m = u.pathname.match(/\/(episode|show|playlist|track|album|artist)\/([A-Za-z0-9]+)/);
    if (m) return { kind: 'spotify', embed: `https://open.spotify.com/embed/${m[1]}/${m[2]}`, url: text, provider: 'spotify' };
    return { kind: 'spotify', embed: null, url: u.toString(), provider: 'spotify' };
  }
  return { kind: 'other', embed: null, url: u.toString(), provider: 'other' };
}

export function playlistEmbed(listId: string): string {
  return `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(listId)}&playsinline=1&rel=0`;
}

export function withAutoplay(src: string): string {
  return src + (src.includes('?') ? '&' : '?') + 'autoplay=1';
}
