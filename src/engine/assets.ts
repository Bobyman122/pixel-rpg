// Every image the game draws, loaded once before the title screen appears.
// Paths are relative to /public/assets and leave off ".png".

const LOOKS = ['kael', 'lira', 'finn', 'elder', 'merchant', 'innkeeper', 'villager', 'villager2', 'oldman', 'kid'];
const MONSTERS = ['slime', 'goblin', 'sabrecat', 'hornet', 'spider', 'skeleton'];
const FX = [
  'slash', 'cutx', 'claw', 'claw2', 'impact', 'flame', 'ice', 'spark', 'smoke', 'dark', 'wave', 'shield',
  'twinkle', 'aura', 'rock', 'water', 'explosion', 'spirit', 'leaf', 'torch',
];
const THEMES = ['maple', 'wood', 'iron', 'ember', 'moss', 'parchment'];

export const IMAGE_KEYS: string[] = [
  ...['floor', 'floor-detail', 'nature', 'house', 'water', 'water-forest', 'relief', 'relief-cave', 'relief-detail', 'element', 'dungeon', 'chest'].map((n) => `tiles/${n}`),
  ...LOOKS.map((n) => `chars/${n}`),
  ...LOOKS.map((n) => `faces/${n}`),
  ...['idle', 'hit', 'attack', 'charge', 'face'].map((n) => `boss/samurai-${n}`),
  ...MONSTERS.map((n) => `monsters/${n}`),
  ...FX.map((n) => `fx/${n}`),
  ...THEMES.map((n) => `ui/panel-${n}`),
  ...['dialog-face', 'dialog', 'facebox', 'arrow', 'emote-talk', 'emote-alert', 'focus', 'icons'].map((n) => `ui/${n}`),
];

export const ASSET_BASE = '/assets/';

const images = new Map<string, HTMLImageElement>();

function loadImage(key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => {
      images.set(key, el);
      resolve();
    };
    el.onerror = () => reject(new Error(`Couldn't load ${key}.png`));
    el.src = `${ASSET_BASE}${key}.png`;
  });
}

let loading: Promise<void> | null = null;

/** Load every image, reporting progress from 0 to 1. Safe to call more than once. */
export function loadImages(onProgress?: (p: number) => void): Promise<void> {
  if (!loading) {
    let done = 0;
    loading = Promise.all(
      IMAGE_KEYS.map((k) =>
        loadImage(k).then(() => {
          done++;
          onProgress?.(done / IMAGE_KEYS.length);
        }),
      ),
    ).then(() => undefined);
    // Let a later call retry after a network hiccup.
    loading.catch(() => {
      loading = null;
    });
  }
  return loading;
}

export function imagesReady() {
  return images.size === IMAGE_KEYS.length;
}

/** A loaded image. Drawing code only runs after loadImages() resolves. */
export function img(key: string): HTMLImageElement {
  const el = images.get(key);
  if (!el) throw new Error(`Image ${key} isn't loaded`);
  return el;
}
