import { Scene, SceneManager } from '@/engine/SceneManager';
import { InputManager } from '@/engine/InputManager';
import { GAME_WIDTH, GAME_HEIGHT } from '@/engine/GameLoop';
import { generateEnemySprite, generateBattleSprite } from '@/engine/spriteGen';
import { useGameStore } from '@/store/gameStore';
import { BattlePhase, BattleEnemy, Skill, DamageType } from '@/types';
import { BattleSystem } from '@/systems/BattleSystem';
import { SKILLS_DB } from '@/data/skills';

const COMMANDS = ['Attack', 'Magic', 'Items', 'Defend', 'Run'];

export class BattleScene implements Scene {
  private enemySprites = new Map<string, HTMLCanvasElement>();
  private partySprites = new Map<string, HTMLCanvasElement>();
  private menuIndex = 0;
  private subMenuIndex = 0;
  private targetIndex = 0;
  private currentMenu: 'command' | 'magic' | 'items' | 'target' = 'command';
  private selectedSkill: Skill | null = null;
  private animTimer = 0;
  private flashTimer = 0;
  private flashTarget: string | null = null;
  private shakeX = 0;
  private battlePhaseTimer = 0;
  private enemyTurnTimer = 0;
  private currentEnemyIdx = 0;
  private victoryTimer = 0;
  private introTimer = 0;
  private logScroll = 0;

  enter() {
    this.introTimer = 1.5;
    const store = useGameStore.getState();
    const battle = store.battle;
    if (!battle) return;

    // Generate enemy sprites
    for (const enemy of battle.enemies) {
      const baseId = enemy.id;
      if (!this.enemySprites.has(enemy.battleId)) {
        this.enemySprites.set(enemy.battleId, generateEnemySprite(baseId));
      }
    }

    // Generate party battle sprites
    const palettes: Record<string, { skin: string; hair: string; main: string; trim: string }> = {
      kael: { skin: '#f4c088', hair: '#8b4513', main: '#4a6fa5', trim: '#c0c0c0' },
      lira: { skin: '#f4c088', hair: '#9b59b6', main: '#2c3e50', trim: '#f1c40f' },
      finn: { skin: '#f4c088', hair: '#2c3e50', main: '#27ae60', trim: '#8b6914' },
    };
    for (const char of store.party) {
      const p = palettes[char.id] || palettes.kael;
      this.partySprites.set(char.id, generateBattleSprite(p));
    }

    store.updateBattle({ phase: BattlePhase.Start });
  }

  update(dt: number) {
    const store = useGameStore.getState();
    const battle = store.battle;
    if (!battle) return;

    // Intro animation
    if (this.introTimer > 0) {
      this.introTimer -= dt;
      if (this.introTimer <= 0) {
        store.updateBattle({ phase: BattlePhase.PlayerCommand, currentCharacterIndex: 0 });
      }
      return;
    }

    // Flash effect
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      this.shakeX = Math.random() * 4 - 2;
      if (this.flashTimer <= 0) {
        this.flashTarget = null;
        this.shakeX = 0;
      }
    }

