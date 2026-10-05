import { THEME_ORDER, type WindowTheme } from '@/gfx/ui';

export type TextSpeed = 'slow' | 'normal' | 'fast';
export type BattleSpeed = 'normal' | 'fast';

export interface Settings {
  windowTheme: WindowTheme;
  textSpeed: TextSpeed;
  battleSpeed: BattleSpeed;
  sfx: boolean;
  music: boolean;
  crt: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  windowTheme: 'wood',
  textSpeed: 'normal',
  battleSpeed: 'normal',
  sfx: true,
  music: true,
  crt: true,
};

/** Characters revealed per second by the typewriter. */
export const TEXT_SPEED_CPS: Record<TextSpeed, number> = { slow: 28, normal: 55, fast: 140 };

const KEY = 'crystal-quest:settings';

export function loadSettings(): Settings {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(KEY) : null;
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      windowTheme: THEME_ORDER.includes(parsed.windowTheme as WindowTheme) ? (parsed.windowTheme as WindowTheme) : 'wood',
      textSpeed: ['slow', 'normal', 'fast'].includes(parsed.textSpeed as string) ? (parsed.textSpeed as TextSpeed) : 'normal',
      battleSpeed: parsed.battleSpeed === 'fast' ? 'fast' : 'normal',
      sfx: parsed.sfx !== false,
      music: parsed.music !== false,
      crt: parsed.crt !== false,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: Settings) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Private mode or storage disabled: settings just won't persist.
  }
}
