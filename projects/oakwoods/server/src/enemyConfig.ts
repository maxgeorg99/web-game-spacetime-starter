export interface EnemyStats {
  id: string;
  maxHp: number;
  touchDamage: number;
  patrolSpeed: number;
  chaseSpeed: number;
  aggroRange: number;
  attackRange: number;
  attackCooldownMs: number;
  attackDurationMs: number;
  attackWindowStartMs: number;
  attackWindowEndMs: number;
  isBoss: boolean;
}

// Values ported from src/entities/Enemy.ts on the client.
export const ENEMY_STATS: Record<string, EnemyStats> = {
  skeleton_mage: {
    id: "skeleton_mage",
    maxHp: 20,
    touchDamage: 10,
    patrolSpeed: 25,
    chaseSpeed: 55,
    aggroRange: 90,
    attackRange: 34,
    attackCooldownMs: 1000,
    attackDurationMs: 500,
    attackWindowStartMs: 150,
    attackWindowEndMs: 350,
    isBoss: true,
  },
  skull: {
    id: "skull",
    maxHp: 8,
    touchDamage: 8,
    patrolSpeed: 30,
    chaseSpeed: 65,
    aggroRange: 100,
    attackRange: 32,
    attackCooldownMs: 1500,
    attackDurationMs: 450,
    attackWindowStartMs: 140,
    attackWindowEndMs: 320,
    isBoss: false,
  },
  spider: {
    id: "spider",
    maxHp: 14,
    touchDamage: 6,
    patrolSpeed: 45,
    chaseSpeed: 80,
    aggroRange: 110,
    attackRange: 26,
    attackCooldownMs: 1600,
    attackDurationMs: 400,
    attackWindowStartMs: 120,
    attackWindowEndMs: 280,
    isBoss: false,
  },
  bear: {
    id: "bear",
    maxHp: 80,
    touchDamage: 22,
    patrolSpeed: 16,
    chaseSpeed: 50,
    aggroRange: 110,
    attackRange: 42,
    attackCooldownMs: 2000,
    attackDurationMs: 600,
    attackWindowStartMs: 180,
    attackWindowEndMs: 420,
    isBoss: false,
  },
  demon: {
    id: "demon",
    maxHp: 55,
    touchDamage: 18,
    patrolSpeed: 22,
    chaseSpeed: 70,
    aggroRange: 120,
    attackRange: 38,
    attackCooldownMs: 850,
    attackDurationMs: 450,
    attackWindowStartMs: 135,
    attackWindowEndMs: 315,
    isBoss: true,
  },
};

// (tile column, enemy type) — matches the pattern used by the client previously.
export const ENEMY_SPAWN_PLAN: Array<[number, keyof typeof ENEMY_STATS]> = [
  [10, "skull"],
  [16, "spider"],
  [24, "skull"],
  [34, "bear"],
  [46, "spider"],
  [58, "skeleton_mage"],
  [74, "demon"],
  [100, "bear"],
];

export const TILE_SIZE = 24;
export const GROUND_TOP_Y = 16 + 7 * TILE_SIZE; // = 184, matches client ground layer
export const PATROL_RANGE = 40;
