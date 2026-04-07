import { Item, ItemType, EquipSlot } from '@/types';

export const ITEMS_DB: Record<string, Item> = {
  // Consumables
  potion: {
    id: 'potion', name: 'Potion', description: 'Restores 30 HP',
    type: ItemType.Consumable, effect: { type: 'heal_hp', value: 30, target: 'single' },
    buyPrice: 50, sellPrice: 25,
  },
  hi_potion: {
    id: 'hi_potion', name: 'Hi-Potion', description: 'Restores 80 HP',
    type: ItemType.Consumable, effect: { type: 'heal_hp', value: 80, target: 'single' },
    buyPrice: 150, sellPrice: 75,
  },
  ether: {
    id: 'ether', name: 'Ether', description: 'Restores 15 MP',
    type: ItemType.Consumable, effect: { type: 'heal_mp', value: 15, target: 'single' },
    buyPrice: 80, sellPrice: 40,
  },
  antidote: {
    id: 'antidote', name: 'Antidote', description: 'Cures poison',
    type: ItemType.Consumable, effect: { type: 'cure_status', value: 0, target: 'single' },
    buyPrice: 30, sellPrice: 15,
  },
  phoenix_down: {
    id: 'phoenix_down', name: 'Phoenix Down', description: 'Revives a fallen ally with 25% HP',
    type: ItemType.Consumable, effect: { type: 'heal_hp', value: 25, target: 'single' },
    buyPrice: 300, sellPrice: 150,
  },

  // Weapons
  iron_sword: {
    id: 'iron_sword', name: 'Iron Sword', description: 'A sturdy iron sword',
    type: ItemType.Weapon, equipSlot: EquipSlot.Weapon,
    statBonus: { atk: 5 },
    buyPrice: 200, sellPrice: 100,
  },
  oak_staff: {
    id: 'oak_staff', name: 'Oak Staff', description: 'A staff channeling magic',
    type: ItemType.Weapon, equipSlot: EquipSlot.Weapon,
    statBonus: { mag: 6, atk: 2 },
    buyPrice: 220, sellPrice: 110,
  },
  steel_dagger: {
    id: 'steel_dagger', name: 'Steel Dagger', description: 'A quick steel dagger',
    type: ItemType.Weapon, equipSlot: EquipSlot.Weapon,
    statBonus: { atk: 4, spd: 3 },
    buyPrice: 180, sellPrice: 90,
  },

  // Armor
  leather_armor: {
    id: 'leather_armor', name: 'Leather Armor', description: 'Basic leather armor',
    type: ItemType.Armor, equipSlot: EquipSlot.Armor,
    statBonus: { def: 4 },
    buyPrice: 150, sellPrice: 75,
  },
  chain_mail: {
    id: 'chain_mail', name: 'Chain Mail', description: 'Linked metal armor',
    type: ItemType.Armor, equipSlot: EquipSlot.Armor,
    statBonus: { def: 8, spd: -1 },
    buyPrice: 350, sellPrice: 175,
  },

  // Key items
  crystal_of_light: {
    id: 'crystal_of_light', name: 'Crystal of Light', description: 'The sacred crystal that protects the village',
    type: ItemType.KeyItem,
    buyPrice: 0, sellPrice: 0,
  },
};
