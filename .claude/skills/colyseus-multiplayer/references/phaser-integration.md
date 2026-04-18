# Phaser + Colyseus Integration

## Architecture

Phaser handles rendering, input, and game feel. Colyseus handles authority, state sync, and multiplayer logic. They communicate through a thin bridge layer.

```
┌──────────────────┐          ┌──────────────────┐
│   Phaser Client  │◄────────►│  Colyseus Server │
│                  │  WebSocket│                  │
│  Input capture   │──input──►│  Process input   │
│  Local predict   │          │  Update state    │
│  Render sprites  │◄─state───│  Broadcast patch │
│  Play VFX/SFX    │◄─events──│  Broadcast events│
│  Interpolate     │          │                  │
└──────────────────┘          └──────────────────┘
```

---

## Connection Manager (singleton)

Create one Colyseus client, share it across scenes.

```typescript
// src/network/ColyseusManager.ts
import { Client, Room } from "colyseus.js";

export class ColyseusManager {
  private static instance: ColyseusManager;
  private client: Client;
  private room: Room | null = null;

  private constructor(url: string) {
    this.client = new Client(url);
  }

  static init(url: string): ColyseusManager {
    if (!ColyseusManager.instance) {
      ColyseusManager.instance = new ColyseusManager(url);
    }
    return ColyseusManager.instance;
  }

  static get(): ColyseusManager {
    if (!ColyseusManager.instance) {
      throw new Error("ColyseusManager not initialized. Call init() first.");
    }
    return ColyseusManager.instance;
  }

  async joinOrCreate(roomName: string, options?: any): Promise<Room> {
    this.room = await this.client.joinOrCreate(roomName, options);
    return this.room;
  }

  async reconnect(token: string): Promise<Room> {
    this.room = await this.client.reconnect(token);
    return this.room;
  }

  getRoom(): Room | null {
    return this.room;
  }

  leave() {
    this.room?.leave();
    this.room = null;
  }
}
```

---

## Boot Scene: Initialize Connection

```typescript
// src/scenes/BootScene.ts
import { ColyseusManager } from "../network/ColyseusManager";

class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    // Load all game assets
    this.load.spritesheet("player", "assets/player.png", {
      frameWidth: 32, frameHeight: 32
    });
  }

  create() {
    // Initialize Colyseus connection manager
    const serverUrl = import.meta.env.VITE_SERVER_URL || "ws://localhost:2567";
    ColyseusManager.init(serverUrl);

    this.scene.start("MenuScene");
  }
}
```

---

## Menu Scene: Single Player vs Multiplayer

```typescript
// src/scenes/MenuScene.ts
import { ColyseusManager } from "../network/ColyseusManager";

class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    // Single Player button
    const spBtn = this.add.text(centerX, centerY - 40, "Single Player", {
      fontSize: "24px", color: "#fff", backgroundColor: "#333", padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive();

    spBtn.on("pointerdown", () => {
      this.scene.start("GameScene", { multiplayer: false });
    });

    // Multiplayer button
    const mpBtn = this.add.text(centerX, centerY + 40, "Multiplayer", {
      fontSize: "24px", color: "#fff", backgroundColor: "#336", padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive();

    mpBtn.on("pointerdown", () => this.joinMultiplayer());
  }

  async joinMultiplayer() {
    const statusText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 100,
      "Connecting...",
      { fontSize: "16px", color: "#aaa" }
    ).setOrigin(0.5);

    try {
      const manager = ColyseusManager.get();
      const room = await manager.joinOrCreate("game_room", {
        name: "Player",  // or from input field
      });

      // Store reconnection token
      localStorage.setItem("reconnectionToken", room.reconnectionToken);

      this.scene.start("GameScene", {
        multiplayer: true,
        sessionId: room.sessionId,
      });
    } catch (e) {
      statusText.setText("Failed to connect. Try again.");
      console.error("Connection failed:", e);
    }
  }
}
```

---

## Game Scene: Multiplayer Integration

