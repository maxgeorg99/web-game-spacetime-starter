import { Card } from "./Card";

export const ALL_CARDS: Card[] = [
  {
    id: "strike_1",
    name: "Strike",
    cost: 1,
    kind: "attack",
    value: 6,
    art: "strike",
    targeting: "single",
  },
  {
    id: "strike_2",
    name: "Heavy Strike",
    cost: 2,
    kind: "attack",
    value: 10,
    art: "heavy-strike",
    targeting: "single",
  },
  {
    id: "strike_3",
    name: "Power Strike",
    cost: 3,
    kind: "attack",
    value: 16,
    art: "power-strike",
    targeting: "single",
  },
  {
    id: "strike_4",
    name: "Mega Strike",
    cost: 4,
    kind: "attack",
    value: 22,
    art: "mega-strike",
    targeting: "single",
  },
  {
    id: "hellfire_2",
    name: "Hellfire",
    cost: 2,
    kind: "attack",
    value: 6,
    art: "heavy-strike",
    targeting: "aoe",
  },
  {
    id: "heal_1",
    name: "Siphon",
    cost: 1,
    kind: "heal",
    value: 4,
    art: "siphon",
    targeting: "self",
  },
  {
    id: "heal_3",
    name: "Drain Life",
    cost: 3,
    kind: "heal",
    value: 12,
    art: "drain-life",
    targeting: "self",
  },
  {
    id: "block_2",
    name: "Dark Shield",
    cost: 2,
    kind: "block",
    value: 10,
    art: "dark-shield",
    targeting: "self",
  },
  {
    id: "block_4",
    name: "Demon Wall",
    cost: 4,
    kind: "block",
    value: 20,
    art: "demon-wall",
    targeting: "self",
  },
  {
    id: "draw_1",
    name: "Dark Whispers",
    cost: 1,
    kind: "draw",
    value: 1,
    art: "icon-draw-whispers",
    targeting: "self",
  },
  {
    id: "draw_2",
    name: "Forbidden Knowledge",
    cost: 2,
    kind: "draw",
    value: 2,
    art: "icon-draw-knowledge",
    targeting: "self",
  },
  {
    id: "burn_1",
    name: "Ember",
    cost: 1,
    kind: "burn",
    value: 2,
    art: "icon-burn-ember",
    targeting: "single",
  },
  {
    id: "burn_2",
    name: "Immolate",
    cost: 2,
    kind: "burn",
    value: 4,
    art: "icon-burn-immolate",
    targeting: "single",
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
