export interface TideState {
  level: number;
  floodedCells: Set<string>;
}

export function createTideState(): TideState {
  return {
    level: 0,
    floodedCells: new Set(),
  };
}
