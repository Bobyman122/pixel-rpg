import { Direction } from '@/types';
import { TILE_SIZE } from './GameLoop';

// Color palettes
export const PALETTES = {
  warrior: { skin: '#f4c088', hair: '#8b4513', armor: '#4a6fa5', trim: '#c0c0c0' },
  mage: { skin: '#f4c088', hair: '#9b59b6', robe: '#2c3e50', trim: '#f1c40f' },
  rogue: { skin: '#f4c088', hair: '#2c3e50', tunic: '#27ae60', trim: '#8b6914' },
  slime: { body: '#22cc44', eye: '#ffffff', pupil: '#000000', shine: '#88ff88' },
  wolf: { body: '#888888', belly: '#cccccc', eye: '#ff4444', nose: '#222222' },
  goblin: { skin: '#55aa55', eye: '#ff0000', cloth: '#8b4513', weapon: '#aaaaaa' },
  bat: { body: '#443355', wing: '#665577', eye: '#ff6666' },
  skeleton: { bone: '#e8dcc8', eye: '#ff3333', weapon: '#888888' },
  darkKnight: { armor: '#222233', trim: '#8b0000', eye: '#ff0000', cape: '#440000' },
};

type SpriteFrame = ImageData;

function createPixelCanvas(w: number, h: number): [CanvasRenderingContext2D, HTMLCanvasElement] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [ctx, canvas];
}

function setPixel(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}

// Character sprite (16x24, top-down RPG style)
export function generateCharacterSprites(
  palette: { skin: string; hair: string; main: string; trim: string }
): Record<Direction, HTMLCanvasElement[]> {
  const sprites: Record<Direction, HTMLCanvasElement[]> = {
    [Direction.Down]: [],
    [Direction.Up]: [],
    [Direction.Left]: [],
    [Direction.Right]: [],
  };

  for (const dir of [Direction.Down, Direction.Up, Direction.Left, Direction.Right]) {
    for (let frame = 0; frame < 2; frame++) {
      const [ctx, canvas] = createPixelCanvas(TILE_SIZE, 24);

      // Head (row 0-7)
      // Hair
      for (let x = 4; x < 12; x++) {
        setPixel(ctx, x, 0, palette.hair);
        setPixel(ctx, x, 1, palette.hair);
      }
      // Face
      for (let y = 2; y < 7; y++) {
        for (let x = 4; x < 12; x++) {
          setPixel(ctx, x, y, palette.skin);
        }
      }
      // Hair sides
      setPixel(ctx, 3, 1, palette.hair);
      setPixel(ctx, 3, 2, palette.hair);
      setPixel(ctx, 12, 1, palette.hair);
      setPixel(ctx, 12, 2, palette.hair);

      // Eyes
      if (dir === Direction.Down) {
        setPixel(ctx, 6, 3, '#000');
        setPixel(ctx, 9, 3, '#000');
        // Mouth
        setPixel(ctx, 7, 5, '#c07060');
        setPixel(ctx, 8, 5, '#c07060');
      } else if (dir === Direction.Up) {
        // Back of head - hair
        for (let y = 2; y < 6; y++) {
          for (let x = 4; x < 12; x++) {
            setPixel(ctx, x, y, palette.hair);
          }
        }
      } else if (dir === Direction.Left) {
        setPixel(ctx, 5, 3, '#000');
        setPixel(ctx, 7, 5, '#c07060');
      } else {
        setPixel(ctx, 10, 3, '#000');
        setPixel(ctx, 8, 5, '#c07060');
      }

      // Body (row 8-18)
      for (let y = 8; y < 18; y++) {
        for (let x = 4; x < 12; x++) {
          setPixel(ctx, x, y, palette.main);
        }
      }
      // Trim on body
      for (let y = 8; y < 10; y++) {
        setPixel(ctx, 4, y, palette.trim);
        setPixel(ctx, 11, y, palette.trim);
      }
      // Belt
      for (let x = 4; x < 12; x++) {
        setPixel(ctx, x, 14, palette.trim);
      }

      // Arms
      const armOffset = frame === 0 ? 0 : 1;
      for (let y = 9; y < 15; y++) {
        setPixel(ctx, 3, y + (dir === Direction.Left ? -armOffset : armOffset), palette.skin);
        setPixel(ctx, 12, y + (dir === Direction.Right ? -armOffset : armOffset), palette.skin);
      }

      // Legs (row 18-23)
      for (let y = 18; y < 23; y++) {
        const legSpread = frame === 0 ? 0 : 1;
        setPixel(ctx, 5 - legSpread, y, palette.main);
        setPixel(ctx, 6, y, palette.main);
        setPixel(ctx, 9, y, palette.main);
        setPixel(ctx, 10 + legSpread, y, palette.main);
      }
      // Boots
      setPixel(ctx, 5, 22, '#443322');
      setPixel(ctx, 6, 22, '#443322');
      setPixel(ctx, 9, 22, '#443322');
      setPixel(ctx, 10, 22, '#443322');
      if (frame === 1) {
        setPixel(ctx, 4, 22, '#443322');
        setPixel(ctx, 11, 22, '#443322');
      }

      sprites[dir].push(canvas);
    }
  }

  return sprites;
}

