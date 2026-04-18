# Client-Side Prediction and Lag Compensation

## When You Need This

If your game has real-time movement and the server is authoritative over positions, players will feel input lag equal to their round-trip time (RTT). For action games, this is unacceptable. Client-side prediction fixes the feel without sacrificing authority.

**You need prediction when:**
- Players control movement directly (WASD, joystick)
- The game is action/arcade (not turn-based)
- RTT > 50ms makes movement feel sluggish

**You DON'T need prediction when:**
- Turn-based games (chess, card games)
- The server just validates actions (attacks, ability use)
- Movement is click-to-move (server path is fine)

---

## The Pattern: Predict, Confirm, Reconcile

### 1. Client Predicts Locally

When the player presses a key, apply the movement immediately on the client WITHOUT waiting for the server. Also send the input to the server with a sequence number.

```typescript
// Client-side input handling
class InputBuffer {
  private sequence = 0;
  private pending: Input[] = [];

  captureAndSend(room: Room, keys: KeyState): Input {
    const input: Input = {
      seq: this.sequence++,
      dx: keys.left ? -1 : keys.right ? 1 : 0,
      dy: keys.up ? -1 : keys.down ? 1 : 0,
      dt: delta,  // time since last input
    };

    // Send to server
    room.send("input", input);

    // Store for reconciliation
    this.pending.push(input);

    return input;
  }

  // Remove confirmed inputs
  confirmUpTo(seq: number) {
    this.pending = this.pending.filter(i => i.seq > seq);
  }

  getPending(): Input[] {
    return this.pending;
  }
}
```

### 2. Apply Prediction Locally

```typescript
// Shared movement function (same logic on client AND server)
function applyMovement(player: { x: number, y: number }, input: Input, speed: number) {
  player.x += input.dx * speed * input.dt;
  player.y += input.dy * speed * input.dt;
}

// Client: predict immediately
const input = inputBuffer.captureAndSend(room, keys);
applyMovement(localPlayer, input, PLAYER_SPEED);
```

### 3. Server Processes Authoritatively

```typescript
// Server room
this.onMessage("input", (client, input: Input) => {
  const player = this.state.players.get(client.sessionId);
  if (!player) return;

  // Validate input (anti-cheat)
  const dx = Math.max(-1, Math.min(1, input.dx));
  const dy = Math.max(-1, Math.min(1, input.dy));
  const dt = Math.min(input.dt, 0.1);  // cap delta time

  // Apply authoritative movement
  player.x += dx * PLAYER_SPEED * dt;
  player.y += dy * PLAYER_SPEED * dt;

  // Clamp to world bounds
  player.x = Math.max(0, Math.min(WORLD_WIDTH, player.x));
  player.y = Math.max(0, Math.min(WORLD_HEIGHT, player.y));

  // Store last processed sequence
  player.lastProcessedSeq = input.seq;
});
```

### 4. Reconcile on Server Update

When the server state arrives, check if our prediction was correct. If not, snap to server position and re-apply unconfirmed inputs.

```typescript
// Client: on server state update for local player
localPlayer.listen("x", (serverX) => {
  reconcile(serverX, "x");
});
localPlayer.listen("y", (serverY) => {
  reconcile(serverY, "y");
});

function reconcile(serverPos: number, axis: "x" | "y") {
  const lastSeq = localPlayerSchema.lastProcessedSeq;

  // Discard inputs the server has already processed
  inputBuffer.confirmUpTo(lastSeq);

  // Start from server's authoritative position
  let pos = serverPos;

  // Re-apply unconfirmed inputs
  for (const input of inputBuffer.getPending()) {
    const delta = axis === "x" ? input.dx : input.dy;
    pos += delta * PLAYER_SPEED * input.dt;
  }

  // Update local position
  localSprite[axis] = pos;
}
```

---

## Interpolation for Other Players

Your local player is predicted. Other players should be **interpolated** — smoothly moved between server updates rather than snapping.

