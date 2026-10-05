import { ITEMS } from '@/data/items';
import type { BaseStats, Character, EquipSlot, Item, StatKey } from '@/types';
import { EQUIP_SLOTS } from '@/types';

export const STAT_KEYS: StatKey[] = ['maxHp', 'maxMp', 'atk', 'def', 'mag', 'spd'];

export const STAT_LABELS: Record<StatKey, string> = {
  maxHp: 'Max HP',
  maxMp: 'Max MP',
  atk: 'Attack',
  def: 'Defense',
  mag: 'Magic',
  spd: 'Speed',
};

export function zeroStats(): BaseStats {
  return { maxHp: 0, maxMp: 0, atk: 0, def: 0, mag: 0, spd: 0 };
}

export function equipmentBonus(equipment: Character['equipment']): BaseStats {
  const total = zeroStats();
  for (const slot of EQUIP_SLOTS) {
    const id = equipment[slot];
    const bonus = id ? ITEMS[id]?.bonus : undefined;
    if (!bonus) continue;
    for (const key of STAT_KEYS) total[key] += bonus[key] ?? 0;
  }
  return total;
}

/** Base stats plus equipment, floored at sensible minimums. */
export function effectiveStats(c: Pick<Character, 'base' | 'equipment'>): BaseStats {
  const bonus = equipmentBonus(c.equipment);
  const out = zeroStats();
  for (const key of STAT_KEYS) out[key] = Math.max(key === 'maxMp' ? 0 : 1, c.base[key] + bonus[key]);
  return out;
}

export function canEquip(item: Item, c: Pick<Character, 'characterClass'>): boolean {
  if (!item.slot) return false;
  return !item.equippableBy || item.equippableBy.includes(c.characterClass);
}

/** Stats the character would have with `itemId` in `slot` (null = unequip). */
export function previewEquip(c: Character, slot: EquipSlot, itemId: string | null): BaseStats {
  return effectiveStats({ base: c.base, equipment: { ...c.equipment, [slot]: itemId } });
}

export function isAlive(c: Pick<Character, 'hp'>) {
  return c.hp > 0;
}
