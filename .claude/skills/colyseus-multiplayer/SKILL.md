---
name: colyseus-multiplayer
description: >
  Build lightweight, non-persistent real-time multiplayer games with Colyseus.
  Covers server rooms, state schema, client SDK, matchmaking, authentication,
  reconnection, and Phaser integration. Philosophy: Authority First, Rendering Second.
  Trigger: colyseus, multiplayer room, real-time multiplayer, lightweight multiplayer,
  game server, authoritative server, client-side prediction, state synchronization.
---

# Colyseus Lightweight Multiplayer

Build real-time multiplayer games using Colyseus as an authoritative game server with automatic state synchronization. Colyseus is for non-persistent, session-based multiplayer: lobbies, arenas, matches, party games. Not for persistent worlds (use SpacetimeDB for that).

---

## Philosophy: Authority First, Rendering Second

Colyseus works best when the server owns truth and clients render cosmetically. The guiding question is not "how do I mirror my entire game state?" but "what does the server NEED to be authoritative about, and what is purely cosmetic?"

**Before building, ask:**

1. **What is authoritative, and what is purely cosmetic?** Damage, health, scoring, win conditions = server. Animations, particles, screen shake, sound = client.
2. **What belongs in a room boundary?** One match, one lobby, one shard, or one arena?
3. **What client messages are player input?** Movement, actions, directions — these are inputs, not state. The server processes them.
4. **What latency strategy fits this game?** Interpolation, client-side prediction + reconciliation, or just accept latency?

**Core principles:**
1. Server owns game state. Clients send inputs, server processes them, state auto-syncs.
2. Only replicate what needs authority: damage, health, positions, scoring.
3. Animations, particles, VFX are client-side — don't sync them.
4. The map/level is static. Clients load it locally. Don't sync terrain.
5. Client-side prediction is for FEEL, not truth. Server corrects.
6. Keep rooms small (2-8 players). Colyseus shines at focused sessions, not MMOs.

---

## HALLUCINATED APIs — DO NOT USE

```typescript
// WRONG PACKAGE NAME
import { Client } from "colyseus";  // This is the SERVER package!

// WRONG — old API patterns
gameServer.register("room_name", Room);  // Use .define()
room.setState(state);  // setState is correct, but don't call it outside onCreate
room.onMessage(callback);  // Must specify message type: this.onMessage("type", callback)

// WRONG — client patterns
room.state.players.onChange = (player) => {};  // Use .onAdd() / .onRemove()
room.listen("state.players", callback);  // Old API, use schema callbacks
room.state.onChange(callback);  // Deprecated, use schema .listen() or .onAdd()

// WRONG — schema definition
@type("map", Player)  // Use @type({ map: Player })
@type("array", Item)  // Use @type([Item])
```

### CORRECT PATTERNS:

```typescript
// SERVER IMPORTS
import { Room, Client } from "colyseus";
import { Schema, type, MapSchema, ArraySchema, filter } from "@colyseus/schema";

// CLIENT IMPORTS
import { Client } from "colyseus.js";  // Note: "colyseus.js" not "colyseus"

// SERVER: define rooms
import { defineServer, defineRoom } from "colyseus";
const server = defineServer({
  rooms: {
    game: defineRoom(GameRoom).filterBy(["mode"]),
  }
});

// CLIENT: join rooms
const client = new Client("ws://localhost:2567");
const room = await client.joinOrCreate("game", { mode: "deathmatch" });
```

---

## Common Mistakes Table

| Wrong | Right | Error |
|-------|-------|-------|
| `import { Client } from "colyseus"` | `import { Client } from "colyseus.js"` | Server vs client package |
| `gameServer.register("name", Room)` | `gameServer.define("name", Room)` | `.register()` removed |
| `@type("map", Player)` | `@type({ map: Player })` | Wrong decorator syntax |
| `@type("array", Item)` | `@type([Item])` | Wrong decorator syntax |
| `this.state.players = new MapSchema()` | `this.state.players.clear()` | Never reassign collections |
| `room.state.players.forEach(...)` on client | `room.state.players.onAdd(...)` | Use callbacks, not iteration |
| Missing `experimentalDecorators` in tsconfig | `"experimentalDecorators": true` | `@type` silently fails |
| `@filter` after `@type` | `@filter` BEFORE `@type` | Filter not applied |
| `this.onMessage((client, msg) => {})` | `this.onMessage("type", (client, msg) => {})` | Must specify message type |
| `room.send({ type: "move", x: 1 })` | `room.send("move", { x: 1 })` | Type is first arg, not in payload |
| `client.reconnect(roomId, sessionId)` | `client.reconnect(reconnectionToken)` | 0.15+ uses token |
| More than 64 `@type` fields per class | Nest into sub-schemas | Silent sync failures |
| Using `"number"` for everything | Use `"int8"`, `"uint16"`, etc. | Wastes bandwidth |
| Mutating state on client | Send message to server | Client state is read-only |