// Battle sprite (larger, 32x48)
export function generateBattleSprite(
  palette: { skin: string; hair: string; main: string; trim: string }
): HTMLCanvasElement {
  const [ctx, canvas] = createPixelCanvas(32, 48);

  // Scale up the character design
  // Head
  for (let y = 0; y < 14; y++) {
    for (let x = 8; x < 24; x++) {
      setPixel(ctx, x, y, y < 4 ? palette.hair : palette.skin);
    }
  }
  // Eyes
  setPixel(ctx, 12, 7, '#000'); setPixel(ctx, 13, 7, '#000');
  setPixel(ctx, 19, 7, '#000'); setPixel(ctx, 20, 7, '#000');
  // Body
  for (let y = 14; y < 34; y++) {
    for (let x = 8; x < 24; x++) {
      setPixel(ctx, x, y, palette.main);
    }
  }
  // Belt
  for (let x = 8; x < 24; x++) {
    setPixel(ctx, x, 27, palette.trim);
    setPixel(ctx, x, 28, palette.trim);
  }
  // Arms
  for (let y = 16; y < 30; y++) {
    setPixel(ctx, 6, y, palette.skin); setPixel(ctx, 7, y, palette.skin);
    setPixel(ctx, 24, y, palette.skin); setPixel(ctx, 25, y, palette.skin);
  }
  // Legs
  for (let y = 34; y < 46; y++) {
    for (let x = 10; x < 15; x++) setPixel(ctx, x, y, palette.main);
    for (let x = 17; x < 22; x++) setPixel(ctx, x, y, palette.main);
  }
  // Boots
  for (let x = 9; x < 15; x++) { setPixel(ctx, x, 45, '#443322'); setPixel(ctx, x, 46, '#443322'); }
  for (let x = 17; x < 23; x++) { setPixel(ctx, x, 45, '#443322'); setPixel(ctx, x, 46, '#443322'); }

  return canvas;
}

// Enemy sprites
export function generateEnemySprite(enemyType: string): HTMLCanvasElement {
  switch (enemyType) {
    case 'slime': return generateSlimeSprite();
    case 'wolf': return generateWolfSprite();
    case 'goblin': return generateGoblinSprite();
    case 'bat': return generateBatSprite();
    case 'skeleton': return generateSkeletonSprite();
    case 'dark_knight': return generateDarkKnightSprite();
    default: return generateSlimeSprite();
  }
}

function generateSlimeSprite(): HTMLCanvasElement {
  const [ctx, canvas] = createPixelCanvas(32, 32);
  const p = PALETTES.slime;

  // Body (blob shape)
  for (let y = 8; y < 28; y++) {
    const width = y < 16 ? (y - 8) * 2 : y < 24 ? 16 : (28 - y) * 3;
    const startX = 16 - Math.floor(width / 2);
    for (let x = startX; x < startX + width; x++) {
      setPixel(ctx, x, y, p.body);
    }
  }
  // Shine
  setPixel(ctx, 12, 12, p.shine); setPixel(ctx, 13, 11, p.shine);
  // Eyes
  setPixel(ctx, 11, 16, p.eye); setPixel(ctx, 12, 16, p.pupil);
  setPixel(ctx, 19, 16, p.eye); setPixel(ctx, 20, 16, p.pupil);
  // Mouth
  for (let x = 13; x < 19; x++) setPixel(ctx, x, 20, '#118833');

  return canvas;
}

