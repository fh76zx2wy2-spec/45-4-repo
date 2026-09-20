import { useSyncExternalStore } from 'react';

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BIPEvent | null = null;
let installed = false;
const ls = new Set<() => void>();
const emit = () => ls.forEach((l) => l());

export function initInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BIPEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    deferred = null;
    emit();
  });
}

export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const snap = () => (deferred ? 'available' : installed || isStandalone() ? 'installed' : 'none');

export function useInstall() {
  const state = useSyncExternalStore(
    (f) => {
      ls.add(f);
      return () => ls.delete(f);
    },
    snap,
    () => 'none',
  );
  return {
    state: state as 'available' | 'installed' | 'none',
    async install() {
      if (!deferred) return;
      await deferred.prompt();
      await deferred.userChoice;
      deferred = null;
      emit();
    },
  };
}