---

## Hard Requirements

1. **`experimentalDecorators: true`** in `tsconfig.json` — `@type` and `@filter` decorators silently fail without it.
2. **Server package is `colyseus`**, client package is `colyseus.js`** — never mix them.
3. **Call `this.setState()` in `onCreate()`** — room must have state before clients join.
4. **Never reassign collection fields** — mutate `MapSchema`/`ArraySchema` in place, never replace them.
5. **Maximum 64 `@type` fields per Schema class** — nest sub-schemas to exceed this.
6. **Use specific int types** (`"uint8"`, `"int16"`) over `"number"` — saves bandwidth significantly.
7. **`@filter` comes BEFORE `@type`** — order matters for decorators.
8. **Client/server versions must match** — mismatched `colyseus`/`colyseus.js` causes silent protocol errors.
9. **Message types are required** — `this.onMessage("type", handler)`, not `this.onMessage(handler)`.
10. **State is server-authoritative** — clients observe state via callbacks, never mutate it directly.
11. **WebSocket sticky sessions required** behind load balancers — Colyseus uses stateful connections.

---

## Installation

### Server

```bash
npm install colyseus @colyseus/schema
# Or scaffold a new project:
npm create colyseus-app@latest ./my-server
```

### Client

```bash
npm install colyseus.js
```

### CDN (no bundler)

```html
<script src="https://unpkg.com/colyseus.js@^0.15.0/dist/colyseus.js"></script>
<script>
  const client = new Colyseus.Client("ws://localhost:2567");
</script>
```

---

## Server Setup

### Modern API (defineServer)

```typescript
import { defineServer, defineRoom } from "colyseus";
import { GameRoom } from "./rooms/GameRoom";
import { LobbyRoom } from "./rooms/LobbyRoom";

const server = defineServer({
  rooms: {
    lobby: defineRoom(LobbyRoom),
    game: defineRoom(GameRoom)
      .filterBy(["mode", "maxClients"])
      .sortBy({ clients: -1 }),  // prefer fuller rooms
  },
  // devMode: process.env.NODE_ENV !== "production",
  // gracefullyShutdown: true,
});
```

### Classic API (Server class)

```typescript
import { Server } from "colyseus";
import { createServer } from "http";
import express from "express";
import { GameRoom } from "./rooms/GameRoom";

const app = express();
app.use(express.json());

const server = createServer(app);
const gameServer = new Server({ server });

gameServer.define("game_room", GameRoom)
  .filterBy(["mode"]);

gameServer.listen(2567);
```

### Express Integration with Monitor

```typescript
import { monitor } from "@colyseus/monitor";
import basicAuth from "express-basic-auth";

app.use("/colyseus",
  basicAuth({ users: { admin: "admin" }, challenge: true }),
  monitor()
);
```

---

## State Schema Definition

```typescript
import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

class Player extends Schema {
  @type("string") name: string = "";
  @type("float32") x: number = 0;
  @type("float32") y: number = 0;
  @type("int16") health: number = 100;
  @type("boolean") connected: boolean = true;
  @type("uint8") facing: number = 0;  // 0-3 direction enum
}

class Projectile extends Schema {
  @type("float32") x: number = 0;
  @type("float32") y: number = 0;
  @type("float32") vx: number = 0;
  @type("float32") vy: number = 0;
  @type("string") ownerId: string = "";
}

class GameState extends Schema {
  @type("string") phase: string = "waiting";  // waiting | playing | ended
  @type("uint8") timer: number = 0;
  @type({ map: Player }) players = new MapSchema<Player>();
  @type([Projectile]) projectiles = new ArraySchema<Projectile>();
  @type("string") winnerId: string = "";
}
```

### Primitive Types Reference

