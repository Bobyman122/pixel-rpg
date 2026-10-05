import { Pixels } from './canvas';

const OUT = '#140c1e';

const FUR = ['#262a40', '#3e4862', '#606c88', '#8c98ae', '#c4ccda'];
const SLIME = ['#125630', '#1c8442', '#30ae52', '#64d46e', '#b4f4ac'];
const GOB = ['#1a461a', '#2a6826', '#408c36', '#66b24c', '#9cd472'];
const LEATHER = ['#341e10', '#56341c', '#7a4e2c', '#a0703e'];
const BAT = ['#24142e', '#40244e', '#623a7c', '#8a62a4', '#b89cd4'];
const WING = ['#180c22', '#2e1a42', '#4a2e66', '#6a4a92'];
const BONE = ['#564c3c', '#867a62', '#b4a88c', '#dacfb4', '#f6eedc'];
const STEEL = ['#14141c', '#242434', '#383850', '#565678', '#8484a6', '#bcbcd6'];
const BLADE = ['#3c3c50', '#62647c', '#9498b0', '#cfd4e6', '#ffffff'];
const CRIMSON = ['#2a0810', '#4a1018', '#6e1c24', '#962c30', '#c04848'];
const GOLD = ['#7a4c10', '#b88020', '#e8b838', '#fff0a0'];
const WOOD = ['#3a2010', '#5c3618', '#82522a', '#a8743c'];

function slime(): Pixels {
  const p = new Pixels(34, 28);
  const body = p
    .mask()
    .ellipse(17, 19, 14, 8.5)
    .poly([
      [11, 14],
      [17.5, 2],
      [24, 14],
    ])
    .ellipse(17, 13, 7.5, 5);
  p.shade(body, SLIME, { depth: 6, directional: 0.5 });
  // glossy highlight
  p.rect(9, 12, 2, 3, '#effff0');
  p.set(11, 11, '#effff0');
  p.set(15, 6, '#d8ffd8');
  // eyes looking toward the party (right)
  for (const ex of [12, 20]) {
    p.rect(ex, 16, 3, 4, '#ffffff');
    p.rect(ex + 1, 17, 2, 3, '#101018');
    p.set(ex + 1, 17, '#ffffff');
  }
  // smile
  p.rect(14, 23, 6, 1, '#0e3a20');
  p.set(13, 22, '#0e3a20');
  p.set(20, 22, '#0e3a20');
  p.rect(15, 24, 4, 1, '#e86070');
  p.outline(OUT);
  return p;
}

function wolf(): Pixels {
  const p = new Pixels(48, 32);
  const backLegs = p.mask().rect(10, 20, 4, 10).rect(17, 21, 4, 9);
  p.shade(backLegs, FUR, { depth: 2, bias: -0.25 });
  const tail = p.mask().poly([
    [1, 7],
    [11, 13],
    [12, 18],
    [3, 13],
  ]);
  p.shade(tail, FUR, { depth: 2, outline: OUT });
  const body = p.mask().ellipse(22, 17, 13, 7.5);
  p.shade(body, FUR, { depth: 4, outline: OUT });
  const belly = p.mask().ellipse(22, 21, 9, 2.5);
  p.shade(belly, FUR, { depth: 2, bias: 0.3 });
  const frontLegs = p.mask().rect(28, 19, 4, 11).rect(33, 20, 4, 10);
  p.shade(frontLegs, FUR, { depth: 2, outline: OUT });
  const head = p
    .mask()
    .ellipse(37, 12, 7, 6)
    .poly([
      [40, 9],
      [47, 13],
      [46, 17],
      [38, 17],
    ])
    .poly([
      [31, 8],
      [33, 0],
      [37, 6],
    ])
    .poly([
      [36, 6],
      [40, 0],
      [42, 8],
    ]);
  p.shade(head, FUR, { depth: 3, outline: OUT });
  // inner ears
  p.set(33, 4, '#c87888');
  p.set(39, 4, '#c87888');
  // eye with angry brow
  p.rect(38, 10, 3, 1, OUT);
  p.rect(39, 11, 2, 1, '#ff3838');
  p.set(40, 11, '#ffd0a0');
  // nose & fangs
  p.rect(46, 13, 1, 2, '#101018');
  p.set(43, 17, '#ffffff');
  p.set(45, 17, '#ffffff');
  // claws
  for (const x of [10, 17, 28, 33]) p.rect(x, 29, 4, 1, '#d8d8e0');
  p.outline(OUT);
  return p;
}

