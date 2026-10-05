import { DIALOGUES } from '@/data/dialogues';
import { ITEMS } from '@/data/items';
import { MAPS } from '@/data/maps';
import { Sound } from '@/engine/audio';
import { GAME_HEIGHT, GAME_WIDTH, TILE } from '@/engine/constants';
import { Clock, GameLoop } from '@/engine/GameLoop';
import { Input, type Button } from '@/engine/InputManager';
import { SceneManager, type Scene } from '@/engine/SceneManager';
import { session } from '@/engine/session';
import { makeCanvas, hash2 } from '@/gfx/canvas';
import { drawShadow, getSheet, walkFrame } from '@/gfx/characters';
import { img } from '@/engine/assets';
import { drawText, measureText } from '@/gfx/font';
import { chestSprite, drawWaterGlints, pedestalSprite, signSprite, torchFlame } from '@/gfx/tiles';
import { COLORS, drawWindow } from '@/gfx/ui';
import { game } from '@/store/gameStore';
import { checkCondition } from '@/systems/conditions';
import { Direction, type BattleSetup, type DialogueAction, type MapDef, type MapObjectDef, type NpcDef } from '@/types';
import { getMapView, type MapView } from '@/world/MapView';
import { BattleScene, type BattleResult } from './BattleScene';
import { DialogueScene, type DialogueHost } from './DialogueScene';
import { EncounterScene } from './EncounterScene';
import { EndingScene } from './EndingScene';
import { MenuScene } from './MenuScene';
import { ShopScene } from './ShopScene';

const DELTA: Record<Direction, [number, number]> = {
  [Direction.Up]: [0, -1],
  [Direction.Down]: [0, 1],
  [Direction.Left]: [-1, 0],
  [Direction.Right]: [1, 0],
};

const DIR_BUTTON: Record<Direction, Button> = {
  [Direction.Up]: 'up',
  [Direction.Down]: 'down',
  [Direction.Left]: 'left',
  [Direction.Right]: 'right',
};

const OPPOSITE: Record<Direction, Direction> = {
  [Direction.Up]: Direction.Down,
  [Direction.Down]: Direction.Up,
  [Direction.Left]: Direction.Right,
  [Direction.Right]: Direction.Left,
};

const WALK_SPEED = 4.2;
const DASH_SPEED = 7.5;
const NPC_SPEED = 2.4;

interface Mover {
  x: number;
  y: number;
  fromX: number;
  fromY: number;
  t: number;
  moving: boolean;
  facing: Direction;
  steps: number;
}

interface NpcState extends Mover {
  def: NpcDef;
  wanderTimer: number;
  talking: boolean;
}

interface Firefly {
  x: number;
  y: number;
  phase: number;
  speed: number;
}

export const INN_SPOT = { map: 'millbrook', x: 4, y: 14, facing: Direction.Down };

export class OverworldScene implements Scene, DialogueHost {
  readonly opaque = true;
  private map!: MapDef;
  private view!: MapView;
  private player!: Mover;
  private npcs: NpcState[] = [];
  private stepsToEncounter = 0;
  private bannerTime = 0;
  private turnHold = 0;
  private bumpArmed = true;
  private busy = false;
  private camX = 0;
  private camY = 0;
  private fireflies: Firefly[] = [];
  private light: [HTMLCanvasElement, CanvasRenderingContext2D] | null = null;

  enter() {
    session.playing = true;
    const s = game();
    this.player = { x: s.x, y: s.y, fromX: s.x, fromY: s.y, t: 0, moving: false, facing: s.facing, steps: 0 };
    this.loadMap(s.mapId);
    this.bannerTime = 2.6;
  }

  resume() {
    Sound.playMusic(this.map.music);
  }

  // -------------------------------------------------------------------------
  // Map loading
  // -------------------------------------------------------------------------

