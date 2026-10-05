import { expToNext } from '@/data/characters';
import { ITEMS } from '@/data/items';
import { MAPS } from '@/data/maps';
import { SKILLS } from '@/data/skills';
import { Sound } from '@/engine/audio';
import { GAME_HEIGHT, GAME_WIDTH } from '@/engine/constants';
import { SceneManager, type Scene } from '@/engine/SceneManager';
import { getFace, getSheet } from '@/gfx/characters';
import { drawText, measureText, wrapText } from '@/gfx/font';
import { COLORS, drawCursor, drawGauge, drawIcon, drawPortrait, drawSelection, drawWindow } from '@/gfx/ui';
import { game } from '@/store/gameStore';
import { calcHeal, fromCharacter, itemUseful, resolveItem } from '@/systems/battle';
import { sortedInventory } from '@/systems/inventory';
import { clampVitals } from '@/systems/progression';
import { formatTime } from '@/systems/save';
import { canEquip, effectiveStats, previewEquip, STAT_KEYS, STAT_LABELS } from '@/systems/stats';
import { Direction, EQUIP_SLOTS, type Character, type EquipSlot, type Item, type Skill } from '@/types';
import { cancelPressed, confirmPressed, ListCursor, scrollFor } from './common';
import { ConfigScene } from './ConfigScene';
import { SaveScene } from './SaveScene';

type Mode = 'main' | 'pickChar' | 'items' | 'skills' | 'target' | 'equip' | 'equipPick';

const COMMANDS = ['Items', 'Skills', 'Equip', 'Save', 'Config'] as const;
const SLOT_LABEL: Record<EquipSlot, string> = { weapon: 'Weapon', armor: 'Armor', accessory: 'Accessory' };
const ITEM_ROWS = 8;
const SKILL_ROWS = 5;
const PICK_ROWS = 4;

export class MenuScene implements Scene {
  private mode: Mode = 'main';
  private cmd = new ListCursor();
  private charCursor = new ListCursor();
  private list = new ListCursor(2);
  private listScroll = 0;
  private slotCursor = new ListCursor();
  private pickCursor = new ListCursor();
  private pickScroll = 0;
  private targetCursor = new ListCursor();
  private pickFor: 'skills' | 'equip' = 'skills';
  private using: { kind: 'item'; item: Item } | { kind: 'skill'; skill: Skill; caster: string } | null = null;
  private targetReturn: Mode = 'items';
  private toast: { text: string; t: number } | null = null;

  update(dt: number) {
    if (this.toast) {
      this.toast.t -= dt;
      if (this.toast.t <= 0) this.toast = null;
    }
    switch (this.mode) {
      case 'main':
        return this.updateMain();
      case 'pickChar':
        return this.updatePickChar();
      case 'items':
        return this.updateItems();
      case 'skills':
        return this.updateSkills();
      case 'target':
        return this.updateTarget();
      case 'equip':
        return this.updateEquip();
      case 'equipPick':
        return this.updateEquipPick();
    }
  }

  private say(text: string) {
    this.toast = { text, t: 1.6 };
  }

  private get party() {
    return game().party;
  }

  // ---- main ---------------------------------------------------------------

  private updateMain() {
    this.cmd.update(COMMANDS.length);
    if (cancelPressed()) {
      Sound.sfx('cancel');
      SceneManager.remove(this);
      return;
    }
    if (!confirmPressed()) return;
    Sound.sfx('confirm');
    switch (COMMANDS[this.cmd.index]) {
      case 'Items':
        this.mode = 'items';
        this.list.index = 0;
        this.listScroll = 0;
        break;
      case 'Skills':
        this.pickFor = 'skills';
        this.mode = 'pickChar';
        break;
      case 'Equip':
        this.pickFor = 'equip';
        this.mode = 'pickChar';
        break;
      case 'Save':
        SceneManager.push(new SaveScene('save'));
        break;
      case 'Config':
        SceneManager.push(new ConfigScene());
        break;
    }
  }