function generateWolfSprite(): HTMLCanvasElement {
  const [ctx, canvas] = createPixelCanvas(48, 32);
  const p = PALETTES.wolf;

  // Body
  for (let y = 10; y < 24; y++) {
    for (let x = 8; x < 40; x++) {
      setPixel(ctx, x, y, p.body);
    }
  }
  // Belly
  for (let y = 18; y < 24; y++) {
    for (let x = 14; x < 34; x++) {
      setPixel(ctx, x, y, p.belly);
    }
  }
  // Head
  for (let y = 6; y < 16; y++) {
    for (let x = 34; x < 46; x++) {
      setPixel(ctx, x, y, p.body);
    }
  }
  // Ears
  setPixel(ctx, 36, 4, p.body); setPixel(ctx, 37, 4, p.body); setPixel(ctx, 36, 5, p.body);
  setPixel(ctx, 42, 4, p.body); setPixel(ctx, 43, 4, p.body); setPixel(ctx, 43, 5, p.body);
  // Eye
  setPixel(ctx, 40, 9, p.eye); setPixel(ctx, 41, 9, p.eye);
  // Nose
  setPixel(ctx, 45, 12, p.nose);
  // Legs
  for (let y = 24; y < 30; y++) {
    setPixel(ctx, 12, y, p.body); setPixel(ctx, 13, y, p.body);
    setPixel(ctx, 20, y, p.body); setPixel(ctx, 21, y, p.body);
    setPixel(ctx, 28, y, p.body); setPixel(ctx, 29, y, p.body);
    setPixel(ctx, 36, y, p.body); setPixel(ctx, 37, y, p.body);
  }
  // Tail
  for (let i = 0; i < 6; i++) setPixel(ctx, 8 - i, 12 - i, p.body);

  return canvas;
}

function generateGoblinSprite(): HTMLCanvasElement {
  const [ctx, canvas] = createPixelCanvas(32, 40);
  const p = PALETTES.goblin;

  // Head
  for (let y = 2; y < 14; y++) {
    for (let x = 8; x < 24; x++) setPixel(ctx, x, y, p.skin);
  }
  // Ears (pointy)
  setPixel(ctx, 6, 6, p.skin); setPixel(ctx, 7, 5, p.skin); setPixel(ctx, 7, 6, p.skin);
  setPixel(ctx, 25, 6, p.skin); setPixel(ctx, 24, 5, p.skin); setPixel(ctx, 24, 6, p.skin);
  // Eyes
  setPixel(ctx, 12, 7, p.eye); setPixel(ctx, 20, 7, p.eye);
  // Body
  for (let y = 14; y < 28; y++) {
    for (let x = 10; x < 22; x++) setPixel(ctx, x, y, p.cloth);
  }
  // Legs
  for (let y = 28; y < 36; y++) {
    setPixel(ctx, 12, y, p.skin); setPixel(ctx, 13, y, p.skin);
    setPixel(ctx, 19, y, p.skin); setPixel(ctx, 20, y, p.skin);
  }
  // Weapon (club)
  for (let y = 10; y < 30; y++) {
    setPixel(ctx, 24, y, p.weapon);
    if (y < 16) { setPixel(ctx, 25, y, p.weapon); setPixel(ctx, 26, y, p.weapon); }
  }

  return canvas;
}

function generateBatSprite(): HTMLCanvasElement {
  const [ctx, canvas] = createPixelCanvas(40, 24);
  const p = PALETTES.bat;

  // Body
  for (let y = 6; y < 16; y++) {
    for (let x = 16; x < 24; x++) setPixel(ctx, x, y, p.body);
  }
  // Wings
  for (let y = 4; y < 14; y++) {
    const span = y < 8 ? (y - 4) * 3 : (14 - y) * 2;
    for (let i = 0; i < span; i++) {
      setPixel(ctx, 15 - i, y, p.wing);
      setPixel(ctx, 24 + i, y, p.wing);
    }
  }
  // Eyes
  setPixel(ctx, 18, 8, p.eye); setPixel(ctx, 22, 8, p.eye);
  // Fangs
  setPixel(ctx, 19, 13, '#fff'); setPixel(ctx, 21, 13, '#fff');

  return canvas;
}

