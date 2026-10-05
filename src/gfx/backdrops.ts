import { MAPS } from '@/data/maps';
import { GAME_HEIGHT, GAME_WIDTH, TILE } from '@/engine/constants';
import type { Backdrop, MapTheme } from '@/types';
import { getMapView } from '@/world/MapView';
import { makeCanvas } from './canvas';
import { cutSprite, drawGround, type TileContext } from './tiles';
import { tileInfo } from './tiles';

/** Height of the battlefield above the command/status panel. */
export const BATTLE_FIELD_H = 124;

/** Paint a tiny tile map with the overworld renderer (used for battle scenery). */
function paintLayout(ctx: CanvasRenderingContext2D, layout: string[], theme: MapTheme) {
  const h = layout.length;
  const w = layout[0].length;
  const charAt = (x: number, y: number) => layout[Math.max(0, Math.min(h - 1, y))][Math.max(0, Math.min(w - 1, x))];
  const tc: TileContext = {
    theme,
    charAt,
    groundAt: (x, y) => {
      const g = tileInfo(charAt(x, y)).ground;
      return theme === 'cave' && g === 'grass' ? 'floor' : g;
    },
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) drawGround(ctx, x * TILE, y * TILE, x, y, tc);
}

/**
 * Battle scenery is laid out at half size from real map tiles, then doubled so its
 * pixels match the 2x party sprites.
 */
function buildBackdrop(kind: Backdrop): HTMLCanvasElement {
  const [half, h] = makeCanvas(GAME_WIDTH / 2, Math.ceil(BATTLE_FIELD_H / 2));
  if (kind === 'field') {
    paintLayout(h, ['..........', '.,........', '..======..', '.========.'], 'forest');
    const trees: [number, number, number][] = [
      [-10, -16, 6],
      [14, -20, 2],
      [36, -15, 6],
      [62, -19, 0],
      [86, -16, 6],
      [110, -20, 2],
      [132, -15, 6],
      [150, -18, 18],
    ];
    for (const [x, y, sx] of trees) h.drawImage(cutSprite('tiles/nature', sx, 0, 2, 2), x, y);
    h.drawImage(cutSprite('tiles/nature', 0, 10), 2, 40);
    h.drawImage(cutSprite('tiles/floor-detail', 5, 2), 60, 6);
    h.drawImage(cutSprite('tiles/floor-detail', 2, 2), 92, 14);
  } else {
    paintLayout(h, ['%%%%%%%%%%', '::::::::::', ':::::::o::', '::::::::::'], 'cave');
    h.drawImage(cutSprite('tiles/nature', 18, 9), 2, 42);
    h.drawImage(cutSprite('tiles/nature', 1, 14), 8, 14);
    if (kind === 'lair') {
      // Rune circle under the boss.
      h.fillStyle = '#7a4a9c';
      for (let a = 0; a < Math.PI * 2; a += 0.01) {
        h.fillRect(Math.round(52 + Math.cos(a) * 34), Math.round(44 + Math.sin(a) * 12), 1, 1);
        h.fillRect(Math.round(52 + Math.cos(a) * 28), Math.round(44 + Math.sin(a) * 9), 1, 1);
      }
    }
  }

  const [canvas, ctx] = makeCanvas(GAME_WIDTH, BATTLE_FIELD_H);
  ctx.drawImage(half, 0, 0, half.width * 2, half.height * 2);
  if (kind !== 'field') {
    // Gloom: darker toward the edges, with a purple cast in the lair.
    const g = ctx.createRadialGradient(GAME_WIDTH / 2, BATTLE_FIELD_H * 0.7, 30, GAME_WIDTH / 2, BATTLE_FIELD_H * 0.6, 220);
    g.addColorStop(0, kind === 'lair' ? 'rgba(40,10,60,0.15)' : 'rgba(10,6,20,0.1)');
    g.addColorStop(1, kind === 'lair' ? 'rgba(20,4,36,0.7)' : 'rgba(6,4,14,0.65)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, GAME_WIDTH, BATTLE_FIELD_H);
  }
  return canvas;
}

const cache = new Map<string, HTMLCanvasElement>();

export function getBackdrop(kind: Backdrop): HTMLCanvasElement {
  let c = cache.get(kind);
  if (!c) {
    c = buildBackdrop(kind);
    cache.set(kind, c);
  }
  return c;
}

/** A screenful of Millbrook (ground, houses and trees) for the title and ending. */
export function getVillageView(): HTMLCanvasElement {
  let c = cache.get('village');
  if (c) return c;
  const view = getMapView(MAPS.millbrook);
  const [canvas, ctx] = makeCanvas(GAME_WIDTH, GAME_HEIGHT);
  const camX = 32;
  const camY = 38;
  ctx.drawImage(view.ground, camX, camY, GAME_WIDTH, GAME_HEIGHT, 0, 0, GAME_WIDTH, GAME_HEIGHT);
  for (const p of [...view.tall].sort((a, b) => a.baseY - b.baseY)) ctx.drawImage(p.sprite, p.x - camX, p.y - camY);
  cache.set('village', canvas);
  c = canvas;
  return c;
}
