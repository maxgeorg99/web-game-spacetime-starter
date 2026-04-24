// Pure geometry helpers for the 2.5D XZ ground plane.
// Kept dependency-free so it can be imported from tests without pulling in Colyseus.

/** On-screen Y of the back row (farthest from camera). */
export const BASE_BACK_Y = 100;

/** Max depth on the XZ plane. z = 0 (back row) .. Z_MAX (front row). */
export const Z_MAX = 60;

/** On-screen Y of the front row (closest to camera). */
export const BASE_FRONT_Y = BASE_BACK_Y + Z_MAX; // 160

/** Clamp an incoming depth value to the walkable band. */
export function clampZ(z: number): number {
  if (!Number.isFinite(z)) return 0;
  if (z < 0) return 0;
  if (z > Z_MAX) return Z_MAX;
  return z;
}

/** Convert a screen-space Y coordinate to a depth value on the XZ plane. */
export function yToZ(y: number): number {
  return clampZ(y - BASE_BACK_Y);
}

/** Convert a depth value on the XZ plane to a screen-space Y coordinate. */
export function zToY(z: number): number {
  return BASE_BACK_Y + clampZ(z);
}

/**
 * Z tolerance (in world units) for melee attacks to connect.
 * Targets outside this band on the depth axis will not take damage even if
 * they are within horizontal reach.
 */
export const Z_ATTACK_TOLERANCE = 12;

/** Planar distance between two points on the XZ ground plane. */
export function xzDistance(
  ax: number,
  az: number,
  bx: number,
  bz: number,
): number {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.hypot(dx, dz);
}

/**
 * Check whether `target` is within a melee strike's reach on the XZ plane.
 * `reachX` is the half-width of the strike in world-x, measured from the
 * attacker toward `facing` (+1 right, -1 left).
 */
export function isInMeleeReach(
  attackerX: number,
  attackerZ: number,
  targetX: number,
  targetZ: number,
  facing: 1 | -1,
  reachX: number,
  zTolerance: number = Z_ATTACK_TOLERANCE,
): boolean {
  const dz = Math.abs(targetZ - attackerZ);
  if (dz > zTolerance) return false;
  const dx = targetX - attackerX;
  if (facing === 1) {
    return dx >= -4 && dx <= reachX;
  } else {
    return dx <= 4 && dx >= -reachX;
  }
}