  private loadMap(id: string) {
    this.map = MAPS[id];
    this.view = getMapView(this.map);
    this.npcs = this.map.npcs.map((def) => ({
      def,
      x: def.x,
      y: def.y,
      fromX: def.x,
      fromY: def.y,
      t: 0,
      moving: false,
      facing: def.facing,
      steps: 0,
      wanderTimer: 1 + Math.random() * 3,
      talking: false,
    }));
    this.resetEncounterSteps();
    this.fireflies =
      this.map.theme === 'forest'
        ? Array.from({ length: 14 }, (_, i) => ({
            x: hash2(i, 1, 3) * GAME_WIDTH,
            y: hash2(i, 2, 3) * GAME_HEIGHT,
            phase: hash2(i, 3, 3) * 10,
            speed: 4 + hash2(i, 4, 3) * 6,
          }))
        : [];
    Sound.playMusic(this.map.music);
  }

  private resetEncounterSteps() {
    const enc = this.map.encounters;
    if (!enc) return;
    const [min, max] = enc.steps;
    this.stepsToEncounter = min + Math.floor(Math.random() * (max - min + 1));
  }

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  private visibleNpcs() {
    return this.npcs.filter((n) => !n.def.hideWhen || !checkCondition(n.def.hideWhen, game().flags));
  }

  private objectAt(x: number, y: number): MapObjectDef | undefined {
    return this.map.objects.find((o) => o.x === x && o.y === y);
  }

  private npcAt(x: number, y: number): NpcState | undefined {
    return this.visibleNpcs().find((n) => (n.x === x && n.y === y) || (n.moving && n.fromX === x && n.fromY === y));
  }

  private blocked(x: number, y: number, ignoreNpc?: NpcState) {
    if (this.view.isSolid(x, y)) return true;
    if (this.objectAt(x, y)) return true;
    const npc = this.npcAt(x, y);
    return !!npc && npc !== ignoreNpc;
  }

  private chestFlag(o: MapObjectDef) {
    return `chest:${this.map.id}:${o.id}`;
  }

  // -------------------------------------------------------------------------
  // Update
  // -------------------------------------------------------------------------

  update(dt: number) {
    if (this.bannerTime > 0) this.bannerTime -= dt;
    this.updateNpcs(dt);
    if (this.busy) return;
    this.updatePlayer(dt);
  }

  /** Direction being held, or tapped this frame (a quick tap still turns the player). */
  private heldDirection(): Direction | null {
    for (const dir of [Direction.Up, Direction.Down, Direction.Left, Direction.Right]) {
      const b = DIR_BUTTON[dir];
      if (Input.isDown(b) || Input.isPressed(b)) return dir;
    }
    return null;
  }

  private updatePlayer(dt: number) {
    const p = this.player;
    const dash = Input.isDown('cancel') || Input.isDown('dash');
    const speed = dash ? DASH_SPEED : WALK_SPEED;

    if (p.moving) {
      p.t += dt * speed;
      if (p.t < 1) return;
      p.moving = false;
      p.t = 0;
      p.steps++;
      game().setPosition(p.x, p.y);
      if (this.onArrive()) return;
    }

    const dir = this.heldDirection();
    if (!dir) {
      this.bumpArmed = true;
      this.turnHold = 0;
    }

    if (Input.isPressed('menu')) {
      Sound.sfx('confirm');
      SceneManager.push(new MenuScene());
      return;
    }

    if (Input.isPressed('confirm')) {
      this.interact();
      return;
    }

    if (!dir) return;
    if (dir !== p.facing) {
      p.facing = dir;
      game().setFacing(dir);
      this.bumpArmed = true;
      // A short tap just turns; holding walks.
      this.turnHold = 0.06;
      return;
    }
    if (this.turnHold > 0) {
      this.turnHold -= dt;
      if (!Input.isDown(DIR_BUTTON[dir])) return;
      if (this.turnHold > 0) return;
    }

    const [dx, dy] = DELTA[dir];
    const nx = p.x + dx;
    const ny = p.y + dy;
    const exit = this.map.exits.find((e) => e.x === nx && e.y === ny);
    if (exit && !checkCondition(exit.when, game().flags)) {
      if (this.bumpArmed && exit.lockedText) {
        this.bumpArmed = false;
        SceneManager.push(DialogueScene.message(exit.lockedText, undefined, { top: this.playerScreenY() > 92 }));
      }
      return;
    }
    if (this.blocked(nx, ny)) return;
    p.fromX = p.x;
    p.fromY = p.y;
    p.x = nx;
    p.y = ny;
    p.moving = true;
    p.t = 0;
  }

