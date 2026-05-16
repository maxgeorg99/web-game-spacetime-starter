// Every enemy template maps to its own dedicated spritesheet (keyPrefix "enemy-{spriteKey}").
// displaySize is the rendered px square in combat.

export interface EnemyTemplate {
  name: string;
  spriteKey: string;
  hp: number;
  damage: number;
  displaySize: number; // height used for hp-bar positioning
  displayW?: number; // width override for non-square sprites
  isStatic?: boolean; // plain image — no spritesheet animations
  phase2Key?: string; // texture key to swap to when hp < 40%
}

function e(
  name: string,
  spriteKey: string,
  hp: number,
  damage: number,
  displaySize = 100,
): EnemyTemplate {
  return { name, spriteKey, hp, damage, displaySize };
}

// ─── Light / agile ────────────────────────────────────────────────────────────
const Skull = e("Skull", "skull", 22, 7);
const SkullHard = e("Skull", "skull", 28, 10);
const Gnoll = e("Gnoll", "gnoll", 24, 8);
const Gnome = e("Gnome", "gnome", 16, 6);
const Spider = e("Spider", "spider", 18, 8);
const Snake = e("Snake", "snake", 16, 9);
const Thief = e("Thief", "thief", 18, 9);
const Shaman = e("Shaman", "shaman", 20, 10);
const SkeletonMage = e("Skeleton Mage", "skeletonmage", 22, 11, 100);
const PaddleFish = e("Paddle Fish", "paddlefish", 18, 7);
const HarpoonFish = e("Harpoon Fish", "harpoonfish", 20, 9);
const SatyrArcher = e("Satyr Archer", "satyrarcher", 22, 10, 100);
const Pyromancer = e("Pyromancer", "pyromancer", 24, 12, 100);

// ─── Heavy / mounted (elite tier — double display size) ───────────────────────
const Panda = e("Panda", "panda", 42, 11, 260);
const Lancer = e("Lancer", "lancer", 40, 12, 260);
const Minotaur = e("Minotaur", "minotaur", 48, 13, 280);
const Turtle = e("Turtle", "turtle", 55, 8, 280);
const Werewolf = e("Werewolf", "werewolf", 44, 13, 240);
const Lizardman = e("Lizardman", "lizardman", 38, 11, 240);
const Gargoyle = e("Gargoyle", "gargoyle", 42, 13, 240);
const Gryphon = e("Gryphon", "gryphon", 44, 12, 240);
const StoneGolem = e("Stone Golem", "stonegolem", 58, 9, 260);
const Troll = e("Troll", "troll", 52, 13, 300);
const HHorseman = e("Headless Horseman", "headlesshorseman", 50, 14, 260);
const Bear = e("Bear", "bear", 45, 12, 260);

// ─── Boss tier ────────────────────────────────────────────────────────────────
const Dragon = e("Dragon", "dragon", 80, 15, 180);
const Cerberus = e("Cerberus", "cerberus", 80, 14, 170);

const Agna: EnemyTemplate = {
  name: "Agna",
  spriteKey: "boss-agna-1",
  hp: 90,
  damage: 16,
  displaySize: 370,
  displayW: 332,
  isStatic: true,
  phase2Key: "boss-agna-2",
};
const FinalBoss: EnemyTemplate = {
  name: "The Dark One",
  spriteKey: "boss-finalboss-1",
  hp: 100,
  damage: 18,
  displaySize: 370,
  displayW: 368,
  isStatic: true,
  phase2Key: "boss-finalboss-2",
};

// ─── Encounter pools ──────────────────────────────────────────────────────────

export type Encounter = EnemyTemplate[];

export const COMBAT_ENCOUNTERS: Encounter[] = [
  [Skull],
  [Gnoll],
  [Thief],
  [Snake],
  [Spider],
  [PaddleFish],
  [HarpoonFish],
  [Gnome],
  [Shaman],
  [SkullHard],
  // Pairs
  [Skull, Thief],
  [Gnoll, Snake],
  [Spider, Spider],
  [PaddleFish, HarpoonFish],
  [Shaman, Skull],
  [SkeletonMage, Gnoll],
  [Gnome, Gnome],
  [SatyrArcher, Thief],
  // Triples
  [Gnome, Gnome, Gnome],
  [Spider, Spider, Skull],
  [Snake, Snake, Gnoll],
  [SkeletonMage],
  [SkeletonMage, Gnoll],
];

export const ELITE_ENCOUNTERS: Encounter[] = [
  [Minotaur],
  [Troll],
  [Werewolf],
  [StoneGolem],
  [Gargoyle],
  [Turtle],
  [HHorseman],
  [Panda],
  [Bear],
  [Lancer],
  [Lizardman],
  [Gryphon],
  [Pyromancer],
  // Pairs
  [Minotaur, Skull],
  [Troll, Gnoll],
  [Werewolf, Shaman],
  [Gargoyle, SkeletonMage],
  [Gryphon, SatyrArcher],
  [HHorseman, Skull],
  [Lancer, Gnoll],
  [Bear, Shaman],
  [Panda, Snake],
  [Pyromancer, Thief],
];

export const BOSS_ENCOUNTERS: Encounter[] = [
  [Dragon],
  [Cerberus],
  [Agna],
  [FinalBoss],
];

export function pickCombatEncounter(): Encounter {
  return COMBAT_ENCOUNTERS[
    Math.floor(Math.random() * COMBAT_ENCOUNTERS.length)
  ];
}

export function pickEliteEncounter(): Encounter {
  return ELITE_ENCOUNTERS[Math.floor(Math.random() * ELITE_ENCOUNTERS.length)];
}

export function pickBossEncounter(): Encounter {
  return BOSS_ENCOUNTERS[Math.floor(Math.random() * BOSS_ENCOUNTERS.length)];
}

const TIER_SCALE: Record<number, number> = {
  1: 0.7,
  2: 0.85,
  3: 1.0,
  4: 1.15,
  5: 1.0,
};

export function scaleForTier(tier: number): number {
  return TIER_SCALE[tier] ?? 1.0;
}
