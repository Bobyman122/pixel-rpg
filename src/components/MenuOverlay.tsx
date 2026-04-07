'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { ITEMS_DB } from '@/data/items';

export function MenuOverlay() {
  const menuOpen = useGameStore((s) => s.menuOpen);
  const party = useGameStore((s) => s.party);
  const inventory = useGameStore((s) => s.inventory);
  const gold = useGameStore((s) => s.gold);
  const toggleMenu = useGameStore((s) => s.toggleMenu);
  const [tab, setTab] = useState<'party' | 'items'>('party');

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'x') {
        e.preventDefault();
        toggleMenu();
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        setTab((t) => (t === 'party' ? 'items' : 'party'));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [menuOpen, toggleMenu]);

  if (!menuOpen) return null;

  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 20, 0.92)' }}
    >
      <div
        className="border-2 rounded p-4 w-[90%] max-h-[90%] overflow-auto"
        style={{
          borderColor: '#6688cc',
          fontFamily: 'monospace',
          color: '#fff',
          fontSize: '16px',
        }}
      >
        {/* Tabs */}
        <div className="flex gap-4 mb-4 border-b border-gray-600 pb-2">
          <button
            className={tab === 'party' ? 'text-yellow-300' : 'text-gray-400'}
            onClick={() => setTab('party')}
          >
            Party
          </button>
          <button
            className={tab === 'items' ? 'text-yellow-300' : 'text-gray-400'}
            onClick={() => setTab('items')}
          >
            Items
          </button>
          <div className="ml-auto text-yellow-500">Gold: {gold}</div>
        </div>

        {tab === 'party' && (
          <div className="space-y-4">
            {party.map((char) => (
              <div key={char.id} className="border border-gray-600 rounded p-2">
                <div className="flex justify-between items-center">
                  <span className="text-yellow-300 font-bold">{char.name}</span>
                  <span className="text-gray-400 text-sm">
                    Lv.{char.stats.lvl} {char.characterClass}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-400">HP</span>
                    <span>{char.stats.hp}/{char.stats.maxHp}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-400">MP</span>
                    <span>{char.stats.mp}/{char.stats.maxMp}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-400">ATK</span>
                    <span>{char.stats.atk}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-300">DEF</span>
                    <span>{char.stats.def}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-400">MAG</span>
                    <span>{char.stats.mag}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-yellow-400">SPD</span>
                    <span>{char.stats.spd}</span>
                  </div>
                </div>
                <div className="mt-1 text-sm text-gray-400">
                  EXP: {char.stats.exp}/{char.stats.expToNext}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'items' && (
          <div className="space-y-1">
            {inventory.length === 0 && (
              <div className="text-gray-500">No items</div>
            )}
            {inventory.map((inv) => (
              <div key={inv.item.id} className="flex justify-between py-1 border-b border-gray-700">
                <span>{inv.item.name}</span>
                <span className="text-gray-400">x{inv.quantity}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 text-gray-500 text-xs text-center">
          Press ESC to close | Arrow keys to switch tabs
        </div>
      </div>
    </div>
  );
}