  /** Returns true if arriving triggered something that takes over. */
  private onArrive(): boolean {
    const p = this.player;
    const exit = this.map.exits.find((e) => e.x === p.x && e.y === p.y);
    if (exit && checkCondition(exit.when, game().flags)) {
      this.busy = true;
      SceneManager.fade({
        midpoint: () => {
          game().setMap(exit.to, exit.tx, exit.ty, exit.facing);
          this.player = { x: exit.tx, y: exit.ty, fromX: exit.tx, fromY: exit.ty, t: 0, moving: false, facing: exit.facing, steps: 0 };
          this.loadMap(exit.to);
        },
        done: () => {
          this.busy = false;
          this.bannerTime = 2.6;
        },
      });
      return true;
    }

    const enc = this.map.encounters;
    if (enc && !enc.safe?.some((r) => p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h)) {
      this.stepsToEncounter--;
      if (this.stepsToEncounter <= 0) {
        this.resetEncounterSteps();
        const total = enc.groups.reduce((s, g) => s + g.weight, 0);
        let roll = Math.random() * total;
        const group = enc.groups.find((g) => (roll -= g.weight) <= 0) ?? enc.groups[0];
        this.startBattle({ enemies: group.enemies, backdrop: this.map.backdrop });
        return true;
      }
    }
    return false;
  }

  private updateNpcs(dt: number) {
    for (const n of this.visibleNpcs()) {
      if (n.moving) {
        n.t += dt * NPC_SPEED;
        if (n.t >= 1) {
          n.moving = false;
          n.t = 0;
          n.steps++;
        }
        continue;
      }
      if (!n.def.wander || n.talking || SceneManager.current !== this) continue;
      n.wanderTimer -= dt;
      if (n.wanderTimer > 0) continue;
      n.wanderTimer = 1.5 + Math.random() * 3;
      const dirs = [Direction.Up, Direction.Down, Direction.Left, Direction.Right];
      const dir = dirs[Math.floor(Math.random() * 4)];
      n.facing = dir;
      const [dx, dy] = DELTA[dir];
      const nx = n.x + dx;
      const ny = n.y + dy;
      const far = Math.abs(nx - n.def.x) + Math.abs(ny - n.def.y) > n.def.wander;
      const p = this.player;
      const hitsPlayer = (nx === p.x && ny === p.y) || (p.moving && nx === p.fromX && ny === p.fromY);
      const onExit = this.map.exits.some((e) => e.x === nx && e.y === ny);
      if (far || hitsPlayer || onExit || this.blocked(nx, ny, n) || this.view.charAt(nx, ny) === '_') continue;
      n.fromX = n.x;
      n.fromY = n.y;
      n.x = nx;
      n.y = ny;
      n.moving = true;
    }
  }

  // -------------------------------------------------------------------------
  // Interaction
  // -------------------------------------------------------------------------

  private facedTile(): [number, number] {
    const [dx, dy] = DELTA[this.player.facing];
    return [this.player.x + dx, this.player.y + dy];
  }

  private interactTarget(): NpcState | MapObjectDef | null {
    const [fx, fy] = this.facedTile();
    const npc = this.visibleNpcs().find((n) => n.x === fx && n.y === fy && !n.moving);
    if (npc) return npc;
    return this.objectAt(fx, fy) ?? null;
  }

  private playerScreenY() {
    return this.player.y * TILE - this.camY;
  }

  private interact() {
    const target = this.interactTarget();
    if (!target) return;
    const top = this.playerScreenY() > 92;
    if ('def' in target) {
      const flags = game().flags;
      const entry = target.def.talk.find((t) => checkCondition(t.when, flags));
      const script = entry ? DIALOGUES[entry.dialogue] : undefined;
      if (!script) return;
      target.facing = OPPOSITE[this.player.facing];
      target.talking = true;
      SceneManager.push(
        new DialogueScene(script, this, { top }, () => {
          target.talking = false;
          if (!target.def.wander) target.facing = target.def.facing;
        }),
      );
      return;
    }
    const o = target;
    if (o.kind === 'sign') {
      SceneManager.push(DialogueScene.message(o.text ?? '', undefined, { top }));
    } else if (o.kind === 'chest') {
      const flag = this.chestFlag(o);
      if (game().flags[flag] || !o.item) {
        SceneManager.push(DialogueScene.message('The chest is empty.', undefined, { top }));
        return;
      }
      game().setFlag(flag);
      game().addItem(o.item.id, o.item.quantity);
      Sound.sfx('chest');
      const name = ITEMS[o.item.id]?.name ?? o.item.id;
      const qty = o.item.quantity > 1 ? ` x${o.item.quantity}` : '';
      SceneManager.push(DialogueScene.message(`Found ${name}${qty}!`, undefined, { top }));
    } else if (o.kind === 'pedestal') {
      const text = game().flags.boss_defeated
        ? 'An empty stone pedestal. The air in here feels lighter now.'
        : 'The Crystal of Light rests on the pedestal, pulsing with a faint, troubled glow.';
      SceneManager.push(DialogueScene.message(text, undefined, { top }));
    }
  }

