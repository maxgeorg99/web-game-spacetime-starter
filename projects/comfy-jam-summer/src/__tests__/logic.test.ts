import { describe, it, expect } from "vitest";
import { createEnemyState } from "../state/EnemyState";
import { createTowerState } from "../state/TowerState";
import { pickTarget } from "../logic/targeting";
import { resolveHit } from "../logic/combat";
import { moveEnemy } from "../logic/enemyAI";
import { generateIntel } from "../logic/waveEngine";
import { canAfford, spend, earnShells, getEnemyReward } from "../logic/economy";
import { createEconomyState } from "../state/EconomyState";

describe("targeting", () => {
  it("returns null when no enemies in range", () => {
    const tower = createTowerState(10, 8);
    const enemies = [
      createEnemyState(1, "paddlefish", 1000, 1000, 30, 50, 1.4),
    ];
    const weapon = { range: 150, damage: 5, fireRate: 0.4, projectileSpeed: 300, projSize: 16, projSheet: "", projAnim: "", name: "", icon: "" };
    expect(pickTarget(tower, enemies, weapon)).toBeNull();
  });

  it("picks closest enemy", () => {
    const tower = createTowerState(10, 8);
    const weapon = { range: 500, damage: 5, fireRate: 0.4, projectileSpeed: 300, projSize: 16, projSheet: "", projAnim: "", name: "", icon: "" };
    const enemies = [
      createEnemyState(1, "paddlefish", 10 * 40 + 20 + 50, 8 * 40 + 20, 30, 50, 1.4),
      createEnemyState(2, "harpoonfish", 10 * 40 + 20 + 10, 8 * 40 + 20, 30, 50, 1.4),
    ];
    const target = pickTarget(tower, enemies, weapon);
    expect(target).not.toBeNull();
    expect(target!.id).toBe(2); // closer one
  });
});

describe("combat", () => {
  it("applies damage to target", () => {
    const enemy = createEnemyState(1, "paddlefish", 500, 400, 30, 50, 1.4);
    const weapon = { range: 500, damage: 10, fireRate: 0.4, projectileSpeed: 300, projSize: 16, projSheet: "", projAnim: "", name: "", icon: "" };
    const proj = { weapon: "watergun", x: 400, y: 400, damage: 10, targetEnemyId: 1 };
    const result = resolveHit(proj, weapon, [enemy]);
    expect(result.targetDamaged).toBe(true);
    expect(enemy.hp).toBe(20);
    expect(result.targetKilled).toBe(false);
  });

  it("kills enemy when hp reaches 0", () => {
    const enemy = createEnemyState(1, "paddlefish", 500, 400, 5, 50, 1.4);
    const weapon = { range: 500, damage: 10, fireRate: 0.4, projectileSpeed: 300, projSize: 16, projSheet: "", projAnim: "", name: "", icon: "" };
    const proj = { weapon: "watergun", x: 400, y: 400, damage: 10, targetEnemyId: 1 };
    const result = resolveHit(proj, weapon, [enemy]);
    expect(result.targetKilled).toBe(true);
    expect(enemy.state).toBe("dead");
  });
});

describe("enemyAI", () => {
  it("moves enemy toward waypoint", () => {
    const enemy = createEnemyState(1, "paddlefish", 0, 0, 30, 50, 1.4);
    enemy.path = [{ x: 100, y: 0 }];
    enemy.state = "moving";
    moveEnemy(enemy, 1000); // 1 second
    expect(enemy.x).toBeGreaterThan(0);
    expect(enemy.x).toBeLessThanOrEqual(50); // speed 50 * 1s = 50 px
  });
});

describe("waveEngine", () => {
  it("generates honest intel when forceTruth is true", () => {
    const def = {
      wave: 1,
      enemies: [
        { type: "paddlefish" as const, count: 3, edges: ["north" as const] },
      ],
      buildTimeSec: 15,
      intelReliability: 0.5,
      speedMult: 1.0,
      hpMult: 1.0,
    };
    const intel = generateIntel(def, true);
    expect(intel.direction).toBe("north");
    const paddlefish = intel.counts.find((c) => c.type === "paddlefish");
    expect(paddlefish!.count).toBe(3);
  });
});

describe("economy", () => {
  it("canAfford checks shell count", () => {
    const state = createEconomyState();
    state.shells = 50;
    expect(canAfford(state, 20)).toBe(true);
    expect(canAfford(state, 60)).toBe(false);
  });

  it("spend deducts shells", () => {
    const state = createEconomyState();
    state.shells = 50;
    const newState = spend(state, 20);
    expect(newState.shells).toBe(30);
  });

  it("earnShells adds shells", () => {
    const state = createEconomyState();
    state.shells = 10;
    const newState = earnShells(state, 5);
    expect(newState.shells).toBe(15);
  });

  it("getEnemyReward returns correct values", () => {
    expect(getEnemyReward("paddlefish")).toBe(3);
    expect(getEnemyReward("turtle")).toBe(8);
  });
});