  private updatePickChar() {
    this.charCursor.update(this.party.length);
    if (cancelPressed()) {
      Sound.sfx('cancel');
      this.mode = 'main';
    } else if (confirmPressed()) {
      Sound.sfx('confirm');
      this.list.index = 0;
      this.listScroll = 0;
      this.slotCursor.index = 0;
      this.mode = this.pickFor;
    }
  }

  // ---- items --------------------------------------------------------------

  private items() {
    return sortedInventory(game().inventory);
  }

  private fieldUsable(item: Item) {
    const t = item.effect?.type;
    return t === 'healHp' || t === 'healMp' || t === 'revive';
  }

  private updateItems() {
    const items = this.items();
    this.list.clamp(items.length);
    this.list.update(items.length);
    this.listScroll = scrollFor(this.list.index, this.listScroll, ITEM_ROWS, 2);
    if (cancelPressed()) {
      Sound.sfx('cancel');
      this.mode = 'main';
      return;
    }
    if (!confirmPressed()) return;
    const entry = items[this.list.index];
    if (!entry || !this.fieldUsable(entry.item)) {
      Sound.sfx('error');
      return;
    }
    Sound.sfx('confirm');
    this.using = { kind: 'item', item: entry.item };
    this.targetReturn = 'items';
    this.targetCursor.index = 0;
    this.mode = 'target';
  }

  // ---- skills -------------------------------------------------------------

  private caster(): Character | undefined {
    return this.party[this.charCursor.index];
  }

  private updateSkills() {
    const ch = this.caster();
    const skills = (ch?.skills ?? []).map((id) => SKILLS[id]).filter(Boolean);
    this.list.update(skills.length);
    this.listScroll = scrollFor(this.list.index, this.listScroll, SKILL_ROWS, 2);
    if (cancelPressed()) {
      Sound.sfx('cancel');
      this.mode = 'pickChar';
      return;
    }
    if (!confirmPressed() || !ch) return;
    const skill = skills[this.list.index];
    if (!skill?.field || ch.mp < skill.mpCost || ch.hp <= 0) {
      Sound.sfx('error');
      return;
    }
    Sound.sfx('confirm');
    this.using = { kind: 'skill', skill, caster: ch.id };
    this.targetReturn = 'skills';
    this.targetCursor.index = 0;
    this.mode = 'target';
  }

  // ---- target (field use) -------------------------------------------------

  private updateTarget() {
    const u = this.using;
    if (!u) {
      this.mode = 'main';
      return;
    }
    const all = u.kind === 'skill' && u.skill.target === 'allAllies';
    if (!all) this.targetCursor.update(this.party.length);
    if (cancelPressed()) {
      Sound.sfx('cancel');
      this.mode = this.targetReturn;
      return;
    }
    if (!confirmPressed()) return;
    const s = game();
    if (u.kind === 'item') {
      const target = this.party[this.targetCursor.index];
      const c = fromCharacter(target);
      if (!itemUseful(c, u.item)) {
        Sound.sfx('error');
        return;
      }
      const res = resolveItem(c, u.item);
      s.updateCharacter(target.id, (ch) => clampVitals({ ...ch, hp: c.hp, mp: c.mp }));
      s.removeItem(u.item.id, 1);
      Sound.sfx('heal');
      this.say(res.kind === 'mp' ? `${target.name} recovers ${res.amount} MP.` : `${target.name} recovers ${res.amount} HP.`);
      if (s.countItem(u.item.id) <= 0) this.mode = 'items';
      return;
    }
    const caster = this.party.find((p) => p.id === u.caster);
    if (!caster || caster.mp < u.skill.mpCost) {
      Sound.sfx('error');
      return;
    }
    const targets = all ? this.party.filter((p) => p.hp > 0) : [this.party[this.targetCursor.index]];
    if (targets.some((t) => t.hp <= 0) || targets.every((t) => t.hp >= effectiveStats(t).maxHp)) {
      Sound.sfx('error');
      return;
    }
    const casterC = fromCharacter(caster);
    s.updateCharacter(caster.id, (ch) => ({ ...ch, mp: ch.mp - u.skill.mpCost }));
    let total = 0;
    for (const t of targets) {
      const amount = calcHeal(casterC, u.skill, Math.random);
      s.updateCharacter(t.id, (ch) => {
        const max = effectiveStats(ch).maxHp;
        total += Math.min(amount, max - ch.hp);
        return { ...ch, hp: Math.min(max, ch.hp + amount) };
      });
    }
    Sound.sfx('heal');
    this.say(all ? `The party recovers HP.` : `${targets[0].name} recovers ${total} HP.`);
  }