  // DialogueHost
  runAction(action: DialogueAction, done: () => void) {
    const s = game();
    switch (action.type) {
      case 'setFlag':
        s.setFlag(action.flag);
        done();
        break;
      case 'giveItem':
        s.addItem(action.itemId, action.quantity ?? 1);
        Sound.sfx('chest');
        done();
        break;
      case 'join':
        s.joinParty(action.characterId);
        s.setFlag(`${action.characterId}_joined`);
        Sound.playJingle('fanfare');
        done();
        break;
      case 'heal':
        SceneManager.fade({
          out: 0.7,
          in: 0.7,
          midpoint: () => {
            game().healAll();
            Sound.playJingle('rest');
          },
          done,
        });
        break;
      case 'shop':
        SceneManager.push(new ShopScene(action.shopId));
        break;
      case 'battle':
        this.startBattle(action.battle);
        break;
      case 'ending':
        Sound.stopMusic();
        SceneManager.fade({
          color: '#ffffff',
          out: 1.4,
          in: 1,
          midpoint: () => {
            SceneManager.clear();
            SceneManager.push(new EndingScene());
          },
        });
        break;
    }
  }

  // -------------------------------------------------------------------------
  // Battles
  // -------------------------------------------------------------------------

  private startBattle(setup: BattleSetup) {
    const snapshot = GameLoop.snapshot();
    Sound.sfx('encounter');
    Sound.playMusic(setup.music ?? 'battle');
    const full: BattleSetup = { ...setup, backdrop: setup.backdrop ?? this.map.backdrop };
    SceneManager.push(
      new EncounterScene(snapshot, !!setup.boss, () => {
        SceneManager.replace(new BattleScene(full, (result) => this.onBattleEnd(result, full)));
      }),
    );
  }

  private onBattleEnd(result: BattleResult, setup: BattleSetup) {
    const s = game();
    if (result === 'victory' && setup.victory) {
      setup.victory.flags?.forEach((f) => s.setFlag(f));
      const script = setup.victory.dialogue ? DIALOGUES[setup.victory.dialogue] : undefined;
      if (script) SceneManager.push(new DialogueScene(script, this));
    } else if (result === 'defeat') {
      const lost = Math.floor(s.gold / 2);
      s.addGold(-lost);
      s.healAll();
      s.setMap(INN_SPOT.map, INN_SPOT.x, INN_SPOT.y, INN_SPOT.facing);
      this.player = { ...INN_SPOT, fromX: INN_SPOT.x, fromY: INN_SPOT.y, t: 0, moving: false, steps: 0 };
      this.loadMap(INN_SPOT.map);
      SceneManager.push(
        new DialogueScene(
          {
            id: 'wake',
            start: 'a',
            lines: {
              a: {
                speaker: 'Mae',
                text: `A hunter found you all out cold and carried you back here. Rest up, dear.${lost > 0 ? ` (Lost ${lost} gold.)` : ''}`,
              },
            },
          },
          this,
          { top: true },
        ),
      );
    }
  }

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  private moverPos(m: Mover): [number, number] {
    const t = m.moving ? m.t : 1;
    return [(m.fromX + (m.x - m.fromX) * t) * TILE, (m.fromY + (m.y - m.fromY) * t) * TILE];
  }

