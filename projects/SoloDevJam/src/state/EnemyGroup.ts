import { EnemyState } from "./EnemyState";

export class EnemyGroup {
  // null slots = dead enemies; gaps never close
  readonly enemies: (EnemyState | null)[];
  activeIndex: number;

  constructor(enemies: EnemyState[]) {
    this.enemies = enemies.slice();
    this.activeIndex = this.firstLivingIndex();
  }

  get living(): EnemyState[] {
    return this.enemies.filter((e): e is EnemyState => e !== null && e.isAlive);
  }

  get livingWithIndices(): { enemy: EnemyState; index: number }[] {
    const result: { enemy: EnemyState; index: number }[] = [];
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (e !== null && e.isAlive) result.push({ enemy: e, index: i });
    }
    return result;
  }

  allDead(): boolean {
    return this.enemies.every((e) => e === null || !e.isAlive);
  }

  kill(index: number): void {
    this.enemies[index] = null;
    this.activeIndex = this.firstLivingIndex();
  }

  computeIntents(bossPhase2 = false, ascensionBonusDmg = 0): void {
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (!e?.isAlive) continue;
      const override = bossPhase2 ? 14 : undefined;
      e.computeIntent(override, ascensionBonusDmg);
    }
  }

  private firstLivingIndex(): number {
    for (let i = 0; i < this.enemies.length; i++) {
      if (this.enemies[i]?.isAlive) return i;
    }
    return -1;
  }
}