function generateSkeletonSprite(): HTMLCanvasElement {
  const [ctx, canvas] = createPixelCanvas(32, 48);
  const p = PALETTES.skeleton;

  // Skull
  for (let y = 2; y < 12; y++) {
    for (let x = 10; x < 22; x++) setPixel(ctx, x, y, p.bone);
  }
  // Eye sockets
  setPixel(ctx, 13, 6, '#000'); setPixel(ctx, 14, 6, '#000');
  setPixel(ctx, 13, 7, p.eye); setPixel(ctx, 14, 7, '#000');
  setPixel(ctx, 18, 6, '#000'); setPixel(ctx, 19, 6, '#000');
  setPixel(ctx, 18, 7, '#000'); setPixel(ctx, 19, 7, p.eye);
  // Jaw
  for (let x = 12; x < 20; x++) setPixel(ctx, x, 10, '#000');
  // Spine
  for (let y = 12; y < 30; y++) {
    setPixel(ctx, 15, y, p.bone); setPixel(ctx, 16, y, p.bone);
  }
  // Ribs
  for (let r = 0; r < 4; r++) {
    const ry = 14 + r * 3;
    for (let x = 10; x < 22; x++) setPixel(ctx, x, ry, p.bone);
  }
  // Arms
  for (let y = 14; y < 28; y++) {
    setPixel(ctx, 8, y, p.bone); setPixel(ctx, 9, y, p.bone);
    setPixel(ctx, 22, y, p.bone); setPixel(ctx, 23, y, p.bone);
  }
  // Sword in right hand
  for (let y = 4; y < 28; y++) setPixel(ctx, 25, y, p.weapon);
  setPixel(ctx, 24, 8, p.weapon); setPixel(ctx, 26, 8, p.weapon);
  // Legs
  for (let y = 30; y < 44; y++) {
    setPixel(ctx, 13, y, p.bone); setPixel(ctx, 14, y, p.bone);
    setPixel(ctx, 18, y, p.bone); setPixel(ctx, 19, y, p.bone);
  }

  return canvas;
}

function generateDarkKnightSprite(): HTMLCanvasElement {
  const [ctx, canvas] = createPixelCanvas(48, 64);
  const p = PALETTES.darkKnight;

  // Cape (behind)
  for (let y = 12; y < 58; y++) {
    const w = Math.min(y - 8, 30);
    for (let x = 24 - Math.floor(w / 2); x < 24 + Math.ceil(w / 2); x++) {
      setPixel(ctx, x, y, p.cape);
    }
  }

  // Helmet
  for (let y = 0; y < 16; y++) {
    for (let x = 12; x < 36; x++) setPixel(ctx, x, y, p.armor);
  }
  // Helmet crest
  for (let y = 0; y < 6; y++) {
    setPixel(ctx, 23, y - 2 < 0 ? 0 : y - 2, p.trim);
    setPixel(ctx, 24, y - 2 < 0 ? 0 : y - 2, p.trim);
  }
  // Visor slit
  for (let x = 16; x < 32; x++) setPixel(ctx, x, 8, '#000');
  // Glowing eyes
  setPixel(ctx, 18, 8, p.eye); setPixel(ctx, 19, 8, p.eye);
  setPixel(ctx, 28, 8, p.eye); setPixel(ctx, 29, 8, p.eye);

  // Body armor
  for (let y = 16; y < 40; y++) {
    for (let x = 10; x < 38; x++) setPixel(ctx, x, y, p.armor);
  }
  // Armor trim
  for (let x = 10; x < 38; x++) {
    setPixel(ctx, x, 16, p.trim); setPixel(ctx, x, 39, p.trim);
  }
  for (let y = 16; y < 40; y++) {
    setPixel(ctx, 10, y, p.trim); setPixel(ctx, 37, y, p.trim);
  }
  // Emblem
  for (let y = 24; y < 30; y++) {
    for (let x = 21; x < 27; x++) setPixel(ctx, x, y, p.trim);
  }

  // Arms
  for (let y = 18; y < 38; y++) {
    setPixel(ctx, 8, y, p.armor); setPixel(ctx, 9, y, p.armor);
    setPixel(ctx, 38, y, p.armor); setPixel(ctx, 39, y, p.armor);
  }

  // Greatsword (right side)
  for (let y = 2; y < 50; y++) {
    setPixel(ctx, 42, y, '#666'); setPixel(ctx, 43, y, '#888');
  }
  // Crossguard
  for (let x = 40; x < 46; x++) {
    setPixel(ctx, x, 18, '#aa8833'); setPixel(ctx, x, 19, '#aa8833');
  }

  // Legs
  for (let y = 40; y < 58; y++) {
    for (let x = 14; x < 22; x++) setPixel(ctx, x, y, p.armor);
    for (let x = 26; x < 34; x++) setPixel(ctx, x, y, p.armor);
  }
  // Boots
  for (let x = 12; x < 22; x++) { setPixel(ctx, x, 58, '#111'); setPixel(ctx, x, 59, '#111'); }
  for (let x = 26; x < 36; x++) { setPixel(ctx, x, 58, '#111'); setPixel(ctx, x, 59, '#111'); }

  return canvas;
}

