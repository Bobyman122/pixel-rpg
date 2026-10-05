import { Sound } from '@/engine/audio';
import { GAME_HEIGHT, GAME_WIDTH } from '@/engine/constants';
import { SceneManager, type Scene } from '@/engine/SceneManager';
import { getSheet } from '@/gfx/characters';
import { drawText } from '@/gfx/font';
import { COLORS, drawCursor, drawSelection, drawWindow } from '@/gfx/ui';
import { game } from '@/store/gameStore';
import { formatTime, listSaves, readSave, SAVE_SLOTS, writeSave, type SaveData, type SaveSummary } from '@/systems/save';
import { Direction } from '@/types';
import { cancelPressed, confirmPressed, ListCursor } from './common';

export class SaveScene implements Scene {
  readonly opaque = true;
  private cursor = new ListCursor();
  private slots: (SaveSummary | null)[] = [];
  private confirming = false;
  private yesNo = new ListCursor();
  private note: string | null = null;

  constructor(
    private mode: 'save' | 'load',
    private onLoad?: (data: SaveData) => void,
  ) {}

  enter() {
    this.slots = listSaves();
    if (this.mode === 'load') {
      const first = this.slots.findIndex(Boolean);
      this.cursor.index = Math.max(0, first);
    }
  }

  update() {
    if (this.confirming) {
      this.yesNo.update(2);
      if (cancelPressed()) {
        Sound.sfx('cancel');
        this.confirming = false;
      } else if (confirmPressed()) {
        this.confirming = false;
        if (this.yesNo.index === 0) this.doSave();
        else Sound.sfx('cancel');
      }
      return;
    }
    this.cursor.update(SAVE_SLOTS);
    if (cancelPressed()) {
      Sound.sfx('cancel');
      SceneManager.remove(this);
      return;
    }
    if (!confirmPressed()) return;
    const slot = this.cursor.index;
    if (this.mode === 'save') {
      if (this.slots[slot]) {
        Sound.sfx('confirm');
        this.confirming = true;
        this.yesNo.index = 1;
      } else this.doSave();
    } else {
      const data = readSave(slot);
      if (!data) {
        Sound.sfx('error');
        return;
      }
      Sound.sfx('confirm');
      this.onLoad?.(data);
    }
  }

  private doSave() {
    const ok = writeSave(this.cursor.index, game().toSave());
    this.slots = listSaves();
    if (ok) {
      Sound.sfx('save');
      this.note = `Saved to File ${this.cursor.index + 1}.`;
    } else {
      Sound.sfx('error');
      this.note = "Couldn't save. Is browser storage disabled?";
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#120c0a';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    drawWindow(ctx, 0, 0, GAME_WIDTH, 22);
    const title = this.note ?? (this.mode === 'save' ? 'Save your progress to which file?' : 'Load which file?');
    drawText(ctx, title, 12, 7, this.note ? COLORS.highlight : COLORS.text);

    for (let i = 0; i < SAVE_SLOTS; i++) {
      const y = 22 + i * 52;
      drawWindow(ctx, 0, y, GAME_WIDTH, 52);
      if (i === this.cursor.index) drawSelection(ctx, 6, y + 5, GAME_WIDTH - 12, 42);
      drawText(ctx, `File ${i + 1}`, 24, y + 8, COLORS.highlight);
      const s = this.slots[i];
      if (!s) {
        drawText(ctx, '- Empty -', GAME_WIDTH / 2, y + 21, COLORS.disabled, { align: 'center' });
        continue;
      }
      s.looks.forEach((look, j) => ctx.drawImage(getSheet(look).frames[Direction.Down][0], 24 + j * 20, y + 25));
      drawText(ctx, `${s.leader}  Lv ${s.level}`, 100, y + 8);
      drawText(ctx, s.location, 100, y + 20, COLORS.dim);
      drawText(ctx, `Time ${formatTime(s.playTime)}`, 100, y + 32, COLORS.dim);
      if (s.savedAt) {
        const d = new Date(s.savedAt);
        drawText(ctx, d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), GAME_WIDTH - 14, y + 8, COLORS.dim, {
          align: 'right',
        });
      }
    }
    drawCursor(ctx, 21, 11 + 22 + this.cursor.index * 52, this.confirming);

    if (this.confirming) {
      const w = 124;
      const x = Math.floor((GAME_WIDTH - w) / 2);
      drawWindow(ctx, x, 62, w, 54);
      drawText(ctx, 'Overwrite this file?', GAME_WIDTH / 2, 70, COLORS.text, { align: 'center' });
      drawText(ctx, 'Yes', x + 36, 86, this.yesNo.index === 0 ? COLORS.highlight : COLORS.text);
      drawText(ctx, 'No', x + 36, 98, this.yesNo.index === 1 ? COLORS.highlight : COLORS.text);
      drawCursor(ctx, x + 33, 89 + this.yesNo.index * 12);
    }
  }
}
