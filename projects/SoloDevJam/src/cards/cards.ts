import { Card } from "./Card";

export const ALL_CARDS: Card[] = [
  { id: "strike_1", name: "Strike", cost: 1, kind: "attack", value: 6, art: "card-blank" },
  { id: "strike_2", name: "Heavy Strike", cost: 2, kind: "attack", value: 10, art: "card-blank" },
  { id: "strike_3", name: "Power Strike", cost: 3, kind: "attack", value: 16, art: "card-blank" },
  { id: "strike_4", name: "Mega Strike", cost: 4, kind: "attack", value: 22, art: "card-blank" },
  { id: "strike_5", name: "Ultra Strike", cost: 5, kind: "attack", value: 30, art: "card-blank" },
  { id: "heal_1", name: "Siphon", cost: 1, kind: "heal", value: 4, art: "card-blank" },
  { id: "heal_3", name: "Drain Life", cost: 3, kind: "heal", value: 12, art: "card-blank" },
  { id: "block_2", name: "Dark Shield", cost: 2, kind: "block", value: 10, art: "card-blank" },
  { id: "block_4", name: "Demon Wall", cost: 4, kind: "block", value: 20, art: "card-blank" },
  { id: "heal_5", name: "Soul Feast", cost: 5, kind: "heal", value: 25, art: "card-blank" },
];

export function getCard(id: string): Card | undefined {
  return ALL_CARDS.find((c) => c.id === id);
}

export function getCardsByKind(kind: string): Card[] {
  return ALL_CARDS.filter((c) => c.kind === kind);
}

export function getStarterDeck(): Card[] {
  const ids = [
    "strike_1", "strike_1", "strike_1",
    "strike_2",
    "strike_3",
    "heal_1", "heal_1",
    "block_2", "block_2",
    "strike_4",
  ];
  return ids.map((id) => getCard(id)!);
}
