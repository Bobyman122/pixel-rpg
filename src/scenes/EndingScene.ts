import { Sound } from '@/engine/audio';
import { GAME_HEIGHT, GAME_WIDTH } from '@/engine/constants';
import { SceneManager, type Scene } from '@/engine/SceneManager';
import { session } from '@/engine/session';
import { getVillageView } from '@/gfx/backdrops';
import { drawText, renderLogo } from '@/gfx/font';

import { game } from '@/store/gameStore';
import { formatTime } from '@/systems/save';
import { confirmPressed } from './common';
import { drawParty, TitleScene } from './TitleScene';

const INK = '#f8f0e0';
const SOFT = '#c8c0e0';
const GOLD = '#ffd870';
const SHADOW = '#0a0414';

export class EndingScene implements Scene {
  readonly opaque = true;
  private t = 0;
  private lines: { text: string; color?: string }[] = [];
  private theEnd: HTMLCanvasElement | null = null;
  private leaving = false;

  enter() {
    session.playing = false;
    const s = game();
    Sound.playMusic('ending');
    const names = s.party.map((c) => c.name);
    const crew = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
    this.lines = [
      { text: 'The Crystal of Light was returned to its shrine,' },
      { text: 'and the shadows over Millbrook melted away.' },
      { text: '' },
      { text: `${crew} were cheered` },
      { text: 'long into the night.' },
      { text: '' },
      { text: 'But far to the north, beyond the mountains,' },
      { text: 'something old and patient began to stir...' },
      { text: '' },
      { text: '' },
      { text: '@END' },
      { text: '' },
      { text: '' },
      { text: `Play time   ${formatTime(s.playTime)}`, color: SOFT },
      { text: `Party level ${s.party[0]?.level ?? 1}`, color: SOFT },
      { text: `Gold        ${s.gold}`, color: SOFT },
      { text: '' },
      { text: '' },
      { text: 'Art, music and sound', color: GOLD },
      { text: 'Ninja Adventure by Pixel-boy and AAA (CC0)' },
      { text: '' },
      { text: 'Monsters', color: GOLD },
      { text: 'Mythic Monsters by Willibab (CC BY)' },
      { text: '' },
      { text: '' },
      { text: 'Thank you for playing!', color: GOLD },
    ];
  }

  private get scroll() {
    return Math.min(this.t * 14, this.lines.length * 14 + 40);
  }

  private get finished() {
    return this.scroll >= this.lines.length * 14 + 40;
  }

  update(dt: number) {
    this.t += dt;
    if (this.leaving) return;
    if (confirmPressed() && this.finished) {
      this.leaving = true;
      Sound.sfx('confirm');
      SceneManager.fade({
        out: 1,
        midpoint: () => {
          SceneManager.clear();
          SceneManager.push(new TitleScene());
        },
      });
    } else if (confirmPressed()) {
      this.t += 2;
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.drawImage(getVillageView(), 0, 0);
    // Night lifting into a warm dawn as the credits roll.
    const dawn = Math.min(1, this.t / 25);
    ctx.fillStyle = `rgba(14,16,52,${0.5 * (1 - dawn)})`;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.fillStyle = `rgba(248,168,104,${0.18 * dawn})`;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    drawParty(ctx, game().party.map((c) => c.look), GAME_WIDTH / 2, 72, 'cheer');

    if (!this.theEnd) this.theEnd = renderLogo('THE END', ['#ffffff', '#fff4d0', '#ffd890', '#f0b060'], '#3a1a08', '#04040c', 2);
    const top = 88;
    const base = GAME_HEIGHT + 4 - this.scroll;
    ctx.fillStyle = 'rgba(8,6,20,0.62)';
    ctx.fillRect(0, top, GAME_WIDTH, GAME_HEIGHT - top);
    this.lines.forEach((l, i) => {
      const y = Math.round(base + i * 14);
      if (y < top + 2 || y > GAME_HEIGHT) return;
      if (l.text === '@END') {
        ctx.drawImage(this.theEnd!, Math.round((GAME_WIDTH - this.theEnd!.width) / 2), y - 6);
      } else {
        drawText(ctx, l.text, GAME_WIDTH / 2, y, l.color ?? INK, { align: 'center', shadow: SHADOW });
      }
    });
    if (this.finished && Math.floor(this.t * 2) % 2 === 0) {
      drawText(ctx, 'Press Z', GAME_WIDTH / 2, GAME_HEIGHT - 12, SOFT, { align: 'center', shadow: SHADOW });
    }
  }
}
