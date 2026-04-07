import { create } from 'zustand';
import {
  Character, Stats, EquipSlot, Direction,
  Item, InventoryItem,
  BattleState, BattlePhase, Enemy, BattleEnemy,
  DialogueScript,
} from '@/types';

interface GameState {
  // Party
  party: Character[];

  // Inventory
  inventory: InventoryItem[];
  gold: number;

  // World
  currentMapId: string;
  playerX: number;
  playerY: number;
  playerFacing: Direction;
  storyFlags: Set<string>;

  // Battle
  battle: BattleState | null;

  // UI
  currentDialogue: DialogueScript | null;
  currentDialogueLine: string | null;
  menuOpen: boolean;
  gameStarted: boolean;

  // Party actions
  addToParty: (character: Character) => void;
  removeFromParty: (characterId: string) => void;
  updateCharacterStats: (characterId: string, updates: Partial<Stats>) => void;
  healParty: () => void;
  damageCharacter: (characterId: string, amount: number) => void;
  useCharacterMp: (characterId: string, amount: number) => void;

  // Inventory actions
  addItem: (item: Item, quantity?: number) => void;
  removeItem: (itemId: string, quantity?: number) => void;
  addGold: (amount: number) => void;
  getItem: (itemId: string) => InventoryItem | undefined;

  // Equipment actions
  equipItem: (characterId: string, itemId: string, slot: EquipSlot) => void;
  unequipItem: (characterId: string, slot: EquipSlot) => void;

  // World actions
  setPosition: (x: number, y: number) => void;
  setFacing: (direction: Direction) => void;
  setMap: (mapId: string, x: number, y: number) => void;
  setFlag: (flag: string) => void;
  hasFlag: (flag: string) => boolean;

  // Battle actions
  startBattle: (enemies: Enemy[]) => void;
  endBattle: () => void;
  updateBattle: (updates: Partial<BattleState>) => void;

  // Dialogue actions
  startDialogue: (script: DialogueScript) => void;
  advanceDialogue: (choiceIndex?: number) => void;
  endDialogue: () => void;

  // Menu
  toggleMenu: () => void;
  setGameStarted: (started: boolean) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  party: [],
  inventory: [],
  gold: 100,
  currentMapId: 'millbrook_village',
  playerX: 7,
  playerY: 10,
  playerFacing: Direction.Down,
  storyFlags: new Set<string>(),
  battle: null,
  currentDialogue: null,
  currentDialogueLine: null,
  menuOpen: false,
  gameStarted: false,

  addToParty: (character) =>
    set((s) => ({ party: [...s.party, character] })),

  removeFromParty: (characterId) =>
    set((s) => ({ party: s.party.filter((c) => c.id !== characterId) })),

  updateCharacterStats: (characterId, updates) =>
    set((s) => ({
      party: s.party.map((c) =>
        c.id === characterId ? { ...c, stats: { ...c.stats, ...updates } } : c
      ),
    })),

  healParty: () =>
    set((s) => ({
      party: s.party.map((c) => ({
        ...c,
        isAlive: true,
        stats: { ...c.stats, hp: c.stats.maxHp, mp: c.stats.maxMp },
      })),
    })),

  damageCharacter: (characterId, amount) =>
    set((s) => ({
      party: s.party.map((c) => {
        if (c.id !== characterId) return c;
        const newHp = Math.max(0, c.stats.hp - amount);
        return { ...c, stats: { ...c.stats, hp: newHp }, isAlive: newHp > 0 };
      }),
    })),

  useCharacterMp: (characterId, amount) =>
    set((s) => ({
      party: s.party.map((c) =>
        c.id === characterId
          ? { ...c, stats: { ...c.stats, mp: Math.max(0, c.stats.mp - amount) } }
          : c
      ),
    })),

  addItem: (item, quantity = 1) =>
    set((s) => {
      const existing = s.inventory.find((i) => i.item.id === item.id);
      if (existing) {
        return {
          inventory: s.inventory.map((i) =>
            i.item.id === item.id ? { ...i, quantity: i.quantity + quantity } : i
          ),
        };
      }
      return { inventory: [...s.inventory, { item, quantity }] };
    }),

