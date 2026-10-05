import { ENEMIES } from '@/data/enemies';
import { ITEMS } from '@/data/items';
import { SKILLS } from '@/data/skills';
import type { Character, CharacterClass, EnemyDef, Item, Skill, StatusEffect, StatusType } from '@/types';
import { effectiveStats } from './stats';

export type Rng = () => number;

export interface Combatant {
  key: string;
  side: 'party' | 'enemy';
  name: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  atk: number;
  def: number;
  mag: number;
  spd: number;
  statuses: StatusEffect[];
  defending: boolean;
  actionsPerTurn: number;
  characterClass?: CharacterClass;
  enemyId?: string;
  stolen?: boolean;
}

export interface Outcome {
  targetKey: string;
  kind: 'damage' | 'heal' | 'mp' | 'miss' | 'status' | 'cure' | 'revive' | 'steal' | 'nothing' | 'wake';
  amount?: number;
  crit?: boolean;
  status?: StatusType;
  killed?: boolean;
  itemId?: string;
  gold?: number;
  message?: string;
}

export const alive = (c: Combatant) => c.hp > 0;
export const hasStatus = (c: Combatant, s: StatusType) => c.statuses.some((x) => x.type === s);

export function fromCharacter(c: Character): Combatant {
  const s = effectiveStats(c);
  return {
    key: c.id,
    side: 'party',
    name: c.name,
    hp: c.hp,
    maxHp: s.maxHp,
    mp: c.mp,
    maxMp: s.maxMp,
    atk: s.atk,
    def: s.def,
    mag: s.mag,
    spd: s.spd,
    statuses: [],
    defending: false,
    actionsPerTurn: 1,
    characterClass: c.characterClass,
  };
}

export function fromEnemy(def: EnemyDef, index: number): Combatant {
  return {
    key: `${def.id}#${index}`,
    side: 'enemy',
    name: def.name,
    hp: def.stats.hp,
    maxHp: def.stats.hp,
    mp: def.stats.mp,
    maxMp: def.stats.mp,
    atk: def.stats.atk,
    def: def.stats.def,
    mag: def.stats.mag,
    spd: def.stats.spd,
    statuses: [],
    defending: false,
    actionsPerTurn: def.actionsPerTurn ?? 1,
    enemyId: def.id,
  };
}

/** Give duplicate enemies letter suffixes: Slime A, Slime B. */
export function labelEnemies(list: Combatant[]) {
  const counts = new Map<string, number>();
  for (const e of list) counts.set(e.name, (counts.get(e.name) ?? 0) + 1);
  const seen = new Map<string, number>();
  for (const e of list) {
    if ((counts.get(e.name) ?? 0) > 1) {
      const n = seen.get(e.name) ?? 0;
      seen.set(e.name, n + 1);
      e.name = `${e.name} ${String.fromCharCode(65 + n)}`;
    }
  }
}

function effectiveDef(c: Combatant) {
  const up = c.statuses.find((s) => s.type === 'defUp');
  return c.def * (up ? 1 + up.value / 100 : 1);
}

export function critChance(user: Combatant, skill: Skill) {
  return 0.05 + (skill.critBonus ?? 0) + (user.characterClass === 'Rogue' ? 0.05 : 0);
}

export function calcDamage(user: Combatant, target: Combatant, skill: Skill, rng: Rng) {
  const variance = 0.9 + rng() * 0.2;
  const asleep = hasStatus(target, 'sleep');
  if (skill.kind === 'physical' && !asleep && rng() < 0.04) return { amount: 0, crit: false, miss: true };
  let raw: number;
  if (skill.kind === 'magical') raw = (user.mag * skill.power) / 10 - effectiveDef(target) / 4;
  else raw = (user.atk * skill.power) / 10 - effectiveDef(target) / 2;
  let amount = raw * variance;
  const crit = skill.kind === 'physical' && rng() < critChance(user, skill);
  if (crit) amount *= 1.5;
  if (target.defending) amount *= 0.5;
  return { amount: Math.max(1, Math.round(amount)), crit, miss: false };
}

export function calcHeal(user: Combatant, skill: Skill, rng: Rng) {
  return Math.max(1, Math.round(((user.mag * skill.power) / 8) * (0.9 + rng() * 0.2)));
}

function applyStatus(target: Combatant, status: NonNullable<Skill['status']>) {
  target.statuses = target.statuses.filter((s) => s.type !== status.type);
  target.statuses.push({ type: status.type, turns: status.turns, value: status.value });
}

