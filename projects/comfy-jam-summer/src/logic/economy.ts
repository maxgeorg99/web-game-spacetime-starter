import { EconomyState } from "../state/EconomyState";
import { EnemyKind } from "../config/WaveConfig";
import { ENEMY_CONFIGS } from "../config/EnemyConfig";
import { WallMaterial } from "../state/GridState";

export const BUILD_COSTS: Record<string, number> = {
  tower: 20,
  wall: 5,
  destroy: 0,
};

export const WEAPON_COSTS: Record<string, number> = {
  watergun: 0,
  coconut: 10,
  volleyball: 15,
  bazooka: 25,
};

export const WALL_MATERIAL_COSTS: Record<WallMaterial, number> = {
  sand: 5,
  "wet-sand": 10,
  driftwood: 20,
};

export function getEnemyReward(type: EnemyKind): number {
  return ENEMY_CONFIGS[type]?.shellReward ?? 0;
}

export function canAfford(state: EconomyState, cost: number): boolean {
  return state.shells >= cost;
}

export function spend(state: EconomyState, cost: number): EconomyState {
  const shells = Math.max(0, state.shells - cost);
  return { ...state, shells };
}

export function earnShells(state: EconomyState, amount: number): EconomyState {
  return { ...state, shells: state.shells + amount };
}

export function addAmmo(state: EconomyState, weaponKey: string, amount: number): EconomyState {
  const ammoInventory = { ...state.ammoInventory };
  ammoInventory[weaponKey] = (ammoInventory[weaponKey] ?? 0) + amount;
  return { ...state, ammoInventory };
}

export function consumeAmmo(state: EconomyState, weaponKey: string): EconomyState | null {
  if (canFire(state, weaponKey)) {
    const ammoInventory = { ...state.ammoInventory };
    ammoInventory[weaponKey]--;
    return { ...state, ammoInventory };
  }
  return null;
}

export function canFire(state: EconomyState, weaponKey: string): boolean {
  return (state.ammoInventory[weaponKey] ?? 0) > 0;
}
