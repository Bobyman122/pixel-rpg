import { beforeEach, describe, expect, it } from 'vitest';
import { effectiveStats } from '@/systems/stats';
import { useGame } from './gameStore';

const g = () => useGame.getState();

describe('game store', () => {
  beforeEach(() => g().newGame());

  it('starts a fresh game with Kael and some supplies', () => {
    expect(g().party.map((c) => c.id)).toEqual(['kael']);
    expect(g().countItem('potion')).toBe(4);
    expect(g().gold).toBe(150);
  });

  it('swaps equipment through the bag', () => {
    g().addItem('iron_sword');
    expect(g().equip('kael', 'weapon', 'iron_sword')).toBe(true);
    expect(g().party[0].equipment.weapon).toBe('iron_sword');
    expect(g().countItem('iron_sword')).toBe(0);
    expect(g().countItem('bronze_sword')).toBe(1);
    expect(g().equip('kael', 'weapon', null)).toBe(true);
    expect(g().countItem('iron_sword')).toBe(1);
    expect(g().equip('kael', 'weapon', 'steel_dagger')).toBe(false);
  });

  it("clamps MP when an MP-boosting accessory comes off", () => {
    g().addItem('mana_charm');
    g().equip('kael', 'accessory', 'mana_charm');
    g().healAll();
    const boosted = g().party[0].mp;
    g().equip('kael', 'accessory', null);
    expect(g().party[0].mp).toBe(effectiveStats(g().party[0]).maxMp);
    expect(g().party[0].mp).toBeLessThan(boosted);
  });

  it('new party members join at the leader level', () => {
    g().setParty([{ ...g().party[0], level: 4 }]);
    g().joinParty('lira');
    g().joinParty('lira');
    expect(g().party.map((c) => [c.id, c.level])).toEqual([
      ['kael', 4],
      ['lira', 4],
    ]);
  });

  it("won't spend gold you don't have", () => {
    expect(g().spendGold(1000)).toBe(false);
    expect(g().spendGold(50)).toBe(true);
    expect(g().gold).toBe(100);
  });

  it('round-trips through a save file', () => {
    g().setFlag('quest_accepted');
    g().setMap('forest', 5, 6, g().facing);
    const data = JSON.parse(JSON.stringify(g().toSave()));
    g().newGame();
    g().loadSave(data);
    expect(g().flags.quest_accepted).toBe(true);
    expect([g().mapId, g().x, g().y]).toEqual(['forest', 5, 6]);
  });
});