| Type | Bytes | Range | Use for |
|------|-------|-------|---------|
| `"boolean"` | 1 | 0/1 | Flags |
| `"int8"` | 1 | -128..127 | Small signed values |
| `"uint8"` | 1 | 0..255 | Health, direction, small counts |
| `"int16"` | 2 | -32768..32767 | Tile coords, health |
| `"uint16"` | 2 | 0..65535 | Scores, IDs |
| `"int32"` | 4 | -2B..2B | Large values |
| `"uint32"` | 4 | 0..4B | Timestamps, large IDs |
| `"float32"` | 4 | ~7 digits | Positions, velocities |
| `"float64"` | 8 | ~15 digits | Precision math |
| `"number"` | 1-9 | auto | Convenience (wastes bytes) |
| `"string"` | varies | UTF-8 | Names, IDs |

### Collection Types

```typescript
// MapSchema — key-value, best for players/entities by ID
@type({ map: Player }) players = new MapSchema<Player>();
this.state.players.set(client.sessionId, new Player());
this.state.players.get(client.sessionId);
this.state.players.delete(client.sessionId);
this.state.players.has(client.sessionId);
this.state.players.size;
this.state.players.forEach((player, key) => {});
this.state.players.clear();

// ArraySchema — ordered list, for projectiles/events/leaderboards
@type([Projectile]) projectiles = new ArraySchema<Projectile>();
this.state.projectiles.push(new Projectile());
this.state.projectiles.splice(index, 1);
this.state.projectiles.length;

// SetSchema — unique primitives (JS client only)
@type({ set: "string" }) tags = new SetSchema<string>();

// CollectionSchema — unindexed Schema instances (JS client only)
@type({ collection: Player }) npcs = new CollectionSchema<Player>();
```

### State Filtering (per-client visibility)

```typescript
import { Schema, type, filter } from "@colyseus/schema";

class Card extends Schema {
  @type("string") ownerId: string = "";

  @filter(function(this: Card, client: Client, value: any, root: Schema) {
    return this.ownerId === client.sessionId;  // only owner sees
  })
  @type("uint8") value: number = 0;
}
```

### Nested Schemas

```typescript
class Inventory extends Schema {
  @type("uint8") maxSlots: number = 10;
  @type([Item]) items = new ArraySchema<Item>();
}

class Player extends Schema {
  @type("string") name: string = "";
  @type(Inventory) inventory = new Inventory();
}
```

---

## Room Implementation

```typescript
import { Room, Client, AuthContext } from "colyseus";
import { GameState, Player } from "./GameState";

export class GameRoom extends Room {
  maxClients = 4;
  state = new GameState();

  // Message handlers — declarative style (0.16+)
  messages = {
    "move": (client: Client, payload: { x: number, y: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.x = payload.x;
        player.y = payload.y;
      }
    },
    "attack": (client: Client, payload: { targetId: string }) => {
      this.handleAttack(client.sessionId, payload.targetId);
    },
    "*": (client: Client, type: string, payload: any) => {
      console.log("Unknown message:", type, payload);
    }
  };

  // Room created
  onCreate(options: any) {
    this.setState(new GameState());

    // Game loop at 60fps
    this.setSimulationInterval((deltaTime) => this.update(deltaTime), 1000 / 60);

    // Or register message handlers imperatively:
    // this.onMessage("move", (client, data) => { ... });
  }

  // Auth (optional) — return truthy to allow, throw to deny
  async onAuth(client: Client, options: any, context: AuthContext) {
    // return truthy = allow join, return value available as auth param in onJoin
    return { name: options.name || "Guest" };
  }

  // Client joined
  onJoin(client: Client, options: any, auth: any) {
    const player = new Player();
    player.name = auth.name;
    this.state.players.set(client.sessionId, player);
    client.send("welcome", { sessionId: client.sessionId });

    // Start game when enough players
    if (this.state.players.size >= 2) {
      this.state.phase = "playing";
      this.lock();  // prevent new joins mid-game
    }
  }

  // Client disconnected unexpectedly (0.16+ lifecycle)
  async onDrop(client: Client, code?: number) {
    const player = this.state.players.get(client.sessionId);
    if (player) player.connected = false;

    // Allow 20 seconds to reconnect
    this.allowReconnection(client, 20);
  }

  // Client reconnected (0.16+)
  onReconnect(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (player) player.connected = true;
  }

  // Client left permanently
  onLeave(client: Client, code?: number) {
    this.state.players.delete(client.sessionId);

    // Check if game should end
    if (this.state.phase === "playing" && this.state.players.size <= 1) {
      this.endGame();
    }
  }

  // Room destroyed
  onDispose() {
    console.log("Room disposed:", this.roomId);
  }

  // Game loop
  update(deltaTime: number) {
    if (this.state.phase !== "playing") return;

    // Update projectiles
    this.state.projectiles.forEach((proj, i) => {
      proj.x += proj.vx * (deltaTime / 1000);
      proj.y += proj.vy * (deltaTime / 1000);
    });

    // Check collisions, apply damage, etc.
    this.checkCollisions();
  }

  handleAttack(attackerId: string, targetId: string) {
    const target = this.state.players.get(targetId);
    if (!target || target.health <= 0) return;

    target.health -= 25;
    this.broadcast("damage", { targetId, amount: 25, attackerId });

    if (target.health <= 0) {
      this.broadcast("kill", { targetId, killerId: attackerId });
      this.checkGameOver();
    }
  }

  checkGameOver() {
    const alive = [...this.state.players.entries()]
      .filter(([_, p]) => p.health > 0);

    if (alive.length <= 1) {
      this.state.phase = "ended";
      this.state.winnerId = alive[0]?.[0] ?? "";
      this.broadcast("gameOver", { winnerId: this.state.winnerId });

      // Auto-dispose after delay
      this.clock.setTimeout(() => this.disconnect(), 5000);
    }
  }

  endGame() {
    this.state.phase = "ended";
    this.unlock();
  }
}
```

