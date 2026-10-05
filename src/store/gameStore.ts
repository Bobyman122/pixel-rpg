import { create } from 'zustand';
import { ITEMS } from '@/data/items';
import { START } from '@/data/maps';
import { addItem, countItem, removeItem } from '@/systems/inventory';
import { clampVitals, createCharacter } from '@/systems/progression';
import { SAVE_VERSION, type SaveData } from '@/systems/save';
import { DEFAULT_SETTINGS, type Settings } from '@/systems/settings';
import { effectiveStats } from '@/systems/stats';
import type { Character, Direction, EquipSlot, InventoryEntry } from '@/types';

export interface GameState {
  party: Character[];
  inventory: InventoryEntry[];
  gold: number;
  mapId: string;
  x: number;
  y: number;
  facing: Direction;
  flags: Record<string, boolean>;
  playTime: number;
  settings: Settings;

  newGame: () => void;
  loadSave: (data: SaveData) => void;
  toSave: () => SaveData;

  setPosition: (x: number, y: number) => void;
  setFacing: (facing: Direction) => void;
  setMap: (mapId: string, x: number, y: number, facing: Direction) => void;

  setFlag: (flag: string) => void;

  addItem: (itemId: string, quantity?: number) => void;
  removeItem: (itemId: string, quantity?: number) => void;
  countItem: (itemId: string) => number;
  addGold: (amount: number) => void;
  spendGold: (amount: number) => boolean;

  setParty: (party: Character[]) => void;
  updateCharacter: (id: string, fn: (c: Character) => Character) => void;
  joinParty: (characterId: string) => void;
  healAll: () => void;
  equip: (characterId: string, slot: EquipSlot, itemId: string | null) => boolean;

  addPlayTime: (seconds: number) => void;
  updateSettings: (patch: Partial<Settings>) => void;
}

const initialWorld = () => ({
  party: [] as Character[],
  inventory: [] as InventoryEntry[],
  gold: 0,
  mapId: START.map,
  x: START.x,
  y: START.y,
  facing: START.facing,
  flags: {} as Record<string, boolean>,
  playTime: 0,
});

export const useGame = create<GameState>((set, get) => ({
  ...initialWorld(),
  settings: { ...DEFAULT_SETTINGS },

  newGame: () =>
    set({
      ...initialWorld(),
      party: [createCharacter('kael')],
      inventory: [
        { itemId: 'potion', quantity: 4 },
        { itemId: 'antidote', quantity: 1 },
      ],
      gold: 150,
    }),

  loadSave: (d) =>
    set({
      party: d.party.map(clampVitals),
      inventory: d.inventory.filter((e) => ITEMS[e.itemId]),
      gold: d.gold,
      mapId: d.mapId,
      x: d.x,
      y: d.y,
      facing: d.facing,
      flags: Object.fromEntries(d.flags.map((f) => [f, true])),
      playTime: d.playTime,
    }),

  toSave: () => {
    const s = get();
    return {
      version: SAVE_VERSION,
      savedAt: Date.now(),
      playTime: s.playTime,
      party: s.party,
      inventory: s.inventory,
      gold: s.gold,
      mapId: s.mapId,
      x: s.x,
      y: s.y,
      facing: s.facing,
      flags: Object.keys(s.flags).filter((k) => s.flags[k]),
    };
  },

  setPosition: (x, y) => set({ x, y }),
  setFacing: (facing) => set({ facing }),
  setMap: (mapId, x, y, facing) => set({ mapId, x, y, facing }),

  setFlag: (flag) => set((s) => ({ flags: { ...s.flags, [flag]: true } })),

  addItem: (itemId, quantity = 1) => set((s) => ({ inventory: addItem(s.inventory, itemId, quantity) })),
  removeItem: (itemId, quantity = 1) => set((s) => ({ inventory: removeItem(s.inventory, itemId, quantity) })),
  countItem: (itemId) => countItem(get().inventory, itemId),
  addGold: (amount) => set((s) => ({ gold: Math.max(0, Math.min(999999, s.gold + amount)) })),
  spendGold: (amount) => {
    if (get().gold < amount) return false;
    set((s) => ({ gold: s.gold - amount }));
    return true;
  },

  setParty: (party) => set({ party }),
  updateCharacter: (id, fn) => set((s) => ({ party: s.party.map((c) => (c.id === id ? fn(c) : c)) })),

  joinParty: (characterId) => {
    const s = get();
    if (s.party.some((c) => c.id === characterId)) return;
    const level = s.party[0]?.level ?? 1;
    set({ party: [...s.party, createCharacter(characterId, level)] });
  },

  healAll: () =>
    set((s) => ({
      party: s.party.map((c) => {
        const st = effectiveStats(c);
        return { ...c, hp: st.maxHp, mp: st.maxMp };
      }),
    })),

  equip: (characterId, slot, itemId) => {
    const s = get();
    const c = s.party.find((p) => p.id === characterId);
    if (!c) return false;
    if (itemId && countItem(s.inventory, itemId) < 1) return false;
    let inventory = s.inventory;
    const current = c.equipment[slot];
    if (current) inventory = addItem(inventory, current, 1);
    if (itemId) inventory = removeItem(inventory, itemId, 1);
    const updated = clampVitals({ ...c, equipment: { ...c.equipment, [slot]: itemId } });
    set({ inventory, party: s.party.map((p) => (p.id === characterId ? updated : p)) });
    return true;
  },

  addPlayTime: (seconds) => set((s) => ({ playTime: s.playTime + seconds })),
  updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
}));

export const game = () => useGame.getState();
