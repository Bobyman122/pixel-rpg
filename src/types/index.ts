// ---------------------------------------------------------------------------
// Characters & stats
// ---------------------------------------------------------------------------

export enum Direction {
  Up = 'up',
  Down = 'down',
  Left = 'left',
  Right = 'right',
}

export type CharacterClass = 'Warrior' | 'Mage' | 'Rogue';

export type EquipSlot = 'weapon' | 'armor' | 'accessory';
export const EQUIP_SLOTS: EquipSlot[] = ['weapon', 'armor', 'accessory'];

export interface BaseStats {
  maxHp: number;
  maxMp: number;
  atk: number;
  def: number;
  mag: number;
  spd: number;
}

export type StatKey = keyof BaseStats;

export interface Character {
  id: string;
  name: string;
  characterClass: CharacterClass;
  look: string;
  level: number;
  /** Experience earned toward the next level. */
  exp: number;
  hp: number;
  mp: number;
  base: BaseStats;
  equipment: Record<EquipSlot, string | null>;
  skills: string[];
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

export type ItemKind = 'consumable' | 'weapon' | 'armor' | 'accessory' | 'key';

export type ItemEffect =
  | { type: 'healHp'; amount: number }
  | { type: 'healMp'; amount: number }
  | { type: 'cure'; status: StatusType }
  | { type: 'revive'; percent: number };

export interface Item {
  id: string;
  name: string;
  description: string;
  kind: ItemKind;
  icon: string;
  price: number;
  effect?: ItemEffect;
  slot?: EquipSlot;
  bonus?: Partial<BaseStats>;
  equippableBy?: CharacterClass[];
}

export interface InventoryEntry {
  itemId: string;
  quantity: number;
}

// ---------------------------------------------------------------------------
// Battle
// ---------------------------------------------------------------------------

export type StatusType = 'poison' | 'sleep' | 'defUp';

export interface StatusEffect {
  type: StatusType;
  turns: number;
  value: number;
}

export type DamageKind = 'physical' | 'magical' | 'healing' | 'none';
export type TargetType = 'enemy' | 'allEnemies' | 'ally' | 'allAllies' | 'self' | 'deadAlly';
export type SkillFx =
  | 'slash'
  | 'bash'
  | 'claw'
  | 'bite'
  | 'fire'
  | 'ice'
  | 'heal'
  | 'poison'
  | 'smoke'
  | 'shadow'
  | 'buff'
  | 'steal'
  | 'sonic'
  | 'bone'
  | 'slime';

export interface Skill {
  id: string;
  name: string;
  description: string;
  mpCost: number;
  kind: DamageKind;
  power: number;
  target: TargetType;
  fx: SkillFx;
  status?: { type: StatusType; chance: number; turns: number; value: number };
  special?: 'steal';
  /** Extra critical-hit chance on top of the base rate. */
  critBonus?: number;
  /** Usable from the field menu (healing spells). */
  field?: boolean;
}

export interface EnemyAction {
  skillId: string;
  weight: number;
  /** Only used once HP falls to this fraction or below. */
  belowHp?: number;
}

export interface EnemyDef {
  id: string;
  name: string;
  stats: { hp: number; mp: number; atk: number; def: number; mag: number; spd: number };
  skills: string[];
  actions: EnemyAction[];
  exp: number;
  gold: number;
  drop?: { itemId: string; chance: number };
  boss?: boolean;
  actionsPerTurn?: number;
}

// ---------------------------------------------------------------------------
// World, dialogue & events
// ---------------------------------------------------------------------------

export interface Condition {
  flag?: string;
  notFlag?: string;
}

export interface BattleSetup {
  enemies: string[];
  boss?: boolean;
  music?: string;
  backdrop?: Backdrop;
  canRun?: boolean;
  victory?: { flags?: string[]; dialogue?: string };
}

export type DialogueAction =
  | { type: 'setFlag'; flag: string }
  | { type: 'heal' }
  | { type: 'join'; characterId: string }
  | { type: 'giveItem'; itemId: string; quantity?: number }
  | { type: 'shop'; shopId: string }
  | { type: 'battle'; battle: BattleSetup }
  | { type: 'ending' };

export interface DialogueChoice {
  text: string;
  next: string | null;
  action?: DialogueAction;
}

export interface DialogueLine {
  speaker?: string;
  text: string;
  /** Next line id. `undefined` or `null` ends the conversation. */
  next?: string | null;
  choices?: DialogueChoice[];
  /** Runs when the line is dismissed. */
  action?: DialogueAction;
}

export interface DialogueScript {
  id: string;
  start: string;
  lines: Record<string, DialogueLine>;
}

export interface NpcDef {
  id: string;
  name: string;
  look: string;
  x: number;
  y: number;
  facing: Direction;
  talk: { when?: Condition; dialogue: string }[];
  hideWhen?: Condition;
  /** Tiles the NPC may stroll from home. 0/undefined = stands still. */
  wander?: number;
}

export interface MapObjectDef {
  id: string;
  kind: 'sign' | 'chest' | 'pedestal';
  x: number;
  y: number;
  text?: string;
  item?: { id: string; quantity: number };
}

export interface ExitDef {
  x: number;
  y: number;
  to: string;
  tx: number;
  ty: number;
  facing: Direction;
  when?: Condition;
  lockedText?: string;
}

export interface BuildingDef {
  x: number;
  y: number;
  w: number;
  h: number;
  roof: string;
  door: number;
  sign?: 'shop' | 'inn';
  chimney?: boolean;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface EncounterTable {
  steps: [number, number];
  groups: { enemies: string[]; weight: number }[];
  safe?: Rect[];
}

export type MapTheme = 'village' | 'forest' | 'cave';
export type Backdrop = 'field' | 'cave' | 'lair';

export interface MapDef {
  id: string;
  name: string;
  theme: MapTheme;
  music: string;
  backdrop: Backdrop;
  layout: string[];
  buildings: BuildingDef[];
  npcs: NpcDef[];
  objects: MapObjectDef[];
  exits: ExitDef[];
  encounters?: EncounterTable;
}
