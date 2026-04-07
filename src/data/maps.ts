import { GameMap, TileType as T, Direction } from '@/types';

// Helper to create a filled 2D array
function fill2D<V>(rows: number, cols: number, value: V): V[][] {
  return Array.from({ length: rows }, () => Array(cols).fill(value));
}

// Millbrook Village - 20x16 map
const villageGround: T[][] = (() => {
  const m = fill2D(16, 20, T.Grass);
  // Paths
  for (let x = 3; x < 17; x++) { m[8][x] = T.Dirt; m[9][x] = T.Dirt; }
  for (let y = 3; y < 13; y++) { m[y][9] = T.Dirt; m[y][10] = T.Dirt; }
  // Plaza
  for (let y = 7; y < 11; y++) for (let x = 7; x < 13; x++) m[y][x] = T.Stone;
  return m;
})();

const villageObjects: (T | null)[][] = (() => {
  const m = fill2D<T | null>(16, 20, null);
  // Border trees
  for (let x = 0; x < 20; x++) { m[0][x] = T.Tree; m[15][x] = T.Tree; }
  for (let y = 0; y < 16; y++) { m[y][0] = T.Tree; m[y][19] = T.Tree; }
  // Buildings (walls with doors)
  // Elder's house (top left)
  for (let y = 2; y < 5; y++) for (let x = 2; x < 7; x++) m[y][x] = T.Wall;
  m[4][4] = T.Door;
  // Item shop (top right)
  for (let y = 2; y < 5; y++) for (let x = 13; x < 18; x++) m[y][x] = T.Wall;
  m[4][15] = T.Door;
  // Inn (bottom left)
  for (let y = 11; y < 14; y++) for (let x = 2; x < 7; x++) m[y][x] = T.Wall;
  m[11][4] = T.Door;
  // Lira's house (bottom right)
  for (let y = 11; y < 14; y++) for (let x = 13; x < 18; x++) m[y][x] = T.Wall;
  m[11][15] = T.Door;
  // Some decorative trees
  m[6][3] = T.Tree; m[6][16] = T.Tree;
  m[12][8] = T.Tree; m[12][11] = T.Tree;
  return m;
})();

const villageCollisions: boolean[][] = (() => {
  const c = fill2D(16, 20, false);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 20; x++) {
      const obj = villageObjects[y][x];
      if (obj === T.Tree || obj === T.Wall) c[y][x] = true;
    }
  }
  return c;
})();

// Whispering Forest - 24x20 map
const forestGround: T[][] = (() => {
  const m = fill2D(20, 24, T.Grass);
  // Path through forest
  for (let x = 0; x < 24; x++) { m[9][x] = T.Dirt; m[10][x] = T.Dirt; }
  // Side paths
  for (let y = 4; y < 16; y++) { m[y][12] = T.Dirt; }
  // Clearing at middle
  for (let y = 7; y < 13; y++) for (let x = 10; x < 14; x++) m[y][x] = T.Dirt;
  return m;
})();

const forestObjects: (T | null)[][] = (() => {
  const m = fill2D<T | null>(20, 24, null);
  // Dense trees
  for (let x = 0; x < 24; x++) { m[0][x] = T.Tree; m[1][x] = T.Tree; m[18][x] = T.Tree; m[19][x] = T.Tree; }
  for (let y = 0; y < 20; y++) { m[y][0] = T.Tree; m[y][23] = T.Tree; }
  // Scattered trees
  const treePositions = [
    [3,2],[3,5],[3,8],[3,15],[3,18],[3,21],
    [5,3],[5,7],[5,16],[5,20],
    [7,2],[7,6],[7,17],[7,21],
    [12,3],[12,7],[12,16],[12,20],
    [14,2],[14,5],[14,8],[14,15],[14,18],[14,21],
    [16,3],[16,7],[16,12],[16,16],[16,20],
  ];
  for (const [y, x] of treePositions) {
    if (m[y][x] === null) m[y][x] = T.Tree;
  }
  return m;
})();

const forestCollisions: boolean[][] = (() => {
  const c = fill2D(20, 24, false);
  for (let y = 0; y < 20; y++) {
    for (let x = 0; x < 24; x++) {
      if (forestObjects[y][x] === T.Tree) c[y][x] = true;
    }
  }
  return c;
})();

// Shadowfang Cave - 20x18 map
const caveGround: T[][] = (() => {
  const m = fill2D(18, 20, T.Stone);
  // Main corridor
  for (let y = 0; y < 18; y++) {
    for (let x = 0; x < 20; x++) {
      m[y][x] = T.FloorStone;
    }
  }
  return m;
})();

