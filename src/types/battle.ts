import { Stats } from './character';

export enum DamageType {
  Physical = 'Physical',
  Magical = 'Magical',
  Healing = 'Healing',
}

export enum StatusEffectType {
  Poison = 'Poison',
  Sleep = 'Sleep',
  Haste = 'Haste',
  DefenseUp = 'DefenseUp',
}

export interface StatusEffect {
  type: StatusEffectType;
  turnsRemaining: number;
  value: number;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  mpCost: number;
  damageType: DamageType;
  power: number;
  targetType: 'single_enemy' | 'all_enemies' | 'single_ally' | 'all_allies' | 'self';
  statusEffect?: { type: StatusEffectType; chance: number; duration: number; value: number };
}

export interface EnemyAction {
  skillId: string;
  weight: number;
  hpThreshold?: number;
}

export interface Enemy {
  id: string;
  name: string;
  stats: Stats;
  skills: Skill[];
  actions: EnemyAction[];
  expReward: number;
  goldReward: number;
  dropItemId?: string;
  dropRate?: number;
}

export enum BattlePhase {
  Start = 'Start',
  PlayerCommand = 'PlayerCommand',
  PlayerTarget = 'PlayerTarget',
  EnemyTurn = 'EnemyTurn',
  Animation = 'Animation',
  Victory = 'Victory',
  Defeat = 'Defeat',
  Run = 'Run',
}

export interface BattleAction {
  actorId: string;
  targetIds: string[];
  skill: Skill;
  isEnemy: boolean;
}

export interface BattleEnemy extends Enemy {
  battleId: string;
  currentHp: number;
  currentMp: number;
  statusEffects: StatusEffect[];
}

export interface BattleState {
  enemies: BattleEnemy[];
  turnOrder: string[];
  currentTurnIndex: number;
  phase: BattlePhase;
  actionQueue: BattleAction[];
  battleLog: string[];
  selectedCommand: string | null;
  selectedSkill: Skill | null;
  currentCharacterIndex: number;
}
