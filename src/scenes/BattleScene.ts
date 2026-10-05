import { SKILL_COMMAND } from '@/data/characters';
import { ENEMIES } from '@/data/enemies';
import { ITEMS } from '@/data/items';
import { ATTACK, SKILLS } from '@/data/skills';
import { Sound, type SfxName } from '@/engine/audio';
import { GAME_HEIGHT, GAME_WIDTH } from '@/engine/constants';
import { Clock } from '@/engine/GameLoop';
import { Input } from '@/engine/InputManager';
import { SceneManager, type Scene } from '@/engine/SceneManager';
import { BATTLE_FIELD_H, getBackdrop } from '@/gfx/backdrops';
import { tintCanvas } from '@/gfx/canvas';
import { drawShadow, getSheet } from '@/gfx/characters';
import { createEffect, FloatingText, Particles, type BattleEffect } from '@/gfx/effects';
import { getEnemySprite, ENEMY_FRAMES } from '@/gfx/enemies';
import { drawText, measureText, wrapText } from '@/gfx/font';
import { COLORS, drawCursor, drawGauge, drawIcon, drawMoreArrow, drawWindow, hpColor } from '@/gfx/ui';
import { game } from '@/store/gameStore';
import {
  alive,
  chooseEnemyAction,
  endOfTurn,
  fromCharacter,
  fromEnemy,
  hasStatus,
  itemTargetsDead,
  itemUseful,
  labelEnemies,
  resolveItem,
  resolveSkill,
  rewards,
  runChance,
  startOfTurn,
  targetsAll,
  targetsOpponents,
  turnOrder,
  type Combatant,
  type Outcome,
} from '@/systems/battle';
import { sortedInventory } from '@/systems/inventory';
import { clampVitals, gainExp } from '@/systems/progression';
import { Direction, type BattleSetup, type Item, type Skill, type SkillFx, type StatusType } from '@/types';
import { cancelPressed, confirmPressed, ListCursor, scrollFor } from './common';

export type BattleResult = 'victory' | 'defeat' | 'escape';

type Flow = Generator<void, void, number>;

interface Unit {
  c: Combatant;
  side: 'party' | 'enemy';
  look?: string;
  enemyId?: string;
  homeX: number;
  homeY: number;
  offsetX: number;
  offsetY: number;
  flash: number;
  fade: number;
  glow: number;
  walking: boolean;
  lastRound: number;
}

type Action =
  | { type: 'skill'; skill: Skill; targets: Unit[] }
  | { type: 'item'; item: Item; targets: Unit[] }
  | { type: 'defend' }
  | { type: 'run' };

type MenuMode = 'command' | 'skill' | 'item' | 'target';

const PANEL_Y = BATTLE_FIELD_H;
const PARTY_SLOTS: [number, number][] = [
  [196, 86],
  [212, 113],
  [228, 140],
];
const ENEMY_SLOTS: Record<number, [number, number][]> = {
  1: [[74, 124]],
  2: [
    [50, 108],
    [104, 132],
  ],
  3: [
    [42, 102],
    [104, 108],
    [70, 140],
  ],
};

const FX_SOUND: Partial<Record<SkillFx, SfxName>> = {
  fire: 'fire',
  ice: 'ice',
  heal: 'heal',
  poison: 'poison',
  smoke: 'magic',
  shadow: 'magic',
  buff: 'defend',
  steal: 'steal',
  sonic: 'magic',
};

const STATUS_LABEL: Record<StatusType, string> = { poison: 'Poison', sleep: 'Sleep', defUp: 'DEF Up' };
const STATUS_ICON: Record<StatusType, string> = { poison: 'poison', sleep: 'sleep', defUp: 'defup' };

export class BattleScene implements Scene {
  readonly opaque = true;
  private party: Unit[] = [];
  private enemies: Unit[] = [];
  private flow: Flow;
  private particles = new Particles();
  private effects: BattleEffect[] = [];
  private numbers: FloatingText[] = [];
  private topMessage: string | null = null;
  private infoLines: string[] | null = null;
  private waitingConfirm = false;
  private introFade = 1;
  private result: BattleResult | null = null;
  private victoryPose = false;
  private round = 0;
  private bossEnraged = false;
  private enemyIds: string[];
  private ended = false;

  // menu state
  private active: Unit | null = null;
  private menu: MenuMode | null = null;
  private prevMenu: MenuMode = 'command';
  private cmdCursor = new ListCursor();
  private listCursor = new ListCursor(2);
  private listScroll = 0;
  private targetCursor = 0;
  private pending: { kind: 'skill'; skill: Skill } | { kind: 'item'; item: Item } | null = null;
  private chosen: Action | null = null;