function damage(target: Combatant, amount: number) {
  target.hp = Math.max(0, target.hp - amount);
  if (target.hp === 0) {
    target.statuses = [];
    target.defending = false;
  }
}

export function stealFrom(user: Combatant, target: Combatant, rng: Rng): Outcome {
  const def = target.enemyId ? ENEMIES[target.enemyId] : undefined;
  if (!def || target.stolen) return { targetKey: target.key, kind: 'nothing', message: 'Nothing left to steal.' };
  const chance = Math.max(0.2, Math.min(0.9, 0.5 + (user.spd - target.spd) * 0.03));
  if (rng() >= chance) return { targetKey: target.key, kind: 'nothing', message: "Couldn't steal anything." };
  target.stolen = true;
  if (def.drop) {
    const item = ITEMS[def.drop.itemId];
    return { targetKey: target.key, kind: 'steal', itemId: def.drop.itemId, message: `Stole ${item?.name ?? 'something'}!` };
  }
  const gold = Math.max(5, Math.floor(def.gold / 2));
  return { targetKey: target.key, kind: 'steal', gold, message: `Stole ${gold} gold!` };
}

/** Apply a skill to its targets (mutating them) and describe what happened. */
export function resolveSkill(user: Combatant, targets: Combatant[], skill: Skill, rng: Rng): Outcome[] {
  const out: Outcome[] = [];
  for (const target of targets) {
    if (skill.special === 'steal') {
      out.push(stealFrom(user, target, rng));
      continue;
    }
    if (skill.kind === 'physical' || skill.kind === 'magical') {
      if (!alive(target)) continue;
      const res = calcDamage(user, target, skill, rng);
      if (res.miss) {
        out.push({ targetKey: target.key, kind: 'miss' });
        continue;
      }
      damage(target, res.amount);
      out.push({ targetKey: target.key, kind: 'damage', amount: res.amount, crit: res.crit, killed: !alive(target) });
      if (alive(target) && hasStatus(target, 'sleep') && skill.status?.type !== 'sleep' && rng() < 0.5) {
        target.statuses = target.statuses.filter((s) => s.type !== 'sleep');
        out.push({ targetKey: target.key, kind: 'wake' });
      }
    } else if (skill.kind === 'healing') {
      if (!alive(target)) continue;
      const amount = Math.min(calcHeal(user, skill, rng), target.maxHp - target.hp);
      target.hp += amount;
      out.push({ targetKey: target.key, kind: 'heal', amount });
    }
    if (skill.status && alive(target)) {
      if (rng() < skill.status.chance) {
        applyStatus(target, skill.status);
        out.push({ targetKey: target.key, kind: 'status', status: skill.status.type });
      } else if (skill.kind === 'none') {
        out.push({ targetKey: target.key, kind: 'miss' });
      }
    }
  }
  return out;
}

export function itemTargetsDead(item: Item) {
  return item.effect?.type === 'revive';
}

export function resolveItem(target: Combatant, item: Item): Outcome {
  const effect = item.effect;
  if (!effect) return { targetKey: target.key, kind: 'nothing' };
  switch (effect.type) {
    case 'healHp': {
      if (!alive(target)) return { targetKey: target.key, kind: 'nothing' };
      const amount = Math.min(effect.amount, target.maxHp - target.hp);
      target.hp += amount;
      return { targetKey: target.key, kind: 'heal', amount };
    }
    case 'healMp': {
      if (!alive(target)) return { targetKey: target.key, kind: 'nothing' };
      const amount = Math.min(effect.amount, target.maxMp - target.mp);
      target.mp += amount;
      return { targetKey: target.key, kind: 'mp', amount };
    }
    case 'cure': {
      const had = hasStatus(target, effect.status);
      target.statuses = target.statuses.filter((s) => s.type !== effect.status);
      return had ? { targetKey: target.key, kind: 'cure', status: effect.status } : { targetKey: target.key, kind: 'nothing' };
    }
    case 'revive': {
      if (alive(target)) return { targetKey: target.key, kind: 'nothing' };
      target.hp = Math.max(1, Math.ceil((target.maxHp * effect.percent) / 100));
      return { targetKey: target.key, kind: 'revive', amount: target.hp };
    }
  }
}