```typescript
// src/scenes/GameScene.ts
import { Room } from "colyseus.js";
import { ColyseusManager } from "../network/ColyseusManager";

class GameScene extends Phaser.Scene {
  private multiplayer: boolean = false;
  private room: Room | null = null;
  private localSessionId: string = "";

  // Sprite maps
  private playerSprites = new Map<string, Phaser.GameObjects.Sprite>();
  private interpolationBuffers = new Map<string, { x: number, y: number, t: number }[]>();

  // Input
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private lastInputTime = 0;
  private inputSeq = 0;
  private pendingInputs: any[] = [];

  constructor() {
    super("GameScene");
  }

  init(data: { multiplayer: boolean; sessionId?: string }) {
    this.multiplayer = data.multiplayer;
    this.localSessionId = data.sessionId || "";
  }

  create() {
    // Create tilemap, world, etc. (same for SP and MP)
    this.createWorld();
    this.cursors = this.input.keyboard!.createCursorKeys();

    if (this.multiplayer) {
      this.setupMultiplayer();
    } else {
      this.setupSinglePlayer();
    }
  }

  private setupSinglePlayer() {
    // Standard Phaser single-player setup
    const player = this.add.sprite(400, 300, "player");
    this.playerSprites.set("local", player);
    this.physics.add.existing(player);
  }

  private setupMultiplayer() {
    this.room = ColyseusManager.get().getRoom();
    if (!this.room) {
      this.scene.start("MenuScene");
      return;
    }

    // Wire up state callbacks
    this.room.state.players.onAdd((playerState: any, sessionId: string) => {
      const sprite = this.add.sprite(playerState.x, playerState.y, "player");
      this.physics.add.existing(sprite);
      this.playerSprites.set(sessionId, sprite);

      if (sessionId === this.localSessionId) {
        // Local player — camera follows
        this.cameras.main.startFollow(sprite);
      } else {
        // Remote player — set up interpolation buffer
        this.interpolationBuffers.set(sessionId, []);

        playerState.listen("x", () => {
          this.pushInterpolation(sessionId, playerState.x, playerState.y);
        });
        playerState.listen("y", () => {
          this.pushInterpolation(sessionId, playerState.x, playerState.y);
        });
      }

      // Health changes
      playerState.listen("health", (value: number) => {
        if (value <= 0) {
          sprite.setTint(0xff0000);
          // Play death animation
        }
      });
    });

    this.room.state.players.onRemove((_: any, sessionId: string) => {
      const sprite = this.playerSprites.get(sessionId);
      sprite?.destroy();
      this.playerSprites.delete(sessionId);
      this.interpolationBuffers.delete(sessionId);
    });

    // Server events (not state — these are fire-and-forget)
    this.room.onMessage("damage", ({ targetId, amount, attackerId }) => {
      // Play damage VFX on target sprite
      const sprite = this.playerSprites.get(targetId);
      if (sprite) {
        this.playDamageEffect(sprite, amount);
      }
    });

    this.room.onMessage("gameOver", ({ winnerId }) => {
      const isWinner = winnerId === this.localSessionId;
      this.scene.start("GameOverScene", { isWinner, winnerId });
    });

    // Reconnection handling
    this.room.onDrop(() => {
      this.showReconnectingOverlay();
    });

    this.room.onReconnect(() => {
      this.hideReconnectingOverlay();
    });

    this.room.onLeave((code) => {
      if (code > 1000) {
        // Abnormal disconnect
        this.scene.start("MenuScene");
      }
    });

    // Listen for game phase changes
    this.room.state.listen("phase", (phase: string) => {
      if (phase === "playing") this.startGameplay();
      if (phase === "ended") this.endGameplay();
    });
  }

  update(time: number, delta: number) {
    if (this.multiplayer) {
      this.updateMultiplayer(time, delta);
    } else {
      this.updateSinglePlayer(time, delta);
    }
  }

  private updateMultiplayer(time: number, delta: number) {
    // 1. Capture and send input (throttled to 20Hz)
    const INPUT_RATE = 1000 / 20;
    if (time - this.lastInputTime >= INPUT_RATE) {
      this.sendInput();
      this.lastInputTime = time;
    }

    // 2. Apply local prediction at full frame rate
    this.applyLocalPrediction(delta);

    // 3. Interpolate remote players
    this.interpolateRemotePlayers();
  }

  private sendInput() {
    if (!this.room) return;

    const dx = (this.cursors.left?.isDown ? -1 : 0) + (this.cursors.right?.isDown ? 1 : 0);
    const dy = (this.cursors.up?.isDown ? -1 : 0) + (this.cursors.down?.isDown ? 1 : 0);

    if (dx === 0 && dy === 0) return;  // don't send idle

    const input = { seq: this.inputSeq++, dx, dy };
    this.room.send("input", input);
    this.pendingInputs.push(input);
  }

  private applyLocalPrediction(delta: number) {
    const sprite = this.playerSprites.get(this.localSessionId);
    if (!sprite) return;

    const speed = 200;  // pixels/sec — MUST match server
    const dx = (this.cursors.left?.isDown ? -1 : 0) + (this.cursors.right?.isDown ? 1 : 0);
    const dy = (this.cursors.up?.isDown ? -1 : 0) + (this.cursors.down?.isDown ? 1 : 0);

    sprite.x += dx * speed * (delta / 1000);
    sprite.y += dy * speed * (delta / 1000);
  }

  private pushInterpolation(sessionId: string, x: number, y: number) {
    const buffer = this.interpolationBuffers.get(sessionId);
    if (!buffer) return;
    buffer.push({ x, y, t: Date.now() });
    while (buffer.length > 20) buffer.shift();
  }

  private interpolateRemotePlayers() {
    const DELAY = 100;  // render 100ms behind server
    const renderTime = Date.now() - DELAY;

    this.interpolationBuffers.forEach((buffer, sessionId) => {
      const sprite = this.playerSprites.get(sessionId);
      if (!sprite || buffer.length < 2) return;

      for (let i = 1; i < buffer.length; i++) {
        const prev = buffer[i - 1];
        const next = buffer[i];

        if (prev.t <= renderTime && next.t >= renderTime) {
          const t = (renderTime - prev.t) / (next.t - prev.t);
          sprite.x = prev.x + (next.x - prev.x) * t;
          sprite.y = prev.y + (next.y - prev.y) * t;
          return;
        }
      }

      // Fall back to latest
      const latest = buffer[buffer.length - 1];
      sprite.x = latest.x;
      sprite.y = latest.y;
    });
  }

  // VFX helpers (client-only, never synced)
  private playDamageEffect(sprite: Phaser.GameObjects.Sprite, amount: number) {
    // Flash red
    sprite.setTint(0xff0000);
    this.time.delayedCall(100, () => sprite.clearTint());

    // Damage number
    const dmgText = this.add.text(sprite.x, sprite.y - 20, `-${amount}`, {
      fontSize: "16px", color: "#ff0000"
    }).setOrigin(0.5);

    this.tweens.add({
      targets: dmgText,
      y: dmgText.y - 40,
      alpha: 0,
      duration: 800,
      onComplete: () => dmgText.destroy()
    });
  }

  private showReconnectingOverlay() {
    // Show "Reconnecting..." text
  }

  private hideReconnectingOverlay() {
    // Hide overlay
  }

  private createWorld() {
    // Load tilemap, set world bounds, etc.
    // This is identical for SP and MP — the map is loaded locally
  }

  private startGameplay() {
    // Enable input, start timer, etc.
  }

  private endGameplay() {
    // Disable input, show results
  }

  private updateSinglePlayer(time: number, delta: number) {
    // Standard Phaser movement, all local
    const sprite = this.playerSprites.get("local");
    if (!sprite) return;

    const speed = 200;
    const body = sprite.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0);

    if (this.cursors.left?.isDown) body.setVelocityX(-speed);
    if (this.cursors.right?.isDown) body.setVelocityX(speed);
    if (this.cursors.up?.isDown) body.setVelocityY(-speed);
    if (this.cursors.down?.isDown) body.setVelocityY(speed);
  }

  shutdown() {
    // Clean up on scene stop
    this.playerSprites.forEach(s => s.destroy());
    this.playerSprites.clear();
    this.interpolationBuffers.clear();
    this.pendingInputs = [];
  }
}
```

