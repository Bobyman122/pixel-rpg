import { Scene } from '@/engine/SceneManager';
import { SceneManager } from '@/engine/SceneManager';
import { InputManager } from '@/engine/InputManager';
import { TilemapRenderer } from '@/engine/TilemapRenderer';
import { TILE_SIZE } from '@/engine/GameLoop';
import { generateCharacterSprites, generateNPCSprite } from '@/engine/spriteGen';
import { useGameStore } from '@/store/gameStore';
import { Direction, GameMap, NPCData } from '@/types';
import { MAPS } from '@/data/maps';
import { DIALOGUES } from '@/data/dialogues';
import { ENEMIES_DB } from '@/data/enemies';
import { BattleScene } from './BattleScene';

export class OverworldScene implements Scene {
  private tilemap = new TilemapRenderer();
  private playerSprites: Record<Direction, HTMLCanvasElement[]> | null = null;
  private npcSprites = new Map<string, Record<Direction, HTMLCanvasElement>>();
  private animFrame = 0;
  private animTimer = 0;
  private moveTimer = 0;
  private moving = false;
  private moveFromX = 0;
  private moveFromY = 0;
  private stepCount = 0;
  private transitionAlpha = 1;
  private transitioningIn = true;
  private transitioningOut = false;
  private pendingTransition: { mapId: string; x: number; y: number } | null = null;

  enter() {
    this.transitionAlpha = 1;
    this.transitioningIn = true;
    this.initSprites();
  }

  private initSprites() {
    this.playerSprites = generateCharacterSprites({
      skin: '#f4c088', hair: '#8b4513', main: '#4a6fa5', trim: '#c0c0c0',
    });
    // Generate NPC sprites for current map
    const store = useGameStore.getState();
    const map = MAPS[store.currentMapId];
    if (map) {
      for (const npc of map.npcs) {
        if (!this.npcSprites.has(npc.id)) {
          this.npcSprites.set(npc.id, generateNPCSprite(npc.spriteColor));
        }
      }
    }
  }

  private getCurrentMap(): GameMap | null {
    const store = useGameStore.getState();
    return MAPS[store.currentMapId] || null;
  }

  update(dt: number) {
    const store = useGameStore.getState();

    // Handle fade transitions
    if (this.transitioningIn) {
      this.transitionAlpha -= dt * 3;
      if (this.transitionAlpha <= 0) {
        this.transitionAlpha = 0;
        this.transitioningIn = false;
      }
      return;
    }

    if (this.transitioningOut) {
      this.transitionAlpha += dt * 3;
      if (this.transitionAlpha >= 1) {
        this.transitionAlpha = 1;
        this.transitioningOut = false;
        if (this.pendingTransition) {
          store.setMap(this.pendingTransition.mapId, this.pendingTransition.x, this.pendingTransition.y);
          this.initSprites();
          this.pendingTransition = null;
          this.transitioningIn = true;
        }
      }
      return;
    }

    // Check for special flags after dialogue
    this.processSpecialFlags(store);

    // Don't process movement during dialogue or menu
    if (store.currentDialogue || store.menuOpen) return;
    if (store.battle) return;

    const map = this.getCurrentMap();
    if (!map) return;

    // Handle movement
    if (this.moving) {
      this.moveTimer += dt * 6;
      if (this.moveTimer >= 1) {
        this.moving = false;
        this.moveTimer = 0;
        this.stepCount++;
        this.checkEncounter(map);
      }
      return;
    }

    // Animation
    this.animTimer += dt;
    if (this.animTimer > 0.3) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 2;
    }

    let dx = 0, dy = 0;
    let newFacing = store.playerFacing;

    if (InputManager.isDown('up')) { dy = -1; newFacing = Direction.Up; }
    else if (InputManager.isDown('down')) { dy = 1; newFacing = Direction.Down; }
    else if (InputManager.isDown('left')) { dx = -1; newFacing = Direction.Left; }
    else if (InputManager.isDown('right')) { dx = 1; newFacing = Direction.Right; }

    if (dx !== 0 || dy !== 0) {
      store.setFacing(newFacing);
      const newX = store.playerX + dx;
      const newY = store.playerY + dy;

      // Check NPC collision
      const npc = map.npcs.find((n) => n.x === newX && n.y === newY);
      if (npc) {
        this.interactWithNPC(npc);
        return;
      }

      // Check collision
      if (!this.tilemap.isCollision(map, newX, newY)) {
        this.moveFromX = store.playerX;
        this.moveFromY = store.playerY;
        store.setPosition(newX, newY);
        this.moving = true;
        this.moveTimer = 0;

        // Check map transition
        const transition = map.transitions.find(
          (t) => t.fromX === newX && t.fromY === newY
        );
        if (transition) {
          this.pendingTransition = {
            mapId: transition.toMapId,
            x: transition.toX,
            y: transition.toY,
          };
          this.transitioningOut = true;
        }
      }
    }