  constructor(
    private setup: BattleSetup,
    private onEnd: (result: BattleResult) => void,
  ) {
    this.enemyIds = setup.enemies.filter((id) => ENEMIES[id]);
    this.flow = this.main();
  }

  enter() {
    const s = game();
    this.party = s.party.map((ch, i) => ({
      c: fromCharacter(ch),
      side: 'party' as const,
      look: ch.look,
      homeX: PARTY_SLOTS[i][0],
      homeY: PARTY_SLOTS[i][1],
      offsetX: 70,
      offsetY: 0,
      flash: 0,
      fade: 0,
      glow: 0,
      walking: false,
      lastRound: -1,
    }));
    const combatants = this.enemyIds.map((id, i) => fromEnemy(ENEMIES[id], i));
    labelEnemies(combatants);
    const slots = ENEMY_SLOTS[Math.min(3, combatants.length)] ?? ENEMY_SLOTS[3];
    this.enemies = combatants.map((c, i) => ({
      c,
      side: 'enemy' as const,
      enemyId: c.enemyId,
      homeX: slots[i % slots.length][0],
      homeY: slots[i % slots.length][1] + (ENEMIES[c.enemyId!]?.boss ? 6 : 0),
      offsetX: 0,
      offsetY: 0,
      flash: 0,
      fade: 0,
      glow: 0,
      walking: false,
      lastRound: -1,
    }));
  }

  private get speed() {
    return game().settings.battleSpeed === 'fast' ? 1.7 : 1;
  }

  // -------------------------------------------------------------------------
  // Coroutine helpers
  // -------------------------------------------------------------------------

  private *wait(seconds: number): Flow {
    let t = 0;
    while (t < seconds) t += (yield) * this.speed;
  }

  private *tween(unit: Unit, key: 'offsetX' | 'offsetY', to: number, seconds: number): Flow {
    const from = unit[key];
    let t = 0;
    while (t < seconds) {
      t += (yield) * this.speed;
      unit[key] = from + (to - from) * Math.min(1, t / seconds);
    }
  }

  private *showInfo(lines: string[]): Flow {
    this.infoLines = lines;
    this.waitingConfirm = true;
    while (this.waitingConfirm) yield;
    this.infoLines = null;
  }

  // -------------------------------------------------------------------------
  // Main flow
  // -------------------------------------------------------------------------

  private *main(): Flow {
    // fade in while the party marches on from the right
    let t = 0;
    while (t < 0.45) {
      const dt = yield;
      t += dt;
      this.introFade = Math.max(0, 1 - t / 0.35);
      for (const u of this.party) u.offsetX = 70 * (1 - Math.min(1, t / 0.45));
      for (const u of this.party) u.walking = true;
    }
    for (const u of this.party) {
      u.offsetX = 0;
      u.walking = false;
    }
    this.introFade = 0;
    this.topMessage = this.setup.boss ? `${this.enemies[0]?.c.name ?? 'A foe'} attacks!` : 'Monsters appear!';
    yield* this.wait(0.9);
    this.topMessage = null;

    while (!this.result) {
      this.round++;
      const all = [...this.party, ...this.enemies];
      const order = turnOrder(
        all.map((u) => u.c),
        Math.random,
      ).map((c) => all.find((u) => u.c === c)!);
      for (const unit of order) {
        if (this.result) break;
        if (!alive(unit.c)) continue;
        yield* this.takeTurn(unit);
        this.checkEnd();
      }
    }

    yield* this.finish();
  }

  private checkEnd() {
    if (this.result) return;
    if (this.enemies.every((u) => !alive(u.c))) this.result = 'victory';
    else if (this.party.every((u) => !alive(u.c))) this.result = 'defeat';
  }

  private *takeTurn(unit: Unit): Flow {
    const first = unit.lastRound !== this.round;
    unit.lastRound = this.round;
    let skip = false;
    let woke = false;
    if (first) ({ skip, woke } = startOfTurn(unit.c));
    else skip = hasStatus(unit.c, 'sleep');

    if (skip) {
      this.topMessage = woke ? `${unit.c.name} wakes up!` : `${unit.c.name} is asleep...`;
      const [x, y] = this.center(unit);
      if (!woke) this.particles.spawn({ x: x + 4, y: y - 10, vy: -12, vx: 6, shape: 'z', colors: ['#c8d8ff'], max: 0.8 });
      yield* this.wait(0.7);
      this.topMessage = null;
    } else if (unit.side === 'party') {
      yield* this.playerTurn(unit);
    } else {
      yield* this.enemyTurn(unit);
    }
    if (this.result) return;

    if (first) {
      const ticks = endOfTurn(unit.c);
      for (const o of ticks) {
        const [x, y] = this.center(unit);
        this.numbers.push(new FloatingText(String(o.amount), x, y - 6, '#a0f080'));
        this.effects.push(createEffect('poison', x, y, this.particles));
        Sound.sfx('poison');
        unit.flash = 0.25;
        yield* this.wait(0.55);
        if (o.killed) yield* this.handleDeath(unit);
      }
    }
    this.checkEnd();
  }