const caveObjects: (T | null)[][] = (() => {
  const m = fill2D<T | null>(18, 20, null);
  // Walls everywhere except corridors
  for (let y = 0; y < 18; y++) for (let x = 0; x < 20; x++) m[y][x] = T.Wall;

  // Carve out corridors
  // Entry corridor (bottom)
  for (let y = 14; y < 18; y++) for (let x = 8; x < 12; x++) m[y][x] = null;
  // Main hall
  for (let y = 8; y < 15; y++) for (let x = 4; x < 16; x++) m[y][x] = null;
  // Left chamber
  for (let y = 4; y < 9; y++) for (let x = 2; x < 8; x++) m[y][x] = null;
  // Right passage
  for (let y = 5; y < 9; y++) for (let x = 12; x < 18; x++) m[y][x] = null;
  // Boss room (top)
  for (let y = 1; y < 5; y++) for (let x = 6; x < 14; x++) m[y][x] = null;
  // Connection corridors
  for (let y = 4; y < 9; y++) m[y][6] = null;
  for (let y = 4; y < 9; y++) m[y][13] = null;

  return m;
})();

const caveCollisions: boolean[][] = (() => {
  const c = fill2D(18, 20, false);
  for (let y = 0; y < 18; y++) {
    for (let x = 0; x < 20; x++) {
      if (caveObjects[y][x] === T.Wall) c[y][x] = true;
    }
  }
  return c;
})();

export const MAPS: Record<string, GameMap> = {
  millbrook_village: {
    id: 'millbrook_village', name: 'Millbrook Village',
    width: 20, height: 16,
    ground: villageGround,
    objects: villageObjects,
    collisions: villageCollisions,
    npcs: [
      { id: 'elder', name: 'Elder Rowan', x: 4, y: 5, facing: Direction.Down, spriteColor: '#887766', dialogueId: 'elder_quest' },
      { id: 'shopkeeper', name: 'Merchant', x: 15, y: 5, facing: Direction.Down, spriteColor: '#cc8844', dialogueId: 'shopkeeper' },
      { id: 'innkeeper', name: 'Innkeeper', x: 4, y: 10, facing: Direction.Up, spriteColor: '#7766aa', dialogueId: 'innkeeper' },
      { id: 'lira_npc', name: 'Lira', x: 15, y: 10, facing: Direction.Down, spriteColor: '#9b59b6', dialogueId: 'lira_recruit' },
      { id: 'villager1', name: 'Villager', x: 9, y: 7, facing: Direction.Down, spriteColor: '#668844', dialogueId: 'villager_generic' },
    ],
    transitions: [
      { fromMapId: 'millbrook_village', toMapId: 'whispering_forest', fromX: 19, fromY: 8, toX: 1, toY: 9 },
      { fromMapId: 'millbrook_village', toMapId: 'whispering_forest', fromX: 19, fromY: 9, toX: 1, toY: 10 },
    ],
    encounterZone: null,
  },

  whispering_forest: {
    id: 'whispering_forest', name: 'Whispering Forest',
    width: 24, height: 20,
    ground: forestGround,
    objects: forestObjects,
    collisions: forestCollisions,
    npcs: [
      { id: 'finn_npc', name: 'Finn', x: 12, y: 9, facing: Direction.Left, spriteColor: '#27ae60', dialogueId: 'finn_recruit' },
    ],
    transitions: [
      { fromMapId: 'whispering_forest', toMapId: 'millbrook_village', fromX: 0, fromY: 9, toX: 18, toY: 8 },
      { fromMapId: 'whispering_forest', toMapId: 'millbrook_village', fromX: 0, fromY: 10, toX: 18, toY: 9 },
      { fromMapId: 'whispering_forest', toMapId: 'shadowfang_cave', fromX: 23, fromY: 9, toX: 10, toY: 16 },
      { fromMapId: 'whispering_forest', toMapId: 'shadowfang_cave', fromX: 23, fromY: 10, toX: 10, toY: 16 },
    ],
    encounterZone: { enemyIds: ['slime', 'wolf', 'goblin'], rate: 0.12 },
  },

  shadowfang_cave: {
    id: 'shadowfang_cave', name: 'Shadowfang Cave',
    width: 20, height: 18,
    ground: caveGround,
    objects: caveObjects,
    collisions: caveCollisions,
    npcs: [
      { id: 'dark_knight_npc', name: 'Dark Knight', x: 10, y: 2, facing: Direction.Down, spriteColor: '#222233', dialogueId: 'dark_knight_boss' },
    ],
    transitions: [
      { fromMapId: 'shadowfang_cave', toMapId: 'whispering_forest', fromX: 10, fromY: 17, toX: 22, toY: 9 },
    ],
    encounterZone: { enemyIds: ['bat', 'skeleton'], rate: 0.15 },
  },
};
