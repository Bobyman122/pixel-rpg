import { describe, expect, it } from 'vitest';
import { expToNext } from '@/data/characters';
import { createCharacter, gainExp } from './progression';
import { addItem, countItem, removeItem } from './inventory';
import { canEquip, effectiveStats } from './stats';
import { ITEMS } from '@/data/items';
import { formatTime, validateSave, SAVE_VERSION } from './save';

describe('characters', () => {
  it('start at full HP/MP including equipment', () => {
    const k = createCharacter('kael');
    const s = effectiveStats(k);
    expect(k.hp).toBe(s.maxHp);
    expect(s.atk).toBe(k.base.atk + 3); // bronze sword
  });

  it('know the skills for their level when they join late', () => {
    expect(createCharacter('lira', 1).skills).toEqual(['fire', 'heal']);
    expect(createCharacter('lira', 3).skills).toContain('ice');
    expect(createCharacter('finn', 4).skills).toContain('smoke_bomb');
  });

  it('can gain several levels from one fight', () => {
    const k = createCharacter('kael');
    const exp = expToNext(1) + expToNext(2) + 5;
    const { char, levels } = gainExp(k, exp);
    expect(char.level).toBe(3);
    expect(char.exp).toBe(5);
    expect(levels.map((l) => l.level)).toEqual([2, 3]);
    expect(levels.flatMap((l) => l.learned)).toEqual(['shield_bash', 'war_cry']);
    expect(char.hp).toBeLessThanOrEqual(effectiveStats(char).maxHp);
  });

  it('respect class equipment restrictions', () => {
    const lira = createCharacter('lira');
    expect(canEquip(ITEMS.iron_sword, lira)).toBe(false);
    expect(canEquip(ITEMS.mystic_staff, lira)).toBe(true);
    expect(canEquip(ITEMS.leather_armor, lira)).toBe(true);
  });
});

describe('inventory', () => {
  it('stacks, removes and caps quantities', () => {
    let inv = addItem([], 'potion', 2);
    inv = addItem(inv, 'potion', 3);
    expect(countItem(inv, 'potion')).toBe(5);
    inv = removeItem(inv, 'potion', 5);
    expect(inv).toEqual([]);
    expect(countItem(addItem([], 'potion', 500), 'potion')).toBe(99);
    expect(addItem([], 'not_an_item')).toEqual([]);
  });
});

describe('save files', () => {
  const good = {
    version: SAVE_VERSION,
    savedAt: 1,
    playTime: 90,
    party: [createCharacter('kael')],
    inventory: [{ itemId: 'potion', quantity: 2 }, { bogus: true }],
    gold: 12,
    mapId: 'forest',
    x: 3,
    y: 4,
    facing: 'left',
    flags: ['quest_accepted', 7],
  };

  it('accepts a valid save and drops junk entries', () => {
    const s = validateSave(JSON.parse(JSON.stringify(good)));
    expect(s).not.toBeNull();
    expect(s!.inventory).toEqual([{ itemId: 'potion', quantity: 2 }]);
    expect(s!.flags).toEqual(['quest_accepted']);
  });

  it('rejects corrupt or foreign saves', () => {
    expect(validateSave(null)).toBeNull();
    expect(validateSave('hello')).toBeNull();
    expect(validateSave({ ...good, version: 99 })).toBeNull();
    expect(validateSave({ ...good, mapId: 'atlantis' })).toBeNull();
    expect(validateSave({ ...good, party: [] })).toBeNull();
  });

  it('formats play time', () => {
    expect(formatTime(65)).toBe('1:05');
    expect(formatTime(3725)).toBe('1:02:05');
  });
});