  private *playerTurn(unit: Unit): Flow {
    this.active = unit;
    yield* this.tween(unit, 'offsetX', -14, 0.12);
    this.chosen = null;
    this.menu = 'command';
    this.cmdCursor.index = 0;
    while (!this.chosen) yield;
    const action: Action = this.chosen;
    this.menu = null;
    yield* this.perform(unit, action);
    if (this.result !== 'escape') yield* this.tween(unit, 'offsetX', 0, 0.12);
    this.active = null;
  }

  private *enemyTurn(unit: Unit): Flow {
    const def = unit.enemyId ? ENEMIES[unit.enemyId] : undefined;
    if (def?.boss && !this.bossEnraged && unit.c.hp / unit.c.maxHp <= 0.6) {
      this.bossEnraged = true;
      this.topMessage = `${unit.c.name}'s aura darkens!`;
      Sound.sfx('magic');
      unit.glow = 1;
      yield* this.wait(1);
      this.topMessage = null;
    }
    yield* this.wait(0.25);
    const choice = chooseEnemyAction(
      unit.c,
      this.party.map((u) => u.c),
      Math.random,
    );
    if (!choice) return;
    const targets = choice.targets.map((c) => this.party.find((u) => u.c === c)!);
    yield* this.perform(unit, { type: 'skill', skill: choice.skill, targets });
  }

  // -------------------------------------------------------------------------
  // Performing actions
  // -------------------------------------------------------------------------

  private unitByKey(key: string) {
    return [...this.party, ...this.enemies].find((u) => u.c.key === key);
  }

  private *perform(unit: Unit, action: Action): Flow {
    if (action.type === 'defend') {
      unit.c.defending = true;
      this.topMessage = 'Defend';
      Sound.sfx('defend');
      const [x, y] = this.center(unit);
      this.effects.push(createEffect('buff', x, y, this.particles));
      yield* this.wait(0.6);
      this.topMessage = null;
      return;
    }

    if (action.type === 'run') {
      if (this.setup.canRun === false) {
        this.topMessage = "Can't escape!";
        Sound.sfx('error');
        yield* this.wait(0.8);
        this.topMessage = null;
        return;
      }
      const chance = runChance(
        this.party.map((u) => u.c),
        this.enemies.map((u) => u.c),
      );
      if (Math.random() < chance) {
        this.topMessage = 'Escaped!';
        Sound.sfx('run');
        for (const u of this.party) u.walking = true;
        let t = 0;
        while (t < 0.6) {
          t += yield;
          for (const u of this.party) if (alive(u.c)) u.offsetX = Math.min(80, u.offsetX + 4);
        }
        this.result = 'escape';
      } else {
        this.topMessage = "Couldn't escape!";
        Sound.sfx('error');
        yield* this.wait(0.8);
      }
      this.topMessage = null;
      return;
    }

    if (action.type === 'item') {
      const { item } = action;
      game().removeItem(item.id, 1);
      this.topMessage = item.name;
      yield* this.wait(0.25);
      for (const target of action.targets) {
        const [x, y] = this.center(target);
        this.effects.push(createEffect('heal', x, y, this.particles));
        Sound.sfx('heal');
        yield* this.wait(0.45);
        this.showOutcome(resolveItem(target.c, item));
      }
      yield* this.wait(0.7);
      this.topMessage = null;
      return;
    }

    const { skill } = action;
    if (skill.mpCost > 0) unit.c.mp = Math.max(0, unit.c.mp - skill.mpCost);
    if (unit.side === 'enemy') {
      for (let i = 0; i < 2; i++) {
        unit.flash = 0.1;
        yield* this.wait(0.14);
      }
    }
    if (skill.id !== 'attack') this.topMessage = skill.name;

    const magical = skill.kind === 'magical' || skill.kind === 'healing' || skill.fx === 'buff';
    if (magical) {
      unit.glow = 0.5;
      Sound.sfx('magic');
      yield* this.wait(0.35);
    } else if (unit.side === 'party') {
      unit.walking = true;
      yield* this.wait(0.12);
      unit.walking = false;
    }

    // effect on every target at once
    let longest = 0;
    for (const target of action.targets) {
      const [x, y] = this.center(target);
      const e = createEffect(skill.fx, x, y, this.particles);
      longest = Math.max(longest, e.duration);
      this.effects.push(e);
    }
    const snd = FX_SOUND[skill.fx];
    if (snd) Sound.sfx(snd);
    yield* this.wait(Math.min(0.35, longest * 0.6));

    const outcomes = resolveSkill(
      unit.c,
      action.targets.map((u) => u.c),
      skill,
      Math.random,
    );
    for (const o of outcomes) this.showOutcome(o);
    yield* this.wait(0.7);
    this.topMessage = null;

    for (const o of outcomes) {
      if (o.killed) {
        const u = this.unitByKey(o.targetKey);
        if (u) yield* this.handleDeath(u);
      }
    }
  }

