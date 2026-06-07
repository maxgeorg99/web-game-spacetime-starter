import { EnemyKind } from "./WaveConfig";

export interface EnemyConfig {
  type: EnemyKind;
  walkSheetKey: string;
  walkAnimKey: string;
  attackSheetKey: string;
  attackAnimKey: string;
  hp: number;
  speed: number;
  attackDamage: number;
  size: number;
  shellReward: number;
}

export const ENEMY_ATTACK_DPS: Record<EnemyKind, number> = {
  paddlefish: 10,
  harpoonfish: 15,
  turtle: 5,
  snake: 8,
};

export const ENEMY_CONFIGS: Record<EnemyKind, EnemyConfig> = {
  paddlefish: {
    type: "paddlefish",
    walkSheetKey: "enemy-paddlefish-run",
    walkAnimKey: "paddlefish-walk",
    attackSheetKey: "enemy-paddlefish-attack",
    attackAnimKey: "paddlefish-attack",
    hp: 30,
    speed: 50,
    attackDamage: ENEMY_ATTACK_DPS.paddlefish,
    size: 1.4,
    shellReward: 3,
  },
  harpoonfish: {
    type: "harpoonfish",
    walkSheetKey: "enemy-harpoonfish-run",
    walkAnimKey: "harpoonfish-walk",
    attackSheetKey: "enemy-harpoonfish-attack",
    attackAnimKey: "harpoonfish-attack",
    hp: 50,
    speed: 55,
    attackDamage: ENEMY_ATTACK_DPS.harpoonfish,
    size: 1.4,
    shellReward: 5,
  },
  turtle: {
    type: "turtle",
    walkSheetKey: "enemy-turtle-walk",
    walkAnimKey: "turtle-walk",
    attackSheetKey: "enemy-turtle-attack",
    attackAnimKey: "turtle-attack",
    hp: 80,
    speed: 25,
    attackDamage: ENEMY_ATTACK_DPS.turtle,
    size: 1.6,
    shellReward: 8,
  },
  snake: {
    type: "snake",
    walkSheetKey: "enemy-snake-run",
    walkAnimKey: "snake-walk",
    attackSheetKey: "enemy-snake-attack",
    attackAnimKey: "snake-attack",
    hp: 20,
    speed: 70,
    attackDamage: ENEMY_ATTACK_DPS.snake,
    size: 1.2,
    shellReward: 2,
  },
};
