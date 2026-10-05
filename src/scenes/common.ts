import { Sound } from '@/engine/audio';
import { Input } from '@/engine/InputManager';

export const confirmPressed = () => Input.isPressed('confirm');
export const cancelPressed = () => Input.isPressed('cancel') || Input.isPressed('menu');

/** Cursor over a list or grid, with wrap-around and key repeat. */
export class ListCursor {
  index = 0;
  constructor(public columns = 1) {}

  clamp(count: number) {
    if (count <= 0) this.index = 0;
    else if (this.index >= count) this.index = count - 1;
  }

  /** Returns true if the cursor moved this frame. */
  update(count: number, opts: { horizontal?: boolean } = {}): boolean {
    if (count <= 0) return false;
    const cols = this.columns;
    const prev = this.index;
    const rows = Math.ceil(count / cols);
    const row = Math.floor(this.index / cols);
    const col = this.index % cols;
    if (Input.isRepeat('down') && !opts.horizontal) {
      let r = (row + 1) % rows;
      if (r * cols + col >= count) r = 0;
      this.index = r * cols + col;
    } else if (Input.isRepeat('up') && !opts.horizontal) {
      let r = (row - 1 + rows) % rows;
      while (r * cols + col >= count) r--;
      this.index = r * cols + col;
    } else if (cols > 1 && Input.isRepeat('right')) {
      this.index = col + 1 < cols && this.index + 1 < count ? this.index + 1 : row * cols;
    } else if (cols > 1 && Input.isRepeat('left')) {
      this.index = col > 0 ? this.index - 1 : Math.min(count - 1, row * cols + cols - 1);
    } else if (opts.horizontal && (Input.isRepeat('right') || Input.isRepeat('down'))) {
      this.index = (this.index + 1) % count;
    } else if (opts.horizontal && (Input.isRepeat('left') || Input.isRepeat('up'))) {
      this.index = (this.index - 1 + count) % count;
    }
    if (this.index !== prev) {
      Sound.sfx('cursor');
      return true;
    }
    return false;
  }
}

/** Keeps a scrolling list's selected row on screen. */
export function scrollFor(index: number, scroll: number, visibleRows: number, columns = 1): number {
  const row = Math.floor(index / columns);
  if (row < scroll) return row;
  if (row >= scroll + visibleRows) return row - visibleRows + 1;
  return scroll;
}
