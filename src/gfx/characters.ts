import { Direction } from '@/types';
import { flipCanvas, Pixels, rotateCanvas } from './canvas';
import { shadeColor } from './color';
import { BodyStyle, clean, HEADS, HeadStyle, KNEEL_LEGS, LEGS, TORSO } from './characterTemplates';

export const OUTLINE = '#181020';

export interface Look {
  head: HeadStyle;
  body: BodyStyle;
  hair: string;
  cloth: string;
  trim: string;
  skin?: string;
  pants?: string;
  boots?: string;
  accent?: string;
}

export const LOOKS: Record<string, Look> = {
  kael: { head: 'spiky', body: 'tunic', hair: '#c05a2c', cloth: '#3a6ad8', trim: '#e8c050', pants: '#5a4030', boots: '#4a2c20' },
  lira: { head: 'long', body: 'robe', hair: '#9a5ad0', cloth: '#d03c4c', trim: '#f0d070', boots: '#5a3020' },
  finn: {
    head: 'bandana',
    body: 'tunic',
    hair: '#3c3654',
    accent: '#3cb058',
    cloth: '#7a9a3a',
    trim: '#9a6030',
    pants: '#4c4238',
    boots: '#3a2a20',
  },
  elder: { head: 'elder', body: 'robe', hair: '#e8e8f0', cloth: '#8a6448', trim: '#d8b068', skin: '#f0c098', boots: '#4a3020' },
  merchant: {
    head: 'bandana',
    body: 'tunic',
    hair: '#6a4428',
    accent: '#e88a30',
    cloth: '#e8d8b0',
    trim: '#8a5a30',
    pants: '#6a5040',
  },
  innkeeper: { head: 'bun', body: 'robe', hair: '#d8782a', cloth: '#7468c4', trim: '#f0f0f8' },
  villager: { head: 'spiky', body: 'tunic', hair: '#e8c050', cloth: '#5aa850', trim: '#8a5a30', pants: '#5a5068' },
  villager2: { head: 'long', body: 'robe', hair: '#6a3a20', cloth: '#3ca0a0', trim: '#f0e8d0' },
  oldman: { head: 'elder', body: 'tunic', hair: '#c8c8d8', cloth: '#6a7898', trim: '#4a3a30', skin: '#e8b890' },
  kid: { head: 'bun', body: 'tunic', hair: '#3a2a20', cloth: '#e86888', trim: '#f8f0e0', pants: '#4a5888' },
  darkKnight: {
    head: 'helm',
    body: 'tunic',
    hair: '#3a3a56',
    accent: '#3e3e5c',
    cloth: '#3e3e5c',
    trim: '#b02838',
    pants: '#2a2a40',
    boots: '#18182a',
  },
};

export interface CharacterSheet {
  frames: Record<Direction, HTMLCanvasElement[]>;
  kneel: HTMLCanvasElement;
  ko: HTMLCanvasElement;
}

function palette(look: Look): Record<string, string> {
  const skin = look.skin ?? '#f8c8a0';
  const pants = look.pants ?? shadeColor(look.cloth, -0.45);
  const boots = look.boots ?? '#4a3020';
  const accent = look.accent ?? look.hair;
  return {
    s: skin,
    S: shadeColor(skin, -0.28),
    h: look.hair,
    H: shadeColor(look.hair, -0.4),
    j: shadeColor(look.hair, 0.42),
    e: '#201828',
    c: look.cloth,
    C: shadeColor(look.cloth, -0.4),
    k: shadeColor(look.cloth, 0.32),
    t: look.trim,
    T: shadeColor(look.trim, -0.35),
    p: pants,
    P: shadeColor(pants, -0.35),
    b: boots,
    a: accent,
    A: shadeColor(accent, -0.4),
    l: shadeColor(accent, 0.45),
    r: '#ff4848',
    w: '#ece4d0',
    o: OUTLINE,
  };
}

/** Back-of-head view: anything that was face becomes hair (or helmet). */
function backOfHead(rows: string[], style: HeadStyle): string[] {
  const fill = style === 'helm' ? 'a' : 'h';
  const shade = style === 'helm' ? 'A' : 'H';
  return rows.map((row, y) => {
    if (y === 10) return row;
    return row.replace(/[seor]/g, fill).replace(/S/g, shade);
  });
}

function compose(look: Look, head: string[], torso: string[], legs: string[], pal: Record<string, string>, dy = 0) {
  const p = new Pixels(16, 24);
  p.stamp(clean(torso), pal, 0, 11 + dy);
  p.stamp(clean(legs), pal, 0, 17 + dy);
  p.stamp(clean(head), pal, 0, dy);
  p.outline(OUTLINE);
  return p;
}

const cache = new Map<string, CharacterSheet>();

export function getSheet(lookId: string): CharacterSheet {
  const cached = cache.get(lookId);
  if (cached) return cached;
  const look = LOOKS[lookId] ?? LOOKS.villager;
  const pal = palette(look);
  const heads = HEADS[look.head];
  const legs = LEGS[look.body];

  const down = legs.down.map((l) => compose(look, heads.down, TORSO.down, l, pal).toCanvas());
  const upHead = backOfHead(clean(heads.down), look.head);
  const up = legs.down.map((l) => compose(look, upHead, TORSO.down, l, pal).toCanvas());
  const leftPx = legs.side.map((l) => compose(look, heads.side, TORSO.side, l, pal));
  const left = leftPx.map((p) => p.toCanvas());
  const right = leftPx.map((p) => p.flipX().toCanvas());

  // Kneeling: drop the upper body three pixels and fold the legs.
  const kneelPx = new Pixels(16, 24);
  kneelPx.stamp(clean(TORSO.side), pal, 0, 14);
  kneelPx.stamp(clean(KNEEL_LEGS), pal, 0, 20);
  kneelPx.stamp(clean(heads.side), pal, 0, 3);
  kneelPx.outline(OUTLINE);

  const sheet: CharacterSheet = {
    frames: { [Direction.Down]: down, [Direction.Up]: up, [Direction.Left]: left, [Direction.Right]: right },
    kneel: kneelPx.toCanvas(),
    ko: rotateCanvas(flipCanvas(left[0])),
  };
  cache.set(lookId, sheet);
  return sheet;
}

/** Walk cycle: stand, step A, stand, step B. */
export function walkFrame(sheet: CharacterSheet, dir: Direction, phase: number): HTMLCanvasElement {
  const frames = sheet.frames[dir];
  const seq = [0, 1, 0, 2];
  return frames[seq[((phase % 4) + 4) % 4]];
}

export function drawShadow(ctx: CanvasRenderingContext2D, cx: number, by: number, w = 10) {
  ctx.fillStyle = 'rgba(16,8,32,0.28)';
  const half = Math.floor(w / 2);
  ctx.fillRect(cx - half + 1, by - 2, w - 2, 1);
  ctx.fillRect(cx - half, by - 1, w, 2);
  ctx.fillRect(cx - half + 1, by + 1, w - 2, 1);
}
