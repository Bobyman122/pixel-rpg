export enum TileType {
  Grass = 0,
  Dirt = 1,
  Water = 2,
  Stone = 3,
  Wall = 4,
  Tree = 5,
  Door = 6,
  Stairs = 7,
  Shop = 8,
  Inn = 9,
  FloorWood = 10,
  FloorStone = 11,
  Sand = 12,
  Bridge = 13,
}

export enum Direction {
  Up = 'Up',
  Down = 'Down',
  Left = 'Left',
  Right = 'Right',
}

export interface MapTransition {
  fromMapId: string;
  toMapId: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

export interface EncounterZone {
  enemyIds: string[];
  rate: number;
}

export interface NPCData {
  id: string;
  name: string;
  x: number;
  y: number;
  facing: Direction;
  spriteColor: string;
  dialogueId: string;
}

export interface GameMap {
  id: string;
  name: string;
  width: number;
  height: number;
  ground: TileType[][];
  objects: (TileType | null)[][];
  collisions: boolean[][];
  npcs: NPCData[];
  transitions: MapTransition[];
  encounterZone: EncounterZone | null;
}