    switch (battle.phase) {
      case BattlePhase.PlayerCommand:
        this.handlePlayerCommand(store, battle);
        break;
      case BattlePhase.PlayerTarget:
        this.handleTargetSelection(store, battle);
        break;
      case BattlePhase.EnemyTurn:
        this.handleEnemyTurn(dt, store, battle);
        break;
      case BattlePhase.Animation:
        this.animTimer -= dt;
        if (this.animTimer <= 0) {
          this.advanceTurn(store);
        }
        break;
      case BattlePhase.Victory:
        this.victoryTimer += dt;
        if (this.victoryTimer > 2 && InputManager.isPressed('confirm')) {
          store.endBattle();
          SceneManager.pop();
        }
        break;
      case BattlePhase.Defeat:
        if (InputManager.isPressed('confirm')) {
          // Reset to village
          store.healParty();
          store.setMap('millbrook_village', 7, 10);
          store.endBattle();
          SceneManager.pop();
        }
        break;
      case BattlePhase.Run:
        this.animTimer -= dt;
        if (this.animTimer <= 0) {
          store.endBattle();
          SceneManager.pop();
        }
        break;
    }
  }

  private handlePlayerCommand(store: ReturnType<typeof useGameStore.getState>, battle: NonNullable<ReturnType<typeof useGameStore.getState>['battle']>) {
    const aliveParty = store.party.filter((c) => c.isAlive);
    if (battle.currentCharacterIndex >= aliveParty.length) {
      // All party members have acted, enemy turn
      this.currentEnemyIdx = 0;
      store.updateBattle({ phase: BattlePhase.EnemyTurn });
      return;
    }

    if (this.currentMenu === 'command') {
      if (InputManager.isPressed('up')) this.menuIndex = (this.menuIndex - 1 + COMMANDS.length) % COMMANDS.length;
      if (InputManager.isPressed('down')) this.menuIndex = (this.menuIndex + 1) % COMMANDS.length;

      if (InputManager.isPressed('confirm')) {
        const cmd = COMMANDS[this.menuIndex];
        const currentChar = aliveParty[battle.currentCharacterIndex];

        switch (cmd) {
          case 'Attack': {
            const atkSkill: Skill = {
              id: 'basic_attack', name: 'Attack', description: 'Basic attack',
              mpCost: 0, damageType: DamageType.Physical, power: 10,
              targetType: 'single_enemy',
            };
            this.selectedSkill = atkSkill;
            this.targetIndex = 0;
            this.currentMenu = 'target';
            break;
          }
          case 'Magic':
            if (currentChar.skills.length > 0) {
              this.subMenuIndex = 0;
              this.currentMenu = 'magic';
            }
            break;
          case 'Items':
            if (store.inventory.length > 0) {
              this.subMenuIndex = 0;
              this.currentMenu = 'items';
            }
            break;
          case 'Defend': {
            const log = [...battle.battleLog, `${currentChar.name} defends!`];
            store.updateBattle({
              battleLog: log,
              currentCharacterIndex: battle.currentCharacterIndex + 1,
            });
            break;
          }
          case 'Run': {
            const canRun = BattleSystem.canRun(
              aliveParty.map((c) => c.stats),
              battle.enemies.filter((e) => e.currentHp > 0)
            );
            if (canRun) {
              store.updateBattle({
                battleLog: [...battle.battleLog, 'Got away safely!'],
                phase: BattlePhase.Run,
              });
              this.animTimer = 1;
            } else {
              store.updateBattle({
                battleLog: [...battle.battleLog, "Can't escape!"],
                currentCharacterIndex: battle.currentCharacterIndex + 1,
              });
            }
            break;
          }
        }
      }
    } else if (this.currentMenu === 'magic') {
      const currentChar = aliveParty[battle.currentCharacterIndex];
      const skills = currentChar.skills.map((id) => SKILLS_DB[id]).filter(Boolean) as Skill[];

      if (InputManager.isPressed('up')) this.subMenuIndex = (this.subMenuIndex - 1 + skills.length) % skills.length;
      if (InputManager.isPressed('down')) this.subMenuIndex = (this.subMenuIndex + 1) % skills.length;
      if (InputManager.isPressed('cancel')) this.currentMenu = 'command';

      if (InputManager.isPressed('confirm') && skills[this.subMenuIndex]) {
        const skill = skills[this.subMenuIndex];
        if (currentChar.stats.mp >= skill.mpCost) {
          this.selectedSkill = skill;
          this.targetIndex = 0;
          this.currentMenu = 'target';
        }
      }
    } else if (this.currentMenu === 'items') {
      const items = store.inventory.filter((i) => i.item.effect);

      if (InputManager.isPressed('up')) this.subMenuIndex = (this.subMenuIndex - 1 + items.length) % items.length;
      if (InputManager.isPressed('down')) this.subMenuIndex = (this.subMenuIndex + 1) % items.length;
      if (InputManager.isPressed('cancel')) this.currentMenu = 'command';

      if (InputManager.isPressed('confirm') && items[this.subMenuIndex]) {
        const inv = items[this.subMenuIndex];
        const skill: Skill = {
          id: `item_${inv.item.id}`,
          name: inv.item.name,
          description: inv.item.description,
          mpCost: 0,
          damageType: inv.item.effect!.type === 'heal_hp' || inv.item.effect!.type === 'heal_mp'
            ? DamageType.Healing : DamageType.Physical,
          power: inv.item.effect!.value,
          targetType: inv.item.effect!.target === 'all' ? 'all_allies' : 'single_ally',
        };
        this.selectedSkill = skill;
        this.targetIndex = 0;
        this.currentMenu = 'target';
        store.removeItem(inv.item.id);
      }
    }
  }

  private handleTargetSelection(store: ReturnType<typeof useGameStore.getState>, battle: NonNullable<ReturnType<typeof useGameStore.getState>['battle']>) {
    if (!this.selectedSkill) { this.currentMenu = 'command'; return; }

    const isAllyTarget = this.selectedSkill.targetType.includes('ally') || this.selectedSkill.targetType === 'self';
    const targets = isAllyTarget
      ? store.party.filter((c) => c.isAlive)
      : battle.enemies.filter((e) => e.currentHp > 0);

    if (InputManager.isPressed('up')) this.targetIndex = (this.targetIndex - 1 + targets.length) % targets.length;
    if (InputManager.isPressed('down')) this.targetIndex = (this.targetIndex + 1) % targets.length;
    if (InputManager.isPressed('cancel')) {
      this.currentMenu = 'command';
      store.updateBattle({ phase: BattlePhase.PlayerCommand });
      return;
    }

    if (InputManager.isPressed('confirm')) {
      const aliveParty = store.party.filter((c) => c.isAlive);
      const currentChar = aliveParty[battle.currentCharacterIndex];
      const target = targets[this.targetIndex];
      const targetId = isAllyTarget ? (target as any).id : (target as BattleEnemy).battleId;

      const allTargets = this.selectedSkill.targetType.includes('all')
        ? targets.map((t: any) => t.battleId || t.id)
        : [targetId];

      const action: import('@/types').BattleAction = {
        actorId: currentChar.id,
        targetIds: allTargets,
        skill: this.selectedSkill,
        isEnemy: false,
      };

      BattleSystem.executePlayerAction(action);
      this.flashTarget = targetId;
      this.flashTimer = 0.3;

      // Check victory
      if (BattleSystem.checkVictory()) {
        BattleSystem.processVictory();
      } else {
        store.updateBattle({
          phase: BattlePhase.Animation,
          currentCharacterIndex: battle.currentCharacterIndex + 1,
        });
        this.animTimer = 0.5;
      }

      this.currentMenu = 'command';
      this.menuIndex = 0;
    }
  }

  private handleEnemyTurn(dt: number, store: ReturnType<typeof useGameStore.getState>, battle: NonNullable<ReturnType<typeof useGameStore.getState>['battle']>) {
    this.enemyTurnTimer += dt;
    if (this.enemyTurnTimer < 0.8) return;
    this.enemyTurnTimer = 0;

    const aliveEnemies = battle.enemies.filter((e) => e.currentHp > 0);

    if (this.currentEnemyIdx >= aliveEnemies.length) {
      // Process status effects on enemies
      const updatedEnemies = battle.enemies.map((e) => {
        if (e.currentHp > 0 && e.statusEffects.length > 0) {
          return BattleSystem.processStatusEffects(e);
        }
        return e;
      });
      store.updateBattle({
        enemies: updatedEnemies,
        phase: BattlePhase.PlayerCommand,
        currentCharacterIndex: 0,
      });
      this.currentEnemyIdx = 0;
      return;
    }

    const enemy = aliveEnemies[this.currentEnemyIdx];
    const action = BattleSystem.executeEnemyAction(enemy);

    if (action) {
      BattleSystem.applyEnemyAction(action, enemy);
      this.flashTarget = action.targetIds[0];
      this.flashTimer = 0.3;

      if (BattleSystem.checkDefeat()) {
        store.updateBattle({
          phase: BattlePhase.Defeat,
          battleLog: [...(store.battle?.battleLog || []), 'The party has been defeated...'],
        });
      }
    }

    this.currentEnemyIdx++;
  }

  private advanceTurn(store: ReturnType<typeof useGameStore.getState>) {
    const battle = store.battle;
    if (!battle) return;

    if (BattleSystem.checkVictory()) {
      BattleSystem.processVictory();
      return;
    }

    const aliveParty = store.party.filter((c) => c.isAlive);
    if (battle.currentCharacterIndex >= aliveParty.length) {
      this.currentEnemyIdx = 0;
      store.updateBattle({ phase: BattlePhase.EnemyTurn });
    } else {
      store.updateBattle({ phase: BattlePhase.PlayerCommand });
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    const store = useGameStore.getState();
    const battle = store.battle;
    if (!battle) return;

    // Background
    const gradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    gradient.addColorStop(0, '#1a1a3a');
    gradient.addColorStop(1, '#2a2a1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Ground line
    ctx.fillStyle = '#3a3a2a';
    ctx.fillRect(0, 140, GAME_WIDTH, GAME_HEIGHT - 140);

    // Draw enemies (left side)
    const aliveEnemies = battle.enemies.filter((e) => e.currentHp > 0);
    aliveEnemies.forEach((enemy, i) => {
      const sprite = this.enemySprites.get(enemy.battleId);
      if (sprite) {
        const x = 30 + i * 50 + (this.flashTarget === enemy.battleId ? this.shakeX : 0);
        const y = 80 - sprite.height / 2;

        if (this.flashTarget === enemy.battleId && this.flashTimer > 0) {
          ctx.globalAlpha = this.flashTimer > 0.15 ? 0.5 : 1;
        }
        ctx.drawImage(sprite, x, y);
        ctx.globalAlpha = 1;

        // Enemy HP bar
        ctx.fillStyle = '#333';
        ctx.fillRect(x, y + sprite.height + 2, sprite.width, 3);
        const hpRatio = enemy.currentHp / enemy.stats.maxHp;
        ctx.fillStyle = hpRatio > 0.5 ? '#44cc44' : hpRatio > 0.25 ? '#cccc44' : '#cc4444';
        ctx.fillRect(x, y + sprite.height + 2, sprite.width * hpRatio, 3);
      }
    });

    // Draw party (right side)
    const aliveParty = store.party.filter((c) => c.isAlive);
    aliveParty.forEach((char, i) => {
      const sprite = this.partySprites.get(char.id);
      if (sprite) {
        const x = 170 + i * 30 + (this.flashTarget === char.id ? this.shakeX : 0);
        const y = 60;

        if (this.flashTarget === char.id && this.flashTimer > 0) {
          ctx.globalAlpha = this.flashTimer > 0.15 ? 0.5 : 1;
        }
        ctx.drawImage(sprite, x, y);
        ctx.globalAlpha = 1;
      }
    });

    // UI Panel background
    ctx.fillStyle = 'rgba(0, 0, 20, 0.85)';
    ctx.fillRect(0, 148, GAME_WIDTH, 76);
    ctx.strokeStyle = '#6688cc';
    ctx.lineWidth = 1;
    ctx.strokeRect(1, 149, GAME_WIDTH - 2, 74);

    // Party status (right side of panel)
    store.party.forEach((char, i) => {
      const y = 154 + i * 22;
      const x = 130;

      ctx.fillStyle = char.isAlive ? '#fff' : '#666';
      ctx.font = '8px monospace';
      ctx.fillText(char.name.substring(0, 6), x, y + 6);

      // HP bar
      ctx.fillStyle = '#333';
      ctx.fillRect(x + 48, y, 40, 6);
      const hpR = char.stats.hp / char.stats.maxHp;
      ctx.fillStyle = hpR > 0.5 ? '#44cc44' : hpR > 0.25 ? '#cccc44' : '#cc4444';
      ctx.fillRect(x + 48, y, 40 * hpR, 6);
      ctx.fillStyle = '#fff';
      ctx.fillText(`${char.stats.hp}/${char.stats.maxHp}`, x + 48, y + 14);

      // MP bar
      ctx.fillStyle = '#333';
      ctx.fillRect(x + 92, y, 30, 6);
      const mpR = char.stats.maxMp > 0 ? char.stats.mp / char.stats.maxMp : 0;
      ctx.fillStyle = '#4488ff';
      ctx.fillRect(x + 92, y, 30 * mpR, 6);
      ctx.fillStyle = '#aaccff';
      ctx.fillText(`${char.stats.mp}`, x + 94, y + 14);
    });

    // Command menu (left side)
    if (battle.phase === BattlePhase.PlayerCommand && this.currentMenu === 'command') {
      const currentChar = aliveParty[battle.currentCharacterIndex];
      if (currentChar) {
        ctx.fillStyle = '#ffcc00';
        ctx.font = '8px monospace';
        ctx.fillText(`${currentChar.name}'s turn`, 6, 158);
      }

      COMMANDS.forEach((cmd, i) => {
        const y = 164 + i * 10;
        ctx.fillStyle = i === this.menuIndex ? '#ffcc00' : '#aaa';
        ctx.font = '8px monospace';
        ctx.fillText(`${i === this.menuIndex ? '>' : ' '} ${cmd}`, 6, y);
      });
    }

    // Magic submenu
    if (this.currentMenu === 'magic') {
      const currentChar = aliveParty[battle.currentCharacterIndex];
      if (currentChar) {
        const skills = currentChar.skills.map((id) => SKILLS_DB[id]).filter(Boolean) as Skill[];
        skills.forEach((skill, i) => {
          const y = 164 + i * 10;
          const canUse = currentChar.stats.mp >= skill.mpCost;
          ctx.fillStyle = i === this.subMenuIndex ? '#ffcc00' : canUse ? '#aaa' : '#555';
          ctx.font = '8px monospace';
          ctx.fillText(`${i === this.subMenuIndex ? '>' : ' '} ${skill.name} ${skill.mpCost}MP`, 6, y);
        });
      }
    }

    // Items submenu
    if (this.currentMenu === 'items') {
      const items = store.inventory.filter((i) => i.item.effect);
      items.forEach((inv, i) => {
        const y = 164 + i * 10;
        ctx.fillStyle = i === this.subMenuIndex ? '#ffcc00' : '#aaa';
        ctx.font = '8px monospace';
        ctx.fillText(`${i === this.subMenuIndex ? '>' : ' '} ${inv.item.name} x${inv.quantity}`, 6, y);
      });
    }

    // Target selection indicator
    if (this.currentMenu === 'target') {
      const isAllyTarget = this.selectedSkill?.targetType.includes('ally');
      if (isAllyTarget) {
        const y = 154 + this.targetIndex * 22;
        ctx.fillStyle = '#ffcc00';
        ctx.fillText('>', 124, y + 6);
      } else {
        const enemies = battle.enemies.filter((e) => e.currentHp > 0);
        if (enemies[this.targetIndex]) {
          const sprite = this.enemySprites.get(enemies[this.targetIndex].battleId);
          const x = 30 + this.targetIndex * 50;
          const y = sprite ? 75 - sprite.height / 2 : 60;
          ctx.fillStyle = '#ffcc00';
          ctx.fillText('v', x + 10, y);
        }
      }
    }

    // Battle log (bottom)
    if (battle.battleLog.length > 0) {
      const lastLog = battle.battleLog[battle.battleLog.length - 1];
      ctx.fillStyle = '#fff';
      ctx.font = '7px monospace';
      ctx.fillText(lastLog.substring(0, 40), 4, GAME_HEIGHT - 4);
    }

    // Victory overlay
    if (battle.phase === BattlePhase.Victory) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      ctx.fillStyle = '#ffcc00';
      ctx.font = '16px monospace';
      ctx.fillText('VICTORY!', GAME_WIDTH / 2 - 40, 40);

      ctx.font = '8px monospace';
      ctx.fillStyle = '#fff';
      const startIdx = Math.max(0, battle.battleLog.length - 6);
      battle.battleLog.slice(startIdx).forEach((line, i) => {
        ctx.fillText(line.substring(0, 40), 20, 60 + i * 12);
      });

      if (this.victoryTimer > 2) {
        ctx.fillStyle = '#aaa';
        ctx.fillText('Press Z to continue', 70, GAME_HEIGHT - 20);
      }
    }

    // Defeat overlay
    if (battle.phase === BattlePhase.Defeat) {
      ctx.fillStyle = 'rgba(50,0,0,0.7)';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      ctx.fillStyle = '#cc0000';
      ctx.font = '16px monospace';
      ctx.fillText('GAME OVER', GAME_WIDTH / 2 - 48, GAME_HEIGHT / 2 - 10);
      ctx.fillStyle = '#aaa';
      ctx.font = '8px monospace';
      ctx.fillText('Press Z to return to village', 50, GAME_HEIGHT / 2 + 20);
    }

    // Intro flash
    if (this.introTimer > 0) {
      const alpha = Math.min(1, this.introTimer);
      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.8})`;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }
  }
}
