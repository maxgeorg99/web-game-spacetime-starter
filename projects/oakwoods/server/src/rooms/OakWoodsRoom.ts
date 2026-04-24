import { Room, Client } from "colyseus";
import { GameState, PlayerState, EnemyState } from "../schemas/GameState";
import {
  ENEMY_STATS,
  ENEMY_SPAWN_PLAN,
  TILE_SIZE,
  GROUND_TOP_Y,
  PATROL_RANGE,
  EnemyStats,
} from "../enemyConfig";
import {
  BASE_BACK_Y,
  Z_MAX,
  Z_ATTACK_TOLERANCE,
  clampZ,
  isInMeleeReach,
  xzDistance,
  zToY,
} from "../shared/xzPlane";

const PLAYER_MAX_HP = 100;
const PLAYER_ATTACK_DAMAGE = 12;
const PLAYER_ATTACK_RANGE = 28;
const PLAYER_ATTACK_WINDOW_MS = 300;
const PLAYER_INVULN_MS = 600;
const ENEMY_INVULN_MS = 220;

interface EnemyRuntime {
  stats: EnemyStats;
  aiState: "patrol" | "chase" | "attack" | "hit" | "dead";
  facing: 1 | -1;
  patrolMin: number;
  patrolMax: number;
  vx: number;
  vz: number;
  attackStartedAt: number;
  attackDealtThisSwing: boolean;
  lastAttackAt: number;
  hitUntil: number;
  invulnUntil: number;
}

interface PlayerRuntime {
  attackValidUntil: number;
  attackDealtThisSwing: boolean;
  attackFacing: 1 | -1;
}

export class OakWoodsRoom extends Room<GameState> {
  maxClients = 8;

  private enemyRuntime = new Map<string, EnemyRuntime>();
  private playerRuntime = new Map<string, PlayerRuntime>();
  private lastTick = Date.now();

  onCreate() {
    this.setState(new GameState());
    this.setPatchRate(50);

    this.spawnEnemies();

    this.onMessage("input", (client, payload: {
      x: number; y?: number; z?: number; facing: number; animState: string;
    }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      if (typeof payload.x === "number") player.x = payload.x;
      // Prefer z (XZ-plane input). Fall back to y for legacy clients.
      if (typeof payload.z === "number") {
        player.z = clampZ(payload.z);
        player.y = zToY(player.z);
      } else if (typeof payload.y === "number") {
        player.z = clampZ(payload.y - BASE_BACK_Y);
        player.y = zToY(player.z);
      }
      if (typeof payload.facing === "number") player.facing = payload.facing & 0xff;
      if (typeof payload.animState === "string") player.animState = payload.animState;
      player.updatedAt = Date.now() >>> 0;
    });

    this.onMessage("attack", (client, payload: { facing: number }) => {
      const player = this.state.players.get(client.sessionId);
      const runtime = this.playerRuntime.get(client.sessionId);
      if (!player || !runtime || player.hp <= 0) return;
      runtime.attackValidUntil = Date.now() + PLAYER_ATTACK_WINDOW_MS;
      runtime.attackDealtThisSwing = false;
      runtime.attackFacing = (payload.facing === 1 ? -1 : 1);
      // Broadcast so remote clients can trigger the attack animation immediately.
      this.broadcast("playerAttack", { sessionId: client.sessionId }, { except: client });
    });

    this.onMessage("respawn", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      player.hp = PLAYER_MAX_HP;
      player.x = 100;
      player.z = Z_MAX / 2;
      player.y = zToY(player.z);
      player.animState = "idle";
      player.invulnUntil = Date.now() + 1500;
    });

    this.onMessage("resetEnemies", () => {
      this.respawnAllEnemies();
    });

