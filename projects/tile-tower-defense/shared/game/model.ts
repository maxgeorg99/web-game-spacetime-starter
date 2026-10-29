import type { TileId, TowerId, UnitId } from '../config';
export interface Point {
  x: number;
  y: number;
}
export interface Land extends Point {
  kind: TileId;
}
export interface Tower extends Point {
  id: number;
  kind: TowerId;
  ranks: Record<string, number>;
  cooldown: number;
  spent: number;
}
export interface Fighter {
  /** Expedition origin; absent on neutral enemies and local defenders. */
  captainSlot?: number;
  reward?: number;
  leak?: number;
  id: number;
  kind: UnitId;
  progress: number;
  health: number;
  maxHealth: number;
  cooldown: number;
}
export interface Projectile extends Point {
  id: number;
  art: string;
  speed: number;
  target: number;
  aim: Point;
  damage: number;
  splash: number;
  ally: boolean;
  age: number;
  launchHeight: number;
}
export interface Impact extends Point {
  splash: number;
  ally: boolean;
}
export interface State {
  version: 2;
  phase: 'prepare' | 'combat' | 'draft' | 'won' | 'lost';
  wave: number;
  gold: number;
  meat: number;
  lives: number;
  tiles: Land[];
  towers: Tower[];
  enemies: Fighter[];
  recruits: Fighter[];
  offers: TileId[];
  queue: UnitId[];
  spawnIn: number;
  nextId: number;
  kills: number;
  retired: number;
  projectiles: Projectile[];
  impacts: Impact[];
}
export type Command =
  | { type: 'build'; kind: string; x: number; y: number }
  | { type: 'upgrade'; tower: number; node: string }
  | { type: 'sell'; tower: number }
  | { type: 'recruit'; kind: string }
  | { type: 'expand'; kind: string; x: number; y: number }
  | { type: 'start' }
  | { type: 'restart' };