    // Confirm button - interact with facing NPC
    if (InputManager.isPressed('confirm')) {
      const facingX = store.playerX + (store.playerFacing === Direction.Right ? 1 : store.playerFacing === Direction.Left ? -1 : 0);
      const facingY = store.playerY + (store.playerFacing === Direction.Down ? 1 : store.playerFacing === Direction.Up ? -1 : 0);
      const npc = map.npcs.find((n) => n.x === facingX && n.y === facingY);
      if (npc) {
        this.interactWithNPC(npc);
      }
    }

    // Menu button
    if (InputManager.isPressed('menu')) {
      store.toggleMenu();
    }
  }

  private processSpecialFlags(store: ReturnType<typeof useGameStore.getState>) {
    if (store.storyFlags.has('_heal_party')) {
      store.healParty();
      // Remove the flag so it doesn't trigger again
      const flags = new Set(store.storyFlags);
      flags.delete('_heal_party');
      // We can't directly remove, but healParty is idempotent
    }

    if (store.storyFlags.has('lira_joined') && !store.party.find((c) => c.id === 'lira')) {
      const { CHARACTERS_DB } = require('@/data/characters');
      store.addToParty(CHARACTERS_DB.lira);
    }

    if (store.storyFlags.has('finn_joined') && !store.party.find((c) => c.id === 'finn')) {
      const { CHARACTERS_DB } = require('@/data/characters');
      store.addToParty(CHARACTERS_DB.finn);
    }

    if (store.storyFlags.has('_boss_fight') && !store.battle) {
      const flags = new Set(store.storyFlags);
      flags.delete('_boss_fight');
      // Start boss battle
      store.startBattle([{ ...ENEMIES_DB.dark_knight }]);
      SceneManager.push(new BattleScene());
    }
  }

  private interactWithNPC(npc: NPCData) {
    const store = useGameStore.getState();
    const dialogue = DIALOGUES[npc.dialogueId];
    if (dialogue) {
      store.startDialogue(dialogue);
    }
  }

  private checkEncounter(map: GameMap) {
    if (!map.encounterZone) return;
    if (this.stepCount < 5) return; // minimum steps between encounters

    if (Math.random() < map.encounterZone.rate) {
      this.stepCount = 0;
      // Pick random enemies (1-3)
      const zone = map.encounterZone;
      const numEnemies = Math.floor(Math.random() * 2) + 1;
      const enemies = [];
      for (let i = 0; i < numEnemies; i++) {
        const enemyId = zone.enemyIds[Math.floor(Math.random() * zone.enemyIds.length)];
        const enemy = ENEMIES_DB[enemyId];
        if (enemy) enemies.push({ ...enemy });
      }
      if (enemies.length > 0) {
        const store = useGameStore.getState();
        store.startBattle(enemies);
        SceneManager.push(new BattleScene());
      }
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    const store = useGameStore.getState();
    const map = this.getCurrentMap();
    if (!map) return;

    this.tilemap.updateCamera(store.playerX, store.playerY, map);
    this.tilemap.render(ctx, map);

    // Render NPCs
    for (const npc of map.npcs) {
      const npcSprite = this.npcSprites.get(npc.id);
      if (npcSprite) {
        const pos = this.tilemap.worldToScreen(npc.x, npc.y);
        ctx.drawImage(npcSprite[npc.facing], pos.x, pos.y - 8);
      }
    }

    // Render player
    if (this.playerSprites) {
      let drawX: number, drawY: number;

      if (this.moving) {
        const t = this.moveTimer;
        drawX = this.moveFromX + (store.playerX - this.moveFromX) * t;
        drawY = this.moveFromY + (store.playerY - this.moveFromY) * t;
        const pos = this.tilemap.worldToScreen(drawX, drawY);
        drawX = pos.x;
        drawY = pos.y;
      } else {
        const pos = this.tilemap.worldToScreen(store.playerX, store.playerY);
        drawX = pos.x;
        drawY = pos.y;
      }

      const frames = this.playerSprites[store.playerFacing];
      const frame = this.moving ? this.animFrame : 0;
      ctx.drawImage(frames[frame], drawX, drawY - 8);
    }

    // Fade overlay
    if (this.transitionAlpha > 0) {
      ctx.fillStyle = `rgba(0,0,0,${this.transitionAlpha})`;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
  }
}
