import { Character, CharacterClass, EquipSlot } from '@/types';

export const CHARACTERS_DB: Record<string, Character> = {
  kael: {
    id: 'kael',
    name: 'Kael',
    characterClass: CharacterClass.Warrior,
    stats: {
      hp: 45, maxHp: 45, mp: 10, maxMp: 10,
      atk: 12, def: 10, mag: 4, spd: 6,
      lvl: 1, exp: 0, expToNext: 30,
    },
    equipment: {
      [EquipSlot.Weapon]: null,
      [EquipSlot.Armor]: null,
      [EquipSlot.Accessory]: null,
    },
    skills: ['power_strike', 'shield_bash', 'war_cry'],
    isAlive: true,
  },
  lira: {
    id: 'lira',
    name: 'Lira',
    characterClass: CharacterClass.Mage,
    stats: {
      hp: 28, maxHp: 28, mp: 30, maxMp: 30,
      atk: 5, def: 6, mag: 14, spd: 7,
      lvl: 1, exp: 0, expToNext: 30,
    },
    equipment: {
      [EquipSlot.Weapon]: null,
      [EquipSlot.Armor]: null,
      [EquipSlot.Accessory]: null,
    },
    skills: ['fire', 'ice', 'heal'],
    isAlive: true,
  },
  finn: {
    id: 'finn',
    name: 'Finn',
    characterClass: CharacterClass.Rogue,
    stats: {
      hp: 35, maxHp: 35, mp: 15, maxMp: 15,
      atk: 10, def: 7, mag: 6, spd: 12,
      lvl: 1, exp: 0, expToNext: 30,
    },
    equipment: {
      [EquipSlot.Weapon]: null,
      [EquipSlot.Armor]: null,
      [EquipSlot.Accessory]: null,
    },
    skills: ['backstab', 'poison_blade', 'smoke_bomb', 'steal'],
    isAlive: true,
  },
};