  // ---- equip --------------------------------------------------------------

  private equipChar(): Character | undefined {
    return this.party[this.charCursor.index];
  }

  private equipChoices(ch: Character, slot: EquipSlot): (Item | null)[] {
    const options = sortedInventory(game().inventory)
      .map((e) => e.item)
      .filter((it) => it.slot === slot && canEquip(it, ch));
    return [...options, null];
  }

  private updateEquip() {
    this.slotCursor.update(EQUIP_SLOTS.length);
    if (cancelPressed()) {
      Sound.sfx('cancel');
      this.mode = 'pickChar';
      return;
    }
    if (confirmPressed()) {
      Sound.sfx('confirm');
      this.pickCursor.index = 0;
      this.pickScroll = 0;
      this.mode = 'equipPick';
    }
  }

  private updateEquipPick() {
    const ch = this.equipChar();
    if (!ch) return;
    const slot = EQUIP_SLOTS[this.slotCursor.index];
    const choices = this.equipChoices(ch, slot);
    this.pickCursor.update(choices.length);
    this.pickScroll = scrollFor(this.pickCursor.index, this.pickScroll, PICK_ROWS);
    if (cancelPressed()) {
      Sound.sfx('cancel');
      this.mode = 'equip';
      return;
    }
    if (!confirmPressed()) return;
    const choice = choices[this.pickCursor.index];
    if (!choice && !ch.equipment[slot]) {
      Sound.sfx('error');
      return;
    }
    game().equip(ch.id, slot, choice ? choice.id : null);
    Sound.sfx('confirm');
    this.mode = 'equip';
  }

