import { tileKey } from "../utils/gridUtils";

export type ObjectType = "tower" | "wall-h" | "wall-v";
export type ToolMode = "none" | "build-tower" | "build-wall" | "destroy";
export type WallMaterial = "sand" | "wet-sand" | "driftwood";

export interface StructureEntry {
  type: ObjectType;
  material?: WallMaterial;
  hp: number;
  maxHp: number;
}

export const MAX_TOWER_HP = 100;
export const MAX_WALL_HP = 60;

export class GridState {
  occupied: Set<string> = new Set();
  structures: Map<string, StructureEntry> = new Map();
  toolMode: ToolMode = "none";
  wallOrientation: "horizontal" | "vertical" = "horizontal";

  isOccupied(col: number, row: number): boolean {
    return this.occupied.has(tileKey(col, row));
  }

  hasStructure(col: number, row: number): boolean {
    return this.structures.has(tileKey(col, row));
  }

  getStructure(col: number, row: number): StructureEntry | null {
    return this.structures.get(tileKey(col, row)) ?? null;
  }

  getType(col: number, row: number): ObjectType | null {
    return this.structures.get(tileKey(col, row))?.type ?? null;
  }

  damageStructure(col: number, row: number, amount: number): { destroyed: boolean; hp: number; maxHp: number } {
    const key = tileKey(col, row);
    const structure = this.structures.get(key);
    if (!structure) return { destroyed: false, hp: 0, maxHp: 0 };

    structure.hp = Math.max(0, structure.hp - amount);
    const destroyed = structure.hp <= 0;

    if (destroyed) {
      this.structures.delete(key);
      this.occupied.delete(key);
    }

    return { destroyed, hp: structure.hp, maxHp: structure.maxHp };
  }

  placeStructure(
    col: number,
    row: number,
    type: ObjectType,
    material?: WallMaterial,
  ): StructureEntry {
    const key = tileKey(col, row);
    const maxHp = type === "tower" ? MAX_TOWER_HP : (material === "driftwood" ? 200 : material === "wet-sand" ? 100 : MAX_WALL_HP);
    const entry: StructureEntry = { type, material, hp: maxHp, maxHp };
    this.occupied.add(key);
    this.structures.set(key, entry);
    return entry;
  }

  destroyStructure(col: number, row: number): void {
    const key = tileKey(col, row);
    this.structures.delete(key);
    this.occupied.delete(key);
  }

  getMaxHp(key: string): number {
    const structure = this.structures.get(key);
    return structure?.maxHp ?? 0;
  }

  getOccupiedCells(): { col: number; row: number }[] {
    const cells: { col: number; row: number }[] = [];
    for (const key of this.structures.keys()) {
      const [c, r] = key.split(",").map(Number);
      cells.push({ col: c, row: r });
    }
    return cells;
  }

  setToolMode(mode: ToolMode): void {
    this.toolMode = mode;
  }

  get occupiedKeys(): Set<string> {
    return this.occupied;
  }
}