  removeItem: (itemId, quantity = 1) =>
    set((s) => ({
      inventory: s.inventory
        .map((i) =>
          i.item.id === itemId ? { ...i, quantity: i.quantity - quantity } : i
        )
        .filter((i) => i.quantity > 0),
    })),

  addGold: (amount) => set((s) => ({ gold: s.gold + amount })),

  getItem: (itemId) => get().inventory.find((i) => i.item.id === itemId),

  equipItem: (characterId, itemId, slot) =>
    set((s) => ({
      party: s.party.map((c) =>
        c.id === characterId
          ? { ...c, equipment: { ...c.equipment, [slot]: itemId } }
          : c
      ),
    })),

  unequipItem: (characterId, slot) =>
    set((s) => ({
      party: s.party.map((c) =>
        c.id === characterId
          ? { ...c, equipment: { ...c.equipment, [slot]: null } }
          : c
      ),
    })),

  setPosition: (x, y) => set({ playerX: x, playerY: y }),
  setFacing: (direction) => set({ playerFacing: direction }),
  setMap: (mapId, x, y) => set({ currentMapId: mapId, playerX: x, playerY: y }),

  setFlag: (flag) =>
    set((s) => {
      const flags = new Set(s.storyFlags);
      flags.add(flag);
      return { storyFlags: flags };
    }),

  hasFlag: (flag) => get().storyFlags.has(flag),

  startBattle: (enemies) => {
    const battleEnemies: BattleEnemy[] = enemies.map((e, i) => ({
      ...e,
      battleId: `${e.id}_${i}`,
      currentHp: e.stats.maxHp,
      currentMp: e.stats.maxMp,
      statusEffects: [],
    }));

    const party = get().party.filter((c) => c.isAlive);
    const allUnits = [
      ...party.map((c) => ({ id: c.id, spd: c.stats.spd })),
      ...battleEnemies.map((e) => ({ id: e.battleId, spd: e.stats.spd })),
    ].sort((a, b) => b.spd - a.spd);

    set({
      battle: {
        enemies: battleEnemies,
        turnOrder: allUnits.map((u) => u.id),
        currentTurnIndex: 0,
        phase: BattlePhase.Start,
        actionQueue: [],
        battleLog: ['A battle begins!'],
        selectedCommand: null,
        selectedSkill: null,
        currentCharacterIndex: 0,
      },
    });
  },

  endBattle: () => set({ battle: null }),

  updateBattle: (updates) =>
    set((s) => ({
      battle: s.battle ? { ...s.battle, ...updates } : null,
    })),

  startDialogue: (script) =>
    set({ currentDialogue: script, currentDialogueLine: script.startLineId }),

  advanceDialogue: (choiceIndex) =>
    set((s) => {
      if (!s.currentDialogue || !s.currentDialogueLine) {
        return { currentDialogue: null, currentDialogueLine: null };
      }
      const line = s.currentDialogue.lines[s.currentDialogueLine];
      if (!line) return { currentDialogue: null, currentDialogueLine: null };

      // Set flag if present
      if (line.setFlag) {
        const flags = new Set(s.storyFlags);
        flags.add(line.setFlag);
        s = { ...s, storyFlags: flags };
      }

      // Handle choices
      if (line.choices && choiceIndex !== undefined) {
        const choice = line.choices[choiceIndex];
        if (choice?.flag) {
          const flags = new Set(s.storyFlags);
          flags.add(choice.flag);
          return { ...s, storyFlags: flags, currentDialogueLine: choice.nextId };
        }
        return { currentDialogueLine: choice?.nextId ?? null };
      }

      // No next line = end
      if (!line.nextId) {
        return { currentDialogue: null, currentDialogueLine: null };
      }

      return { currentDialogueLine: line.nextId };
    }),

  endDialogue: () => set({ currentDialogue: null, currentDialogueLine: null }),

  toggleMenu: () => set((s) => ({ menuOpen: !s.menuOpen })),
  setGameStarted: (started) => set({ gameStarted: started }),
}));
