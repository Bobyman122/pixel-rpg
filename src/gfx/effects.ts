import type { SkillFx } from '@/types';
import { drawText, measureText } from './font';

function px(ctx: CanvasRenderingContext2D, x: number, y: number, c: string, w = 1, h = 1) {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

// ---------------------------------------------------------------------------
// Particles
// ---------------------------------------------------------------------------

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  colors: string[];
  size: number;
  gravity: number;
  shape: 'square' | 'plus' | 'bubble' | 'z';
}

export class Particles {
  private list: Particle[] = [];

  spawn(p: Partial<Particle> & { x: number; y: number }) {
    this.list.push({
      vx: 0,
      vy: 0,
      life: 0,
      max: 0.6,
      colors: ['#ffffff'],
      size: 1,
      gravity: 0,
      shape: 'square',
      ...p,
    });
  }

  burst(x: number, y: number, n: number, colors: string[], speed = 50, opts: Partial<Particle> = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.6);
      this.spawn({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, colors, max: 0.4 + Math.random() * 0.3, ...opts });
    }
  }

  get active() {
    return this.list.length > 0;
  }

  update(dt: number) {
    for (const p of this.list) {
      p.life += dt;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.list = this.list.filter((p) => p.life < p.max);
  }

  render(ctx: CanvasRenderingContext2D) {
    for (const p of this.list) {
      const t = p.life / p.max;
      const c = p.colors[Math.min(p.colors.length - 1, Math.floor(t * p.colors.length))];
      switch (p.shape) {
        case 'plus':
          px(ctx, p.x, p.y - 1, c);
          px(ctx, p.x - 1, p.y, c, 3, 1);
          px(ctx, p.x, p.y + 1, c);
          break;
        case 'bubble':
          px(ctx, p.x - 1, p.y, c, 1, 2);
          px(ctx, p.x + 2, p.y, c, 1, 2);
          px(ctx, p.x, p.y - 1, c, 2, 1);
          px(ctx, p.x, p.y + 2, c, 2, 1);
          break;
        case 'z':
          drawText(ctx, 'z', p.x, p.y, c);
          break;
        default:
          px(ctx, p.x, p.y, c, p.size, p.size);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Skill effects
// ---------------------------------------------------------------------------

export interface BattleEffect {
  t: number;
  duration: number;
  update(dt: number): void;
  render(ctx: CanvasRenderingContext2D): void;
}

const FX_DURATION: Record<SkillFx, number> = {
  slash: 0.28,
  bash: 0.3,
  claw: 0.3,
  bite: 0.3,
  fire: 0.6,
  ice: 0.6,
  heal: 0.7,
  poison: 0.5,
  smoke: 0.6,
  shadow: 0.7,
  buff: 0.6,
  steal: 0.4,
  sonic: 0.45,
  bone: 0.35,
  slime: 0.35,
};

/** Build an effect centred on (x, y). Some effects also seed the shared particle pool. */
export function createEffect(kind: SkillFx, x: number, y: number, particles: Particles): BattleEffect {
  const duration = FX_DURATION[kind];
  let spawned = 0;
  const e: BattleEffect = {
    t: 0,
    duration,
    update(dt) {
      e.t += dt;
      const p = Math.min(1, e.t / duration);
      // trickle particles over the effect's life
      const want = Math.floor(p * 14);
      while (spawned < want) {
        spawned++;
        switch (kind) {
          case 'fire':
            particles.spawn({
              x: x - 8 + Math.random() * 16,
              y: y + 6 - Math.random() * 6,
              vx: (Math.random() - 0.5) * 12,
              vy: -30 - Math.random() * 40,
              colors: ['#fff8c0', '#f8d040', '#f88820', '#d83818', '#601010'],
              size: 2,
              max: 0.5,
            });
            break;
          case 'heal':
            particles.spawn({
              x: x - 10 + Math.random() * 20,
              y: y + 8,
              vy: -25 - Math.random() * 20,
              colors: ['#ffffff', '#c8ffd0', '#70f090', '#30b060'],
              shape: Math.random() < 0.4 ? 'plus' : 'square',
              max: 0.7,
            });
            break;
          case 'poison':
            particles.spawn({
              x: x - 8 + Math.random() * 16,
              y: y + 4,
              vy: -20 - Math.random() * 15,
              colors: ['#b8f890', '#70d050', '#3a9030'],
              shape: 'bubble',
              max: 0.6,
            });
            break;
          case 'smoke':
            particles.spawn({
              x: x - 12 + Math.random() * 24,
              y: y - 4 + Math.random() * 12,
              vx: (Math.random() - 0.5) * 20,
              vy: -8 - Math.random() * 8,
              colors: ['#f0f0f8', '#c8c8d8', '#9898b0', '#686880'],
              size: 3,
              max: 0.8,
            });
            break;
          case 'shadow':
            particles.spawn({
              x: x - 12 + Math.random() * 24,
              y: y - 10 + Math.random() * 20,
              vy: -10,
              colors: ['#e0a0ff', '#9040d0', '#501880', '#200830'],
              size: 2,
              max: 0.6,
            });
            break;
          case 'steal':
            particles.spawn({
              x: x + (Math.random() - 0.5) * 16,
              y: y + (Math.random() - 0.5) * 16,
              vy: -15,
              colors: ['#ffffff', '#fff0a0', '#f8c840'],
              shape: 'plus',
              max: 0.5,
            });
            break;
          case 'slime':
            particles.spawn({
              x,
              y,
              vx: (Math.random() - 0.5) * 80,
              vy: -40 - Math.random() * 30,
              gravity: 200,
              colors: ['#b4f4ac', '#64d46e', '#30ae52'],
              size: 2,
              max: 0.45,
            });
            break;
        }
      }
    },
    render(ctx) {
      const p = Math.min(1, e.t / duration);
      switch (kind) {
        case 'slash':
        case 'claw': {
          const lines = kind === 'claw' ? [-5, 0, 5] : [-1, 0, 1];
          const col = kind === 'claw' ? ['#ffffff', '#ffb0b0', '#f04848'] : ['#ffffff', '#fff8c8', '#c8d8ff'];
          const len = 26 * Math.min(1, p * 2);
          for (const off of lines) {
            for (let i = 0; i < len; i++) {
              const fade = p > 0.6 ? (i / len < (p - 0.6) * 2.5 ? 0 : 1) : 1;
              if (!fade) continue;
              const xx = x + 12 - i + off;
              const yy = y - 12 + i;
              px(ctx, xx, yy, col[Math.abs(off) > 2 ? 2 : off === 0 ? 0 : 1]);
              if (off === 0) px(ctx, xx + 1, yy, col[1]);
            }
          }
          break;
        }
        case 'bash':
        case 'bone': {
          const r = 4 + p * 12;
          const c = p < 0.5 ? '#ffffff' : '#f8d860';
          for (let a = 0; a < 8; a++) {
            const ang = (a / 8) * Math.PI * 2;
            const r0 = r * 0.5;
            for (let k = r0; k < r; k++) px(ctx, x + Math.cos(ang) * k, y + Math.sin(ang) * k, c);
          }
          if (p < 0.4) px(ctx, x - 3, y - 3, '#ffffff', 7, 7);
          break;
        }
        case 'bite': {
          const gap = 12 * (1 - Math.min(1, p * 2));
          for (let i = 0; i < 4; i++) {
            const tx = x - 10 + i * 6;
            for (let k = 0; k < 4; k++) {
              px(ctx, tx + k / 2, y - gap - 6 + k, '#ffffff', 4 - k, 1);
              px(ctx, tx + k / 2, y + gap + 6 - k, '#ffffff', 4 - k, 1);
            }
          }
          break;
        }
        case 'ice': {
          for (let i = 0; i < 6; i++) {
            const ang = (i / 6) * Math.PI * 2 + 0.3;
            const dist = 40 * (1 - Math.min(1, p * 1.6));
            const sx = x + Math.cos(ang) * dist;
            const sy = y + Math.sin(ang) * dist * 0.7;
            px(ctx, sx - 1, sy - 3, '#e0f8ff', 2, 6);
            px(ctx, sx - 2, sy - 1, '#78c8f8', 4, 2);
            px(ctx, sx, sy - 4, '#ffffff', 1, 2);
          }
          if (p > 0.6) {
            const s = (p - 0.6) * 40;
            ctx.globalAlpha = 1 - (p - 0.6) * 2.5;
            px(ctx, x - s / 2, y - s / 2, '#c8f0ff', s, s);
            ctx.globalAlpha = 1;
          }
          break;
        }
        case 'shadow': {
          for (let k = 0; k < 3; k++) {
            const rp = Math.max(0, p - k * 0.15);
            const r = rp * 30;
            if (rp <= 0 || rp >= 1) continue;
            for (let a = 0; a < Math.PI * 2; a += 0.08) px(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.6, k === 0 ? '#d090ff' : '#7030b0');
          }
          break;
        }
        case 'buff': {
          const r = 20 * (1 - p);
          for (let a = 0; a < Math.PI * 2; a += 0.1) px(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.5, '#f8e070');
          break;
        }
        case 'sonic': {
          for (let k = 0; k < 3; k++) {
            const r = ((p * 3 + k) % 3) * 8 + 4;
            for (let a = -0.8; a < 0.8; a += 0.08) px(ctx, x - Math.cos(a) * r, y + Math.sin(a) * r, '#f0f0ff');
          }
          break;
        }
        case 'fire':
          if (p < 0.3) {
            ctx.globalAlpha = 0.5;
            px(ctx, x - 12, y - 12, '#f89830', 24, 24);
            ctx.globalAlpha = 1;
          }
          break;
        default:
          break;
      }
    },
  };
  return e;
}

// ---------------------------------------------------------------------------
// Bouncing damage numbers
// ---------------------------------------------------------------------------

export class FloatingText {
  t = 0;
  constructor(
    public text: string,
    public x: number,
    public y: number,
    public color: string,
    public duration = 1.0,
  ) {}

  get done() {
    return this.t >= this.duration;
  }

  update(dt: number) {
    this.t += dt;
  }

  render(ctx: CanvasRenderingContext2D) {
    const bounceT = Math.min(this.t / 0.45, 1);
    const offset = -Math.abs(Math.sin(bounceT * Math.PI * 2)) * 10 * (1 - bounceT);
    if (this.t > this.duration - 0.2 && Math.floor(this.t * 20) % 2 === 0) return;
    const w = measureText(this.text);
    const x = Math.round(this.x - w / 2);
    const y = Math.round(this.y + offset);
    for (const [dx, dy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
      [1, 1],
    ]) {
      drawText(ctx, this.text, x + dx, y + dy, '#100818', { shadow: null });
    }
    drawText(ctx, this.text, x, y, this.color, { shadow: null });
  }
}