/** Would this item do anything to this target right now? */
export function itemUseful(target: Pick<Combatant, 'hp' | 'maxHp' | 'mp' | 'maxMp' | 'statuses'>, item: Item): boolean {
  const e = item.effect;
  if (!e) return false;
  const isAlive = target.hp > 0;
  switch (e.type) {
    case 'healHp':
      return isAlive && target.hp < target.maxHp;
    case 'healMp':
      return isAlive && target.mp < target.maxMp;
    case 'cure':
      return isAlive && target.statuses.some((s) => s.type === e.status);
    case 'revive':
      return !isAlive;
  }
}

function pickWeighted<T extends { weight: number }>(list: T[], rng: Rng): T {
  const total = list.reduce((s, x) => s + x.weight, 0);
  let roll = rng() * total;
  for (const x of list) {
    roll -= x.weight;
    if (roll <= 0) return x;
  }
  return list[list.length - 1];
}

export function chooseEnemyAction(enemy: Combatant, party: Combatant[], rng: Rng): { skill: Skill; targets: Combatant[] } | null {
  const def = enemy.enemyId ? ENEMIES[enemy.enemyId] : undefined;
  const living = party.filter(alive);
  if (!def || living.length === 0) return null;
  const ratio = enemy.hp / enemy.maxHp;
  const options = def.actions.filter((a) => a.belowHp === undefined || ratio <= a.belowHp);
  const choice = pickWeighted(options.length ? options : def.actions, rng);
  const skill = SKILLS[choice.skillId];
  if (!skill) return null;
  const targets = skill.target === 'allEnemies' ? living : [living[Math.floor(rng() * living.length)]];
  return { skill, targets };
}

/**
 * Initiative for one round: faster units go first, with a little randomness.
 * Units with several actions per turn get extra, later slots.
 */
export function turnOrder(units: Combatant[], rng: Rng): Combatant[] {
  const slots: { unit: Combatant; init: number }[] = [];
  for (const u of units.filter(alive)) {
    for (let i = 0; i < u.actionsPerTurn; i++) {
      slots.push({ unit: u, init: (u.spd * (0.85 + rng() * 0.3)) / (i + 1) });
    }
  }
  return slots.sort((a, b) => b.init - a.init).map((s) => s.unit);
}

/** End-of-turn upkeep: poison damage and status countdowns. */
export function endOfTurn(c: Combatant): Outcome[] {
  const out: Outcome[] = [];
  if (!alive(c)) return out;
  const poison = c.statuses.find((s) => s.type === 'poison');
  if (poison) {
    const amount = Math.max(1, Math.floor((c.maxHp * poison.value) / 100));
    damage(c, amount);
    out.push({ targetKey: c.key, kind: 'damage', amount, status: 'poison', killed: !alive(c) });
  }
  c.statuses = c.statuses
    .map((s) => (s.type === 'sleep' ? s : { ...s, turns: s.turns - 1 }))
    .filter((s) => s.turns > 0);
  return out;
}

/** Start of a unit's turn. Returns true if it is asleep and loses the turn. */
export function startOfTurn(c: Combatant): { skip: boolean; woke: boolean } {
  c.defending = false;
  const sleep = c.statuses.find((s) => s.type === 'sleep');
  if (!sleep) return { skip: false, woke: false };
  sleep.turns -= 1;
  if (sleep.turns <= 0) {
    c.statuses = c.statuses.filter((s) => s !== sleep);
    return { skip: true, woke: true };
  }
  return { skip: true, woke: false };
}

export function runChance(party: Combatant[], enemies: Combatant[]) {
  const avg = (l: Combatant[]) => l.reduce((s, c) => s + c.spd, 0) / Math.max(1, l.length);
  return Math.max(0.25, Math.min(0.95, 0.55 + (avg(party.filter(alive)) - avg(enemies.filter(alive))) * 0.04));
}

export function rewards(enemyIds: string[], rng: Rng) {
  let exp = 0;
  let gold = 0;
  const items: string[] = [];
  for (const id of enemyIds) {
    const def = ENEMIES[id];
    if (!def) continue;
    exp += def.exp;
    gold += def.gold;
    if (def.drop && rng() < def.drop.chance) items.push(def.drop.itemId);
  }
  return { exp, gold, items };
}

/** Which side a skill aims at, from the user's point of view. */
export function targetsOpponents(skill: Skill) {
  return skill.target === 'enemy' || skill.target === 'allEnemies';
}

export function targetsAll(skill: Skill) {
  return skill.target === 'allEnemies' || skill.target === 'allAllies';
}