### Room Properties Reference

| Property | Type | Description |
|----------|------|-------------|
| `this.roomId` | `string` | Unique room ID |
| `this.roomName` | `string` | Room name from `.define()` |
| `this.state` | `T` | Room state (Schema) |
| `this.clients` | `Client[]` | Connected clients |
| `this.maxClients` | `number` | Max allowed clients |
| `this.patchRate` | `number` | State sync rate in ms (default 50ms = 20fps) |
| `this.autoDispose` | `boolean` | Auto-dispose when empty (default true) |
| `this.locked` | `boolean` | Whether room accepts new clients |
| `this.clock` | `ClockTimer` | Built-in timer for setTimeout/setInterval |
| `this.presence` | `Presence` | Shared presence (for multi-process) |

### Room Methods Reference

```typescript
// State
this.setState(state: T): void;
this.setMetadata(metadata: any): Promise<void>;

// Messaging
this.broadcast(type: string, message?: any, options?: { except?: Client, afterNextPatch?: boolean }): void;
this.onMessage(type: string, callback: (client: Client, message: any) => void): void;
this.onMessage("*", callback: (client: Client, type: string, message: any) => void): void;

// Client management
this.lock(): Promise<void>;
this.unlock(): Promise<void>;
this.disconnect(): Promise<void>;

// Reconnection
this.allowReconnection(client: Client, seconds: number): Promise<Client>;

// Simulation
this.setSimulationInterval(callback: (deltaTime: number) => void, interval?: number): void;
this.setPatchRate(milliseconds: number): void;

// Timers
this.clock.setTimeout(callback, ms): Delayed;
this.clock.setInterval(callback, ms): Delayed;
this.clock.clear(): void;
```

### Client Object (server-side)

```typescript
client.sessionId: string;         // unique per connection
client.auth: any;                  // data from onAuth
client.userData: any;              // custom storage
client.send(type: string, message?: any): void;
client.leave(code?: number): void;
client.error(code: number, message?: string): void;
```

---

## Client SDK

```typescript
import { Client } from "colyseus.js";

const client = new Client("ws://localhost:2567");

// Join or create (most common — matchmaking)
const room = await client.joinOrCreate("game", { name: "Alice", mode: "deathmatch" });

// Other join methods
const room = await client.create("game", options);       // always create new
const room = await client.join("game", options);          // join existing only
const room = await client.joinById("roomIdHere", options); // specific room

// Reconnect with token
const room = await client.reconnect(reconnectionToken);

// List available rooms
const rooms = await client.getAvailableRooms("game");
// => [{ roomId, clients, maxClients, metadata, name }]
```

### Room Events (client-side)

