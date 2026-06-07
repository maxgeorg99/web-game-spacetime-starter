import { EnemyKind } from "../config/WaveConfig";
import { WaveIntel } from "../state/WaveState";
import { ObjectType } from "../state/GridState";

export type GameEvent =
  | { type: "ENEMY_KILLED"; enemyType: string; x: number; y: number }
  | { type: "ENEMY_SPAWNED"; enemyType: EnemyKind; edge: string }
  | { type: "ENEMY_REACHED_CENTER" }
  | { type: "STRUCTURE_PLACED"; col: number; row: number; structureType: ObjectType }
  | { type: "STRUCTURE_DESTROYED"; col: number; row: number }
  | { type: "STRUCTURE_DAMAGED"; col: number; row: number; hp: number; maxHp: number }
  | { type: "WAVE_STARTED"; wave: number; intel: WaveIntel }
  | { type: "WAVE_CLEARED"; wave: number }
  | { type: "BUILD_TIMER_TICK"; secondsLeft: number }
  | { type: "SHELLS_CHANGED"; count: number }
  | { type: "GAME_OVER" }
  | { type: "VICTORY" }
  | { type: "WEAPON_CHANGED"; col: number; row: number; weapon: string }
  | { type: "DIALOG_TRIGGER"; trigger: string }
  | { type: "OCCUPANCY_CHANGED" }
  | { type: "TOWER_CLICKED"; x: number; y: number };

type EventCallback = (event: GameEvent) => void;

export class EventBus {
  private listeners = new Map<string, Set<EventCallback>>();

  on<E extends GameEvent>(type: E["type"], fn: (e: E) => void): () => void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(fn as EventCallback);
    return () => this.listeners.get(type)?.delete(fn as EventCallback);
  }

  emit<E extends GameEvent>(event: E): void {
    this.listeners.get(event.type)?.forEach((fn) => fn(event as GameEvent));
  }

  clear(): void {
    this.listeners.clear();
  }
}
