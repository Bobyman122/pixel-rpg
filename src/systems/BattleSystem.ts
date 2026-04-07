import { useGameStore } from '@/store/gameStore';
import {
  BattlePhase, BattleAction, BattleEnemy, Skill,
  DamageType, StatusEffectType,
} from '@/types';
import { SKILLS_DB } from '@/data/skills';

export class BattleSystem {
  static calculateDamage(
    attackerAtk: number,
    attackerMag: number,
    defenderDef: number,
    skill: Skill
  ): number {
    const variance = 0.9 + Math.random() * 0.2;
    let damage: number;

    switch (skill.damageType) {
      case DamageType.Physical:
        damage = Math.max(1, Math.floor((attackerAtk * skill.power / 10 - defenderDef / 2) * variance));
        break;
      case DamageType.Magical:
        damage = Math.max(1, Math.floor((attackerMag * skill.power / 10 - defenderDef / 4) * variance));
        break;
      case DamageType.Healing:
        damage = Math.floor(attackerMag * skill.power / 8 * variance);
        break;
      default:
        damage = 1;
    }
    return damage;
  }

  static executePlayerAction(action: BattleAction) {
    const store = useGameStore.getState();
    const battle = store.battle;
    if (!battle) return;

    const actor = store.party.find((c) => c.id === action.actorId);
    if (!actor) return;

    // Deduct MP
    if (action.skill.mpCost > 0) {
      store.useCharacterMp(actor.id, action.skill.mpCost);
    }

    const log = [...battle.battleLog];

    if (action.skill.damageType === DamageType.Healing) {
      // Heal ally
      for (const targetId of action.targetIds) {
        const target = store.party.find((c) => c.id === targetId);
        if (target) {
          const heal = this.calculateDamage(actor.stats.atk, actor.stats.mag, 0, action.skill);
          const newHp = Math.min(target.stats.maxHp, target.stats.hp + heal);
          store.updateCharacterStats(targetId, { hp: newHp });
          log.push(`${actor.name} casts ${action.skill.name}! ${target.name} recovers ${heal} HP!`);
        }
      }
    } else {
      // Damage enemy
      const newEnemies = battle.enemies.map((e) => {
        if (action.targetIds.includes(e.battleId)) {
          const dmg = this.calculateDamage(actor.stats.atk, actor.stats.mag, e.stats.def, action.skill);
          const newHp = Math.max(0, e.currentHp - dmg);
          log.push(`${actor.name} uses ${action.skill.name}! ${e.name} takes ${dmg} damage!`);

          // Status effect
          if (action.skill.statusEffect && Math.random() < action.skill.statusEffect.chance) {
            const se = action.skill.statusEffect;
            log.push(`${e.name} is afflicted with ${se.type}!`);
            return {
              ...e,
              currentHp: newHp,
              statusEffects: [...e.statusEffects, {
                type: se.type, turnsRemaining: se.duration, value: se.value,
              }],
            };
          }

          return { ...e, currentHp: newHp };
        }
        return e;
      });

      store.updateBattle({ enemies: newEnemies, battleLog: log });
      return;
    }

    store.updateBattle({ battleLog: log });
  }

  static executeEnemyAction(enemy: BattleEnemy): BattleAction | null {
    const store = useGameStore.getState();
    const hpPercent = enemy.currentHp / enemy.stats.maxHp;

    // Filter actions by HP threshold
    const available = enemy.actions.filter(
      (a) => !a.hpThreshold || hpPercent <= a.hpThreshold
    );
    if (available.length === 0) return null;

    // Weighted random selection
    const totalWeight = available.reduce((sum, a) => sum + a.weight, 0);
    let roll = Math.random() * totalWeight;
    let chosen = available[0];
    for (const action of available) {
      roll -= action.weight;
      if (roll <= 0) { chosen = action; break; }
    }

    const skill = enemy.skills.find((s) => s.id === chosen.skillId) || enemy.skills[0];
    if (!skill) return null;

    // Pick random alive party member as target
    const aliveParty = store.party.filter((c) => c.isAlive);
    if (aliveParty.length === 0) return null;

    const targetIds = skill.targetType === 'all_enemies'
      ? aliveParty.map((c) => c.id)
      : [aliveParty[Math.floor(Math.random() * aliveParty.length)].id];

    return {
      actorId: enemy.battleId,
      targetIds,
      skill,
      isEnemy: true,
    };
  }

