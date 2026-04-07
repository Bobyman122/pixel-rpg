export interface Scene {
  enter?(): void;
  exit?(): void;
  update(dt: number): void;
  render(ctx: CanvasRenderingContext2D): void;
}

class SceneManagerClass {
  private stack: Scene[] = [];

  get current(): Scene | null {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
  }

  push(scene: Scene) {
    this.stack.push(scene);
    scene.enter?.();
  }

  pop(): Scene | null {
    const scene = this.stack.pop() ?? null;
    scene?.exit?.();
    return scene;
  }

  replace(scene: Scene) {
    this.pop();
    this.push(scene);
  }

  clear() {
    while (this.stack.length > 0) {
      this.pop();
    }
  }

  update(dt: number) {
    this.current?.update(dt);
  }

  render(ctx: CanvasRenderingContext2D) {
    // Render all scenes in stack (for overlays)
    for (const scene of this.stack) {
      scene.render(ctx);
    }
  }
}

export const SceneManager = new SceneManagerClass();
