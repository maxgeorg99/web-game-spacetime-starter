export type CardKind = "attack" | "heal" | "block";

export interface Card {
  id: string;
  name: string;
  cost: number;
  kind: CardKind;
  value: number;
  art: string;
}