  private showOutcome(o: Outcome) {
    const u = this.unitByKey(o.targetKey);
    if (!u) return;
    const [x, y] = this.center(u);
    const top = y - this.unitHeight(u) / 2 - 2;
    switch (o.kind) {
      case 'damage':
        this.numbers.push(new FloatingText(String(o.amount), x, top + 6, o.crit ? '#ffe060' : COLORS.damage));
        if (o.crit) this.numbers.push(new FloatingText('Critical!', x, top - 6, '#ffe060', 0.9));
        Sound.sfx(o.crit ? 'crit' : 'hit');
        u.flash = 0.3;
        break;
      case 'heal':
      case 'revive':
        this.numbers.push(new FloatingText(String(o.amount), x, top + 6, COLORS.heal));
        if (o.kind === 'revive') this.numbers.push(new FloatingText('Revived!', x, top - 6, COLORS.heal));
        break;
      case 'mp':
        this.numbers.push(new FloatingText(`${o.amount} MP`, x, top + 6, COLORS.mp));
        break;
      case 'miss':
        this.numbers.push(new FloatingText('Miss', x, top + 6, '#d0d0e0'));
        Sound.sfx('miss');
        break;
      case 'status':
        if (o.status) this.numbers.push(new FloatingText(STATUS_LABEL[o.status], x, top - 6, o.status === 'defUp' ? '#f8d860' : '#c8a8ff'));
        break;
      case 'cure':
        this.numbers.push(new FloatingText('Cured!', x, top + 6, COLORS.heal));
        break;
      case 'wake':
        this.numbers.push(new FloatingText('Awake!', x, top - 6, '#c8d8ff'));
        break;
      case 'steal':
        if (o.itemId) game().addItem(o.itemId, 1);
        if (o.gold) game().addGold(o.gold);
        this.topMessage = o.message ?? null;
        break;
      case 'nothing':
        if (o.message) this.topMessage = o.message;
        else this.numbers.push(new FloatingText('No effect', x, top + 6, '#d0d0e0'));
        break;
    }
  }

  private *handleDeath(u: Unit): Flow {
    if (u.side === 'enemy') {
      Sound.sfx('enemyDie');
      let t = 0;
      while (t < 0.5) {
        t += (yield) * this.speed;
        u.fade = Math.min(1, t / 0.5);
      }
    } else {
      this.numbers.push(new FloatingText('KO', this.center(u)[0], this.center(u)[1] - 14, COLORS.hpCrit));
      yield* this.wait(0.3);
    }
  }

  // -------------------------------------------------------------------------
  // Ending
  // -------------------------------------------------------------------------

  private syncParty() {
    const s = game();
    for (const u of this.party) {
      s.updateCharacter(u.c.key, (ch) => clampVitals({ ...ch, hp: u.c.hp, mp: u.c.mp }));
    }
  }

  private *finish(): Flow {
    const result = this.result!;
    if (result === 'victory') {
      Sound.playJingle('victory', false);
      this.victoryPose = true;
      this.syncParty();
      const s = game();
      const spoils = rewards(this.enemyIds, Math.random);
      s.addGold(spoils.gold);
      for (const id of spoils.items) s.addItem(id, 1);
      const lines: string[] = [`Got ${spoils.exp} EXP and ${spoils.gold} gold.`];
      for (const id of spoils.items) lines.push(`Found ${ITEMS[id]?.name ?? id}!`);
      const levelLines: string[] = [];
      for (const ch of game().party) {
        if (ch.hp <= 0) continue;
        const { char, levels } = gainExp(ch, spoils.exp);
        s.updateCharacter(ch.id, () => char);
        for (const l of levels) {
          levelLines.push(`${ch.name} reached level ${l.level}!`);
          for (const sk of l.learned) levelLines.push(`${ch.name} learned ${SKILLS[sk]?.name ?? sk}!`);
        }
        // reflect new maximums in the status window
        const u = this.party.find((p) => p.c.key === ch.id);
        if (u && levels.length) {
          const fresh = fromCharacter(char);
          u.c.hp = fresh.hp;
          u.c.maxHp = fresh.maxHp;
          u.c.mp = fresh.mp;
          u.c.maxMp = fresh.maxMp;
        }
      }
      yield* this.wait(0.6);
      yield* this.showInfo(lines);
      for (let i = 0; i < levelLines.length; i += 3) {
        if (i === 0) Sound.sfx('save');
        yield* this.showInfo(levelLines.slice(i, i + 3));
      }
    } else if (result === 'defeat') {
      Sound.playJingle('gameover', false);
      yield* this.wait(0.8);
      yield* this.showInfo(['The party has fallen...']);
    } else {
      this.syncParty();
      yield* this.wait(0.3);
    }

    this.ended = true;
    SceneManager.fade({
      color: result === 'defeat' ? '#200008' : '#000',
      out: result === 'defeat' ? 1 : 0.4,
      in: 0.4,
      midpoint: () => {
        SceneManager.remove(this);
        this.onEnd(result);
      },
    });
  }

