export interface EconomyState {
  shells: number;
  ammoInventory: Record<string, number>;
}

export function createEconomyState(): EconomyState {
  return {
    shells: 15,
    ammoInventory: {},
  };
}
