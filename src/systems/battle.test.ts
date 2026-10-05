import { describe, expect, it } from 'vitest';
import { ENEMIES } from '@/data/enemies';
import { ITEMS } from '@/data/items';
import { ATTACK, SKILLS } from '@/data/skills';
import {
  calcDamage,
  endOfTurn,
  fromCharacter,
  fromEnemy,
  itemUseful,
  resolveItem,
  resolveSkill,
  startOfTurn,
  stealFrom,
  turnOrder,
  type Combatant,
} from './battle';
import { createCharacter } from './progression';

const fixed = (v: number) => () => v;
const party = (id = 'kael', level = 1) => fromCharacter(createCharacter(id, level));

describe('items', () => {
  it('Potion heals a flat 40 HP, capped at max', () => {
    const k = party();
    k.hp = 5;
    expect(resolveItem(k, ITEMS.potion)).toMatchObject({ kind: 'heal', amount: 40 });
    expect(k.hp).toBe(45);
    k.hp = k.maxHp - 5;
    expect(resolveItem(k, ITEMS.potion).amount).toBe(5);
  });

  it('Ether restores MP, not HP', () => {
    const k = party('lira');
    k.hp = 5;
    k.mp = 0;
    expect(resolveItem(k, ITEMS.ether)).toMatchObject({ kind: 'mp', amount: 20 });
    expect(k.hp).toBe(5);
    expect(k.mp).toBe(20);
  });

  it('Phoenix Down revives the fallen and nothing else revives them', () => {
    const k = party();
    k.hp = 0;
    expect(itemUseful(k, ITEMS.potion)).toBe(false);
    expect(resolveItem(k, ITEMS.potion).kind).toBe('nothing');
    expect(itemUseful(k, ITEMS.phoenix_down)).toBe(true);
    expect(resolveItem(k, ITEMS.phoenix_down).kind).toBe('revive');
    expect(k.hp).toBe(Math.ceil(k.maxHp * 0.3));
  });

  it('Antidote cures poison', () => {
    const k = party();
    k.statuses = [{ type: 'poison', turns: 3, value: 8 }];
    expect(resolveItem(k, ITEMS.antidote).kind).toBe('cure');
    expect(k.statuses).toEqual([]);
  });
});

describe('skills', () => {
  it('War Cry buffs the whole party and deals no damage', () => {
    const a = party('kael', 3);
    const b = party('lira', 3);
    const out = resolveSkill(a, [a, b], SKILLS.war_cry, fixed(0.5));
    expect(out.filter((o) => o.kind === 'status')).toHaveLength(2);
    expect(out.some((o) => o.kind === 'damage')).toBe(false);
    expect(a.statuses[0]).toMatchObject({ type: 'defUp' });
  });

  it('Smoke Bomb only tries to sleep enemies', () => {
    const finn = party('finn', 4);
    const slime = fromEnemy(ENEMIES.slime, 0);
    const out = resolveSkill(finn, [slime], SKILLS.smoke_bomb, fixed(0.1));
    expect(slime.hp).toBe(slime.maxHp);
    expect(out).toEqual([{ targetKey: slime.key, kind: 'status', status: 'sleep' }]);
  });

  it('Heal scales with magic and never overheals', () => {
    const lira = party('lira');
    const kael = party();
    kael.hp = kael.maxHp - 3;
    const [o] = resolveSkill(lira, [kael], SKILLS.heal, fixed(0.5));
    expect(o).toMatchObject({ kind: 'heal', amount: 3 });
    expect(kael.hp).toBe(kael.maxHp);
  });

  it('damage is at least 1 and halved by Defend', () => {
    const slime = fromEnemy(ENEMIES.slime, 0);
    const tank: Combatant = { ...party(), def: 999 };
    expect(calcDamage(slime, tank, ATTACK, fixed(0.5)).amount).toBe(1);
    const kael = party();
    const normal = calcDamage(slime, kael, ATTACK, fixed(0.5)).amount;
    kael.defending = true;
    expect(calcDamage(slime, kael, ATTACK, fixed(0.5)).amount).toBe(Math.max(1, Math.round(normal / 2)));
  });

  it('Steal takes the drop once', () => {
    const finn = party('finn');
    const goblin = fromEnemy(ENEMIES.goblin, 0);
    expect(stealFrom(finn, goblin, fixed(0))).toMatchObject({ kind: 'steal', itemId: 'potion' });
    expect(stealFrom(finn, goblin, fixed(0)).kind).toBe('nothing');
  });
});

describe('turn flow', () => {
  it('poison ticks at the end of a turn and wears off', () => {
    const k = party();
    k.statuses = [{ type: 'poison', turns: 1, value: 10 }];
    const [o] = endOfTurn(k);
    expect(o).toMatchObject({ kind: 'damage', amount: Math.floor(k.maxHp / 10) });
    expect(k.statuses).toEqual([]);
  });

  it('sleep skips exactly as many turns as it lasts', () => {
    const e = fromEnemy(ENEMIES.sabrecat, 0);
    e.statuses = [{ type: 'sleep', turns: 2, value: 0 }];
    expect(startOfTurn(e)).toEqual({ skip: true, woke: false });
    expect(startOfTurn(e)).toEqual({ skip: true, woke: true });
    expect(startOfTurn(e)).toEqual({ skip: false, woke: false });
  });

  it('faster units act first and the boss acts twice', () => {
    const slow = fromEnemy(ENEMIES.slime, 0);
    const fast = fromEnemy(ENEMIES.spider, 1);
    const boss = fromEnemy(ENEMIES.shadow_samurai, 2);
    const order = turnOrder([slow, boss, fast], fixed(0.5));
    expect(order[0]).toBe(fast);
    expect(order.filter((u) => u === boss)).toHaveLength(2);
    expect(order.indexOf(slow)).toBeGreaterThan(order.indexOf(fast));
  });

  it('skips the dead', () => {
    const a = party();
    a.hp = 0;
    expect(turnOrder([a], fixed(0.5))).toEqual([]);
  });
});
