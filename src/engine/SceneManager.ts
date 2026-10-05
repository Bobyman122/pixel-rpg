import { GAME_HEIGHT, GAME_WIDTH } from './constants';

export interface Scene {
  /** Opaque scenes hide everything beneath them, so lower scenes are not drawn. */
  readonly opaque?: boolean;
  enter?(): void;
  exit?(): void;
  /** Called when the scene above this one is popped. */
  resume?(): void;
  update(dt: number): void;
  render(ctx: CanvasRenderingContext2D): void;
}

interface Transition {
  color: string;
  outTime: number;
  inTime: number;
  t: number;
  phase: 'out' | 'in';
  midpoint?: () => void;
  done?: () => void;
}

class SceneManagerClass {
  private stack: Scene[] = [];
  private transition: Transition | null = null;

  get current(): Scene | null {
    return this.stack[this.stack.length - 1] ?? null;
  }

  get busy(): boolean {
    return this.transition !== null;
  }

  has(scene: Scene) {
    return this.stack.includes(scene);
  }

  push(scene: Scene) {
    this.stack.push(scene);
    scene.enter?.();
  }

  pop(): Scene | null {
    const scene = this.stack.pop() ?? null;
    scene?.exit?.();
    this.current?.resume?.();
    return scene;
  }

  /** Remove a specific scene wherever it sits in the stack. */
  remove(scene: Scene) {
    const idx = this.stack.indexOf(scene);
    if (idx === -1) return;
    if (idx === this.stack.length - 1) {
      this.pop();
      return;
    }
    this.stack.splice(idx, 1);
    scene.exit?.();
  }

  replace(scene: Scene) {
    const old = this.stack.pop();
    old?.exit?.();
    this.push(scene);
  }

  clear() {
    while (this.stack.length > 0) this.stack.pop()?.exit?.();
    this.transition = null;
  }

  /**
   * Fade to a colour, run `midpoint` while the screen is covered, then fade back in.
   * Scene updates are paused for the duration so input can't leak through.
   */
  fade(opts: { midpoint?: () => void; done?: () => void; color?: string; out?: number; in?: number }) {
    this.transition = {
      color: opts.color ?? '#000',
      outTime: opts.out ?? 0.3,
      inTime: opts.in ?? 0.3,
      t: 0,
      phase: 'out',
      midpoint: opts.midpoint,
      done: opts.done,
    };
  }

  update(dt: number) {
    const tr = this.transition;
    if (tr) {
      tr.t += dt;
      if (tr.phase === 'out' && tr.t >= tr.outTime) {
        tr.phase = 'in';
        tr.t = 0;
        tr.midpoint?.();
      } else if (tr.phase === 'in' && tr.t >= tr.inTime) {
        this.transition = null;
        tr.done?.();
      }
      return;
    }
    this.current?.update(dt);
  }

  render(ctx: CanvasRenderingContext2D) {
    let start = 0;
    for (let i = this.stack.length - 1; i >= 0; i--) {
      if (this.stack[i].opaque) {
        start = i;
        break;
      }
    }
    for (let i = start; i < this.stack.length; i++) this.stack[i].render(ctx);

    const tr = this.transition;
    if (tr) {
      const p = tr.phase === 'out' ? tr.t / tr.outTime : 1 - tr.t / tr.inTime;
      // Stepped fade reads more "SNES" than a smooth one.
      const alpha = Math.min(1, Math.max(0, Math.round(p * 8) / 8));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = tr.color;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      ctx.globalAlpha = 1;
    }
  }
}

export const SceneManager = new SceneManagerClass();
