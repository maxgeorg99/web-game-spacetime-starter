export type EnemyKind = "paddlefish" | "harpoonfish" | "turtle" | "snake";
export type Edge = "north" | "south" | "east" | "west";

export interface WaveEnemy {
  type: EnemyKind;
  count: number;
  edges: Edge[];
}

export interface WaveDef {
  wave: number;
  enemies: WaveEnemy[];
  buildTimeSec: number;
  intelReliability: number;
  speedMult: number;
  hpMult: number;
}

export const WAVES: WaveDef[] = [
  {
    wave: 1,
    enemies: [{ type: "paddlefish", count: 3, edges: ["north"] }],
    buildTimeSec: 15,
    intelReliability: 0.85,
    speedMult: 1.0,
    hpMult: 1.0,
  },
  {
    wave: 2,
    enemies: [
      { type: "paddlefish", count: 2, edges: ["north"] },
      { type: "harpoonfish", count: 2, edges: ["south"] },
    ],
    buildTimeSec: 14,
    intelReliability: 0.85,
    speedMult: 1.08,
    hpMult: 1.1,
  },
  {
    wave: 3,
    enemies: [
      { type: "turtle", count: 3, edges: ["west"] },
      { type: "snake", count: 4, edges: ["east"] },
    ],
    buildTimeSec: 13,
    intelReliability: 0.80,
    speedMult: 1.16,
    hpMult: 1.2,
  },
  {
    wave: 4,
    enemies: [
      { type: "paddlefish", count: 4, edges: ["north"] },
      { type: "snake", count: 3, edges: ["east"] },
      { type: "harpoonfish", count: 2, edges: ["south"] },
    ],
    buildTimeSec: 12,
    intelReliability: 0.80,
    speedMult: 1.24,
    hpMult: 1.3,
  },
  {
    wave: 5,
    enemies: [
      { type: "paddlefish", count: 5, edges: ["north"] },
      { type: "harpoonfish", count: 3, edges: ["north", "east"] },
      { type: "turtle", count: 3, edges: ["west"] },
    ],
    buildTimeSec: 11,
    intelReliability: 0.75,
    speedMult: 1.32,
    hpMult: 1.4,
  },
  {
    wave: 6,
    enemies: [
      { type: "turtle", count: 4, edges: ["west", "south"] },
      { type: "snake", count: 5, edges: ["east", "north"] },
    ],
    buildTimeSec: 10,
    intelReliability: 0.75,
    speedMult: 1.40,
    hpMult: 1.5,
  },
  {
    wave: 7,
    enemies: [
      { type: "paddlefish", count: 4, edges: ["north"] },
      { type: "harpoonfish", count: 4, edges: ["south"] },
      { type: "turtle", count: 3, edges: ["west"] },
      { type: "snake", count: 3, edges: ["east"] },
    ],
    buildTimeSec: 9,
    intelReliability: 0.70,
    speedMult: 1.48,
    hpMult: 1.6,
  },
  {
    wave: 8,
    enemies: [
      { type: "harpoonfish", count: 5, edges: ["north", "south"] },
      { type: "turtle", count: 4, edges: ["west"] },
      { type: "snake", count: 5, edges: ["east"] },
    ],
    buildTimeSec: 8,
    intelReliability: 0.70,
    speedMult: 1.56,
    hpMult: 1.7,
  },
  {
    wave: 9,
    enemies: [
      { type: "paddlefish", count: 6, edges: ["north", "south"] },
      { type: "harpoonfish", count: 5, edges: ["east", "west"] },
      { type: "turtle", count: 4, edges: ["west", "north"] },
      { type: "snake", count: 6, edges: ["east", "south"] },
    ],
    buildTimeSec: 7,
    intelReliability: 0.65,
    speedMult: 1.64,
    hpMult: 1.8,
  },
  {
    wave: 10,
    enemies: [
      { type: "paddlefish", count: 7, edges: ["north"] },
      { type: "harpoonfish", count: 6, edges: ["south"] },
      { type: "turtle", count: 5, edges: ["west"] },
      { type: "snake", count: 7, edges: ["east"] },
    ],
    buildTimeSec: 5,
    intelReliability: 0.65,
    speedMult: 1.72,
    hpMult: 1.9,
  },
  {
    wave: 11,
    enemies: [
      { type: "paddlefish", count: 5, edges: ["north", "east"] },
      { type: "harpoonfish", count: 5, edges: ["south", "west"] },
      { type: "turtle", count: 5, edges: ["west", "north"] },
      { type: "snake", count: 5, edges: ["east", "south"] },
    ],
    buildTimeSec: 5,
    intelReliability: 0.60,
    speedMult: 1.80,
    hpMult: 2.0,
  },
  {
    wave: 12,
    enemies: [
      { type: "paddlefish", count: 6, edges: ["north", "south", "east", "west"] },
      { type: "harpoonfish", count: 6, edges: ["north", "south", "east", "west"] },
      { type: "turtle", count: 5, edges: ["north", "south", "east", "west"] },
      { type: "snake", count: 6, edges: ["north", "south", "east", "west"] },
    ],
    buildTimeSec: 4,
    intelReliability: 0.60,
    speedMult: 1.88,
    hpMult: 2.1,
  },
];
