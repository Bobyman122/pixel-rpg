import { ITEMS } from '@/data/items';
import { SHOPS } from '@/data/shops';
import { Sound } from '@/engine/audio';
import { GAME_HEIGHT, GAME_WIDTH } from '@/engine/constants';
import { Input } from '@/engine/InputManager';
import { SceneManager, type Scene } from '@/engine/SceneManager';
import { getFace, getSheet } from '@/gfx/characters';
import { drawText, wrapText } from '@/gfx/font';
import { COLORS, drawCursor, drawIcon, drawSelection, drawWindow } from '@/gfx/ui';
import { game } from '@/store/gameStore';
import { MAX_STACK, sellPrice, sortedInventory } from '@/systems/inventory';
import { canEquip, effectiveStats, previewEquip, STAT_KEYS } from '@/systems/stats';
import { Direction, type Item, type StatKey } from '@/types';
import { cancelPressed, confirmPressed, ListCursor, scrollFor } from './common';

type Mode = 'cmd' | 'buy' | 'sell' | 'qty';

const SHORT: Record<StatKey, string> = { maxHp: 'HP', maxMp: 'MP', atk: 'ATK', def: 'DEF', mag: 'MAG', spd: 'SPD' };
const VISIBLE = 6;

export class ShopScene implements Scene {
  readonly opaque = true;
  private mode: Mode = 'cmd';
  private cmd = new ListCursor();
  private list = new ListCursor();
  private scroll = 0;
  private qty = 1;
  private qtyFrom: 'buy' | 'sell' = 'buy';
  private message: string;

  constructor(private shopId: string) {
    this.message = SHOPS[shopId]?.greeting ?? '';
  }

  private get shop() {
    return SHOPS[this.shopId];
  }

  private stock(): Item[] {
    return this.shop.items.map((id) => ITEMS[id]).filter(Boolean);
  }

  private sellable() {
    return sortedInventory(game().inventory).filter((e) => e.item.kind !== 'key' && e.item.price > 0);
  }

  private current(): Item | undefined {
    if (this.mode === 'buy' || (this.mode === 'qty' && this.qtyFrom === 'buy')) return this.stock()[this.list.index];
    if (this.mode === 'sell' || (this.mode === 'qty' && this.qtyFrom === 'sell')) return this.sellable()[this.list.index]?.item;
    return undefined;
  }

  private maxQty(item: Item) {
    const s = game();
    if (this.qtyFrom === 'buy') return Math.min(MAX_STACK - s.countItem(item.id), Math.floor(s.gold / item.price));
    return s.countItem(item.id);
  }

