import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CHARACTER_DEFS } from '@/data/characters';
import { DIALOGUES, PORTRAITS } from '@/data/dialogues';
import { ENEMIES } from '@/data/enemies';
import { ITEMS } from '@/data/items';
import { MAPS } from '@/data/maps';
import { BOSS_LOOK, LOOKS } from '@/gfx/characters';
import { iconExists } from '@/gfx/ui';
import { IMAGE_KEYS } from './assets';
import { MUSIC_TRACKS } from './audio';

const PUBLIC = join(__dirname, '../../public/assets');
const onDisk = (path: string) => existsSync(join(PUBLIC, path));

describe('asset files', () => {
  it('every image the game loads is in public/assets', () => {
    for (const key of IMAGE_KEYS) expect(onDisk(`${key}.png`), key).toBe(true);
  });

  it('every music track and sound effect is in public/assets', () => {
    for (const t of MUSIC_TRACKS) expect(onDisk(`music/${t}.mp3`), t).toBe(true);
    for (const s of ['cursor', 'confirm', 'cancel', 'hit', 'magic', 'jingle-victory', 'jingle-levelup']) {
      expect(onDisk(`sfx/${s}.wav`), s).toBe(true);
    }
  });

  it('ships the asset licences', () => {
    expect(onDisk('LICENSE-ninja-adventure.txt')).toBe(true);
  });
});

describe('art coverage', () => {
  it('every character and NPC has a sprite sheet', () => {
    const known = new Set([...LOOKS, BOSS_LOOK]);
    for (const c of Object.values(CHARACTER_DEFS)) expect(known.has(c.look), c.name).toBe(true);
    for (const m of Object.values(MAPS)) for (const n of m.npcs) expect(known.has(n.look), n.id).toBe(true);
  });

  it('every speaker with a portrait maps to a real face', () => {
    const known = new Set([...LOOKS, BOSS_LOOK]);
    for (const [name, look] of Object.entries(PORTRAITS)) expect(known.has(look), name).toBe(true);
    // Named speakers should all get a portrait.
    for (const d of Object.values(DIALOGUES)) {
      for (const line of Object.values(d.lines)) if (line.speaker) expect(PORTRAITS[line.speaker], line.speaker).toBeDefined();
    }
  });

  it('every enemy has a battle sprite', () => {
    for (const e of Object.values(ENEMIES)) {
      if (e.boss) continue;
      expect(IMAGE_KEYS.includes(`monsters/${e.id}`), e.id).toBe(true);
    }
  });

  it('every item has an icon', () => {
    for (const item of Object.values(ITEMS)) expect(iconExists(item.icon), item.id).toBe(true);
  });

  it('every map plays a track that exists', () => {
    for (const m of Object.values(MAPS)) expect(MUSIC_TRACKS as readonly string[]).toContain(m.music);
  });
});