  private moverFrame(m: Mover, look: string) {
    const sheet = getSheet(look);
    if (sheet.idle) return sheet.idle[Math.floor(Clock.time * 6) % sheet.idle.length];
    if (!m.moving) return sheet.frames[m.facing][0];
    const phase = m.steps * 2 + (m.t < 0.5 ? 1 : 2);
    return walkFrame(sheet, m.facing, phase);
  }

  /** Draw a character with its feet on the tile at (x, y); big sprites are centred on it. */
  private drawMover(ctx: CanvasRenderingContext2D, frame: HTMLCanvasElement, x: number, y: number) {
    const fx = Math.round(x + (TILE - frame.width) / 2);
    const fy = Math.round(y + TILE - frame.height);
    drawShadow(ctx, Math.round(x) + 8, Math.round(y) + 15, Math.min(28, Math.max(12, Math.round(frame.width * 0.4))));
    ctx.drawImage(frame, fx, fy);
  }

  render(ctx: CanvasRenderingContext2D) {
    const [ppx, ppy] = this.moverPos(this.player);
    const mapW = this.view.w * TILE;
    const mapH = this.view.h * TILE;
    this.camX = Math.round(Math.max(0, Math.min(mapW - GAME_WIDTH, ppx + 8 - GAME_WIDTH / 2)));
    this.camY = Math.round(Math.max(0, Math.min(mapH - GAME_HEIGHT, ppy + 8 - GAME_HEIGHT / 2)));
    const cx = this.camX;
    const cy = this.camY;

    ctx.drawImage(this.view.ground, cx, cy, GAME_WIDTH, GAME_HEIGHT, 0, 0, GAME_WIDTH, GAME_HEIGHT);

    for (const [tx, ty] of this.view.water) {
      const sx = tx * TILE - cx;
      const sy = ty * TILE - cy;
      if (sx > -TILE && sy > -TILE && sx < GAME_WIDTH && sy < GAME_HEIGHT) drawWaterGlints(ctx, sx, sy, tx, ty, Clock.time);
    }

    // Depth-sorted sprites
    const draw: { y: number; fn: () => void }[] = [];
    for (const prop of this.view.tall) {
      const sx = prop.x - cx;
      const sy = prop.y - cy;
      if (sx < -32 || sy < -40 || sx > GAME_WIDTH || sy > GAME_HEIGHT) continue;
      draw.push({ y: prop.baseY, fn: () => ctx.drawImage(prop.sprite, sx, sy) });
    }
    for (const o of this.map.objects) {
      const sx = o.x * TILE - cx;
      const sy = o.y * TILE - cy;
      let sprite: HTMLCanvasElement;
      if (o.kind === 'chest') sprite = chestSprite(!!game().flags[this.chestFlag(o)]);
      else if (o.kind === 'sign') sprite = signSprite();
      else sprite = pedestalSprite(!game().flags.boss_defeated);
      draw.push({ y: o.y * TILE + TILE - 1, fn: () => ctx.drawImage(sprite, sx, sy + TILE - sprite.height) });
    }
    for (const n of this.visibleNpcs()) {
      const [nx, ny] = this.moverPos(n);
      const frame = this.moverFrame(n, n.def.look);
      draw.push({ y: ny + TILE, fn: () => this.drawMover(ctx, frame, nx - cx, ny - cy) });
    }
    const leader = game().party[0]?.look ?? 'kael';
    const pFrame = this.moverFrame(this.player, leader);
    draw.push({ y: ppy + TILE + 0.5, fn: () => this.drawMover(ctx, pFrame, ppx - cx, ppy - cy) });
    draw.sort((a, b) => a.y - b.y);
    for (const d of draw) d.fn();

    for (const [tx, ty] of this.view.torches) torchFlame(ctx, tx * TILE - cx, ty * TILE - cy, Clock.time + tx);

    if (this.map.theme === 'cave') this.renderLighting(ctx, ppx - cx + 8, ppy - cy + 6);
    if (this.fireflies.length) this.renderFireflies(ctx);

    // "Talk" bubble over whatever the player is facing
    if (!this.player.moving && SceneManager.current === this && !this.busy) {
      const target = this.interactTarget();
      if (target) {
        const isNpc = 'def' in target;
        const [bx, by] = isNpc ? this.moverPos(target) : [target.x * TILE, target.y * TILE];
        const tall = isNpc ? this.moverFrame(target, target.def.look).height - TILE : 0;
        this.renderBubble(ctx, bx - cx + 8, by - cy - 4 - tall, isNpc);
      }
    }

    if (this.bannerTime > 0) this.renderBanner(ctx);
  }