  // -------------------------------------------------------------------------
  // Update & menus
  // -------------------------------------------------------------------------

  update(dt: number) {
    if (this.ended) return;
    if (this.menu) this.updateMenu();
    else if (this.waitingConfirm && (confirmPressed() || Input.isPressed('cancel'))) {
      Sound.sfx('cursor');
      this.waitingConfirm = false;
    }

    this.flow.next(dt);

    for (const u of [...this.party, ...this.enemies]) {
      u.flash = Math.max(0, u.flash - dt);
      u.glow = Math.max(0, u.glow - dt);
    }
    this.particles.update(dt);
    for (const e of this.effects) e.update(dt);
    this.effects = this.effects.filter((e) => e.t < e.duration);
    for (const n of this.numbers) n.update(dt);
    this.numbers = this.numbers.filter((n) => !n.done);
  }

  private commands(unit: Unit) {
    const cls = unit.c.characterClass ?? 'Warrior';
    return [
      { label: 'Attack', enabled: true },
      { label: SKILL_COMMAND[cls], enabled: this.skillsOf(unit).length > 0 },
      { label: 'Item', enabled: this.battleItems().length > 0 },
      { label: 'Defend', enabled: true },
      { label: 'Run', enabled: this.setup.canRun !== false },
    ];
  }

  private skillsOf(unit: Unit): Skill[] {
    const ch = game().party.find((c) => c.id === unit.c.key);
    return (ch?.skills ?? []).map((id) => SKILLS[id]).filter(Boolean);
  }

  private battleItems() {
    return sortedInventory(game().inventory).filter((e) => e.item.kind === 'consumable');
  }

  private attackSkill(unit: Unit): Skill {
    const fx: SkillFx = unit.c.characterClass === 'Mage' ? 'bash' : 'slash';
    return { ...ATTACK, fx };
  }

  /** Candidate targets for the pending skill/item. */
  private targetPool(): Unit[] {
    const p = this.pending;
    if (!p || !this.active) return [];
    if (p.kind === 'item') {
      return itemTargetsDead(p.item) ? this.party.filter((u) => !alive(u.c)) : this.party.filter((u) => alive(u.c));
    }
    const s = p.skill;
    if (s.target === 'self') return [this.active];
    if (targetsOpponents(s)) return this.enemies.filter((u) => alive(u.c)).sort((a, b) => a.homeX - b.homeX || a.homeY - b.homeY);
    if (s.target === 'deadAlly') return this.party.filter((u) => !alive(u.c));
    return this.party.filter((u) => alive(u.c));
  }

  private pendingIsAll() {
    return this.pending?.kind === 'skill' && targetsAll(this.pending.skill);
  }

  private beginTargeting(from: MenuMode) {
    this.prevMenu = from;
    const pool = this.targetPool();
    if (pool.length === 0) {
      Sound.sfx('error');
      return;
    }
    // default to the first enemy, or to the weakest ally for support actions
    this.targetCursor = 0;
    const p = this.pending;
    const support = p && (p.kind === 'item' || !targetsOpponents(p.skill));
    if (support && !this.pendingIsAll()) {
      let best = 0;
      pool.forEach((u, i) => {
        if (u.c.hp / u.c.maxHp < pool[best].c.hp / pool[best].c.maxHp) best = i;
      });
      this.targetCursor = best;
    }
    this.menu = 'target';
  }

