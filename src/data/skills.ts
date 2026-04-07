import { Skill, DamageType, StatusEffectType } from '@/types';

export const SKILLS_DB: Record<string, Skill> = {
  // Warrior skills
  power_strike: {
    id: 'power_strike', name: 'Power Strike', description: 'A powerful physical attack',
    mpCost: 4, damageType: DamageType.Physical, power: 18, targetType: 'single_enemy',
  },
  shield_bash: {
    id: 'shield_bash', name: 'Shield Bash', description: 'Stun attack that may cause sleep',
    mpCost: 6, damageType: DamageType.Physical, power: 12, targetType: 'single_enemy',
    statusEffect: { type: StatusEffectType.Sleep, chance: 0.3, duration: 2, value: 0 },
  },
  war_cry: {
    id: 'war_cry', name: 'War Cry', description: 'Boost own defense',
    mpCost: 3, damageType: DamageType.Physical, power: 0, targetType: 'self',
    statusEffect: { type: StatusEffectType.DefenseUp, chance: 1, duration: 3, value: 50 },
  },

  // Mage skills
  fire: {
    id: 'fire', name: 'Fire', description: 'Fire magic attack',
    mpCost: 5, damageType: DamageType.Magical, power: 16, targetType: 'single_enemy',
  },
  ice: {
    id: 'ice', name: 'Ice', description: 'Ice magic that hits all enemies',
    mpCost: 8, damageType: DamageType.Magical, power: 12, targetType: 'all_enemies',
  },
  heal: {
    id: 'heal', name: 'Heal', description: 'Restore HP to one ally',
    mpCost: 6, damageType: DamageType.Healing, power: 20, targetType: 'single_ally',
  },
  heal_all: {
    id: 'heal_all', name: 'Heal All', description: 'Restore HP to all allies',
    mpCost: 12, damageType: DamageType.Healing, power: 12, targetType: 'all_allies',
  },

  // Rogue skills
  backstab: {
    id: 'backstab', name: 'Backstab', description: 'Critical sneak attack',
    mpCost: 5, damageType: DamageType.Physical, power: 22, targetType: 'single_enemy',
  },
  smoke_bomb: {
    id: 'smoke_bomb', name: 'Smoke Bomb', description: 'Puts enemies to sleep',
    mpCost: 7, damageType: DamageType.Physical, power: 0, targetType: 'all_enemies',
    statusEffect: { type: StatusEffectType.Sleep, chance: 0.5, duration: 2, value: 0 },
  },
  steal: {
    id: 'steal', name: 'Steal', description: 'Attempt to steal gold from enemy',
    mpCost: 3, damageType: DamageType.Physical, power: 5, targetType: 'single_enemy',
  },
  poison_blade: {
    id: 'poison_blade', name: 'Poison Blade', description: 'Attack with poison chance',
    mpCost: 4, damageType: DamageType.Physical, power: 14, targetType: 'single_enemy',
    statusEffect: { type: StatusEffectType.Poison, chance: 0.6, duration: 3, value: 8 },
  },

  // Enemy skills
  bite: {
    id: 'bite', name: 'Bite', description: 'A biting attack',
    mpCost: 0, damageType: DamageType.Physical, power: 10, targetType: 'single_enemy',
  },
  tackle: {
    id: 'tackle', name: 'Tackle', description: 'A body slam',
    mpCost: 0, damageType: DamageType.Physical, power: 8, targetType: 'single_enemy',
  },
  howl: {
    id: 'howl', name: 'Howl', description: 'A terrifying howl',
    mpCost: 0, damageType: DamageType.Physical, power: 6, targetType: 'all_enemies',
  },
  slash: {
    id: 'slash', name: 'Slash', description: 'A weapon slash',
    mpCost: 0, damageType: DamageType.Physical, power: 12, targetType: 'single_enemy',
  },
  dark_slash: {
    id: 'dark_slash', name: 'Dark Slash', description: 'Dark-infused powerful attack',
    mpCost: 0, damageType: DamageType.Magical, power: 20, targetType: 'single_enemy',
  },
  shadow_wave: {
    id: 'shadow_wave', name: 'Shadow Wave', description: 'Dark wave hitting all',
    mpCost: 0, damageType: DamageType.Magical, power: 14, targetType: 'all_enemies',
  },
  screech: {
    id: 'screech', name: 'Screech', description: 'A piercing screech',
    mpCost: 0, damageType: DamageType.Physical, power: 8, targetType: 'single_enemy',
  },
  bone_throw: {
    id: 'bone_throw', name: 'Bone Throw', description: 'Throws a bone',
    mpCost: 0, damageType: DamageType.Physical, power: 10, targetType: 'single_enemy',
  },
};
