import { GameMap, TileType } from '@/types';
import { GAME_WIDTH, GAME_HEIGHT, TILE_SIZE } from './GameLoop';
import { getTileSprite } from './spriteGen';

export class TilemapRenderer {
  private cameraX = 0;
  private cameraY = 0;

  updateCamera(playerX: number, playerY: number, map: GameMap) {
    const px = playerX * TILE_SIZE + TILE_SIZE / 2;
    const py = playerY * TILE_SIZE + TILE_SIZE / 2;

    this.cameraX = Math.max(
      0,
      Math.min(px - GAME_WIDTH / 2, map.width * TILE_SIZE - GAME_WIDTH)
    );
    this.cameraY = Math.max(
      0,
      Math.min(py - GAME_HEIGHT / 2, map.height * TILE_SIZE - GAME_HEIGHT)
    );
  }

  getCameraX() { return this.cameraX; }
  getCameraY() { return this.cameraY; }

  render(ctx: CanvasRenderingContext2D, map: GameMap) {
    const startCol = Math.floor(this.cameraX / TILE_SIZE);
    const startRow = Math.floor(this.cameraY / TILE_SIZE);
    const endCol = Math.min(startCol + Math.ceil(GAME_WIDTH / TILE_SIZE) + 1, map.width);
    const endRow = Math.min(startRow + Math.ceil(GAME_HEIGHT / TILE_SIZE) + 1, map.height);

    // Ground layer
    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        const tile = map.ground[row]?.[col];
        if (tile !== undefined) {
          const sprite = getTileSprite(tile);
          ctx.drawImage(
            sprite,
            col * TILE_SIZE - this.cameraX,
            row * TILE_SIZE - this.cameraY
          );
        }
      }
    }

    // Object layer
    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        const obj = map.objects[row]?.[col];
        if (obj !== null && obj !== undefined) {
          const sprite = getTileSprite(obj);
          ctx.drawImage(
            sprite,
            col * TILE_SIZE - this.cameraX,
            row * TILE_SIZE - this.cameraY
          );
        }
      }
    }
  }

  isCollision(map: GameMap, x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= map.width || y >= map.height) return true;
    return map.collisions[y]?.[x] ?? true;
  }

  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: worldX * TILE_SIZE - this.cameraX,
      y: worldY * TILE_SIZE - this.cameraY,
    };
  }
}
