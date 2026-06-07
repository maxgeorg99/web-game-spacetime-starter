import { EnemyState } from "../state/EnemyState";
import { GridState, StructureEntry } from "../state/GridState";

export function moveEnemy(
  enemy: EnemyState,
  delta: number,
): void {
  if (enemy.state !== "moving" || enemy.path.length === 0) return;

  while (enemy.pathIndex < enemy.path.length) {
    const target = enemy.path[enemy.pathIndex];
    const dx = target.x - enemy.x;
    const dy = target.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 4) {
      enemy.pathIndex++;
      continue;
    }

    const step = (enemy.speed * delta) / 1000;
    enemy.x += (dx / dist) * step;
    enemy.y += (dy / dist) * step;
    return;
  }

  enemy.state = "dead";
}

export function findEngageTarget(
  enemy: EnemyState,
  grid: GridState,
  targetCol: number,
  targetRow: number,
): { col: number; row: number } | null {
  const gx = Math.floor(enemy.x / 40);
  const gy = Math.floor(enemy.y / 40);

  const dCol = Math.sign(targetCol - gx);
  const dRow = Math.sign(targetRow - gy);

  const priority: { col: number; row: number }[] = [];
  if (dCol !== 0) priority.push({ col: gx + dCol, row: gy });
  if (dRow !== 0) priority.push({ col: gx, row: gy + dRow });
  if (dCol !== 0 && dRow !== 0) priority.push({ col: gx + dCol, row: gy + dRow });

  for (const p of priority) {
    const key = `${p.col},${p.row}`;
    if (grid.structures.has(key)) {
      return p;
    }
  }

  const neighbors = [
    { dc: 0, dr: -1 }, { dc: 0, dr: 1 },
    { dc: -1, dr: 0 }, { dc: 1, dr: 0 },
  ];
  for (const { dc, dr } of neighbors) {
    const nc = gx + dc;
    const nr = gy + dr;
    const key = `${nc},${nr}`;
    if (grid.structures.has(key)) {
      return { col: nc, row: nr };
    }
  }

  return null;
}

export function applyStructureDamage(
  grid: GridState,
  col: number,
  row: number,
  dmg: number,
): StructureEntry | null {
  const key = `${col},${row}`;
  const structure = grid.structures.get(key);
  if (!structure) return null;

  structure.hp = Math.max(0, structure.hp - dmg);
  return structure;
}
