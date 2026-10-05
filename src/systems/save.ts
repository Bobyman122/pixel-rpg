import { MAPS } from '@/data/maps';
import { Direction, type Character, type InventoryEntry } from '@/types';

export const SAVE_VERSION = 1;
export const SAVE_SLOTS = 3;
const KEY = (slot: number) => `crystal-quest:save:${slot}`;

export interface SaveData {
  version: number;
  savedAt: number;
  playTime: number;
  party: Character[];
  inventory: InventoryEntry[];
  gold: number;
  mapId: string;
  x: number;
  y: number;
  facing: Direction;
  flags: string[];
}

export interface SaveSummary {
  slot: number;
  leader: string;
  level: number;
  location: string;
  playTime: number;
  savedAt: number;
  looks: string[];
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function isCharacter(v: unknown): v is Character {
  if (!isObj(v)) return false;
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.level === 'number' &&
    typeof v.hp === 'number' &&
    typeof v.mp === 'number' &&
    isObj(v.base) &&
    isObj(v.equipment) &&
    Array.isArray(v.skills)
  );
}

/** Returns a clean SaveData, or null if the blob is missing, corrupt, or from another version. */
export function validateSave(raw: unknown): SaveData | null {
  if (!isObj(raw) || raw.version !== SAVE_VERSION) return null;
  if (!Array.isArray(raw.party) || raw.party.length === 0 || !raw.party.every(isCharacter)) return null;
  if (!Array.isArray(raw.inventory)) return null;
  if (typeof raw.mapId !== 'string' || !MAPS[raw.mapId]) return null;
  if (typeof raw.x !== 'number' || typeof raw.y !== 'number') return null;
  const facing = Object.values(Direction).includes(raw.facing as Direction) ? (raw.facing as Direction) : Direction.Down;
  return {
    version: SAVE_VERSION,
    savedAt: typeof raw.savedAt === 'number' ? raw.savedAt : 0,
    playTime: typeof raw.playTime === 'number' ? raw.playTime : 0,
    party: raw.party as Character[],
    inventory: (raw.inventory as unknown[]).filter(
      (e): e is InventoryEntry => isObj(e) && typeof e.itemId === 'string' && typeof e.quantity === 'number',
    ),
    gold: typeof raw.gold === 'number' ? raw.gold : 0,
    mapId: raw.mapId,
    x: raw.x,
    y: raw.y,
    facing,
    flags: Array.isArray(raw.flags) ? raw.flags.filter((f): f is string => typeof f === 'string') : [],
  };
}

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function writeSave(slot: number, data: SaveData): boolean {
  try {
    storage()?.setItem(KEY(slot), JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function readSave(slot: number): SaveData | null {
  try {
    const raw = storage()?.getItem(KEY(slot));
    return raw ? validateSave(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function summarize(slot: number, data: SaveData): SaveSummary {
  return {
    slot,
    leader: data.party[0]?.name ?? '???',
    level: data.party[0]?.level ?? 1,
    location: MAPS[data.mapId]?.name ?? '???',
    playTime: data.playTime,
    savedAt: data.savedAt,
    looks: data.party.map((c) => c.look),
  };
}

export function listSaves(): (SaveSummary | null)[] {
  return Array.from({ length: SAVE_SLOTS }, (_, i) => {
    const d = readSave(i);
    return d ? summarize(i, d) : null;
  });
}

export function hasAnySave() {
  return listSaves().some(Boolean);
}

export function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}
