export type CardKind = "attack" | "heal" | "block";
export type CardTargeting = "single" | "aoe" | "self";

export interface Card {
  id: string;
  name: string;
  cost: number;
  kind: CardKind;
  value: number;
  art: string;
  targeting: CardTargeting;
}