  static applyEnemyAction(action: BattleAction, enemy: BattleEnemy) {
    const store = useGameStore.getState();
    const battle = store.battle;
    if (!battle) return;

    const log = [...battle.battleLog];

    for (const targetId of action.targetIds) {
      const target = store.party.find((c) => c.id === targetId);
      if (!target || !target.isAlive) continue;

      const dmg = this.calculateDamage(
        enemy.stats.atk, enemy.stats.mag, target.stats.def, action.skill
      );
      store.damageCharacter(targetId, dmg);
      log.push(`${enemy.name} uses ${action.skill.name}! ${target.name} takes ${dmg} damage!`);

      // Check if character died
      const updated = useGameStore.getState().party.find((c) => c.id === targetId);
      if (updated && !updated.isAlive) {
        log.push(`${target.name} has fallen!`);
      }
    }

    store.updateBattle({ battleLog: log });
  }

  static processStatusEffects(enemy: BattleEnemy): BattleEnemy {
    const store = useGameStore.getState();
    const battle = store.battle;
    if (!battle) return enemy;

    let hp = enemy.currentHp;
    const log = [...battle.battleLog];
    const remaining = enemy.statusEffects
      .map((se) => {
        if (se.type === StatusEffectType.Poison) {
          const dmg = Math.floor(enemy.stats.maxHp * se.value / 100);
          hp = Math.max(0, hp - dmg);
          log.push(`${enemy.name} takes ${dmg} poison damage!`);
        }
        return { ...se, turnsRemaining: se.turnsRemaining - 1 };
      })
      .filter((se) => se.turnsRemaining > 0);

    store.updateBattle({ battleLog: log });
    return { ...enemy, currentHp: hp, statusEffects: remaining };
  }

  static checkVictory(): boolean {
    const battle = useGameStore.getState().battle;
    if (!battle) return false;
    return battle.enemies.every((e) => e.currentHp <= 0);
  }

  static checkDefeat(): boolean {
    const party = useGameStore.getState().party;
    return party.every((c) => !c.isAlive);
  }

  static processVictory() {
    const store = useGameStore.getState();
    const battle = store.battle;
    if (!battle) return;

    const totalExp = battle.enemies.reduce((sum, e) => sum + e.expReward, 0);
    const totalGold = battle.enemies.reduce((sum, e) => sum + e.goldReward, 0);

    store.addGold(totalGold);

    const log = [...battle.battleLog, `Victory! Gained ${totalExp} EXP and ${totalGold} gold!`];

    // Distribute EXP and check level ups
    for (const char of store.party) {
      if (!char.isAlive) continue;
      const newExp = char.stats.exp + totalExp;
      if (newExp >= char.stats.expToNext) {
        // Level up!
        const newLvl = char.stats.lvl + 1;
        store.updateCharacterStats(char.id, {
          lvl: newLvl,
          exp: newExp - char.stats.expToNext,
          expToNext: Math.floor(char.stats.expToNext * 1.5),
          maxHp: char.stats.maxHp + 5 + Math.floor(Math.random() * 5),
          maxMp: char.stats.maxMp + 3 + Math.floor(Math.random() * 3),
          atk: char.stats.atk + 1 + Math.floor(Math.random() * 2),
          def: char.stats.def + 1 + Math.floor(Math.random() * 2),
          mag: char.stats.mag + 1 + Math.floor(Math.random() * 2),
          spd: char.stats.spd + Math.floor(Math.random() * 2),
          hp: char.stats.maxHp + 5,
          mp: char.stats.maxMp + 3,
        });
        log.push(`${char.name} leveled up to ${newLvl}!`);
      } else {
        store.updateCharacterStats(char.id, { exp: newExp });
      }
    }

    // Item drops
    for (const enemy of battle.enemies) {
      if (enemy.dropItemId && enemy.dropRate && Math.random() < enemy.dropRate) {
        const { ITEMS_DB } = require('@/data/items');
        const item = ITEMS_DB[enemy.dropItemId];
        if (item) {
          store.addItem(item);
          log.push(`Obtained ${item.name}!`);
        }
      }
    }

    store.updateBattle({ battleLog: log, phase: BattlePhase.Victory });
  }

  static canRun(party: { spd: number }[], enemies: { stats: { spd: number } }[]): boolean {
    const avgPartySpd = party.reduce((s, c) => s + c.spd, 0) / party.length;
    const avgEnemySpd = enemies.reduce((s, e) => s + e.stats.spd, 0) / enemies.length;
    return Math.random() < 0.5 + (avgPartySpd - avgEnemySpd) * 0.05;
  }
}
