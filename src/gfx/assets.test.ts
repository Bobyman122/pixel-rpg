import { describe, expect, it } from 'vitest';
import { clean, HEADS, KNEEL_LEGS, LEGS, TORSO } from './characterTemplates';
import { GLYPH_HEIGHT, GLYPHS } from './fontData';
import { measureText, wrapText } from './font';

describe('font', () => {
  it('has consistent glyph rows', () => {
    for (const [ch, rows] of Object.entries(GLYPHS)) {
      expect(rows.length, ch).toBeLessThanOrEqual(GLYPH_HEIGHT);
      for (const r of rows) expect(r.length, ch).toBe(rows[0].length);
    }
  });

  it('wraps text to a pixel width', () => {
    const lines = wrapText('The quick brown fox jumps over the lazy dog again and again', 80);
    expect(lines.length).toBeGreaterThan(1);
    for (const l of lines) expect(measureText(l)).toBeLessThanOrEqual(80);
  });
});

describe('character templates', () => {
  const all: string[][] = [TORSO.down, TORSO.side, KNEEL_LEGS];
  for (const h of Object.values(HEADS)) all.push(h.down, h.side);
  for (const l of Object.values(LEGS)) all.push(...l.down, ...l.side);

  it('are all 16 pixels wide', () => {
    for (const rows of all) for (const r of clean(rows)) expect(r.length).toBe(16);
  });
});
