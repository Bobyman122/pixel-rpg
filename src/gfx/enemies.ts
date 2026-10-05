import { img } from '@/engine/assets';
import { makeCanvas } from './canvas';

/** Monsters that hover above the ground in battle. */
export const FLYING = new Set(['hornet']);

const BOSS_ID = 'shadow_samurai';
const BOSS_SCALE = 2;
const BOSS_FRAME_W = 96;

/** Animation frame counts; monsters without an entry are a single still. */
export const ENEMY_FRAMES: Record<string, number> = { [BOSS_ID]: 6 };

const cache = new Map<string, HTMLCanvasElement>();

/**
 * Battle sprite for an enemy, cropped to its visible pixels so it sits on the ground.
 * Mythic Monsters are drawn at 1x; the samurai boss is a Ninja Adventure sprite at 2x.
 */
export function getEnemySprite(id: string, frame = 0): HTMLCanvasElement {
  const boss = id === BOSS_ID;
  const f = boss ? frame % ENEMY_FRAMES[BOSS_ID] : 0;
  const key = `${id}:${f}`;
  let c = cache.get(key);
  if (c) return c;
  if (boss) {
    const src = img('boss/samurai-idle');
    const [canvas, ctx] = makeCanvas(BOSS_FRAME_W * BOSS_SCALE, src.height * BOSS_SCALE);
    ctx.drawImage(src, f * BOSS_FRAME_W, 0, BOSS_FRAME_W, src.height, 0, 0, canvas.width, canvas.height);
    c = canvas;
  } else {
    let src: HTMLImageElement;
    try {
      src = img(`monsters/${id}`);
    } catch {
      src = img('monsters/slime');
    }
    // Trim empty rows below the feet so shadows line up.
    const [probe, pctx] = makeCanvas(src.width, src.height);
    pctx.drawImage(src, 0, 0);
    const data = pctx.getImageData(0, 0, src.width, src.height).data;
    let bottom = src.height;
    outer: for (let y = src.height - 1; y >= 0; y--) {
      for (let x = 0; x < src.width; x++) {
        if (data[(y * src.width + x) * 4 + 3] > 0) break outer;
      }
      bottom = y;
    }
    const [canvas, ctx] = makeCanvas(src.width, bottom);
    ctx.drawImage(probe, 0, 0);
    c = canvas;
  }
  cache.set(key, c);
  return c;
}

/** Pixels of empty space under the boss's feet in its frames (scaled). */
export function enemyFootOffset(id: string) {
  return id === BOSS_ID ? 4 * BOSS_SCALE : 0;
}
