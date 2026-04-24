import { Schema, type, MapSchema } from "@colyseus/schema";

export class PlayerState extends Schema {
  @type("string") name: string = "";
  @type("float32") x: number = 100;
  @type("float32") y: number = 130;
  // Depth on the XZ ground plane. 0 = back row, Z_MAX = front row.
  // Rendering: screenY = BASE_BACK_Y + z.
  @type("float32") z: number = 30;
  @type("uint8") facing: number = 0;
  @type("string") animState: string = "idle";
  @type("int16") hp: number = 100;
  @type("uint32") updatedAt: number = 0;
  @type("uint32") invulnUntil: number = 0;
}

export class EnemyState extends Schema {
  @type("string") enemyType: string = "";
  @type("float32") x: number = 0;
  @type("float32") y: number = 0;
  @type("uint8") facing: number = 0;
  @type("string") animState: string = "idle";
  @type("int16") hp: number = 0;
  @type("int16") maxHp: number = 0;
}

export class GameState extends Schema {
  @type("string") phase: string = "playing"; // playing | victory
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type({ map: EnemyState }) enemies = new MapSchema<EnemyState>();
}
