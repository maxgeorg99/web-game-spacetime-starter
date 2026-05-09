---
name: deckbuilder-architecture
description: >
  Build roguelike deck-builder games with proper architecture. Covers card models, action queues,
  event hooks, power/relic systems, combat flow, and save serialization. Inspired by Slay the Spire.
  Trigger: "deck builder", "card game architecture", "roguelike deck", "card game data model",
  "deck builder hooks", "card game events"
---

# Deck Builder Architecture

Best practices for building roguelike deck-builder games - engine-agnostic patterns.

---

## Core Principle: Separate Data from Presentation

### The Pattern

```
┌─────────────────────┐     ┌─────────────────────┐
│   MODEL / DATA      │     │   VIEW / ENTITY     │
│   (What it IS)      │     │   (What it DOES)   │
├─────────────────────┤     ├─────────────────────┤
│ CardModel           │ ──► │ CardSprite/Node     │
│ PowerModel          │     │ PowerDisplay        │
│ RelicModel          │     │ RelicIcon           │
│ EnemyModel          │     │ EnemyEntity         │
└─────────────────────┘     └─────────────────────┘
```

**Why this matters:**
- Game designers tweak values in data without touching visuals
- Artists work on scenes/sprites without breaking logic
- Easier to test, serialize, and modify procedurally
- Powers can modify card values without UI coupling

---

## 1. Card System

### Data Structure

```javascript
// Phaser - Card as pure data
const CARD = {
  id: 'strike',
  name: 'Strike',
  type: 'attack',        // attack, skill, power, status, curse
  rarity: 'common',     // common, uncommon, rare, special
  cost: 1,              // energy cost (or -1 for free)
  keywords: ['strike'],
  target: 'enemy',      // none, enemy, all_enemies, self
  effects: {
    damage: 6
  }
};
```

### Card Execution (Command Pattern)

```javascript
// Use command pattern for card effects
class PlayCardCommand {
  static async execute(card, target, context) {
    // 1. Hook: Can card be played?
    if (!await Hooks.trigger('canPlayCard', card, context)) {
      return; // Blocked by a power/relic
    }

    // 2. Modify values based on powers
    let damage = card.effects.damage;
    damage = Hooks.modify('damage', damage, context);

    // 3. Execute effect
    await DamageCommand.execute(target, damage, context);

    // 4. Hook: After card played
    Hooks.trigger('afterCardPlayed', card, context);
  }
}
```

---

## 2. Action Queue System

### Why Queue Actions?

- **Deterministic execution** - Same order every time
- **Pause/resume** - Player can pause during animations
- **Replays** - Action log enables replays
- **Undo** - Can implement undo with action history
- **Visual pacing** - Effects animate between actions

### Simple Implementation

```javascript
class ActionQueue {
  constructor() {
    this.queue = [];
    this.isRunning = false;
  }

  enqueue(action) {
    this.queue.push(action);
    if (!this.isRunning) this.runNext();
  }

  async runNext() {
    if (this.queue.length === 0) {
      this.isRunning = false;
      return;
    }

    this.isRunning = true;
    const action = this.queue.shift();

    // Execute and wait for completion (including animations)
    await action.execute();

    // Notify listeners
    Hooks.trigger('actionComplete', action);

    // Next action
    this.runNext();
  }
}
```

### Action States

```
Created → Enqueued → WaitingForExecution → Executing
                                              ↓
                                    GatheringPlayerChoice (paused)
                                              ↓
                                      ReadyToResumeExecuting
                                              ↓
                                         Finished / Canceled
```

---

## 3. Event Hook System

### The Observer Pattern

```javascript
const HOOKS = {
  beforeCardPlayed: [],
  afterCardPlayed: [],
  beforeAttack: [],
  afterAttack: [],
  beforeDamageReceived: [],
  afterDamageReceived: [],
  beforeTurnEnd: [],
  afterTurnEnd: [],
  onTurnStart: [],
  beforeCardDrawn: [],
  afterCardDrawn: [],
  beforeCardDiscarded: [],
  afterCardExhausted: [],
  onBattleStart: [],
  onBattleEnd: [],
  // ... 30+ more
};

function Hooks.trigger(eventName, ...args) {
  for (const callback of HOOKS[eventName] || []) {
    callback(...args);
  }
}

function Hooks.modify(modifierType, value, context) {
  let result = value;
  for (const modifier of HOOKS['modify' + modifierType] || []) {
    result = modifier(result, context);
  }
  return result;
}
```

### Power Implements Hooks

```javascript
class StrengthPower {
  constructor(amount) {
    this.amount = amount;
    this.name = 'strength';
  }

  // Register hooks
  register() {
    HOOKS.modifyDamage.push((damage, ctx) => damage + this.amount);
  }

  unregister() {
    const idx = HOOKS.modifyDamage.indexOf(this);
    if (idx >= 0) HOOKS.modifyDamage.splice(idx, 1);
  }
}
```

### Hook Timing Variants

```javascript
// Some hooks fire in order: Early → Main → Late
HOOKS.afterCardPlayedEarly.forEach(h => h(...args));  // Runs first
HOOKS.afterCardPlayed.forEach(h => h(...args));        // Main handlers
HOOKS.afterCardPlayedLate.forEach(h => h(...args));   // Cleanup
```

---

## 4. Power / Buff System

### Power Types

