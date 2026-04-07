import { Scene, SceneManager } from '@/engine/SceneManager';
import { InputManager } from '@/engine/InputManager';
import { GAME_WIDTH, GAME_HEIGHT } from '@/engine/GameLoop';
import { useGameStore } from '@/store/gameStore';
import { OverworldScene } from './OverworldScene';
import { CHARACTERS_DB } from '@/data/characters';
import { ITEMS_DB } from '@/data/items';

export class TitleScene implements Scene {
  private menuIndex = 0;
  private starTimer = 0;
  private stars: { x: number; y: number; speed: number; brightness: number }[] = [];
  private blinkTimer = 0;
  private showText = true;

  enter() {
    // Generate stars
    for (let i = 0; i < 60; i++) {
      this.stars.push({
        x: Math.random() * GAME_WIDTH,
        y: Math.random() * GAME_HEIGHT,
        speed: 0.2 + Math.random() * 0.5,
        brightness: 0.3 + Math.random() * 0.7,
      });
    }
  }

  update(dt: number) {
    this.starTimer += dt;
    this.blinkTimer += dt;
    if (this.blinkTimer > 0.5) {
      this.blinkTimer = 0;
      this.showText = !this.showText;
    }

    // Animate stars
    for (const star of this.stars) {
      star.y += star.speed;
      if (star.y > GAME_HEIGHT) {
        star.y = 0;
        star.x = Math.random() * GAME_WIDTH;
      }
    }

    if (InputManager.isPressed('confirm')) {
      this.startNewGame();
    }
  }

  private startNewGame() {
    const store = useGameStore.getState();

    // Add starter character (Kael)
    const kael = CHARACTERS_DB.kael;
    store.addToParty(kael);

    // Add starter items
    store.addItem(ITEMS_DB.potion, 3);
    store.addItem(ITEMS_DB.ether, 1);

    store.setGameStarted(true);
    store.setMap('millbrook_village', 7, 10);

    SceneManager.replace(new OverworldScene());
  }

  render(ctx: CanvasRenderingContext2D) {
    // Background
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Stars
    for (const star of this.stars) {
      ctx.fillStyle = `rgba(255,255,255,${star.brightness})`;
      ctx.fillRect(star.x, star.y, 1, 1);
    }

    // Title
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CRYSTAL', GAME_WIDTH / 2, 60);
    ctx.fillText('QUEST', GAME_WIDTH / 2, 84);

    // Subtitle
    ctx.fillStyle = '#8888cc';
    ctx.font = '8px monospace';
    ctx.fillText('~ A Tale of Light and Shadow ~', GAME_WIDTH / 2, 100);

    // Crystal icon (simple diamond shape)
    const cx = GAME_WIDTH / 2;
    const cy = 125;
    ctx.fillStyle = '#44aaff';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 8);
    ctx.lineTo(cx + 6, cy);
    ctx.lineTo(cx, cy + 8);
    ctx.lineTo(cx - 6, cy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#88ccff';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx + 3, cy);
    ctx.lineTo(cx, cy + 6);
    ctx.lineTo(cx - 3, cy);
    ctx.closePath();
    ctx.fill();

    // Press Start
    if (this.showText) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px monospace';
      ctx.fillText('PRESS Z TO START', GAME_WIDTH / 2, 170);
    }

    // Credits
    ctx.fillStyle = '#555';
    ctx.font = '6px monospace';
    ctx.fillText('Arrow Keys: Move | Z: Confirm | X: Cancel | Esc: Menu', GAME_WIDTH / 2, GAME_HEIGHT - 10);

    ctx.textAlign = 'left';
  }
}