// NPC sprite (simple colored character)
export function generateNPCSprite(color: string): Record<Direction, HTMLCanvasElement> {
  const sprites: Record<Direction, HTMLCanvasElement> = {} as Record<Direction, HTMLCanvasElement>;
  for (const dir of [Direction.Down, Direction.Up, Direction.Left, Direction.Right]) {
    const [ctx, canvas] = createPixelCanvas(TILE_SIZE, 24);
    // Head
    for (let y = 0; y < 7; y++) {
      for (let x = 4; x < 12; x++) setPixel(ctx, x, y, '#f4c088');
    }
    // Hair
    for (let x = 4; x < 12; x++) { setPixel(ctx, x, 0, color); setPixel(ctx, x, 1, color); }
    // Eyes
    if (dir === Direction.Down) { setPixel(ctx, 6, 3, '#000'); setPixel(ctx, 9, 3, '#000'); }
    // Body
    for (let y = 8; y < 20; y++) {
      for (let x = 4; x < 12; x++) setPixel(ctx, x, y, color);
    }
    // Legs
    for (let y = 20; y < 24; y++) {
      setPixel(ctx, 5, y, '#555'); setPixel(ctx, 6, y, '#555');
      setPixel(ctx, 9, y, '#555'); setPixel(ctx, 10, y, '#555');
    }
    sprites[dir] = canvas;
  }
  return sprites;
}

// Tile sprites
const tileColors: Record<number, string> = {
  0: '#4a8c3f',  // Grass
  1: '#b8860b',  // Dirt
  2: '#2266aa',  // Water
  3: '#808080',  // Stone
  4: '#554433',  // Wall
  5: '#2d5a1e',  // Tree
  6: '#8b6914',  // Door
  7: '#999999',  // Stairs
  8: '#aa7744',  // Shop
  9: '#7766aa',  // Inn
  10: '#a0784a', // FloorWood
  11: '#888888', // FloorStone
  12: '#daa520', // Sand
  13: '#8b6914', // Bridge
};

const tileCache = new Map<number, HTMLCanvasElement>();

export function getTileSprite(tileType: number): HTMLCanvasElement {
  if (tileCache.has(tileType)) return tileCache.get(tileType)!;

  const [ctx, canvas] = createPixelCanvas(TILE_SIZE, TILE_SIZE);
  const base = tileColors[tileType] || '#ff00ff';

  // Fill base color
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

  // Add detail based on type
  switch (tileType) {
    case 0: // Grass - random darker spots
      ctx.fillStyle = '#3d7a34';
      for (let i = 0; i < 6; i++) {
        const gx = (i * 7 + 3) % TILE_SIZE;
        const gy = (i * 5 + 2) % TILE_SIZE;
        ctx.fillRect(gx, gy, 1, 2);
      }
      break;
    case 2: // Water - wave lines
      ctx.fillStyle = '#3377bb';
      for (let x = 0; x < TILE_SIZE; x += 4) {
        ctx.fillRect(x, 6, 3, 1);
        ctx.fillRect(x + 2, 12, 3, 1);
      }
      break;
    case 4: // Wall - brick pattern
      ctx.fillStyle = '#665544';
      for (let y = 0; y < TILE_SIZE; y += 4) {
        ctx.fillRect(0, y, TILE_SIZE, 1);
        ctx.fillRect(y % 8 === 0 ? 4 : 12, y, 1, 4);
      }
      break;
    case 5: // Tree - trunk and crown
      ctx.fillStyle = '#1a4a10';
      ctx.fillRect(2, 0, 12, 10);
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(6, 10, 4, 6);
      ctx.fillStyle = '#2a6a1e';
      ctx.fillRect(4, 2, 8, 6);
      break;
    case 6: // Door
      ctx.fillStyle = '#6a4a20';
      ctx.fillRect(2, 2, 12, 14);
      ctx.fillStyle = '#ffcc00';
      ctx.fillRect(10, 8, 2, 2);
      break;
    case 7: // Stairs
      ctx.fillStyle = '#777';
      for (let y = 0; y < TILE_SIZE; y += 3) {
        ctx.fillRect(0, y, TILE_SIZE, 2);
      }
      break;
  }

  tileCache.set(tileType, canvas);
  return canvas;
}
