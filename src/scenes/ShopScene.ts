import { ITEMS } from '@/data/items';
import { SHOPS } from '@/data/shops';
import { Sound } from '@/engine/audio';
import { GAME_HEIGHT, GAME_WIDTH } from '@/engine/constants';
import { Input } from '@/engine/InputManager';
import { SceneManager, type Scene } from '@/engine/SceneManager';
import { getSheet } from '@/gfx/characters';
import { drawText, wrapText } from '@/gfx/font';
import { COLORS, drawCursor, drawIcon, drawWindow } from '@/gfx/ui';
import { game } from '@/store/gameStore';
import { MAX_STACK, sellPrice, sortedInventory } from '@/systems/inventory';
import { canEquip, effectiveStats, previewEquip, STAT_KEYS } from '@/systems/stats';
import { Direction, type Item, type StatKey } from '@/types';
import { cancelPressed, confirmPressed, ListCursor, scrollFor } from './common';

type Mode = 'cmd' | 'buy' | 'sell' | 'qty';

const SHORT: Record<StatKey, string> = { maxHp: 'HP', maxMp: 'MP', atk: 'ATK', def: 'DEF', mag: 'MAG', spd: 'SPD' };
const VISIBLE = 9;

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
    ctx.fillStyle = '#05050f';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    drawWindow(ctx, 0, 0, 168, 24);
    drawText(ctx, this.shop.name, 12, 8, COLORS.highlight);
    drawWindow(ctx, 168, 0, 88, 24);
    drawIcon(ctx, 'coin', 178, 10);
    drawText(ctx, `${s.gold}`, 246, 8, COLORS.gold, { align: 'right' });

    drawWindow(ctx, 0, 24, GAME_WIDTH, 22);
    ['Buy', 'Sell', 'Leave'].forEach((c, i) => drawText(ctx, c, 30 + i * 80, 31, this.mode === 'cmd' || i === this.cmd.index ? COLORS.text : COLORS.dim));
    drawCursor(ctx, 28 + this.cmd.index * 80, 34, this.mode !== 'cmd');

    // item list
    drawWindow(ctx, 0, 46, 150, 134);
    if (this.mode !== 'cmd') {
      const selling = this.mode === 'sell' || (this.mode === 'qty' && this.qtyFrom === 'sell');
      const listRows = selling
        ? this.sellable().map((e) => ({ item: e.item, price: sellPrice(e.item) }))
        : this.stock().map((item) => ({ item, price: item.price }));
      listRows.forEach((r, i) => {
        const row = i - this.scroll;
        if (row < 0 || row >= VISIBLE) return;
        const y = 55 + row * 13;
        const affordable = selling || s.gold >= r.price;
        drawIcon(ctx, r.item.icon, 18, y);
        drawText(ctx, r.item.name, 30, y, affordable ? COLORS.text : COLORS.disabled);
        drawText(ctx, `${r.price}`, 142, y, affordable ? COLORS.gold : COLORS.disabled, { align: 'right' });
      });
      if (listRows.length === 0) drawText(ctx, 'Nothing to sell.', 75, 100, COLORS.dim, { align: 'center' });
      else drawCursor(ctx, 16, 58 + (this.list.index - this.scroll) * 13, this.mode === 'qty');
    } else {
      wrapText('Bram polishes a sword and grins at you over the counter.', 126).forEach((l, i) => drawText(ctx, l, 12, 56 + i * 12, COLORS.dim));
    }

    // info panel
    drawWindow(ctx, 150, 46, 106, 134);
    const item = this.current();
    if (item) {
      drawText(ctx, 'In bag', 160, 54, COLORS.dim);
      drawText(ctx, String(s.countItem(item.id)), 246, 54, COLORS.text, { align: 'right' });
      if (item.slot) {
        s.party.forEach((ch, i) => {
          const y = 72 + i * 34;
          ctx.drawImage(getSheet(ch.look).frames[Direction.Down][0], 158, y);
          drawText(ctx, ch.name, 178, y + 1);
          if (!canEquip(item, ch)) {
            drawText(ctx, "Can't use", 178, y + 13, COLORS.disabled);
            return;
          }
          if (ch.equipment[item.slot!] === item.id) {
            drawText(ctx, 'Equipped', 178, y + 13, COLORS.highlight);
            return;
          }
          const now = effectiveStats(ch);
          const next = previewEquip(ch, item.slot!, item.id);
          const diffs = STAT_KEYS.map((k) => ({ k, d: next[k] - now[k] }))
            .filter((x) => x.d !== 0)
            .sort((a, b) => Math.abs(b.d) - Math.abs(a.d))
            .slice(0, 2);
          if (!diffs.length) drawText(ctx, 'No change', 178, y + 13, COLORS.dim);
          diffs.forEach((x, j) =>
            drawText(ctx, `${SHORT[x.k]} ${x.d > 0 ? '+' : ''}${x.d}`, 178 + j * 38, y + 13, x.d > 0 ? COLORS.good : COLORS.bad),
          );
        });
      } else if (item.effect) {
        wrapText(item.description, 88).forEach((l, i) => drawText(ctx, l, 160, 72 + i * 12));
      }
    }

    drawWindow(ctx, 0, 180, GAME_WIDTH, 44);
    const desc = item && this.mode !== 'cmd' ? item.description : '';
    const lines = [...wrapText(this.message, 236).slice(0, 1), ...(desc ? wrapText(desc, 236).slice(0, 1) : [])];
    lines.forEach((l, i) => drawText(ctx, l, 10, 188 + i * 13, i === 0 ? COLORS.text : COLORS.dim));

    if (this.mode === 'qty' && item) {
      const price = this.qtyFrom === 'buy' ? item.price : sellPrice(item);
      drawWindow(ctx, 56, 90, 144, 50);
      drawText(ctx, this.qtyFrom === 'buy' ? 'How many?' : 'Sell how many?', 128, 98, COLORS.text, { align: 'center' });
      drawText(ctx, `<  ${this.qty}  >`, 92, 114, COLORS.highlight, { align: 'center' });
      drawIcon(ctx, 'coin', 132, 116);
      drawText(ctx, `${price * this.qty}`, 188, 114, COLORS.gold, { align: 'right' });
    }
  }
}