---

## Game Over Scene: Room Cleanup

```typescript
// src/scenes/GameOverScene.ts
import { ColyseusManager } from "../network/ColyseusManager";

class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOverScene");
  }

  create(data: { isWinner: boolean; winnerId: string }) {
    const text = data.isWinner ? "You Win!" : "Game Over";
    this.add.text(400, 250, text, { fontSize: "48px", color: "#fff" }).setOrigin(0.5);

    const playAgain = this.add.text(400, 350, "Play Again", {
      fontSize: "24px", color: "#fff", backgroundColor: "#336", padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive();

    playAgain.on("pointerdown", () => {
      // Leave current room, go back to menu to join a new one
      ColyseusManager.get().leave();
      this.scene.start("MenuScene");
    });
  }
}
```

---

## Key Integration Rules

1. **One ColyseusManager, many scenes.** Initialize once in BootScene, access via `ColyseusManager.get()` everywhere.

2. **Wire callbacks in `create()`, not `update()`.** Colyseus schema callbacks (`onAdd`, `listen`) are registered once. Never re-register in the game loop.

3. **Clean up on scene shutdown.** Destroy sprites, clear maps, remove listeners when leaving a scene.

4. **Same world, different authority.** Single-player and multiplayer can share the same tilemap, same assets, same physics config. Only the input/movement authority changes.

5. **VFX via messages, not state.** Damage numbers, screen shake, sound cues — send as `broadcast()` messages, handle client-side. Don't put them in Schema.

6. **Animations are local.** Use velocity/facing from state to CHOOSE the animation, but play it locally. Don't sync animation frames.

```typescript
// Choose animation based on synced state, play locally
playerState.listen("facing", (facing: number) => {
  const sprite = playerSprites.get(sessionId);
  const anims = ["walk-down", "walk-left", "walk-right", "walk-up"];
  sprite?.play(anims[facing], true);
});
```

7. **Input throttling matters.** Send inputs at 20Hz max. Predict locally at 60fps. This is the most common Colyseus+Phaser performance mistake.

8. **Physics in multiplayer.** For authoritative games, run physics on the server (custom collision in `setSimulationInterval`). The client uses Phaser physics only for local prediction/feel. Server corrects via state sync.
