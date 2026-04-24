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
