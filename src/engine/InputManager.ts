export type Button = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'cancel' | 'menu' | 'dash';

export const BUTTONS: Button[] = ['up', 'down', 'left', 'right', 'confirm', 'cancel', 'menu', 'dash'];

// Matched against both KeyboardEvent.code and a lower-cased KeyboardEvent.key,
// so physical positions and typed characters both work.
const KEY_MAP: Record<string, Button> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
  KeyZ: 'confirm',
  z: 'confirm',
  Enter: 'confirm',
  NumpadEnter: 'confirm',
  Space: 'confirm',
  ' ': 'confirm',
  KeyX: 'cancel',
  x: 'cancel',
  Backspace: 'cancel',
  Escape: 'menu',
  KeyC: 'menu',
  c: 'menu',
  ShiftLeft: 'dash',
  ShiftRight: 'dash',
  Shift: 'dash',
};

const REPEAT_DELAY = 0.32;
const REPEAT_RATE = 0.075;

type Source = 'keyboard' | 'touch';

class InputManagerClass {
  private held: Record<Source, Set<Button>> = { keyboard: new Set(), touch: new Set() };
  private pressed = new Set<Button>();
  private holdTime = new Map<Button, number>();
  private repeated = new Set<Button>();
  private initialized = false;
  private listeners: (() => void)[] = [];

  /** Called once on the first user gesture (used to unlock audio). */
  onFirstInteraction: (() => void) | null = null;

  init() {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    const keydown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const button = KEY_MAP[e.code] ?? KEY_MAP[e.key.length === 1 ? e.key.toLowerCase() : e.key];
      if (!button) return;
      e.preventDefault();
      this.fireFirstInteraction();
      if (!e.repeat) this.press(button, 'keyboard');
    };
    const keyup = (e: KeyboardEvent) => {
      const button = KEY_MAP[e.code] ?? KEY_MAP[e.key.length === 1 ? e.key.toLowerCase() : e.key];
      if (button) this.release(button, 'keyboard');
    };
    const blur = () => this.reset();

    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    window.addEventListener('blur', blur);
    this.listeners.push(
      () => window.removeEventListener('keydown', keydown),
      () => window.removeEventListener('keyup', keyup),
      () => window.removeEventListener('blur', blur),
    );
  }

  destroy() {
    this.listeners.forEach((off) => off());
    this.listeners = [];
    this.initialized = false;
    this.reset();
  }

  fireFirstInteraction() {
    if (this.onFirstInteraction) {
      const cb = this.onFirstInteraction;
      this.onFirstInteraction = null;
      cb();
    }
  }

  /** Used by the on-screen touch controls. */
  setVirtual(button: Button, down: boolean) {
    this.fireFirstInteraction();
    if (down) this.press(button, 'touch');
    else this.release(button, 'touch');
  }

  private press(button: Button, source: Source) {
    if (!this.isDown(button)) {
      this.pressed.add(button);
      this.holdTime.set(button, 0);
    }
    this.held[source].add(button);
  }

  private release(button: Button, source: Source) {
    this.held[source].delete(button);
    if (!this.isDown(button)) this.holdTime.delete(button);
  }

  reset() {
    this.held.keyboard.clear();
    this.held.touch.clear();
    this.pressed.clear();
    this.repeated.clear();
    this.holdTime.clear();
  }

  isDown(button: Button): boolean {
    return this.held.keyboard.has(button) || this.held.touch.has(button);
  }

  /** True only on the frame the button went down. */
  isPressed(button: Button): boolean {
    return this.pressed.has(button);
  }

  /** True on the initial press and then at a steady rate while held (for menus). */
  isRepeat(button: Button): boolean {
    return this.pressed.has(button) || this.repeated.has(button);
  }

  /** Swallow a press so nothing else reacts to it this frame. */
  consume(button: Button) {
    this.pressed.delete(button);
    this.repeated.delete(button);
  }

  /** Advance hold timers. Call before the scene update. */
  beginFrame(dt: number) {
    this.repeated.clear();
    for (const [button, time] of this.holdTime) {
      const next = time + dt;
      this.holdTime.set(button, next);
      if (time < REPEAT_DELAY && next >= REPEAT_DELAY) {
        this.repeated.add(button);
      } else if (next > REPEAT_DELAY) {
        const before = Math.floor((time - REPEAT_DELAY) / REPEAT_RATE);
        const after = Math.floor((next - REPEAT_DELAY) / REPEAT_RATE);
        if (after > before) this.repeated.add(button);
      }
    }
  }

  /** Clear one-frame state. Call after the scene update. */
  endFrame() {
    this.pressed.clear();
    this.repeated.clear();
  }
}

export const Input = new InputManagerClass();
