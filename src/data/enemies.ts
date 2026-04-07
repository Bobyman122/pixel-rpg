import { Enemy } from '@/types';
import { SKILLS_DB } from './skills';

export const ENEMIES_DB: Record<string, Enemy> = {
  slime: {
    id: 'slime', name: 'Slime',
    stats: {
      hp: 20, maxHp: 20, mp: 0, maxMp: 0,
      atk: 5, def: 2, mag: 1, spd: 3,
      lvl: 1, exp: 0, expToNext: 0,
    },
    skills: [SKILLS_DB.tackle],
    actions: [{ skillId: 'tackle', weight: 1 }],
    expReward: 8, goldReward: 10,
    dropItemId: 'potion', dropRate: 0.2,
  },
  wolf: {
    id: 'wolf', name: 'Wolf',
    stats: {
      hp: 30, maxHp: 30, mp: 0, maxMp: 0,
      atk: 9, def: 4, mag: 2, spd: 8,
      lvl: 2, exp: 0, expToNext: 0,
    },
    skills: [SKILLS_DB.bite, SKILLS_DB.howl],
    actions: [
      { skillId: 'bite', weight: 3 },
      { skillId: 'howl', weight: 1 },
    ],
    expReward: 14, goldReward: 15,
    dropItemId: 'antidote', dropRate: 0.15,
  },
  goblin: {
    id: 'goblin', name: 'Goblin',
    stats: {
      hp: 25, maxHp: 25, mp: 0, maxMp: 0,
      atk: 8, def: 5, mag: 3, spd: 6,
      lvl: 2, exp: 0, expToNext: 0,
    },
    skills: [SKILLS_DB.slash, SKILLS_DB.tackle],
    actions: [
      { skillId: 'slash', weight: 2 },
      { skillId: 'tackle', weight: 1 },
    ],
    expReward: 12, goldReward: 20,
    dropItemId: 'potion', dropRate: 0.25,
  },
  bat: {
    id: 'bat', name: 'Cave Bat',
    stats: {
      hp: 18, maxHp: 18, mp: 0, maxMp: 0,
      atk: 7, def: 3, mag: 4, spd: 10,
      lvl: 3, exp: 0, expToNext: 0,
    },
    skills: [SKILLS_DB.screech, SKILLS_DB.bite],
    actions: [
      { skillId: 'screech', weight: 2 },
      { skillId: 'bite', weight: 2 },
    ],
    expReward: 10, goldReward: 8,
  },
  skeleton: {
    id: 'skeleton', name: 'Skeleton',
    stats: {
      hp: 40, maxHp: 40, mp: 0, maxMp: 0,
      atk: 11, def: 8, mag: 3, spd: 5,
      lvl: 3, exp: 0, expToNext: 0,
    },
    skills: [SKILLS_DB.slash, SKILLS_DB.bone_throw],
    actions: [
      { skillId: 'slash', weight: 2 },
      { skillId: 'bone_throw', weight: 1 },
    ],
    expReward: 18, goldReward: 25,
    dropItemId: 'ether', dropRate: 0.15,
  },
  dark_knight: {
    id: 'dark_knight', name: 'Dark Knight',
    stats: {
      hp: 150, maxHp: 150, mp: 50, maxMp: 50,
      atk: 16, def: 12, mag: 14, spd: 7,
      lvl: 5, exp: 0, expToNext: 0,
    },
    skills: [SKILLS_DB.dark_slash, SKILLS_DB.shadow_wave, SKILLS_DB.slash],
    actions: [
      { skillId: 'slash', weight: 3 },
      { skillId: 'dark_slash', weight: 2 },
      { skillId: 'shadow_wave', weight: 1, hpThreshold: 0.5 },
    ],
    expReward: 100, goldReward: 200,
    dropItemId: 'phoenix_down', dropRate: 0.5,
  },
};