  update() {
    const s = game();
    switch (this.mode) {
      case 'cmd': {
        this.cmd.update(3, { horizontal: true });
        if (cancelPressed() || (confirmPressed() && this.cmd.index === 2)) {
          Sound.sfx('cancel');
          SceneManager.remove(this);
          return;
        }
        if (confirmPressed()) {
          Sound.sfx('confirm');
          this.mode = this.cmd.index === 0 ? 'buy' : 'sell';
          this.list.index = 0;
          this.scroll = 0;
          this.message = this.mode === 'buy' ? 'What catches your eye?' : 'What are you selling?';
        }
        break;
      }
      case 'buy':
      case 'sell': {
        const count = this.mode === 'buy' ? this.stock().length : this.sellable().length;
        this.list.clamp(count);
        this.list.update(count);
        this.scroll = scrollFor(this.list.index, this.scroll, VISIBLE);
        if (cancelPressed()) {
          Sound.sfx('cancel');
          this.mode = 'cmd';
          this.message = this.shop.greeting;
          return;
        }
        if (!confirmPressed()) return;
        const item = this.current();
        if (!item) {
          Sound.sfx('error');
          return;
        }
        this.qtyFrom = this.mode;
        if (this.maxQty(item) <= 0) {
          Sound.sfx('error');
          this.message = this.mode === 'buy' ? (s.gold < item.price ? "You're a little short on gold." : "Your bag can't hold any more.") : '';
          return;
        }
        Sound.sfx('confirm');
        this.qty = 1;
        this.mode = 'qty';
        break;
      }
      case 'qty': {
        const item = this.current();
        if (!item) {
          this.mode = this.qtyFrom;
          return;
        }
        const max = this.maxQty(item);
        const prev = this.qty;
        if (Input.isRepeat('right')) this.qty = Math.min(max, this.qty + 1);
        if (Input.isRepeat('left')) this.qty = Math.max(1, this.qty - 1);
        if (Input.isRepeat('up')) this.qty = Math.min(max, this.qty + 10);
        if (Input.isRepeat('down')) this.qty = Math.max(1, this.qty - 10);
        if (prev !== this.qty) Sound.sfx('cursor');
        if (cancelPressed()) {
          Sound.sfx('cancel');
          this.mode = this.qtyFrom;
          return;
        }
        if (!confirmPressed()) return;
        if (this.qtyFrom === 'buy') {
          if (!s.spendGold(item.price * this.qty)) {
            Sound.sfx('error');
            return;
          }
          s.addItem(item.id, this.qty);
          this.message = `Bought ${this.qty} ${item.name}${this.qty > 1 ? 's' : ''}. Thank you!`;
        } else {
          s.removeItem(item.id, this.qty);
          s.addGold(sellPrice(item) * this.qty);
          this.message = `Sold ${this.qty} ${item.name}${this.qty > 1 ? 's' : ''}.`;
        }
        Sound.sfx('buy');
        this.mode = this.qtyFrom;
        break;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    const s = game();
    ctx.fillStyle = '#120c0a';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    drawWindow(ctx, 0, 0, 212, 22);
    drawText(ctx, this.shop.name, 12, 7, COLORS.highlight);
    drawWindow(ctx, 212, 0, 108, 22);
    drawIcon(ctx, 'coin', 218, 3);
    drawText(ctx, `${s.gold}`, 308, 7, COLORS.gold, { align: 'right' });

    drawWindow(ctx, 0, 22, GAME_WIDTH, 20);
    ['Buy', 'Sell', 'Leave'].forEach((c, i) =>
      drawText(ctx, c, 40 + i * 90, 28, i === this.cmd.index ? COLORS.highlight : this.mode === 'cmd' ? COLORS.text : COLORS.dim),
    );
    drawCursor(ctx, 37 + this.cmd.index * 90, 31, this.mode !== 'cmd');

    // item list
    drawWindow(ctx, 0, 42, 190, 92);
    if (this.mode !== 'cmd') {
      const selling = this.mode === 'sell' || (this.mode === 'qty' && this.qtyFrom === 'sell');
      const listRows = selling
        ? this.sellable().map((e) => ({ item: e.item, price: sellPrice(e.item) }))
        : this.stock().map((item) => ({ item, price: item.price }));
      listRows.forEach((r, i) => {
        const row = i - this.scroll;
        if (row < 0 || row >= VISIBLE) return;
        const y = 49 + row * 14;
        const affordable = selling || s.gold >= r.price;
        if (i === this.list.index) drawSelection(ctx, 18, y - 3, 166, 14);
        drawIcon(ctx, r.item.icon, 22, y - 4);
        drawText(ctx, r.item.name, 40, y, affordable ? COLORS.text : COLORS.disabled);
        drawText(ctx, `${r.price}`, 180, y, affordable ? COLORS.gold : COLORS.disabled, { align: 'right' });
      });
      if (listRows.length === 0) drawText(ctx, 'Nothing to sell.', 95, 86, COLORS.dim, { align: 'center' });
      else drawCursor(ctx, 20, 52 + (this.list.index - this.scroll) * 14, this.mode === 'qty');
    } else {
      wrapText('Bram polishes a sword and grins at you over the counter.', 166).forEach((l, i) => drawText(ctx, l, 12, 52 + i * 12, COLORS.dim));
    }

    // info panel
    drawWindow(ctx, 190, 42, 130, 92);
    const item = this.current();
    if (item) {
      drawText(ctx, 'In bag', 200, 50, COLORS.dim);
      drawText(ctx, String(s.countItem(item.id)), 310, 50, COLORS.text, { align: 'right' });
      if (item.slot) {
        s.party.forEach((ch, i) => {
          const y = 64 + i * 24;
          ctx.drawImage(getSheet(ch.look).frames[Direction.Down][0], 198, y + 2);
          drawText(ctx, ch.name, 218, y);
          if (!canEquip(item, ch)) {
            drawText(ctx, "Can't use", 218, y + 10, COLORS.disabled);
            return;
          }
          if (ch.equipment[item.slot!] === item.id) {
            drawText(ctx, 'Equipped', 218, y + 10, COLORS.highlight);
            return;
          }
          const now = effectiveStats(ch);
          const next = previewEquip(ch, item.slot!, item.id);
          const diffs = STAT_KEYS.map((k) => ({ k, d: next[k] - now[k] }))
            .filter((x) => x.d !== 0)
            .sort((a, b) => Math.abs(b.d) - Math.abs(a.d))
            .slice(0, 2);
          if (!diffs.length) drawText(ctx, 'No change', 218, y + 10, COLORS.dim);
          diffs.forEach((x, j) =>
            drawText(ctx, `${SHORT[x.k]} ${x.d > 0 ? '+' : ''}${x.d}`, 218 + j * 44, y + 10, x.d > 0 ? COLORS.good : COLORS.bad),
          );
        });
      } else if (item.effect) {
        wrapText(item.description, 110).forEach((l, i) => drawText(ctx, l, 200, 66 + i * 12));
      }
    }

    // Bram has the last word
    drawWindow(ctx, 0, 134, GAME_WIDTH, 46);
    ctx.drawImage(getFace('merchant'), 7, 138);
    const desc = item && this.mode !== 'cmd' ? item.description : '';
    const lines = [...wrapText(this.message, 256).slice(0, 1), ...(desc ? wrapText(desc, 256).slice(0, 1) : [])];
    lines.forEach((l, i) => drawText(ctx, l, 52, 144 + i * 12, i === 0 ? COLORS.text : COLORS.dim));

    if (this.mode === 'qty' && item) {
      const price = this.qtyFrom === 'buy' ? item.price : sellPrice(item);
      const w = 150;
      const x = Math.floor((GAME_WIDTH - w) / 2);
      drawWindow(ctx, x, 62, w, 50);
      drawText(ctx, this.qtyFrom === 'buy' ? 'How many?' : 'Sell how many?', GAME_WIDTH / 2, 70, COLORS.text, { align: 'center' });
      drawText(ctx, `<  ${this.qty}  >`, x + 38, 88, COLORS.highlight, { align: 'center' });
      drawIcon(ctx, 'coin', x + 78, 84);
      drawText(ctx, `${price * this.qty}`, x + w - 12, 88, COLORS.gold, { align: 'right' });
    }
  }
}