| Type | Behavior | Examples |
|------|----------|----------|
| **Intensity** | Stacks by amount | Strength, Focus, Dexterity |
| **Duration** | Lasts N turns | Vulnerable, Weak |
| **Independent** | Each instance separate | Artifact, Intangible |

### Power Implementation

```javascript
class Power {
  constructor(name, amount, duration) {
    this.name = name;
    this.amount = amount;
    this.duration = duration; // -1 = permanent
    this.source = null; // which card/relic applied this
  }

  // Hook into damage calculations
  onBeforeAttack(attack) {
    // Modify attack
  }

  // Called each turn end
  onTurnEnd() {
    if (this.duration > 0) {
      this.duration--;
      if (this.duration === 0) return 'expire';
    }
    return 'keep';
  }

  serialize() {
    return { name: this.name, amount: this.amount, duration: this.duration };
  }
}
```

---

## 5. Relic / Artifact System

### Relic as Persistent Modifier

```javascript
class Relic {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.rarity = data.rarity;
    this.description = data.description;
    this.isStarter = data.isStarter || false;
  }

  // Hook into game events
  onBattleStart(context) { }
  onCardPlayed(card, context) { }
  onTurnStart(player, context) { }
  onEnemyDefeated(enemy, context) { }
}
```

### Example: Cracked Core

```javascript
class CrackedCore extends Relic {
  constructor() {
    super({
      id: 'cracked_core',
      name: 'Cracked Core',
      rarity: 'starter',
      isStarter: true,
      description: 'Start combat with 1 Lightning Orb.'
    });
  }

  onBattleStart(player, context) {
    if (context.isFirstTurn) {
      context.spawnOrb('lightning', player);
    }
  }
}
```

---

## 6. Combat Flow

### Turn Structure

```
���─────────────────────────────────────────┐
│           COMBAT START                  │
│  • Initialize entities                  │
│  • onBattleStart hooks                  │
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐  │
│  │         PLAYER TURN                │  │
│  │  • Draw hand (default 5 cards)    │  │
│  │  • Energy reset                   │  │
│  │  • Play cards (queue actions)     │  │
│  │  • End turn → discard hand        │  │
│  └───────────────────────────────────┘  │
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐  │
│  │         ENEMY TURN                │  │
│  │  • Enemies reveal intents         │  │
│  │  • Execute intents in order       │  │
│  │  • Each triggers hooks             │  │
│  └───────────────────────────────────┘  │
├─────────────────────────────────────────┤
│  REPEAT until one side HP <= 0          │
│  onBattleEnd → rewards → next room       │
└─────────────────────────────────────────┘
```

### Enemy Intent System

```javascript
class Enemy {
  getIntent() {
    // Show player what enemy will do
    return this._intent;
  }

  setIntent(intentType, value, target) {
    this._intent = { type: intentType, value, target };
  }

  resolveIntent(target) {
    switch (this._intent.type) {
      case 'attack':
        DamageCommand.execute(target, this._intent.value);
        break;
      case 'defend':
        BlockCommand.gain(this, this._intent.value);
        break;
      case 'buff':
        ApplyPowerCommand.execute(target, this._intent.power, this._intent.value);
        break;
    }
  }
}
```

---

## 7. Save / Serialization

### Save What Matters

```javascript
const SaveData = {
  // Run progress
  act: 1,
  floor: 12,
  gold: 456,

  // Player state
  player: {
    hp: 45,
    maxHp: 70,
    energy: 3,
    maxEnergy: 3,
    deck: ['strike', 'strike', 'defend', 'defend', ...],
    hand: [],
    drawPile: [],
    discardPile: [],
    exhaustPile: [],
    relics: ['burning_blood', 'calipers'],
    powers: [] // active powers with durations
  },

  // Combat state
  enemies: [],
  orbs: [],

  // RNG for deterministic replays
  rng: { seed: 12345, state: {...} }
};
```

### Serialize/Deserialize Powers

```javascript
// Powers that need state must be serializable
class Power {
  serialize() {
    return { name: this.name, amount: this.amount, duration: this.duration };
  }

  static deserialize(data) {
    // Recreate power instance
    return new Power(data.name, data.amount, data.duration);
  }
}
```

---

## 8. Best Practices

### Do ✓

1. **Separate data from visuals** - Cards/relics as pure data, display separately
2. **Use event hooks** - Never hardcode system interactions
3. **Queue all actions** - Enables pause, replay, undo
4. **Support modifiers** - Card values travel through modification hooks
5. **Serialize state** - Save all meaningful gameplay data
6. **Show enemy intents** - Core to deck-builder tension
7. **Plan pools** - Card rewards from defined pools by rarity

### Don't ✗

1. **Don't hardcode card logic in UI** - Card logic belongs in data/models
2. **Don't use direct references** - Use hooks for cross-system communication
3. **Don't skip save** - Even prototypes need progress saving
4. **Don't ignore edge cases** - Empty deck, zero energy, multi-target attacks

---

## File Structure

```
project/
├── src/
│   ├── models/           # Data definitions
│   │   ├── cards/
│   │   ├── powers/
│   │   ├── relics/
│   │   └── enemies/
│   ├── systems/          # Game systems
│   │   ├── combat.js
│   │   ├── hand.js
│   │   ├── deck.js
│   │   └── hooks.js
│   ├── commands/         # Effect commands
│   └── scenes/           # Phaser scenes
├── assets/
└── data/
    └── card_pools.json
```