function goblin(): Pixels {
  const p = new Pixels(34, 36);
  const legs = p.mask().rect(11, 26, 4, 7).rect(18, 26, 4, 7);
  p.shade(legs, GOB, { depth: 2, bias: -0.2 });
  const feet = p.mask().rect(10, 32, 6, 2).rect(18, 32, 6, 2);
  p.shade(feet, LEATHER, { depth: 1 });
  const backArm = p.mask().rect(6, 17, 4, 9);
  p.shade(backArm, GOB, { depth: 2, bias: -0.2 });
  const torso = p.mask().poly([
    [9, 16],
    [24, 16],
    [25, 28],
    [8, 28],
  ]);
  p.shade(torso, LEATHER, { depth: 3, outline: OUT });
  p.rect(9, 24, 15, 2, '#2a1a10');
  p.rect(15, 24, 3, 2, GOLD[2]);
  // club
  const club = p
    .mask()
    .poly([
      [24, 20],
      [27, 20],
      [31, 6],
      [28, 5],
    ])
    .ellipse(29.5, 5, 3.5, 4);
  p.shade(club, WOOD, { depth: 2, outline: OUT });
  for (const [x, y] of [
    [26, 3],
    [32, 4],
    [30, 1],
  ])
    p.set(x, y, '#d0d0d8');
  const frontArm = p.mask().rect(23, 17, 4, 7);
  p.shade(frontArm, GOB, { depth: 2, outline: OUT });
  const head = p
    .mask()
    .ellipse(16, 10, 8.5, 7)
    .poly([
      [2, 6],
      [9, 7],
      [9, 12],
    ])
    .poly([
      [31, 6],
      [24, 7],
      [24, 12],
    ]);
  p.shade(head, GOB, { depth: 4, outline: OUT });
  // face
  p.rect(11, 7, 4, 1, OUT);
  p.rect(18, 7, 4, 1, OUT);
  for (const ex of [12, 19]) {
    p.rect(ex, 8, 3, 2, '#f8e040');
    p.set(ex + 2, 9, '#c01818');
    p.set(ex + 2, 8, '#c01818');
  }
  p.rect(16, 11, 2, 1, GOB[0]);
  p.rect(12, 13, 9, 2, '#3a0c10');
  p.set(13, 13, '#ffffff');
  p.set(19, 13, '#ffffff');
  p.set(16, 14, '#ffffff');
  p.outline(OUT);
  return p;
}

function bat(frame: number): Pixels {
  const p = new Pixels(40, 26);
  const up = frame === 0;
  const left: [number, number][] = up
    ? [
        [16, 11],
        [3, 1],
        [5, 9],
        [1, 13],
        [8, 12],
        [9, 17],
        [15, 15],
      ]
    : [
        [16, 11],
        [2, 16],
        [6, 15],
        [3, 22],
        [10, 18],
        [12, 23],
        [15, 16],
      ];
  const right = left.map(([x, y]) => [39 - x, y] as [number, number]);
  const wings = p.mask().poly(left).poly(right);
  p.shade(wings, WING, { depth: 2, directional: 0.4 });
  // wing bones
  const tips = up
    ? [
        [3, 1],
        [1, 13],
        [9, 17],
      ]
    : [
        [2, 16],
        [3, 22],
        [12, 23],
      ];
  for (const [tx, ty] of tips) {
    const m = p.mask().line(16, 11, tx, ty);
    p.fill(m, BAT[3]);
    const m2 = p.mask().line(23, 11, 39 - tx, ty);
    p.fill(m2, BAT[3]);
  }
  const body = p
    .mask()
    .ellipse(20, 14, 5.5, 6.5)
    .poly([
      [15, 7],
      [16, 1],
      [19, 8],
    ])
    .poly([
      [25, 7],
      [24, 1],
      [21, 8],
    ]);
  p.shade(body, BAT, { depth: 3, outline: OUT });
  p.set(17, 12, '#ff4848');
  p.set(18, 12, '#ff4848');
  p.set(22, 12, '#ff4848');
  p.set(23, 12, '#ff4848');
  p.set(17, 11, '#ffc0c0');
  p.set(22, 11, '#ffc0c0');
  p.rect(18, 16, 5, 1, '#2a0c18');
  p.set(18, 17, '#ffffff');
  p.set(22, 17, '#ffffff');
  p.outline(OUT);
  return p;
}

