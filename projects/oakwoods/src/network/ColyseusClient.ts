import { Client, Room, getStateCallbacks } from "colyseus.js";

export interface PlayerStateView {
  name: string;
  x: number;
  y: number;
  z: number;
  facing: number;
  animState: string;
  hp: number;
  updatedAt: number;
}

export type StateCallbacks = ReturnType<typeof getStateCallbacks>;

const DEFAULT_ENDPOINT =
  (import.meta as any).env?.VITE_COLYSEUS_URL ?? `ws://${window.location.hostname}:2567`;

export class OakWoodsNet {
  private client: Client;
  room: Room<any> | null = null;
  callbacks: StateCallbacks | null = null;

  constructor(endpoint: string = DEFAULT_ENDPOINT) {
    this.client = new Client(endpoint);
  }

  async join(name: string = "Player"): Promise<Room<any>> {
    const room = await this.client.joinOrCreate<any>("oakwoods", { name });
    this.room = room;
    this.callbacks = getStateCallbacks(room);
    return room;
  }

  sendInput(payload: {
    x: number;
    y: number;
    z: number;
    facing: number;
    animState: string;
  }): void {
    this.room?.send("input", payload);
  }

  sendAttack(payload: { x: number; y: number; facing: number }): void {
    this.room?.send("attack", payload);
  }

  sendRespawn(): void {
    this.room?.send("respawn", {});
  }

  sendResetEnemies(): void {
    this.room?.send("resetEnemies", {});
  }

  leave(): void {
    this.room?.leave();
    this.room = null;
  }

  get sessionId(): string {
    return this.room?.sessionId ?? "";
  }
}
