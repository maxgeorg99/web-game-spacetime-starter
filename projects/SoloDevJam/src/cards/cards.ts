import { Card } from "./Card";

export const ALL_CARDS: Card[] = [
  {
    id: "strike_1",
    name: "Strike",
    cost: 1,
    kind: "attack",
    value: 5,
    art: "strike",
    targeting: "single",
  },
  {
    id: "strike_2",
    name: "Heavy Strike",
    cost: 2,
    kind: "attack",
    value: 8,
    art: "heavy-strike",
    targeting: "single",
  },
  {
    id: "strike_3",
    name: "Power Strike",
    cost: 3,
    kind: "attack",
    value: 12,
    art: "power-strike",
    targeting: "single",
  },
  {
    id: "strike_4",
    name: "Mega Strike",
    cost: 4,
    kind: "attack",
    value: 18,
    art: "mega-strike",
    targeting: "single",
  },
  {
    id: "hellfire_2",
    name: "Hellfire",
    cost: 3,
    kind: "attack",
    value: 5,
    art: "heavy-strike",
    targeting: "aoe",
  },
  {
    id: "heal_1",
    name: "Siphon",
    cost: 1,
    kind: "heal",
    value: 3,
    art: "siphon",
    targeting: "self",
  },
  {
    id: "heal_3",
    name: "Drain Life",
    cost: 4,
    kind: "heal",
    value: 10,
    art: "drain-life",
    targeting: "self",
  },
  {
    id: "block_2",
    name: "Dark Shield",
    cost: 2,
    kind: "block",
    value: 8,
    art: "dark-shield",
    targeting: "self",
  },
  {
    id: "block_4",
    name: "Demon Wall",
    cost: 4,
    kind: "block",
    value: 16,
    art: "demon-wall",
    targeting: "self",
  },
];

export function getCard(id: string): Card | undefined {
  return ALL_CARDS.find((c) => c.id === id);
}

export function getCardsByKind(kind: string): Card[] {
  return ALL_CARDS.filter((c) => c.kind === kind);
}

export function getStarterDeck(): Card[] {
  const ids = [
    "strike_1",
    "strike_1",
    "strike_2",
    "strike_2",
    "strike_3",
    "strike_4",
    "heal_1",
    "block_2",
    "block_2",
    "block_4",
  ];
  return ids.map((id) => getCard(id)!);
}
