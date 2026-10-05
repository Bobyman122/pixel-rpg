import { ITEMS } from '@/data/items';
import type { InventoryEntry, Item } from '@/types';

export const MAX_STACK = 99;

export function countItem(inv: InventoryEntry[], itemId: string): number {
  return inv.find((e) => e.itemId === itemId)?.quantity ?? 0;
}

export function addItem(inv: InventoryEntry[], itemId: string, quantity = 1): InventoryEntry[] {
  if (!ITEMS[itemId] || quantity <= 0) return inv;
  const existing = inv.find((e) => e.itemId === itemId);
  if (existing) {
    return inv.map((e) => (e.itemId === itemId ? { ...e, quantity: Math.min(MAX_STACK, e.quantity + quantity) } : e));
  }
  return [...inv, { itemId, quantity: Math.min(MAX_STACK, quantity) }];
}

export function removeItem(inv: InventoryEntry[], itemId: string, quantity = 1): InventoryEntry[] {
  return inv
    .map((e) => (e.itemId === itemId ? { ...e, quantity: e.quantity - quantity } : e))
    .filter((e) => e.quantity > 0);
}

const KIND_ORDER: Record<Item['kind'], number> = { consumable: 0, weapon: 1, armor: 2, accessory: 3, key: 4 };

/** Inventory entries sorted for display (consumables first, key items last). */
export function sortedInventory(inv: InventoryEntry[]): (InventoryEntry & { item: Item })[] {
  return inv
    .filter((e) => ITEMS[e.itemId])
    .map((e) => ({ ...e, item: ITEMS[e.itemId] }))
    .sort((a, b) => KIND_ORDER[a.item.kind] - KIND_ORDER[b.item.kind] || a.item.name.localeCompare(b.item.name));
}

export function sellPrice(item: Item): number {
  return Math.floor(item.price / 2);
}