```typescript
// State changed (fires every server patch ~20fps)
room.onStateChange((state) => {
  console.log("state updated:", state);
});

// First state received
room.onStateChange.once((state) => {
  console.log("initial state:", state);
});

// Receive messages from server
room.onMessage("welcome", (data) => {
  console.log("Welcome! Session:", data.sessionId);
});

room.onMessage("damage", ({ targetId, amount }) => {
  playDamageEffect(targetId, amount);  // purely cosmetic
});

// Wildcard
room.onMessage("*", (type, message) => {
  console.log("received:", type, message);
});

// Connection dropped (0.16+ — auto-reconnect configured)
room.onDrop((code, reason) => {
  showReconnectingUI();
});

// Reconnected
room.onReconnect(() => {
  hideReconnectingUI();
});

// Error
room.onError((code, message) => {
  console.error("Room error:", code, message);
});

// Left room
room.onLeave((code) => {
  if (code > 1000) {
    // abnormal disconnect
  }
});

// Send input to server
room.send("move", { x: 100, y: 200 });
room.send("attack", { targetId: "abc123" });

// Leave
room.leave();

// Store for reconnection
localStorage.setItem("reconnectionToken", room.reconnectionToken);
```

### Schema Callbacks (client-side state listening)

```typescript
// MapSchema: players added/removed
room.state.players.onAdd((player, sessionId) => {
  const sprite = createPlayerSprite(player.x, player.y);
  playerSprites.set(sessionId, sprite);

  // Listen to property changes on this player
  player.listen("x", (value, prev) => { sprite.x = value; });
  player.listen("y", (value, prev) => { sprite.y = value; });
  player.listen("health", (value, prev) => { updateHealthBar(sessionId, value); });
});

room.state.players.onRemove((player, sessionId) => {
  playerSprites.get(sessionId)?.destroy();
  playerSprites.delete(sessionId);
});

// ArraySchema: projectiles
room.state.projectiles.onAdd((proj, index) => {
  spawnProjectileEffect(proj.x, proj.y, proj.vx, proj.vy);
});

room.state.projectiles.onRemove((proj, index) => {
  removeProjectileEffect(index);
});

// Listen to primitive state changes
room.state.listen("phase", (value, prev) => {
  if (value === "playing") startGameUI();
  if (value === "ended") showGameOverUI();
});
```

---

## Reconnection Pattern

### Server

```typescript
async onDrop(client: Client, code?: number) {
  const player = this.state.players.get(client.sessionId);
  if (player) player.connected = false;
  this.allowReconnection(client, 30);  // 30 seconds
}

onReconnect(client: Client) {
  const player = this.state.players.get(client.sessionId);
  if (player) player.connected = true;
}

onLeave(client: Client) {
  // Called after reconnection timeout OR consented leave
  this.state.players.delete(client.sessionId);
}
```

### Client (0.16+)

```typescript
const room = await client.joinOrCreate("game", options);

// Configure auto-reconnection
room.reconnection.maxRetries = 10;
room.reconnection.maxDelay = 5000;

room.onDrop((code, reason) => {
  showReconnectingUI();
});

room.onReconnect(() => {
  hideReconnectingUI();
});

room.onLeave((code) => {
  if (code === CloseCode.FAILED_TO_RECONNECT) {
    showError("Connection lost. Please rejoin.");
  }
});
```

---

## Authentication

### onAuth in Room

```typescript
async onAuth(client: Client, options: any, context: AuthContext) {
  if (options.token) {
    const user = await verifyToken(options.token);
    return user;  // truthy = allow, available as `auth` in onJoin
  }
  // Anonymous — allow with guest name
  return { name: options.name || "Guest", anonymous: true };
}

onJoin(client: Client, options: any, auth: any) {
  console.log("Joined:", auth.name, auth.anonymous ? "(guest)" : "(authenticated)");
}
```

### @colyseus/auth module (optional)

```typescript
import { auth } from "@colyseus/auth";

// Server: mount routes
app.use(auth.prefix, auth.routes());

// Client:
import { auth } from "colyseus.js";
const { user, token } = await auth.login("email", "password");
const { user, token } = await auth.anonymous();
const room = await client.joinOrCreate("game", { token });
```

---

## Matchmaking with filterBy

```typescript
// Server
gameServer.define("battle", BattleRoom)
  .filterBy(["mode", "region"])
  .sortBy({ clients: -1 });  // fill rooms before creating new ones

// Client — same filter values = same room
await client.joinOrCreate("battle", { mode: "deathmatch", region: "eu" });
```

---

## Reference Files

Read these before working on the relevant feature:

| When working on... | Read first |
|--------------------|------------|
| Client-side prediction, interpolation, lag compensation | `references/client-side-prediction.md` |
| Phaser + Colyseus integration patterns | `references/phaser-integration.md` |