```typescript
class InterpolationBuffer {
  private buffer: { x: number, y: number, timestamp: number }[] = [];
  private interpolationDelay = 100;  // ms behind server time

  push(x: number, y: number) {
    this.buffer.push({ x, y, timestamp: Date.now() });
    // Keep only last ~1 second of data
    while (this.buffer.length > 20) this.buffer.shift();
  }

  getInterpolated(): { x: number, y: number } | null {
    const renderTime = Date.now() - this.interpolationDelay;

    // Find two states to interpolate between
    for (let i = 1; i < this.buffer.length; i++) {
      const prev = this.buffer[i - 1];
      const next = this.buffer[i];

      if (prev.timestamp <= renderTime && next.timestamp >= renderTime) {
        const t = (renderTime - prev.timestamp) / (next.timestamp - prev.timestamp);
        return {
          x: prev.x + (next.x - prev.x) * t,
          y: prev.y + (next.y - prev.y) * t,
        };
      }
    }

    // Use latest if we can't interpolate
    return this.buffer.length > 0
      ? this.buffer[this.buffer.length - 1]
      : null;
  }
}

// Usage: one buffer per remote player
const remoteBuffers = new Map<string, InterpolationBuffer>();

room.state.players.onAdd((player, sessionId) => {
  if (sessionId === room.sessionId) return;  // skip local player

  const buffer = new InterpolationBuffer();
  remoteBuffers.set(sessionId, buffer);

  player.listen("x", () => buffer.push(player.x, player.y));
  player.listen("y", () => buffer.push(player.x, player.y));
});

// In game loop update
function updateRemotePlayers() {
  remoteBuffers.forEach((buffer, sessionId) => {
    const pos = buffer.getInterpolated();
    if (pos) {
      const sprite = playerSprites.get(sessionId);
      if (sprite) {
        sprite.x = pos.x;
        sprite.y = pos.y;
      }
    }
  });
}
```

---

## What to Predict vs What to Accept Latency On

| Feature | Strategy | Why |
|---------|----------|-----|
| Local player movement | Predict + reconcile | Must feel instant |
| Other player movement | Interpolate | Smooth, no prediction needed |
| Melee attack hit | Server-authoritative, client shows effect immediately | Server decides if it hit |
| Projectile launch | Predict locally, server confirms | Visual feedback matters |
| Projectile hit/damage | Server-authoritative only | Must be fair |
| Health changes | Accept latency (server event) | Accuracy > speed |
| Death/kill | Server-authoritative, play effect on event | Cannot be predicted |
| Animations (walk, idle) | Client-only, based on velocity | Never sync animations |
| Particle effects | Client-only | Never sync particles |

---

## Colyseus-Specific Notes

### Adding lastProcessedSeq to Schema

```typescript
class Player extends Schema {
  @type("float32") x: number = 0;
  @type("float32") y: number = 0;
  @type("int16") health: number = 100;
  @type("uint32") lastProcessedSeq: number = 0;  // for reconciliation
}
```

### Input Throttling

Don't send input every frame. Batch or throttle to match server tick rate.

```typescript
// Send input at 20Hz, not 60Hz
const INPUT_RATE = 1000 / 20;
let lastInputTime = 0;

function update(time: number, delta: number) {
  if (time - lastInputTime >= INPUT_RATE) {
    const input = captureInput();
    if (input.dx !== 0 || input.dy !== 0) {
      room.send("input", input);
    }
    lastInputTime = time;
  }

  // But ALWAYS predict locally at full frame rate
  applyLocalPrediction(delta);
}
```

### Handling Snapping

If reconciliation produces a large correction (>threshold), lerp instead of snapping:

```typescript
const SNAP_THRESHOLD = 50;  // pixels
const CORRECTION_SPEED = 0.2;

function applyCorrection(current: number, target: number): number {
  const diff = Math.abs(target - current);
  if (diff > SNAP_THRESHOLD) {
    return target;  // teleport if too far off
  }
  return current + (target - current) * CORRECTION_SPEED;  // smooth correction
}
```

---

## Summary

1. **Predict** local player movement immediately
2. **Send** inputs to server with sequence numbers
3. **Server** processes inputs authoritatively, stores last processed seq
4. **Reconcile** when server state arrives: snap to server pos, re-apply pending inputs
5. **Interpolate** remote players between server updates
6. **Never predict** damage, health, death, or win conditions
7. **Throttle** input sending to match server tick rate
8. **Smooth** corrections instead of snapping when difference is small
