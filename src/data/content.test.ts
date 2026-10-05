import { describe, expect, it } from 'vitest';
import { TILE_INFO, tileInfo } from '@/gfx/tiles';
import type { DialogueAction, MapDef } from '@/types';
import { CHARACTER_DEFS } from './characters';
import { DIALOGUES } from './dialogues';
import { ENEMIES } from './enemies';
import { ITEMS } from './items';
import { MAPS, START } from './maps';
import { SHOPS } from './shops';
import { SKILLS } from './skills';

function blocked(map: MapDef, x: number, y: number) {
  if (y < 0 || y >= map.layout.length || x < 0 || x >= map.layout[0].length) return true;
  if (tileInfo(map.layout[y][x]).solid) return true;
  if (map.buildings.some((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h)) return true;
  if (map.objects.some((o) => o.x === x && o.y === y)) return true;
  return map.npcs.some((n) => n.x === x && n.y === y);
}

/** Every tile you can walk to from `from`, ignoring locked doors. */
function reachable(map: MapDef, from: [number, number][]) {
  const seen = new Set<string>();
  const queue = [...from];
  for (const [x, y] of from) seen.add(`${x},${y}`);
  while (queue.length) {
    const [x, y] = queue.shift()!;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      const key = `${nx},${ny}`;
      if (seen.has(key) || blocked(map, nx, ny)) continue;
      seen.add(key);
      queue.push([nx, ny]);
    }
  }
  return seen;
}

function entryPoints(mapId: string): [number, number][] {
  const points: [number, number][] = [];
  if (mapId === START.map) points.push([START.x, START.y]);
  for (const m of Object.values(MAPS)) for (const e of m.exits) if (e.to === mapId) points.push([e.tx, e.ty]);
  return points;
}

const adjacent = (x: number, y: number): [number, number][] => [
  [x + 1, y],
  [x - 1, y],
  [x, y + 1],
  [x, y - 1],
];

describe.each(Object.values(MAPS))('map $id', (map) => {
  it('has a rectangular layout made of known tiles', () => {
    const w = map.layout[0].length;
    map.layout.forEach((row) => {
      expect(row.length).toBe(w);
      for (const ch of row) expect(TILE_INFO[ch], `unknown tile "${ch}"`).toBeDefined();
    });
  });

  it('marks building footprints with H and only there', () => {
    map.layout.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const inside = map.buildings.some((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h);
        expect(row[x] === 'H', `(${x},${y})`).toBe(inside);
      }
    });
  });

  it('lets the player reach every exit, NPC and chest', () => {
    const seen = reachable(map, entryPoints(map.id));
    for (const e of map.exits) expect(seen.has(`${e.x},${e.y}`), `exit at ${e.x},${e.y}`).toBe(true);
    for (const n of map.npcs) {
      expect(
        adjacent(n.x, n.y).some(([x, y]) => seen.has(`${x},${y}`)),
        `NPC ${n.id}`,
      ).toBe(true);
    }
    for (const o of map.objects) {
      expect(
        adjacent(o.x, o.y).some(([x, y]) => seen.has(`${x},${y}`)),
        `object ${o.id}`,
      ).toBe(true);
    }
  });

  it('only sends exits to walkable tiles on real maps', () => {
    for (const e of map.exits) {
      const target = MAPS[e.to];
      expect(target, e.to).toBeDefined();
      expect(blocked(target, e.tx, e.ty), `${e.to} ${e.tx},${e.ty}`).toBe(false);
    }
  });

  it('references real dialogue and enemies', () => {
    for (const n of map.npcs) for (const t of n.talk) expect(DIALOGUES[t.dialogue], t.dialogue).toBeDefined();
    for (const g of map.encounters?.groups ?? []) for (const id of g.enemies) expect(ENEMIES[id], id).toBeDefined();
    for (const o of map.objects) if (o.item) expect(ITEMS[o.item.id], o.item.id).toBeDefined();
  });
});

describe('the whole quest', () => {
  it('connects village → forest → cave', () => {
    const village = reachable(MAPS.millbrook, entryPoints('millbrook'));
    expect(MAPS.millbrook.exits.some((e) => e.to === 'forest' && village.has(`${e.x},${e.y}`))).toBe(true);
    const forest = reachable(MAPS.forest, entryPoints('forest'));
    expect(MAPS.forest.exits.some((e) => e.to === 'cave' && forest.has(`${e.x},${e.y}`))).toBe(true);
  });
});

describe('dialogue scripts', () => {
  const actions: DialogueAction[] = [];
  for (const script of Object.values(DIALOGUES)) {
    for (const line of Object.values(script.lines)) {
      if (line.action) actions.push(line.action);
      for (const c of line.choices ?? []) if (c.action) actions.push(c.action);
    }
  }

  it.each(Object.values(DIALOGUES))('$id links only to lines that exist', (script) => {
    expect(script.lines[script.start]).toBeDefined();
    for (const line of Object.values(script.lines)) {
      if (line.next) expect(script.lines[line.next], line.next).toBeDefined();
      for (const c of line.choices ?? []) if (c.next) expect(script.lines[c.next], c.next).toBeDefined();
    }
  });

  it('only triggers actions with valid targets', () => {
    for (const a of actions) {
      if (a.type === 'join') expect(CHARACTER_DEFS[a.characterId]).toBeDefined();
      if (a.type === 'giveItem') expect(ITEMS[a.itemId]).toBeDefined();
      if (a.type === 'shop') expect(SHOPS[a.shopId]).toBeDefined();
      if (a.type === 'battle') {
        a.battle.enemies.forEach((id) => expect(ENEMIES[id]).toBeDefined());
        if (a.battle.victory?.dialogue) expect(DIALOGUES[a.battle.victory.dialogue]).toBeDefined();
      }
    }
  });
});

describe('game data', () => {
  it('only uses skills that exist', () => {
    for (const def of Object.values(CHARACTER_DEFS)) for (const l of def.learnset) expect(SKILLS[l.skill], l.skill).toBeDefined();
    for (const e of Object.values(ENEMIES)) {
      for (const s of e.skills) expect(SKILLS[s], s).toBeDefined();
      for (const a of e.actions) expect(e.skills).toContain(a.skillId);
    }
  });

  it('stocks only real items in shops, and starting gear exists', () => {
    for (const shop of Object.values(SHOPS)) for (const id of shop.items) expect(ITEMS[id], id).toBeDefined();
    for (const def of Object.values(CHARACTER_DEFS)) {
      for (const id of Object.values(def.equipment)) if (id) expect(ITEMS[id], id).toBeDefined();
    }
  });

  it('gives every enemy drop a real item', () => {
    for (const e of Object.values(ENEMIES)) if (e.drop) expect(ITEMS[e.drop.itemId]).toBeDefined();
  });
});
