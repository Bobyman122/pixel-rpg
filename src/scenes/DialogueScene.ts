import { PORTRAITS } from '@/data/dialogues';
import { img } from '@/engine/assets';
import { Sound } from '@/engine/audio';
import { GAME_HEIGHT, GAME_WIDTH } from '@/engine/constants';
import { Input } from '@/engine/InputManager';
import { SceneManager, type Scene } from '@/engine/SceneManager';
import { getFace } from '@/gfx/characters';
import { drawText, LINE_HEIGHT, measureText, wrapText } from '@/gfx/font';
import { COLORS, drawCursor, drawMoreArrow, drawWindow } from '@/gfx/ui';
import { game } from '@/store/gameStore';
import { TEXT_SPEED_CPS } from '@/systems/settings';
import type { DialogueAction, DialogueLine, DialogueScript } from '@/types';
import { ListCursor } from './common';

/** Something that can carry out dialogue actions (the overworld). */
export interface DialogueHost {
  /** Immediate or animated actions; call `done` to continue the conversation. */
  runAction(action: DialogueAction, done: () => void): void;
}

/** Actions that end the conversation before they run (they open other screens). */
const TERMINAL: DialogueAction['type'][] = ['shop', 'battle', 'ending'];

// The pack's dialogue boxes: 300x58 with a name tab, with or without a portrait slot.
const BOX_W = 300;
const BOX_H = 58;
const TAB_W = 68;
const PORTRAIT_TEXT_X = 60;
const PLAIN_TEXT_X = 12;
const TEXT_RIGHT = 292;
const LINES_PER_PAGE = 3;
const INK = '#3a2430';

export class DialogueScene implements Scene {
  private lineId: string | null;
  private pages: string[][] = [];
  private page = 0;
  private shown = 0;
  private waiting = false;
  private choiceCursor = new ListCursor();
  private onTop: boolean;

  constructor(
    private script: DialogueScript,
    private host: DialogueHost | null,
    opts: { top?: boolean } = {},
    private onClose?: () => void,
  ) {
    this.lineId = script.start;
    this.onTop = opts.top ?? false;
  }

  /** A one-off message with no speaker. */
  static message(text: string, onClose?: () => void, opts: { top?: boolean } = {}) {
    return new DialogueScene({ id: 'msg', start: 'a', lines: { a: { text } } }, null, opts, onClose);
  }

  enter() {
    this.loadLine();
  }

  private get line(): DialogueLine | null {
    return this.lineId ? (this.script.lines[this.lineId] ?? null) : null;
  }

  private loadLine() {
    const line = this.line;
    if (!line) {
      this.close();
      return;
    }
    const wrapped = wrapText(line.text, TEXT_RIGHT - this.textX(line));
    this.pages = [];
    for (let i = 0; i < wrapped.length; i += LINES_PER_PAGE) this.pages.push(wrapped.slice(i, i + LINES_PER_PAGE));
    this.page = 0;
    this.shown = 0;
    this.choiceCursor.index = 0;
  }

  private portrait(line: DialogueLine) {
    return line.speaker ? PORTRAITS[line.speaker] : undefined;
  }

  private textX(line: DialogueLine) {
    return this.portrait(line) ? PORTRAIT_TEXT_X : PLAIN_TEXT_X;
  }

  private get pageText() {
    return this.pages[this.page]?.join('\n') ?? '';
  }

  private get pageDone() {
    return this.shown >= this.pageText.length;
  }

  private get isLastPage() {
    return this.page >= this.pages.length - 1;
  }

  private close() {
    if (SceneManager.has(this)) SceneManager.remove(this);
    this.onClose?.();
  }

  private advance(next: string | null | undefined, action?: DialogueAction) {
    const go = () => {
      this.waiting = false;
      this.lineId = next ?? null;
      this.loadLine();
    };
    if (!action || !this.host) {
      go();
      return;
    }
    if (TERMINAL.includes(action.type)) {
      this.close();
      this.host.runAction(action, () => {});
      return;
    }
    this.waiting = true;
    this.host.runAction(action, go);
  }

  update(dt: number) {
    if (this.waiting) return;
    const line = this.line;
    if (!line) return;

    if (!this.pageDone) {
      const before = Math.floor(this.shown);
      this.shown = Math.min(this.pageText.length, this.shown + dt * TEXT_SPEED_CPS[game().settings.textSpeed]);
      if (Math.floor(this.shown) > before && this.pageText[Math.floor(this.shown) - 1]?.trim()) Sound.sfx('blip');
      if (Input.isPressed('confirm') || Input.isPressed('cancel')) this.shown = this.pageText.length;
      return;
    }

    const choices = this.isLastPage ? line.choices : undefined;
    if (choices?.length) {
      this.choiceCursor.update(choices.length);
      if (Input.isPressed('confirm')) {
        Sound.sfx('confirm');
        const c = choices[this.choiceCursor.index];
        this.advance(c.next, c.action);
      }
      return;
    }

    if (Input.isPressed('confirm') || Input.isPressed('cancel')) {
      if (!this.isLastPage) {
        this.page++;
        this.shown = 0;
        return;
      }
      this.advance(line.next, line.action);
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    const line = this.line;
    if (!line) return;
    const x = Math.floor((GAME_WIDTH - BOX_W) / 2);
    const y = this.onTop ? 4 : GAME_HEIGHT - BOX_H - 4;
    const look = this.portrait(line);

    if (line.speaker) {
      ctx.drawImage(img(look ? 'ui/dialog-face' : 'ui/dialog'), x, y);
      // Long names get a wider tab: stretch its plain middle section.
      const nameW = measureText(line.speaker) + 12;
      if (nameW > TAB_W) ctx.drawImage(img('ui/dialog'), 20, 0, 20, 11, x + 40, y, nameW - 36, 11);
      if (nameW > TAB_W) ctx.drawImage(img('ui/dialog'), 60, 0, 11, 11, x + nameW + 3, y, 11, 11);
      drawText(ctx, line.speaker, x + 9, y + 2, '#ffffff', { shadow: '#5a2a1c' });
      if (look) ctx.drawImage(getFace(look), x + 7, y + 16);
    } else {
      // No speaker: same box without the name tab.
      ctx.drawImage(img('ui/dialog'), 0, 9, BOX_W, BOX_H - 9, x, y + 9, BOX_W, BOX_H - 9);
    }

    const tx = x + this.textX(line);
    const text = this.pageText.slice(0, Math.floor(this.shown));
    text.split('\n').forEach((t, i) => drawText(ctx, t, tx, y + 17 + i * LINE_HEIGHT, INK, { shadow: null }));

    if (this.waiting) return;
    const choices = this.isLastPage ? line.choices : undefined;
    if (this.pageDone && choices?.length) {
      const cw = Math.max(...choices.map((c) => measureText(c.text))) + 34;
      const ch = choices.length * LINE_HEIGHT + 14;
      const cx = x + BOX_W - cw - 4;
      const cy = this.onTop ? y + BOX_H + 2 : y - ch + 6;
      drawWindow(ctx, cx, cy, cw, ch);
      choices.forEach((c, i) => drawText(ctx, c.text, cx + 22, cy + 8 + i * LINE_HEIGHT, i === this.choiceCursor.index ? COLORS.highlight : COLORS.text));
      drawCursor(ctx, cx + 19, cy + 11 + this.choiceCursor.index * LINE_HEIGHT);
    } else if (this.pageDone) {
      drawMoreArrow(ctx, x + BOX_W - 16, y + BOX_H - 9);
    }
  }
}
