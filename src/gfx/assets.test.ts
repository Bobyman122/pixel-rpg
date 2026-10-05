import { describe, expect, it } from 'vitest';
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