function skeleton(): Pixels {
  const p = new Pixels(34, 46);
  // shield behind
  const shield = p.mask().ellipse(7, 23, 5.5, 7);
  p.shade(shield, WOOD, { depth: 2 });
  p.fill(p.mask().ellipse(7, 23, 1.5, 1.5), GOLD[2]);
  const legs = p.mask().line(13, 29, 12, 37, 2).line(12, 37, 12, 43, 2).line(20, 29, 21, 37, 2).line(21, 37, 21, 43, 2);
  legs.rect(10, 43, 5, 2).rect(20, 43, 5, 2);
  p.shade(legs, BONE, { depth: 1 });
  const pelvis = p.mask().ellipse(16.5, 28, 5.5, 2.5);
  p.shade(pelvis, BONE, { depth: 2, outline: OUT });
  const ribs = p.mask().rect(15, 15, 3, 13);
  for (let r = 0; r < 4; r++) {
    const half = 6 - r;
    ribs.rect(16 - half, 17 + r * 3, half * 2 + 1, 2);
  }
  p.shade(ribs, BONE, { depth: 1, outline: OUT });
  const backArm = p.mask().line(10, 17, 8, 24, 2);
  p.shade(backArm, BONE, { depth: 1 });
  // sword
  const blade = p.mask().poly([
    [26, 19],
    [28, 19],
    [33, 2],
    [31, 1],
  ]);
  p.shade(blade, BLADE, { depth: 1, directional: 0.8 });
  p.shade(p.mask().rect(24, 19, 7, 2), GOLD, { depth: 1 });
  const arm = p.mask().line(22, 16, 25, 22, 2).line(25, 22, 27, 20, 2);
  p.shade(arm, BONE, { depth: 1, outline: OUT });
  const skull = p.mask().ellipse(17, 8, 7, 6.5).rect(12, 11, 10, 4);
  p.shade(skull, BONE, { depth: 3, outline: OUT });
  for (const ex of [13, 19]) {
    p.rect(ex, 7, 3, 3, '#1a1018');
    p.set(ex + 1, 8, '#ff3030');
  }
  p.set(17, 11, '#1a1018');
  for (let x = 13; x <= 21; x += 2) p.set(x, 13, '#3a2c28');
  p.outline(OUT);
  return p;
}

