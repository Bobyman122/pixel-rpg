import { CHARACTER_DEFS, expToNext, GROWTH, MAX_LEVEL } from '@/data/characters';
import type { BaseStats, Character } from '@/types';
import { effectiveStats, STAT_KEYS } from './stats';

export interface LevelUp {
  level: number;
  gains: BaseStats;
  learned: string[];
}

function learnedAt(id: string, level: number): string[] {
  return CHARACTER_DEFS[id].learnset.filter((l) => l.level === level).map((l) => l.skill);
}

function levelUpOnce(c: Character): { char: Character; info: LevelUp } {
  const def = CHARACTER_DEFS[c.id];
  const growth = GROWTH[c.characterClass];
  const level = c.level + 1;
  // Every third level gives a little extra so growth doesn't feel flat.
  const bonus = level % 3 === 0 ? 1 : 0;
  const gains = { ...growth };
  gains.atk += bonus;
  gains.mag += c.characterClass === 'Mage' ? bonus : 0;
  gains.maxHp += bonus * 2;
  const base = { ...c.base };
  for (const key of STAT_KEYS) base[key] += gains[key];
  const learned = def ? learnedAt(c.id, level).filter((s) => !c.skills.includes(s)) : [];
  return {
    char: {
      ...c,
      level,
      base,
      skills: [...c.skills, ...learned],
      // New max HP/MP is added on top of what the character currently has.
      hp: c.hp > 0 ? c.hp + gains.maxHp : 0,
      mp: c.mp + gains.maxMp,
    },
    info: { level, gains, learned },
  };
}

export function createCharacter(id: string, level = 1): Character {
  const def = CHARACTER_DEFS[id];
  if (!def) throw new Error(`Unknown character ${id}`);
  let c: Character = {
    id,
    name: def.name,
    characterClass: def.characterClass,
    look: def.look,
    level: 1,
    exp: 0,
    hp: 0,
    mp: 0,
    base: { ...def.base },
    equipment: { ...def.equipment },
    skills: learnedAt(id, 1),
  };
  while (c.level < Math.min(level, MAX_LEVEL)) c = levelUpOnce(c).char;
  const stats = effectiveStats(c);
  return { ...c, hp: stats.maxHp, mp: stats.maxMp };
}

/** Award experience, applying as many level-ups as it pays for. */
export function gainExp(c: Character, amount: number): { char: Character; levels: LevelUp[] } {
  let char: Character = { ...c, exp: c.exp + amount };
  const levels: LevelUp[] = [];
  while (char.level < MAX_LEVEL && char.exp >= expToNext(char.level)) {
    const need = expToNext(char.level);
    const res = levelUpOnce({ ...char, exp: char.exp - need });
    char = res.char;
    levels.push(res.info);
  }
  return { char: clampVitals(char), levels };
}

/** Keep HP/MP inside the character's (equipment-adjusted) maximums. */
export function clampVitals(c: Character): Character {
  const s = effectiveStats(c);
  return { ...c, hp: Math.max(0, Math.min(c.hp, s.maxHp)), mp: Math.max(0, Math.min(c.mp, s.maxMp)) };
}
