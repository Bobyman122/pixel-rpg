import { Stats, EquipSlot } from './character';

export enum ItemType {
  Consumable = 'Consumable',
  Weapon = 'Weapon',
  Armor = 'Armor',
  Accessory = 'Accessory',
  KeyItem = 'KeyItem',
}

export interface ItemEffect {
  type: 'heal_hp' | 'heal_mp' | 'cure_status' | 'damage' | 'buff';
  value: number;
  target: 'single' | 'all';
}

export interface Item {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  effect?: ItemEffect;
  buyPrice: number;
  sellPrice: number;
  equipSlot?: EquipSlot;
  statBonus?: Partial<Stats>;
}

export interface InventoryItem {
  item: Item;
  quantity: number;
}
