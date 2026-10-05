export interface ShopDef {
  name: string;
  greeting: string;
  items: string[];
}

export const SHOPS: Record<string, ShopDef> = {
  millbrook: {
    name: "Bram's Supplies",
    greeting: 'Take your time. Everything here is honestly priced!',
    items: [
      'potion',
      'hi_potion',
      'ether',
      'antidote',
      'phoenix_down',
      'iron_sword',
      'mystic_staff',
      'steel_dagger',
      'leather_armor',
      'chain_mail',
      'silk_robe',
      'power_ring',
      'mana_charm',
      'swift_boots',
    ],
  },
};
