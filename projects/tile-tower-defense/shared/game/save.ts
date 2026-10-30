import { migrateMages } from './magic';
import type { State } from './model';

/** Preserve existing M1 islands when replacing instantaneous shots with traveling projectiles. */
export function restoreState(serialized: string, migrateGameplay = true): State {
  const decoded = JSON.parse(serialized) as { version: number };
  if (decoded.version !== 1 && decoded.version !== 2) {
    throw Error('Unsupported island save version.');
  }
  const state = decoded as State & { shots?: unknown };
  if (decoded.version === 1) {
    state.version = 2;
    state.projectiles = [];
    state.impacts = [];
    delete state.shots;
  }
  if (migrateGameplay) migrateMages(state);
  return state;
}
