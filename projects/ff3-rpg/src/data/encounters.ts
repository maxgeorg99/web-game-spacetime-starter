export interface EncounterTableEntry {
  enemyId: string;
  weight: number;
}

export interface EncounterTable {
  areaId: string;
  minEnemies: number;
  maxEnemies: number;
  enemies: EncounterTableEntry[];
}

export const ENCOUNTER_TABLES: Record<string, EncounterTable> = {
  forest: {
    areaId: 'forest',
    minEnemies: 1,
    maxEnemies: 3,
    enemies: [
      { enemyId: 'gnome', weight: 4 },
      { enemyId: 'skull', weight: 3 },
      { enemyId: 'bear', weight: 1 },
    ],
  },
};

/** Pick a random enemy ID from a weighted table. */
export function rollEnemy(table: EncounterTable): string {
  const total = table.enemies.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * total;
  for (const entry of table.enemies) {
    roll -= entry.weight;
    if (roll <= 0) return entry.enemyId;
  }
  return table.enemies[0].enemyId;
}

/** Generate a random encounter group. */
export function generateEncounter(table: EncounterTable): string[] {
  const count = Phaser.Math.Between(table.minEnemies, table.maxEnemies);
  const enemies: string[] = [];
  for (let i = 0; i < count; i++) {
    enemies.push(rollEnemy(table));
  }
  return enemies;
}

// Phaser namespace needed for Math.Between — imported where used
import * as Phaser from 'phaser';