    this.setSimulationInterval((dt) => this.tick(dt), 1000 / 60);
  }

  onJoin(client: Client, options: { name?: string } = {}) {
    const player = new PlayerState();
    player.name = (options.name ?? `P${this.state.players.size + 1}`).slice(0, 16);
    player.x = 100;
    player.z = Z_MAX / 2;
    player.y = zToY(player.z);
    player.hp = PLAYER_MAX_HP;
    player.invulnUntil = Date.now() + 1500; // short join invuln
    player.updatedAt = Date.now() >>> 0;
    this.state.players.set(client.sessionId, player);
    this.playerRuntime.set(client.sessionId, {
      attackValidUntil: 0,
      attackDealtThisSwing: true,
      attackFacing: 1,
    });
    console.log(`[oakwoods] ${client.sessionId} joined as ${player.name} (${this.state.players.size}/${this.maxClients})`);
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
    this.playerRuntime.delete(client.sessionId);
    console.log(`[oakwoods] ${client.sessionId} left (${this.state.players.size}/${this.maxClients})`);
  }

  onDispose() {
    console.log(`[oakwoods] room ${this.roomId} disposed`);
  }

  // ───────────────────────── enemy spawning ─────────────────────────

  private spawnEnemies() {
    // Rotate spawn depth across waves so agents/players need to manage Z.
    const zSlots = [Z_MAX * 0.25, Z_MAX * 0.55, Z_MAX * 0.85];
    for (let i = 0; i < ENEMY_SPAWN_PLAN.length; i++) {
      const [col, type] = ENEMY_SPAWN_PLAN[i];
      const stats = ENEMY_STATS[type];
      if (!stats) continue;
      const id = `e${i}`;
      const x = col * TILE_SIZE + TILE_SIZE / 2;
      const z = clampZ(zSlots[i % zSlots.length]);
      const enemy = new EnemyState();
      enemy.enemyType = type;
      enemy.x = x;
      enemy.z = z;
      enemy.y = zToY(z);
      enemy.hp = stats.maxHp;
      enemy.maxHp = stats.maxHp;
      enemy.animState = "idle";
      enemy.facing = 0;
      this.state.enemies.set(id, enemy);
      this.enemyRuntime.set(id, {
        stats,
        aiState: "patrol",
        facing: 1,
        patrolMin: x - PATROL_RANGE,
        patrolMax: x + PATROL_RANGE,
        vx: 0,
        vz: 0,
        attackStartedAt: 0,
        attackDealtThisSwing: false,
        lastAttackAt: 0,
        hitUntil: 0,
        invulnUntil: 0,
      });
    }
    // Keep the import "GROUND_TOP_Y" available to side-step unused-import warnings
    // while the old y-based ground logic is decommissioned.
    void GROUND_TOP_Y;
  }

  private respawnAllEnemies() {
    this.state.enemies.clear();
    this.enemyRuntime.clear();
    this.spawnEnemies();
    this.state.phase = "playing";
  }

  // ───────────────────────────── tick ────────────────────────────────

  private tick(dtMs: number) {
    const now = Date.now();
    const dt = dtMs / 1000;

    this.tickEnemies(now, dt);
    this.resolvePlayerAttacks(now);
    this.checkVictory();
  }

  private tickEnemies(now: number, dt: number) {
    for (const [id, enemy] of this.state.enemies) {
      const rt = this.enemyRuntime.get(id);
      if (!rt) continue;

      if (rt.aiState === "dead") {
        // Remove body after death animation time (600ms).
        if (now - rt.hitUntil > 600) {
          this.state.enemies.delete(id);
          this.enemyRuntime.delete(id);
        }
        continue;
      }

      const target = this.pickTarget(enemy, rt);
      const dx = target ? target.x - enemy.x : 0;
      const dz = target ? target.z - enemy.z : 0;
      const adx = target ? Math.abs(dx) : Infinity;
      const adz = target ? Math.abs(dz) : Infinity;

      if (rt.aiState === "chase" || rt.aiState === "attack") {
        rt.facing = dx >= 0 ? 1 : -1;
      }
      enemy.facing = rt.facing === -1 ? 1 : 0; // 0 = facing right, 1 = facing left (flipped)

      switch (rt.aiState) {
        case "patrol": {
          if (target && adx < rt.stats.aggroRange && adz < rt.stats.aggroRange) {
            rt.aiState = "chase";
            break;
          }
          if (enemy.x <= rt.patrolMin) rt.facing = 1;
          else if (enemy.x >= rt.patrolMax) rt.facing = -1;
          rt.vx = rt.facing * rt.stats.patrolSpeed;
          rt.vz = 0;
          enemy.animState = "run";
          break;
        }
        case "chase": {
          if (!target || adx > rt.stats.aggroRange * 1.6) {
            rt.aiState = "patrol";
            break;
          }
          // Lined up on Z AND within X reach → attack.
          if (adx <= rt.stats.attackRange && adz <= Z_ATTACK_TOLERANCE) {
            rt.vx = 0;
            rt.vz = 0;
            if (now - rt.lastAttackAt >= rt.stats.attackCooldownMs) {
              rt.aiState = "attack";
              rt.attackStartedAt = now;
              rt.attackDealtThisSwing = false;
              rt.lastAttackAt = now;
              enemy.animState = "attack";
            } else {
              enemy.animState = "idle";
            }
            break;
          }
          // Otherwise, move toward the player on both axes. Direction is
          // the unit vector of (dx, dz) so the enemy doesn't exceed chaseSpeed.
          const mag = Math.hypot(dx, dz) || 1;
          rt.vx = (dx / mag) * rt.stats.chaseSpeed;
          rt.vz = (dz / mag) * rt.stats.chaseSpeed;
          enemy.animState = "run";
          break;
        }
        case "attack": {
          rt.vx = 0;
          rt.vz = 0;
          const elapsed = now - rt.attackStartedAt;
          if (
            !rt.attackDealtThisSwing &&
            elapsed >= rt.stats.attackWindowStartMs &&
            elapsed <= rt.stats.attackWindowEndMs
          ) {
            this.applyEnemyHit(enemy, rt);
            rt.attackDealtThisSwing = true;
          }
          if (elapsed >= rt.stats.attackDurationMs) {
            rt.aiState = target ? "chase" : "patrol";
            enemy.animState = "idle";
          }
          break;
        }
        case "hit": {
          rt.vx *= 0.85; // quick decay
          rt.vz *= 0.85;
          if (now >= rt.hitUntil) {
            rt.aiState = target ? "chase" : "patrol";
          }
          break;
        }
      }

      enemy.x += rt.vx * dt;
      enemy.z = clampZ(enemy.z + rt.vz * dt);
      enemy.y = zToY(enemy.z);
      // Keep enemies within a reasonable x range (ground layer extends to 500 tiles).
      if (enemy.x < 0) enemy.x = 0;
      if (enemy.x > 499 * TILE_SIZE) enemy.x = 499 * TILE_SIZE;
    }
  }

  private pickTarget(enemy: EnemyState, _rt: EnemyRuntime): PlayerState | null {
    let best: PlayerState | null = null;
    let bestDist = Infinity;
    for (const player of this.state.players.values()) {
      if (player.hp <= 0) continue;
      const d = xzDistance(player.x, player.z, enemy.x, enemy.z);
      if (d < bestDist) {
        bestDist = d;
        best = player;
      }
    }
    return best;
  }

  private applyEnemyHit(enemy: EnemyState, rt: EnemyRuntime) {
    const range = rt.stats.attackRange + 6;
    for (const player of this.state.players.values()) {
      if (player.hp <= 0) continue;
      if (
        isInMeleeReach(
          enemy.x,
          enemy.z,
          player.x,
          player.z,
          rt.facing,
          range,
        )
      ) {
        this.damagePlayer(player, rt.stats.touchDamage);
      }
    }
  }

  private damagePlayer(player: PlayerState, dmg: number) {
    const now = Date.now();
    if (now < player.invulnUntil || player.hp <= 0) return;
    player.hp = Math.max(0, player.hp - dmg);
    player.invulnUntil = now + PLAYER_INVULN_MS;
    if (player.hp <= 0) {
      player.animState = "death";
    }
  }

  // ─────────────────────── player attack resolution ───────────────────

  private resolvePlayerAttacks(now: number) {
    for (const [sessionId, player] of this.state.players) {
      const rt = this.playerRuntime.get(sessionId);
      if (!rt) continue;
      if (rt.attackDealtThisSwing) continue;
      if (now > rt.attackValidUntil) continue;

      for (const [, enemy] of this.state.enemies) {
        const rte = this.enemyRuntime.get(this.enemyIdOf(enemy)!);
        if (!rte || rte.aiState === "dead") continue;
        if (now < rte.invulnUntil) continue;

        if (
          isInMeleeReach(
            player.x,
            player.z,
            enemy.x,
            enemy.z,
            rt.attackFacing,
            PLAYER_ATTACK_RANGE,
          )
        ) {
          this.damageEnemy(enemy, rte, PLAYER_ATTACK_DAMAGE, player.x);
        }
      }
      rt.attackDealtThisSwing = true;
    }
  }

  private enemyIdOf(target: EnemyState): string | null {
    for (const [id, enemy] of this.state.enemies) {
      if (enemy === target) return id;
    }
    return null;
  }

  private damageEnemy(enemy: EnemyState, rt: EnemyRuntime, dmg: number, fromX: number) {
    const now = Date.now();
    enemy.hp = Math.max(0, enemy.hp - dmg);
    rt.invulnUntil = now + ENEMY_INVULN_MS;
    if (enemy.hp <= 0) {
      rt.aiState = "dead";
      rt.vx = 0;
      rt.hitUntil = now;
      enemy.animState = "death";
      return;
    }
    rt.aiState = "hit";
    rt.hitUntil = now + 240;
    rt.vx = (enemy.x < fromX ? -1 : 1) * 80;
    // Keep current animState; client can show a tint flash via hp change listener.
  }

  // ─────────────────────────── victory check ──────────────────────────

  private checkVictory() {
    if (this.state.phase !== "playing") return;
    let bossAlive = false;
    for (const enemy of this.state.enemies.values()) {
      const stats = ENEMY_STATS[enemy.enemyType];
      if (stats?.isBoss && enemy.hp > 0) {
        bossAlive = true;
        break;
      }
    }
    if (!bossAlive) {
      this.state.phase = "victory";
    }
  }
}
