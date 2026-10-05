import type { BaseStats, CharacterClass, EquipSlot } from '@/types';

export interface CharacterDef {
  name: string;
  characterClass: CharacterClass;
  look: string;
  base: BaseStats;
  /** Skills unlocked at each level (level 1 = known from the start). */
  learnset: { level: number; skill: string }[];
  equipment: Record<EquipSlot, string | null>;
}

export const CHARACTER_DEFS: Record<string, CharacterDef> = {
  kael: {
    name: 'Kael',
    characterClass: 'Warrior',
    look: 'kael',
    base: { maxHp: 48, maxMp: 12, atk: 12, def: 10, mag: 4, spd: 7 },
    learnset: [
      { level: 1, skill: 'power_strike' },
      { level: 2, skill: 'shield_bash' },
      { level: 3, skill: 'war_cry' },
      { level: 5, skill: 'cleave' },
    ],
    equipment: { weapon: 'bronze_sword', armor: null, accessory: null },
  },
  lira: {
    name: 'Lira',
    characterClass: 'Mage',
    look: 'lira',
    base: { maxHp: 30, maxMp: 30, atk: 5, def: 6, mag: 14, spd: 8 },
    learnset: [
      { level: 1, skill: 'fire' },
      { level: 1, skill: 'heal' },
      { level: 3, skill: 'ice' },
      { level: 5, skill: 'heal_all' },
    ],
    equipment: { weapon: 'oak_rod', armor: null, accessory: null },
  },
  finn: {
    name: 'Finn',
    characterClass: 'Rogue',
    look: 'finn',
    base: { maxHp: 38, maxMp: 16, atk: 10, def: 7, mag: 6, spd: 13 },
    learnset: [
      { level: 1, skill: 'steal' },
      { level: 1, skill: 'backstab' },
      { level: 2, skill: 'poison_blade' },
      { level: 4, skill: 'smoke_bomb' },
    ],
    equipment: { weapon: 'knife', armor: null, accessory: null },
  },
};

/** Stat gains per level, by class. */
export const GROWTH: Record<CharacterClass, BaseStats> = {
  Warrior: { maxHp: 9, maxMp: 2, atk: 3, def: 2, mag: 1, spd: 1 },
  Mage: { maxHp: 5, maxMp: 6, atk: 1, def: 1, mag: 3, spd: 1 },
  Rogue: { maxHp: 7, maxMp: 3, atk: 2, def: 2, mag: 1, spd: 2 },
};

export const MAX_LEVEL = 30;

export function expToNext(level: number): number {
  return Math.round(24 * Math.pow(1.5, level - 1));
}

/** Name of the class-specific skill command in battle. */
export const SKILL_COMMAND: Record<CharacterClass, string> = {
  Warrior: 'Arts',
  Mage: 'Magic',
  Rogue: 'Tricks',
};
