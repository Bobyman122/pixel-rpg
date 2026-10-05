import { Sound } from '@/engine/audio';
import { GAME_HEIGHT, GAME_WIDTH } from '@/engine/constants';
import { Input } from '@/engine/InputManager';
import { SceneManager, type Scene } from '@/engine/SceneManager';
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

const BOX_W = 240;
const BOX_H = 56;
const TEXT_W = BOX_W - 24;
const LINES_PER_PAGE = 3;

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
    const wrapped = wrapText(line.text, TEXT_W);
    this.pages = [];
    for (let i = 0; i < wrapped.length; i += LINES_PER_PAGE) this.pages.push(wrapped.slice(i, i + LINES_PER_PAGE));
    this.page = 0;
    this.shown = 0;
    this.choiceCursor.index = 0;
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
    const y = this.onTop ? 8 : GAME_HEIGHT - BOX_H - 8;

    if (line.speaker) {
      const nw = measureText(line.speaker) + 16;
      const ny = this.onTop ? y + BOX_H - 2 : y - 14;
      drawWindow(ctx, x + 6, ny, nw, 18);
      drawText(ctx, line.speaker, x + 14, ny + 5, COLORS.highlight);
    }
    drawWindow(ctx, x, y, BOX_W, BOX_H);

    const text = this.pageText.slice(0, Math.floor(this.shown));
    text.split('\n').forEach((t, i) => drawText(ctx, t, x + 12, y + 9 + i * LINE_HEIGHT, line.speaker ? COLORS.text : '#e8f0ff'));

    if (this.waiting) return;
    const choices = this.isLastPage ? line.choices : undefined;
    if (this.pageDone && choices?.length) {
      const cw = Math.max(...choices.map((c) => measureText(c.text))) + 34;
      const ch = choices.length * LINE_HEIGHT + 12;
      const cx = x + BOX_W - cw;
      const cy = this.onTop ? y + BOX_H + 4 : y - ch - (line.speaker ? 16 : 4);
      drawWindow(ctx, cx, cy, cw, ch);
      choices.forEach((c, i) => drawText(ctx, c.text, cx + 22, cy + 7 + i * LINE_HEIGHT));
      drawCursor(ctx, cx + 20, cy + 10 + this.choiceCursor.index * LINE_HEIGHT);
    } else if (this.pageDone) {
      drawMoreArrow(ctx, x + BOX_W - 18, y + BOX_H - 10);
    }
  }
}
