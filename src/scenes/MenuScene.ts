import { expToNext } from '@/data/characters';
import { ITEMS } from '@/data/items';
import { MAPS } from '@/data/maps';
import { SKILLS } from '@/data/skills';
import { Sound } from '@/engine/audio';
import { GAME_HEIGHT, GAME_WIDTH } from '@/engine/constants';
import { SceneManager, type Scene } from '@/engine/SceneManager';
import { getSheet } from '@/gfx/characters';
import { drawText, measureText, wrapText } from '@/gfx/font';
import { COLORS, drawCursor, drawGauge, drawIcon, drawWindow } from '@/gfx/ui';
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
    this.listScroll = scrollFor(this.list.index, this.listScroll, 11, 2);
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
    this.listScroll = scrollFor(this.list.index, this.listScroll, 8, 2);
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
    this.pickScroll = scrollFor(this.pickCursor.index, this.pickScroll, 7);
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
      drawWindow(ctx, Math.floor((GAME_WIDTH - w) / 2), GAME_HEIGHT - 30, w, 22);
      drawText(ctx, this.toast.text, GAME_WIDTH / 2, GAME_HEIGHT - 23, COLORS.text, { align: 'center' });
    }
  }

  private drawMember(ctx: CanvasRenderingContext2D, ch: Character, x: number, y: number) {
    const st = effectiveStats(ch);
    const sprite = ch.hp > 0 ? getSheet(ch.look).frames[Direction.Down][0] : getSheet(ch.look).ko;
    ctx.drawImage(sprite, x, ch.hp > 0 ? y + 4 : y + 12);
    const tx = x + 24;
    drawText(ctx, ch.name, tx, y + 2, ch.hp > 0 ? COLORS.text : COLORS.hpCrit);
    drawText(ctx, `Lv ${ch.level}`, tx + 76, y + 2, COLORS.highlight, { align: 'right' });
    drawText(ctx, ch.characterClass, tx + 82, y + 2, COLORS.dim);
    drawText(ctx, 'HP', tx, y + 15, COLORS.dim);
    drawText(ctx, `${ch.hp}/${st.maxHp}`, tx + 76, y + 15, COLORS.text, { align: 'right' });
    drawGauge(ctx, tx + 82, y + 17, 46, ch.hp / st.maxHp, 'hp');
    drawText(ctx, 'MP', tx, y + 27, COLORS.dim);
    drawText(ctx, `${ch.mp}/${st.maxMp}`, tx + 76, y + 27, COLORS.text, { align: 'right' });
    drawGauge(ctx, tx + 82, y + 29, 46, st.maxMp ? ch.mp / st.maxMp : 0, 'mp');
    drawText(ctx, 'Next', tx, y + 39, COLORS.dim);
    const need = expToNext(ch.level);
    drawText(ctx, String(need - ch.exp), tx + 76, y + 39, COLORS.text, { align: 'right' });
    drawGauge(ctx, tx + 82, y + 41, 46, ch.exp / need, 'exp');
  }

  private renderMain(ctx: CanvasRenderingContext2D) {
    const s = game();
    drawWindow(ctx, 0, 0, 184, 188);
    this.party.forEach((ch, i) => this.drawMember(ctx, ch, 12, 8 + i * 58));
    if (this.mode === 'pickChar') drawCursor(ctx, 12, 20 + this.charCursor.index * 58);

    drawWindow(ctx, 184, 0, 72, 86);
    COMMANDS.forEach((c, i) => drawText(ctx, c, 202, 9 + i * 14));
    drawCursor(ctx, 200, 12 + this.cmd.index * 14, this.mode !== 'main');

    drawWindow(ctx, 184, 86, 72, 102);
    drawText(ctx, 'Time', 194, 96, COLORS.dim);
    drawText(ctx, formatTime(s.playTime), 246, 108, COLORS.text, { align: 'right' });
    drawText(ctx, 'Gold', 194, 126, COLORS.dim);
    drawIcon(ctx, 'coin', 194, 140);
    drawText(ctx, String(s.gold), 246, 138, COLORS.gold, { align: 'right' });
    drawText(ctx, 'Party', 194, 156, COLORS.dim);
    drawText(ctx, `${s.party.length}/3`, 246, 168, COLORS.text, { align: 'right' });

    drawWindow(ctx, 0, 188, GAME_WIDTH, 36);
    drawText(ctx, MAPS[s.mapId]?.name ?? '', 12, 194, COLORS.highlight);
    const hint = this.mode === 'pickChar' ? 'Choose a party member.' : objectiveText();
    drawText(ctx, hint, 12, 206, COLORS.dim);
  }

  private renderItems(ctx: CanvasRenderingContext2D) {
    const items = this.items();
    const sel = items[this.list.index];
    drawWindow(ctx, 0, 0, GAME_WIDTH, 24);
    drawText(ctx, sel ? sel.item.description : 'Your bag is empty.', 10, 8);
    drawWindow(ctx, 0, 24, GAME_WIDTH, GAME_HEIGHT - 24);
    items.forEach((e, i) => {
      const row = Math.floor(i / 2) - this.listScroll;
      if (row < 0 || row >= 11) return;
      const x = 20 + (i % 2) * 120;
      const y = 34 + row * 16;
      const usable = this.fieldUsable(e.item);
      drawIcon(ctx, e.item.icon, x, y);
      drawText(ctx, e.item.name, x + 11, y, usable ? COLORS.text : e.item.kind === 'key' ? COLORS.highlight : COLORS.dim);
      if (e.item.kind !== 'key') drawText(ctx, `${e.quantity}`, x + 104, y, COLORS.dim, { align: 'right' });
    });
    if (items.length) {
      const row = Math.floor(this.list.index / 2) - this.listScroll;
      drawCursor(ctx, 18 + (this.list.index % 2) * 120, 37 + row * 16, this.mode !== 'items');
    }
  }

  private renderSkills(ctx: CanvasRenderingContext2D) {
    const ch = this.caster();
    if (!ch) return;
    const skills = ch.skills.map((id) => SKILLS[id]).filter(Boolean);
    const sel = skills[this.list.index];
    drawWindow(ctx, 0, 0, GAME_WIDTH, 24);
    drawText(ctx, sel ? sel.description : `${ch.name} hasn't learned anything yet.`, 10, 8);
    drawWindow(ctx, 0, 24, GAME_WIDTH, 60);
    this.drawMember(ctx, ch, 12, 30);
    drawWindow(ctx, 0, 84, GAME_WIDTH, GAME_HEIGHT - 84);
    skills.forEach((sk, i) => {
      const row = Math.floor(i / 2) - this.listScroll;
      if (row < 0 || row >= 8) return;
      const x = 20 + (i % 2) * 120;
      const y = 94 + row * 15;
      const ok = sk.field && ch.mp >= sk.mpCost;
      drawText(ctx, sk.name, x, y, ok ? COLORS.text : COLORS.dim);
      drawText(ctx, String(sk.mpCost), x + 104, y, ok ? COLORS.mp : COLORS.dim, { align: 'right' });
    });
    if (skills.length) {
      const row = Math.floor(this.list.index / 2) - this.listScroll;
      drawCursor(ctx, 18 + (this.list.index % 2) * 120, 97 + row * 15, this.mode !== 'skills');
    }
  }

  private renderTarget(ctx: CanvasRenderingContext2D) {
    const x = 96;
    const y = 40;
    const h = this.party.length * 40 + 12;
    drawWindow(ctx, x, y, 152, h);
    const all = this.using?.kind === 'skill' && this.using.skill.target === 'allAllies';
    this.party.forEach((ch, i) => {
      const st = effectiveStats(ch);
      const ry = y + 8 + i * 40;
      const sprite = ch.hp > 0 ? getSheet(ch.look).frames[Direction.Down][0] : getSheet(ch.look).ko;
      ctx.drawImage(sprite, x + 22, ch.hp > 0 ? ry : ry + 8);
      drawText(ctx, ch.name, x + 46, ry + 2, ch.hp > 0 ? COLORS.text : COLORS.hpCrit);
      drawText(ctx, `${ch.hp}/${st.maxHp}`, x + 140, ry + 2, COLORS.text, { align: 'right' });
      drawGauge(ctx, x + 46, ry + 13, 94, ch.hp / st.maxHp, 'hp');
      drawText(ctx, `MP ${ch.mp}/${st.maxMp}`, x + 140, ry + 19, COLORS.mp, { align: 'right' });
      if (all || i === this.targetCursor.index) drawCursor(ctx, x + 20, ry + 10, all);
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

    drawWindow(ctx, 0, 0, GAME_WIDTH, 34);
    ctx.drawImage(getSheet(ch.look).frames[Direction.Down][0], 10, 5);
    drawText(ctx, ch.name, 32, 7);
    drawText(ctx, `Lv ${ch.level} ${ch.characterClass}`, 32, 19, COLORS.dim);
    drawText(ctx, 'Equipment', GAME_WIDTH - 12, 13, COLORS.highlight, { align: 'right' });

    drawWindow(ctx, 0, 34, 148, 52);
    EQUIP_SLOTS.forEach((sl, i) => {
      const y = 42 + i * 13;
      const id = ch.equipment[sl];
      const item = id ? ITEMS[id] : undefined;
      drawText(ctx, SLOT_LABEL[sl], 20, y, COLORS.dim);
      if (item) drawIcon(ctx, item.icon, 66, y);
      drawText(ctx, item ? item.name : '-', 77, y, item ? COLORS.text : COLORS.disabled);
    });
    drawCursor(ctx, 18, 45 + this.slotCursor.index * 13, this.mode !== 'equip');

    drawWindow(ctx, 148, 34, 108, 152);
    STAT_KEYS.forEach((k, i) => {
      const y = 44 + i * 23;
      drawText(ctx, STAT_LABELS[k], 158, y, COLORS.dim);
      drawText(ctx, String(current[k]), 196, y + 10, COLORS.text, { align: 'right' });
      if (preview) {
        const diff = preview[k] - current[k];
        const col = diff > 0 ? COLORS.good : diff < 0 ? COLORS.bad : COLORS.text;
        drawText(ctx, '→', 204, y + 10, COLORS.dim);
        drawText(ctx, String(preview[k]), 244, y + 10, col, { align: 'right' });
      }
    });

    drawWindow(ctx, 0, 86, 148, 100);
    if (this.mode === 'equipPick') {
      choices.forEach((it, i) => {
        const row = i - this.pickScroll;
        if (row < 0 || row >= 7) return;
        const y = 94 + row * 12;
        if (it) {
          drawIcon(ctx, it.icon, 20, y);
          drawText(ctx, it.name, 32, y);
          drawText(ctx, String(game().countItem(it.id)), 138, y, COLORS.dim, { align: 'right' });
        } else drawText(ctx, '(Remove)', 20, y, COLORS.dim);
      });
      drawCursor(ctx, 18, 97 + (this.pickCursor.index - this.pickScroll) * 12);
    } else {
      wrapText(`Pick a slot to change ${ch.name}'s gear. Unequipped items go back into your bag.`, 124).forEach((l, i) =>
        drawText(ctx, l, 12, 96 + i * 12, COLORS.dim),
      );
    }

    drawWindow(ctx, 0, 186, GAME_WIDTH, 38);
    const desc =
      this.mode === 'equipPick'
        ? hovered
          ? hovered.description
          : 'Take this slot off.'
        : (ITEMS[ch.equipment[slot] ?? '']?.description ?? 'Nothing equipped.');
    wrapText(desc, 236).slice(0, 2).forEach((l, i) => drawText(ctx, l, 10, 193 + i * 12));
  }
}

/** One-line reminder of what to do next, shown in the menu. */
export function objectiveText(): string {
  const f = game().flags;
  if (!f.quest_accepted) return 'Talk to Elder Rowan in the plaza.';
  if (f.boss_defeated) return 'Bring the crystal back to Elder Rowan.';
  if (!f.lira_joined) return 'Recruit Lira, then head east.';
  return 'Reach Shadowfang Cave, east of the forest.';
}