  /** The pack's speech-bubble emote over whoever (or whatever) the player is facing. */
  private renderBubble(ctx: CanvasRenderingContext2D, x: number, y: number, talk: boolean) {
    const bob = Math.round(Math.sin(Clock.time * 5) * 1);
    const icon = img(talk ? 'ui/emote-talk' : 'ui/emote-alert');
    ctx.drawImage(icon, Math.round(x - icon.width / 2), Math.round(y - icon.height + bob));
  }

  private renderBanner(ctx: CanvasRenderingContext2D) {
    const t = this.bannerTime;
    const slide = t > 2.3 ? (2.6 - t) / 0.3 : t < 0.3 ? t / 0.3 : 1;
    const w = measureText(this.map.name) + 32;
    const y = Math.round(-26 + slide * 34);
    drawWindow(ctx, Math.floor((GAME_WIDTH - w) / 2), y, w, 22);
    drawText(ctx, this.map.name, GAME_WIDTH / 2, y + 7, COLORS.text, { align: 'center' });
  }

  private renderFireflies(ctx: CanvasRenderingContext2D) {
    const t = Clock.time;
    for (const f of this.fireflies) {
      const x = (((f.x + Math.sin(t * 0.5 + f.phase) * 20 - this.camX * 0.3) % GAME_WIDTH) + GAME_WIDTH) % GAME_WIDTH;
      const y = (((f.y + Math.cos(t * 0.4 + f.phase) * 14 - t * f.speed) % GAME_HEIGHT) + GAME_HEIGHT) % GAME_HEIGHT;
      const glow = Math.sin(t * 3 + f.phase);
      if (glow < -0.2) continue;
      ctx.fillStyle = glow > 0.6 ? '#fbffc0' : '#c8f070';
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      if (glow > 0.6) {
        ctx.globalAlpha = 0.35;
        ctx.fillRect(Math.round(x) - 1, Math.round(y), 3, 1);
        ctx.fillRect(Math.round(x), Math.round(y) - 1, 1, 3);
        ctx.globalAlpha = 1;
      }
    }
  }

  /** Half-resolution light map so the light falls off in chunky pixel steps. */
  private renderLighting(ctx: CanvasRenderingContext2D, px: number, py: number) {
    if (!this.light) this.light = makeCanvas(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    const [lc, lctx] = this.light;
    lctx.globalCompositeOperation = 'source-over';
    lctx.clearRect(0, 0, lc.width, lc.height);
    lctx.fillStyle = 'rgba(8,2,20,0.84)';
    lctx.fillRect(0, 0, lc.width, lc.height);
    lctx.globalCompositeOperation = 'destination-out';
    const hole = (x: number, y: number, r: number) => {
      const steps = [
        [1, 0.3],
        [0.78, 0.55],
        [0.56, 0.8],
        [0.36, 1],
      ];
      for (const [k, a] of steps) {
        lctx.globalAlpha = a;
        lctx.beginPath();
        lctx.arc(Math.round(x / 2), Math.round(y / 2), (r * k) / 2, 0, Math.PI * 2);
        lctx.fill();
      }
      lctx.globalAlpha = 1;
    };
    lctx.fillStyle = '#000';
    const flicker = Math.sin(Clock.time * 13) * 1.5 + Math.sin(Clock.time * 7.3) * 1.5;
    hole(px, py, 64 + flicker);
    for (const [tx, ty] of this.view.torches) hole(tx * TILE - this.camX + 8, ty * TILE - this.camY + 8, 52 + flicker);
    for (const [tx, ty] of this.view.crystals) hole(tx * TILE - this.camX + 8, ty * TILE - this.camY + 6, 30);
    if (!game().flags.boss_defeated) {
      const ped = this.map.objects.find((o) => o.kind === 'pedestal');
      if (ped) hole(ped.x * TILE - this.camX + 8, ped.y * TILE - this.camY + 4, 40 + flicker);
    }
    ctx.drawImage(lc, 0, 0, GAME_WIDTH, GAME_HEIGHT);
  }
}