  private updateMenu() {
    const unit = this.active;
    if (!unit) return;
    switch (this.menu) {
      case 'command': {
        const cmds = this.commands(unit);
        this.cmdCursor.update(cmds.length);
        if (confirmPressed()) {
          const cmd = cmds[this.cmdCursor.index];
          if (!cmd.enabled) {
            Sound.sfx('error');
            return;
          }
          Sound.sfx('confirm');
          switch (this.cmdCursor.index) {
            case 0:
              this.pending = { kind: 'skill', skill: this.attackSkill(unit) };
              this.beginTargeting('command');
              break;
            case 1:
              this.listCursor.index = 0;
              this.listScroll = 0;
              this.menu = 'skill';
              break;
            case 2:
              this.listCursor.index = 0;
              this.listScroll = 0;
              this.menu = 'item';
              break;
            case 3:
              this.chosen = { type: 'defend' };
              break;
            case 4:
              this.chosen = { type: 'run' };
              break;
          }
        }
        break;
      }
      case 'skill': {
        const skills = this.skillsOf(unit);
        this.listCursor.update(skills.length);
        this.listScroll = scrollFor(this.listCursor.index, this.listScroll, 4, 2);
        if (cancelPressed()) {
          Sound.sfx('cancel');
          this.menu = 'command';
        } else if (confirmPressed()) {
          const skill = skills[this.listCursor.index];
          if (!skill || unit.c.mp < skill.mpCost) {
            Sound.sfx('error');
            return;
          }
          Sound.sfx('confirm');
          this.pending = { kind: 'skill', skill };
          this.beginTargeting('skill');
        }
        break;
      }
      case 'item': {
        const items = this.battleItems();
        this.listCursor.update(items.length);
        this.listScroll = scrollFor(this.listCursor.index, this.listScroll, 4, 2);
        if (cancelPressed()) {
          Sound.sfx('cancel');
          this.menu = 'command';
        } else if (confirmPressed()) {
          const entry = items[this.listCursor.index];
          if (!entry) return;
          Sound.sfx('confirm');
          this.pending = { kind: 'item', item: entry.item };
          this.beginTargeting('item');
        }
        break;
      }
      case 'target': {
        const pool = this.targetPool();
        if (pool.length === 0) {
          this.menu = this.prevMenu;
          return;
        }
        if (!this.pendingIsAll()) {
          const prev = this.targetCursor;
          if (Input.isRepeat('down') || Input.isRepeat('right')) this.targetCursor = (this.targetCursor + 1) % pool.length;
          if (Input.isRepeat('up') || Input.isRepeat('left')) this.targetCursor = (this.targetCursor - 1 + pool.length) % pool.length;
          if (prev !== this.targetCursor) Sound.sfx('cursor');
        }
        this.targetCursor = Math.min(this.targetCursor, pool.length - 1);
        if (cancelPressed()) {
          Sound.sfx('cancel');
          this.menu = this.prevMenu;
        } else if (confirmPressed()) {
          const p = this.pending!;
          const targets = this.pendingIsAll() ? pool : [pool[this.targetCursor]];
          if (p.kind === 'item' && !itemUseful(targets[0].c, p.item)) {
            Sound.sfx('error');
            return;
          }
          Sound.sfx('confirm');
          this.chosen = p.kind === 'skill' ? { type: 'skill', skill: p.skill, targets } : { type: 'item', item: p.item, targets };
        }
        break;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  private unitHeight(u: Unit) {
    if (u.side === 'party') return 24;
    return getEnemySprite(u.enemyId ?? 'slime').height;
  }

  /** Visual centre of a unit (for effects and numbers). */
  private center(u: Unit): [number, number] {
    const h = this.unitHeight(u);
    const fly = u.enemyId === 'bat' ? -10 : 0;
    return [Math.round(u.homeX + u.offsetX), Math.round(u.homeY + u.offsetY - h / 2 + fly)];
  }

  private partySprite(u: Unit): HTMLCanvasElement {
    const sheet = getSheet(u.look ?? 'kael');
    if (!alive(u.c)) return sheet.ko;
    if (this.victoryPose) return sheet.frames[Direction.Down][0];
    if (u.walking) return sheet.frames[Direction.Left][Math.floor(Clock.time * 8) % 2 ? 1 : 2];
    if (u.c.hp / u.c.maxHp <= 0.25 || hasStatus(u.c, 'sleep')) return sheet.kneel;
    return sheet.frames[Direction.Left][0];
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.drawImage(getBackdrop(this.setup.backdrop ?? 'field'), 0, 0);
    const t = Clock.time;

    // enemies, back to front
    const enemies = [...this.enemies].sort((a, b) => a.homeY - b.homeY);
    enemies.forEach((u, i) => {
      if (u.fade >= 1) return;
      const frames = ENEMY_FRAMES[u.enemyId ?? ''] ?? 1;
      const frame = frames > 1 ? Math.floor(t * 7 + i) % frames : 0;
      const sprite = getEnemySprite(u.enemyId ?? 'slime', frame);
      const flying = u.enemyId === 'bat';
      const bob = flying ? Math.round(Math.sin(t * 4 + i) * 3) - 10 : Math.round(Math.sin(t * 2 + i * 1.7) * 1);
      const x = Math.round(u.homeX + u.offsetX - sprite.width / 2);
      const y = Math.round(u.homeY + u.offsetY - sprite.height + bob);
      drawShadow(ctx, Math.round(u.homeX), Math.round(u.homeY), Math.min(40, Math.round(sprite.width * 0.7)));
      if (u.fade > 0) {
        ctx.globalAlpha = 1 - u.fade;
        ctx.drawImage(tintCanvas(sprite, '#c03060'), x, y);
        ctx.globalAlpha = 1;
        return;
      }
      if (u.glow > 0) {
        const g = tintCanvas(sprite, '#b060ff');
        ctx.globalAlpha = 0.6;
        for (const [dx, dy] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ])
          ctx.drawImage(g, x + dx, y + dy);
        ctx.globalAlpha = 1;
      }
      const flashOn = u.flash > 0 && Math.floor(u.flash * 30) % 2 === 0;
      const shake = u.flash > 0.15 && u.side === 'enemy' ? Math.round(Math.sin(t * 80) * 2) : 0;
      ctx.drawImage(flashOn ? tintCanvas(sprite, '#ffffff') : sprite, x + shake, y);
      this.drawStatusIcons(ctx, u, x + sprite.width / 2, y - 8);
    });

    // party
    this.party.forEach((u) => {
      const sprite = this.partySprite(u);
      const hop = this.victoryPose && alive(u.c) ? -Math.abs(Math.round(Math.sin(t * 6 + u.homeY) * 4)) : 0;
      const x = Math.round(u.homeX + u.offsetX - sprite.width / 2);
      const y = Math.round(u.homeY + u.offsetY - sprite.height + hop);
      drawShadow(ctx, Math.round(u.homeX + u.offsetX), Math.round(u.homeY), 12);
      if (u.glow > 0 || u.c.defending) {
        const g = tintCanvas(sprite, u.c.defending ? '#78a8ff' : '#ffffff');
        ctx.globalAlpha = u.c.defending ? 0.5 : 0.8 * Math.abs(Math.sin(t * 20));
        for (const [dx, dy] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ])
          ctx.drawImage(g, x + dx, y + dy);
        ctx.globalAlpha = 1;
      }
      const flashOn = u.flash > 0 && Math.floor(u.flash * 30) % 2 === 0;
      const shake = u.flash > 0.15 ? Math.round(Math.sin(t * 80) * 2) : 0;
      ctx.drawImage(flashOn ? tintCanvas(sprite, '#ffffff') : sprite, x + shake, y);
    });

    for (const e of this.effects) e.render(ctx);
    this.particles.render(ctx);
    for (const n of this.numbers) n.render(ctx);

    this.renderTargetCursor(ctx);
    this.renderPanel(ctx);

    if (this.topMessage) {
      const w = Math.max(80, measureText(this.topMessage) + 24);
      drawWindow(ctx, Math.floor((GAME_WIDTH - w) / 2), 6, w, 22);
      drawText(ctx, this.topMessage, GAME_WIDTH / 2, 13, COLORS.text, { align: 'center' });
    }

    if (this.infoLines) {
      const lines = this.infoLines.flatMap((l) => wrapText(l, 220));
      const h = lines.length * 12 + 16;
      drawWindow(ctx, 8, 8, GAME_WIDTH - 16, h);
      lines.forEach((l, i) => drawText(ctx, l, 20, 15 + i * 12));
      drawMoreArrow(ctx, GAME_WIDTH - 26, 8 + h - 10);
    }

    if (this.introFade > 0) {
      ctx.globalAlpha = Math.round(this.introFade * 8) / 8;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      ctx.globalAlpha = 1;
    }
  }

  private drawStatusIcons(ctx: CanvasRenderingContext2D, u: Unit, cx: number, y: number) {
    const icons = u.c.statuses.map((s) => STATUS_ICON[s.type]);
    let x = Math.round(cx - icons.length * 4);
    for (const id of icons) {
      drawIcon(ctx, id, x, y);
      x += 8;
    }
  }

  private renderTargetCursor(ctx: CanvasRenderingContext2D) {
    if (this.menu !== 'target') return;
    const pool = this.targetPool();
    const list = this.pendingIsAll() ? pool : [pool[this.targetCursor]].filter(Boolean);
    const blink = this.pendingIsAll() && Math.floor(Clock.time * 8) % 2 === 0;
    if (blink) return;
    for (const u of list) {
      const h = this.unitHeight(u);
      const w = u.side === 'party' ? 16 : getEnemySprite(u.enemyId ?? 'slime').width;
      const [, cy] = this.center(u);
      drawCursor(ctx, u.homeX + u.offsetX - w / 2 - 1, cy + (h > 40 ? 0 : 2));
    }
    // help window naming the target
    const target = list[0];
    if (target) {
      const label = this.pendingIsAll() ? (target.side === 'enemy' ? 'All enemies' : 'All allies') : target.c.name;
      const w = measureText(label) + 24;
      drawWindow(ctx, Math.floor((GAME_WIDTH - w) / 2), 6, w, 22);
      drawText(ctx, label, GAME_WIDTH / 2, 13, COLORS.text, { align: 'center' });
    }
  }

  private renderPanel(ctx: CanvasRenderingContext2D) {
    const y = PANEL_Y;
    const h = GAME_HEIGHT - PANEL_Y;

    if (this.menu === 'skill' || this.menu === 'item') {
      this.renderList(ctx);
      return;
    }

    // left: commands or enemy roster
    drawWindow(ctx, 0, y, 92, h);
    if (this.menu === 'command' && this.active) {
      const cmds = this.commands(this.active);
      cmds.forEach((c, i) => drawText(ctx, c.label, 22, y + 8 + i * 12, c.enabled ? COLORS.text : COLORS.disabled));
      drawCursor(ctx, 20, y + 11 + this.cmdCursor.index * 12);
    } else {
      const names: string[] = [];
      for (const e of this.enemies) if (alive(e.c)) names.push(e.c.name);
      names.slice(0, 5).forEach((n, i) => drawText(ctx, n, 10, y + 8 + i * 12));
    }

    // right: party status
    drawWindow(ctx, 92, y, GAME_WIDTH - 92, h);
    this.party.forEach((u, i) => {
      const ry = y + 8 + i * 20;
      const isActive = u === this.active;
      const dead = !alive(u.c);
      drawText(ctx, u.c.name, 104, ry, dead ? COLORS.hpCrit : isActive ? COLORS.highlight : COLORS.text);
      let ix = 104 + measureText(u.c.name) + 3;
      for (const s of u.c.statuses) {
        drawIcon(ctx, STATUS_ICON[s.type], ix, ry + 1);
        ix += 8;
      }
      if (u.c.defending) drawIcon(ctx, 'shield', ix, ry + 1);
      const ratio = u.c.hp / u.c.maxHp;
      drawText(ctx, `${u.c.hp}/${u.c.maxHp}`, 216, ry, dead ? COLORS.hpCrit : ratio <= 0.25 ? hpColor(ratio) : COLORS.text, {
        align: 'right',
      });
      drawGauge(ctx, 172, ry + 10, 44, ratio, 'hp');
      drawText(ctx, String(u.c.mp), 246, ry, COLORS.mp, { align: 'right' });
      drawGauge(ctx, 222, ry + 10, 24, u.c.maxMp ? u.c.mp / u.c.maxMp : 0, 'mp');
      if (isActive && this.menu) drawCursor(ctx, 102, ry + 3);
    });
  }

  private renderList(ctx: CanvasRenderingContext2D) {
    const unit = this.active!;
    const y = PANEL_Y;
    drawWindow(ctx, 0, y, GAME_WIDTH, GAME_HEIGHT - y);
    let help = '';
    if (this.menu === 'skill') {
      const skills = this.skillsOf(unit);
      skills.forEach((s, i) => {
        const row = Math.floor(i / 2) - this.listScroll;
        if (row < 0 || row > 3) return;
        const x = 22 + (i % 2) * 124;
        const ry = y + 9 + row * 14;
        const ok = unit.c.mp >= s.mpCost;
        drawText(ctx, s.name, x, ry, ok ? COLORS.text : COLORS.disabled);
        drawText(ctx, String(s.mpCost), x + 98, ry, ok ? COLORS.mp : COLORS.disabled, { align: 'right' });
      });
      help = skills[this.listCursor.index]?.description ?? '';
    } else {
      const items = this.battleItems();
      items.forEach((e, i) => {
        const row = Math.floor(i / 2) - this.listScroll;
        if (row < 0 || row > 3) return;
        const x = 22 + (i % 2) * 124;
        const ry = y + 9 + row * 14;
        drawIcon(ctx, e.item.icon, x, ry);
        drawText(ctx, e.item.name, x + 11, ry);
        drawText(ctx, `${e.quantity}`, x + 98, ry, COLORS.dim, { align: 'right' });
      });
      help = items[this.listCursor.index]?.item.description ?? '';
    }
    const row = Math.floor(this.listCursor.index / 2) - this.listScroll;
    drawCursor(ctx, 20 + (this.listCursor.index % 2) * 124, y + 12 + row * 14);
    if (help) {
      drawWindow(ctx, 0, 0, GAME_WIDTH, 22);
      drawText(ctx, help, 10, 7);
    }
    const label = `${unit.c.name}  MP ${unit.c.mp}/${unit.c.maxMp}`;
    const lw = measureText(label) + 20;
    drawWindow(ctx, GAME_WIDTH - lw, y - 20, lw, 20);
    drawText(ctx, label, GAME_WIDTH - 10, y - 14, COLORS.text, { align: 'right' });
  }
}
