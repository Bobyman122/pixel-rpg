import type { Condition } from '@/types';

export function checkCondition(cond: Condition | undefined, flags: Record<string, boolean>): boolean {
  if (!cond) return true;
  if (cond.flag && !flags[cond.flag]) return false;
  if (cond.notFlag && flags[cond.notFlag]) return false;
  return true;
}
