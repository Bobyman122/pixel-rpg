export type GameKey = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'cancel' | 'menu';

const KEY_MAP: Record<string, GameKey> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
  z: 'confirm',
  Enter: 'confirm',
  ' ': 'confirm',
  x: 'cancel',
  Escape: 'menu',
};

class InputManagerClass {
  private keysDown = new Set<GameKey>();
  private keysPressed = new Set<GameKey>();
  private initialized = false;

  init() {
    if (this.initialized) return;
    this.initialized = true;

    window.addEventListener('keydown', (e) => {
      const key = KEY_MAP[e.key];
      if (key) {
        e.preventDefault();
        if (!this.keysDown.has(key)) {
          this.keysPressed.add(key);
        }
        this.keysDown.add(key);
      }
    });

    window.addEventListener('keyup', (e) => {
      const key = KEY_MAP[e.key];
      if (key) {
        this.keysDown.delete(key);
      }
    });
  }

  isDown(key: GameKey): boolean {
    return this.keysDown.has(key);
  }

  isPressed(key: GameKey): boolean {
    return this.keysPressed.has(key);
  }

  update() {
    this.keysPressed.clear();
  }
}

export const InputManager = new InputManagerClass();