function darkKnight(): Pixels {
  const p = new Pixels(58, 66);
  const cape = p.mask().poly([
    [14, 15],
    [38, 15],
    [47, 62],
    [3, 62],
  ]);
  p.shade(cape, CRIMSON, { depth: 4, directional: 0.4 });
  for (const x of [12, 20, 30, 39]) p.fill(p.mask().line(x + 2, 30, x, 61), CRIMSON[1]);

  const legs = p.mask().rect(17, 41, 7, 16).rect(28, 41, 7, 16);
  p.shade(legs, STEEL, { depth: 2, outline: OUT });
  const boots = p.mask().rect(15, 56, 10, 6).rect(27, 56, 10, 6);
  p.shade(boots, STEEL, { depth: 2, bias: -0.15, outline: OUT });
  const backArm = p.mask().rect(7, 22, 6, 15).ellipse(9.5, 38, 3.5, 3);
  p.shade(backArm, STEEL, { depth: 2, bias: -0.15, outline: OUT });

  const torso = p.mask().poly([
    [14, 18],
    [39, 18],
    [36, 41],
    [17, 41],
  ]);
  p.shade(torso, STEEL, { depth: 4, outline: OUT });
  // chest plate lines and emblem
  p.fill(p.mask().line(17, 22, 26, 30), STEEL[1]);
  p.fill(p.mask().line(36, 22, 27, 30), STEEL[1]);
  const emblem = p.mask().poly([
    [26.5, 25],
    [30, 30],
    [26.5, 35],
    [23, 30],
  ]);
  p.shade(emblem, CRIMSON, { depth: 2, bias: 0.15 });
  p.fill(p.mask().rect(16, 38, 21, 3), CRIMSON[2]);
  p.fill(p.mask().rect(24, 38, 5, 3), GOLD[2]);

  // greatsword (held forward toward the party)
  const blade = p.mask().poly([
    [42, 30],
    [46, 30],
    [57, 3],
    [54, 1],
  ]);
  p.shade(blade, BLADE, { depth: 2, directional: 0.8 });
  p.fill(p.mask().line(44, 29, 55, 3), BLADE[1]);
  p.shade(p.mask().rect(38, 28, 12, 3), GOLD, { depth: 1, outline: OUT });
  p.shade(p.mask().rect(42, 31, 3, 6), WOOD, { depth: 1 });

  const arm = p.mask().rect(39, 22, 6, 11).ellipse(43, 33, 3.5, 3);
  p.shade(arm, STEEL, { depth: 2, outline: OUT });
  const pauldrons = p.mask().ellipse(13, 20, 7.5, 5).ellipse(40, 20, 7.5, 5);
  p.shade(pauldrons, STEEL, { depth: 3, outline: OUT });
  p.fill(p.mask().rect(7, 22, 13, 1), CRIMSON[3]);
  p.fill(p.mask().rect(33, 22, 13, 1), CRIMSON[3]);

  // helmet with horns and plume
  const horns = p
    .mask()
    .poly([
      [19, 7],
      [11, 1],
      [8, 0],
      [12, 5],
      [18, 11],
    ])
    .poly([
      [34, 7],
      [42, 1],
      [45, 0],
      [41, 5],
      [35, 11],
    ]);
  p.shade(horns, BONE, { depth: 1, directional: 0.7 });
  const plume = p.mask().poly([
    [24, 0],
    [29, 0],
    [28, 5],
    [25, 5],
  ]);
  p.shade(plume, CRIMSON, { depth: 1 });
  const helm = p.mask().ellipse(26.5, 10, 9, 8.5).rect(18, 10, 18, 8);
  p.shade(helm, STEEL, { depth: 3, outline: OUT });
  p.rect(19, 10, 16, 2, '#06040a');
  p.rect(22, 10, 2, 1, '#ff3030');
  p.rect(30, 10, 2, 1, '#ff3030');
  p.set(23, 11, '#ff9090');
  p.set(31, 11, '#ff9090');
  p.rect(26, 13, 1, 4, STEEL[1]);
  p.outline(OUT);
  // a faint violet aura on the blade edge
  for (let y = 2; y < 28; y += 3) {
    const x = Math.round(54 - ((y - 2) * 10) / 27);
    p.set(x + 3, y, '#b068ff');
  }
  return p;
}

const SPRITES: Record<string, (frame: number) => Pixels> = {
  slime,
  wolf,
  goblin,
  bat,
  skeleton,
  dark_knight: darkKnight,
};

export const ENEMY_FRAMES: Record<string, number> = { bat: 2 };

const cache = new Map<string, HTMLCanvasElement>();

export function getEnemySprite(id: string, frame = 0): HTMLCanvasElement {
  const frames = ENEMY_FRAMES[id] ?? 1;
  const f = frame % frames;
  const key = `${id}:${f}`;
  let c = cache.get(key);
  if (!c) {
    const make = SPRITES[id] ?? slime;
    c = make(f).toCanvas();
    cache.set(key, c);
  }
  return c;
}