  // ---- rendering ----------------------------------------------------------

  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'rgba(4,4,16,0.55)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    switch (this.mode) {
      case 'main':
      case 'pickChar':
        this.renderMain(ctx);
        break;
      case 'items':
        this.renderItems(ctx);
        break;
      case 'skills':
        this.renderSkills(ctx);
        break;
      case 'target':
        if (this.targetReturn === 'items') this.renderItems(ctx);
        else this.renderSkills(ctx);
        this.renderTarget(ctx);
        break;
      case 'equip':
      case 'equipPick':
        this.renderEquip(ctx);
        break;
    }
    if (this.toast) {
      const w = measureText(this.toast.text) + 24;
      drawWindow(ctx, Math.floor((GAME_WIDTH - w) / 2), GAME_HEIGHT - 28, w, 22);
      drawText(ctx, this.toast.text, GAME_WIDTH / 2, GAME_HEIGHT - 21, COLORS.text, { align: 'center' });
    }
  }

  /** Portrait plus level, HP, MP and EXP, 48px tall. */
  private drawMember(ctx: CanvasRenderingContext2D, ch: Character, x: number, y: number, gaugeW = 60) {
    const st = effectiveStats(ch);
    drawPortrait(ctx, getFace(ch.look), x, y);
    if (ch.hp <= 0) {
      ctx.fillStyle = 'rgba(80,0,0,0.45)';
      ctx.fillRect(x + 5, y + 5, 38, 38);
    }
    const tx = x + 54;
    const vx = tx + 74;
    const gx = vx + 6;
    drawText(ctx, ch.name, tx, y + 3, ch.hp > 0 ? COLORS.text : COLORS.hpCrit);
    drawText(ctx, `Lv ${ch.level}`, vx, y + 3, COLORS.highlight, { align: 'right' });
    drawText(ctx, ch.characterClass, gx, y + 3, COLORS.dim);
    drawText(ctx, 'HP', tx, y + 15, COLORS.dim);
    drawText(ctx, `${ch.hp}/${st.maxHp}`, vx, y + 15, COLORS.text, { align: 'right' });
    drawGauge(ctx, gx, y + 17, gaugeW, ch.hp / st.maxHp, 'hp');
    drawText(ctx, 'MP', tx, y + 26, COLORS.dim);
    drawText(ctx, `${ch.mp}/${st.maxMp}`, vx, y + 26, COLORS.text, { align: 'right' });
    drawGauge(ctx, gx, y + 28, gaugeW, st.maxMp ? ch.mp / st.maxMp : 0, 'mp');
    drawText(ctx, 'Next', tx, y + 37, COLORS.dim);
    const need = expToNext(ch.level);
    drawText(ctx, String(need - ch.exp), vx, y + 37, COLORS.text, { align: 'right' });
    drawGauge(ctx, gx, y + 39, gaugeW, ch.exp / need, 'exp');
  }

  private renderMain(ctx: CanvasRenderingContext2D) {
    const s = game();
    drawWindow(ctx, 4, 4, 224, 152);
    this.party.forEach((ch, i) => {
      const y = 8 + i * 48;
      if (this.mode === 'pickChar' && i === this.charCursor.index) drawSelection(ctx, 10, y + 1, 212, 46);
      this.drawMember(ctx, ch, 20, y);
    });
    if (this.mode === 'pickChar') drawCursor(ctx, 19, 32 + this.charCursor.index * 48);

    drawWindow(ctx, 230, 4, 86, 86);
    COMMANDS.forEach((c, i) => drawText(ctx, c, 254, 12 + i * 14, i === this.cmd.index && this.mode === 'main' ? COLORS.highlight : COLORS.text));
    drawCursor(ctx, 251, 15 + this.cmd.index * 14, this.mode !== 'main');

    drawWindow(ctx, 230, 92, 86, 64);
    drawText(ctx, 'Time', 240, 100, COLORS.dim);
    drawText(ctx, formatTime(s.playTime), 306, 112, COLORS.text, { align: 'right' });
    drawText(ctx, 'Gold', 240, 126, COLORS.dim);
    drawIcon(ctx, 'coin', 236, 133);
    drawText(ctx, String(s.gold), 306, 138, COLORS.gold, { align: 'right' });

    drawWindow(ctx, 4, 158, 312, 20);
    const place = MAPS[s.mapId]?.name ?? '';
    drawText(ctx, place, 12, 164, COLORS.highlight);
    const hint = this.mode === 'pickChar' ? 'Choose a party member.' : objectiveText();
    drawText(ctx, hint, 308, 164, COLORS.dim, { align: 'right' });
  }

  private renderItems(ctx: CanvasRenderingContext2D) {
    const items = this.items();
    const sel = items[this.list.index];
    drawWindow(ctx, 0, 0, GAME_WIDTH, 22);
    drawText(ctx, sel ? sel.item.description : 'Your bag is empty.', 10, 7);
    drawWindow(ctx, 0, 22, GAME_WIDTH, GAME_HEIGHT - 22);
    items.forEach((e, i) => {
      const row = Math.floor(i / 2) - this.listScroll;
      if (row < 0 || row >= ITEM_ROWS) return;
      const x = 24 + (i % 2) * 150;
      const y = 32 + row * 17;
      const usable = this.fieldUsable(e.item);
      if (i === this.list.index) drawSelection(ctx, x - 4, y - 3, 140, 15);
      drawIcon(ctx, e.item.icon, x, y - 4);
      drawText(ctx, e.item.name, x + 19, y, usable ? COLORS.text : e.item.kind === 'key' ? COLORS.highlight : COLORS.dim);
      if (e.item.kind !== 'key') drawText(ctx, `${e.quantity}`, x + 132, y, COLORS.dim, { align: 'right' });
    });
    if (items.length) {
      const row = Math.floor(this.list.index / 2) - this.listScroll;
      drawCursor(ctx, 18 + (this.list.index % 2) * 150, 35 + row * 17, this.mode !== 'items');
    }
  }

  private renderSkills(ctx: CanvasRenderingContext2D) {
    const ch = this.caster();
    if (!ch) return;
    const skills = ch.skills.map((id) => SKILLS[id]).filter(Boolean);
    const sel = skills[this.list.index];
    drawWindow(ctx, 0, 0, GAME_WIDTH, 22);
    drawText(ctx, sel ? sel.description : `${ch.name} hasn't learned anything yet.`, 10, 7);
    drawWindow(ctx, 0, 22, GAME_WIDTH, 60);
    this.drawMember(ctx, ch, 10, 28, 100);
    drawWindow(ctx, 0, 82, GAME_WIDTH, GAME_HEIGHT - 82);
    skills.forEach((sk, i) => {
      const row = Math.floor(i / 2) - this.listScroll;
      if (row < 0 || row >= SKILL_ROWS) return;
      const x = 24 + (i % 2) * 150;
      const y = 92 + row * 16;
      const ok = sk.field && ch.mp >= sk.mpCost;
      if (i === this.list.index) drawSelection(ctx, x - 4, y - 3, 140, 15);
      drawText(ctx, sk.name, x, y, ok ? COLORS.text : COLORS.dim);
      drawText(ctx, `${sk.mpCost} MP`, x + 132, y, ok ? COLORS.mp : COLORS.dim, { align: 'right' });
    });
    if (skills.length) {
      const row = Math.floor(this.list.index / 2) - this.listScroll;
      drawCursor(ctx, 18 + (this.list.index % 2) * 150, 95 + row * 16, this.mode !== 'skills');
    }
  }

  private renderTarget(ctx: CanvasRenderingContext2D) {
    const w = 170;
    const x = Math.floor((GAME_WIDTH - w) / 2);
    const h = this.party.length * 40 + 12;
    const y = Math.floor((GAME_HEIGHT - h) / 2);
    drawWindow(ctx, x, y, w, h);
    const all = this.using?.kind === 'skill' && this.using.skill.target === 'allAllies';
    this.party.forEach((ch, i) => {
      const st = effectiveStats(ch);
      const ry = y + 8 + i * 40;
      const sheet = getSheet(ch.look);
      const sprite = ch.hp > 0 ? sheet.frames[Direction.Down][0] : sheet.ko;
      if (all || i === this.targetCursor.index) drawSelection(ctx, x + 6, ry - 2, w - 12, 36);
      ctx.drawImage(sprite, x + 24, ry + 8);
      drawText(ctx, ch.name, x + 48, ry + 2, ch.hp > 0 ? COLORS.text : COLORS.hpCrit);
      drawText(ctx, `${ch.hp}/${st.maxHp}`, x + w - 12, ry + 2, COLORS.text, { align: 'right' });
      drawGauge(ctx, x + 48, ry + 13, w - 60, ch.hp / st.maxHp, 'hp');
      drawText(ctx, `MP ${ch.mp}/${st.maxMp}`, x + w - 12, ry + 21, COLORS.mp, { align: 'right' });
      if (all || i === this.targetCursor.index) drawCursor(ctx, x + 21, ry + 14, all);
    });
  }

  private renderEquip(ctx: CanvasRenderingContext2D) {
    const ch = this.equipChar();
    if (!ch) return;
    const slot = EQUIP_SLOTS[this.slotCursor.index];
    const choices = this.mode === 'equipPick' ? this.equipChoices(ch, slot) : [];
    const hovered = this.mode === 'equipPick' ? choices[this.pickCursor.index] : null;
    const current = effectiveStats(ch);
    const preview = this.mode === 'equipPick' ? previewEquip(ch, slot, hovered ? hovered.id : null) : null;

    drawWindow(ctx, 0, 0, GAME_WIDTH, 26);
    ctx.drawImage(getSheet(ch.look).frames[Direction.Down][0], 8, 5);
    drawText(ctx, ch.name, 30, 9);
    drawText(ctx, `Lv ${ch.level} ${ch.characterClass}`, 34 + measureText(ch.name), 9, COLORS.dim);
    drawText(ctx, 'Equipment', GAME_WIDTH - 12, 9, COLORS.highlight, { align: 'right' });

    drawWindow(ctx, 0, 26, 170, 58);
    EQUIP_SLOTS.forEach((sl, i) => {
      const y = 34 + i * 16;
      const id = ch.equipment[sl];
      const item = id ? ITEMS[id] : undefined;
      if (this.mode === 'equip' && i === this.slotCursor.index) drawSelection(ctx, 16, y - 3, 148, 15);
      drawText(ctx, SLOT_LABEL[sl], 22, y, COLORS.dim);
      if (item) drawIcon(ctx, item.icon, 70, y - 4);
      drawText(ctx, item ? item.name : '-', 88, y, item ? COLORS.text : COLORS.disabled);
    });
    drawCursor(ctx, 19, 37 + this.slotCursor.index * 16, this.mode !== 'equip');

    drawWindow(ctx, 170, 26, 150, 130);
    STAT_KEYS.forEach((k, i) => {
      const y = 36 + i * 19;
      drawText(ctx, STAT_LABELS[k], 180, y, COLORS.dim);
      drawText(ctx, String(current[k]), 252, y, COLORS.text, { align: 'right' });
      if (preview) {
        const diff = preview[k] - current[k];
        const col = diff > 0 ? COLORS.good : diff < 0 ? COLORS.bad : COLORS.text;
        drawText(ctx, '→', 260, y, COLORS.dim);
        drawText(ctx, String(preview[k]), 306, y, col, { align: 'right' });
      }
    });

    drawWindow(ctx, 0, 84, 170, 72);
    if (this.mode === 'equipPick') {
      choices.forEach((it, i) => {
        const row = i - this.pickScroll;
        if (row < 0 || row >= PICK_ROWS) return;
        const y = 92 + row * 15;
        if (i === this.pickCursor.index) drawSelection(ctx, 16, y - 3, 148, 14);
        if (it) {
          drawIcon(ctx, it.icon, 20, y - 4);
          drawText(ctx, it.name, 38, y);
          drawText(ctx, String(game().countItem(it.id)), 158, y, COLORS.dim, { align: 'right' });
        } else drawText(ctx, '(Remove)', 22, y, COLORS.dim);
      });
      drawCursor(ctx, 18, 95 + (this.pickCursor.index - this.pickScroll) * 15);
    } else {
      wrapText(`Pick a slot to change ${ch.name}'s gear. Unequipped items go back into your bag.`, 148).forEach((l, i) =>
        drawText(ctx, l, 12, 93 + i * 12, COLORS.dim),
      );
    }

    drawWindow(ctx, 0, 156, GAME_WIDTH, 24);
    const desc =
      this.mode === 'equipPick'
        ? hovered
          ? hovered.description
          : 'Take this slot off.'
        : (ITEMS[ch.equipment[slot] ?? '']?.description ?? 'Nothing equipped.');
    drawText(ctx, wrapText(desc, 300)[0] ?? '', 10, 163);
  }
}

/** One-line reminder of what to do next, shown in the menu. */
export function objectiveText(): string {
  const f = game().flags;
  if (!f.quest_accepted) return 'Talk to Elder Rowan in the plaza.';
  if (f.boss_defeated) return 'Bring the crystal back to the elder.';
  if (!f.lira_joined) return 'Recruit Lira, then head east.';
  return 'Head east to Shadowfang Cave.';
}
