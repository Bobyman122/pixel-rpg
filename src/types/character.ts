export interface Stats {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  atk: number;
  def: number;
  mag: number;
  spd: number;
  lvl: number;
  exp: number;
  expToNext: number;
}

export enum CharacterClass {
  Warrior = 'Warrior',
  Mage = 'Mage',
  Rogue = 'Rogue',
}

export enum EquipSlot {
  Weapon = 'Weapon',
  Armor = 'Armor',
  Accessory = 'Accessory',
}

export type Equipment = Record<EquipSlot, string | null>;

export interface Character {
  id: string;
  name: string;
  characterClass: CharacterClass;
  stats: Stats;
  equipment: Equipment;
  skills: string[];
  isAlive: boolean;
}