---

## Project Structure

```
my-game/
  server/
    src/
      index.ts              # Server entry, defineServer
      rooms/
        GameRoom.ts         # Room lifecycle + game logic
        LobbyRoom.ts        # Lobby/matchmaking room
      schemas/
        GameState.ts        # Schema definitions
    package.json            # colyseus, @colyseus/schema
    tsconfig.json           # experimentalDecorators: true!
  client/
    src/
      network/
        ColyseusClient.ts   # Client singleton, join/reconnect
        StateCallbacks.ts   # Wire schema callbacks to game objects
      scenes/
        GameScene.ts        # Phaser scene with multiplayer
    package.json            # colyseus.js
```

### Server tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2018",
    "module": "commonjs",
    "outDir": "./lib",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "experimentalDecorators": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

---

## Architecture Decisions (Make Early)

### What to Sync vs What to Keep Local

| Sync (server-authoritative) | Local (client-only) |
|-----------------------------|---------------------|
| Player positions | Animations, sprite frames |
| Health, damage, death | Damage VFX, screen shake |
| Projectile positions | Particle trails |
| Game phase, timer, scores | UI state, menus |
| Win/lose conditions | Sound effects |
| Collision results | Camera movement |

### Room Topology

| Pattern | Use when |
|---------|----------|
| Single room type | Simple games: lobby IS the game |
| Lobby + Game rooms | Players gather first, then play |
| Persistent lobby | Players return to lobby after match |
| Instanced arenas | Each match is its own disposable room |

### Tick Rate vs Patch Rate

| Setting | Default | Tuning |
|---------|---------|--------|
| `setSimulationInterval` | none | 1000/60 for action, 1000/20 for turn-based |
| `patchRate` | 50ms (20/s) | Lower = more bandwidth, higher = more lag |
| Relationship | Simulation runs game logic, patchRate controls state sync frequency |

---

## Anti-Patterns to Avoid

| Anti-pattern | Why it hurts | Better |
|--------------|--------------|--------|
| Syncing animations/VFX via state | Bloats bandwidth, adds latency to visuals | Send event messages, play effects client-side |
| Syncing the entire tilemap | Massive state, pointless if map is static | Clients load map locally |
| Using `"number"` for all fields | Wastes 1-9 bytes per field vs 1-4 with specific types | Use `"uint8"`, `"int16"`, `"float32"` |
| Replacing MapSchema instead of mutating | Breaks delta sync, sends entire collection | Use `.set()`, `.delete()`, `.clear()` |
| Running physics on both client AND server | Divergence causes rubber-banding | Pick one: server-authoritative OR client-predicted with server correction |
| Putting all game logic in message handlers | Messy, hard to reason about tick order | Use `setSimulationInterval` for game loop, messages for input |
| Trusting client input directly | Cheating vector | Validate all input server-side |
| Not storing reconnection token | Users can't rejoin after brief disconnects | Store `room.reconnectionToken` in localStorage |
| Giant Schema classes (>64 fields) | Silent sync failures | Nest into sub-schemas |
| Sending messages every frame from client | Floods server | Throttle input, send only on change |

---

## Scaling and Deployment

### Single Process (development)

```bash
npx ts-node src/index.ts
# or
node lib/index.js
```

### Multi-Process with Redis

```typescript
import { RedisPresence } from "@colyseus/redis-presence";
import { RedisDriver } from "@colyseus/redis-driver";

const gameServer = new Server({
  presence: new RedisPresence({ host: "redis-host", port: 6379 }),
  driver: new RedisDriver(),
});
```

### PM2

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: "colyseus",
    script: "lib/index.js",
    instances: 2,
    exec_mode: "fork",  // NOT cluster — Colyseus manages its own
  }]
};
```

### NGINX (sticky sessions required)

```nginx
upstream colyseus {
  ip_hash;  # sticky sessions
  server 127.0.0.1:2567;
  server 127.0.0.1:2568;
}

server {
  location / {
    proxy_pass http://colyseus;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
  }
}
```

---

## Remember

Colyseus is for focused, session-based multiplayer. Its sweet spot is 2-8 player rooms with server-authoritative game logic and automatic state sync. Keep schemas lean, sync only what matters, and let clients handle cosmetics locally.

Before coding: What is the server authoritative about? What room boundaries define a session? What does the client need to predict for responsiveness? Answer these first, then the implementation follows naturally.
