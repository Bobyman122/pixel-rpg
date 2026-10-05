import { img } from '@/engine/assets';
import { Direction } from '@/types';
import { makeCanvas } from './canvas';

/** Looks that have a sheet in /assets/chars. Anything else falls back to a villager. */
export const LOOKS = ['kael', 'lira', 'finn', 'elder', 'merchant', 'innkeeper', 'villager', 'villager2', 'oldman', 'kid'];

/** The cave's guardian is drawn from the boss sprites instead of a character sheet. */
export const BOSS_LOOK = 'samurai';

export interface CharacterSheet {
  /** Walk cycle per direction; frame 0 doubles as the standing pose. */
  frames: Record<Direction, HTMLCanvasElement[]>;
  /** Looping idle animation, for characters that breathe while standing still. */
  idle?: HTMLCanvasElement[];
  attack: Record<Direction, HTMLCanvasElement>;
  /** Arms raised: used when a party member wins or casts. */
  cheer: HTMLCanvasElement;
  cast: HTMLCanvasElement;
  ko: HTMLCanvasElement;
}

const COLS: Record<Direction, number> = {
  [Direction.Down]: 0,
  [Direction.Up]: 1,
  [Direction.Left]: 2,
  [Direction.Right]: 3,
};

function cut(sheet: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const [c, ctx] = makeCanvas(w, h);
  ctx.drawImage(sheet, x, y, w, h, 0, 0, w, h);
  return c;
}

const cache = new Map<string, CharacterSheet>();

function bossSheet(): CharacterSheet {
  const idleImg = img('boss/samurai-idle');
  const idle = Array.from({ length: idleImg.width / 96 }, (_, i) => cut(idleImg, i * 96, 0, 96, 48));
  const all = { [Direction.Down]: idle, [Direction.Up]: idle, [Direction.Left]: idle, [Direction.Right]: idle };
  const still = idle[0];
  return {
    frames: all,
    idle,
    attack: { [Direction.Down]: still, [Direction.Up]: still, [Direction.Left]: still, [Direction.Right]: still },
    cheer: still,
    cast: still,
    ko: still,
  };
}

/**
 * Ninja Adventure sheets are 4 columns (down, up, left, right) by up to 7 rows:
 * rows 0-3 walk, 4 attack, 5 jump, and row 6 holds KO, item-raise and two special poses.
 * A couple of townsfolk only have the first two rows.
 */
export function getSheet(lookId: string): CharacterSheet {
  const hit = cache.get(lookId);
  if (hit) return hit;
  let sheet: CharacterSheet;
  if (lookId === BOSS_LOOK) {
    sheet = bossSheet();
  } else {
    const src = img(`chars/${LOOKS.includes(lookId) ? lookId : 'villager'}`);
    const rows = Math.floor(src.height / 16);
    const at = (col: number, row: number) => cut(src, col * 16, Math.min(row, rows - 1) * 16, 16, 16);
    const walkRows = Math.min(4, rows);
    const dirs = [Direction.Down, Direction.Up, Direction.Left, Direction.Right];
    const frames = {} as Record<Direction, HTMLCanvasElement[]>;
    const attack = {} as Record<Direction, HTMLCanvasElement>;
    for (const d of dirs) {
      frames[d] = Array.from({ length: walkRows }, (_, r) => at(COLS[d], r));
      attack[d] = rows > 4 ? at(COLS[d], 4) : frames[d][0];
    }
    const full = rows >= 7;
    sheet = {
      frames,
      attack,
      ko: full ? at(0, 6) : frames[Direction.Down][0],
      cheer: full ? at(1, 6) : frames[Direction.Down][0],
      cast: full ? at(2, 6) : frames[Direction.Down][0],
    };
  }
  cache.set(lookId, sheet);
  return sheet;
}

/** Walk cycle frame for a step phase (two phases per tile walked). */
export function walkFrame(sheet: CharacterSheet, dir: Direction, phase: number): HTMLCanvasElement {
  const frames = sheet.frames[dir];
  return frames[((phase % frames.length) + frames.length) % frames.length];
}

/** 38x38 portrait for dialogue and menus. */
export function getFace(lookId: string): HTMLImageElement {
  if (lookId === BOSS_LOOK) return img('boss/samurai-face');
  return img(`faces/${LOOKS.includes(lookId) ? lookId : 'villager'}`);
}

export function drawShadow(ctx: CanvasRenderingContext2D, cx: number, by: number, w = 12) {
  ctx.fillStyle = 'rgba(28,20,36,0.25)';
  const half = Math.floor(w / 2);
  ctx.fillRect(cx - half + 2, by - 2, w - 4, 1);
  ctx.fillRect(cx - half, by - 1, w, 2);
  ctx.fillRect(cx - half + 2, by + 1, w - 4, 1);
}
