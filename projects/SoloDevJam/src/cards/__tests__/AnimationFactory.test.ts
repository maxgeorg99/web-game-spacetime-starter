import { describe, it, expect, vi } from "vitest";
import { registerAnimations } from "../AnimationFactory";

describe("AnimationFactory", () => {
  const sampleSpritesheets = [
    {
      id: "demon",
      keyPrefix: "char-demon",
      frameWidth: 192,
      frameHeight: 192,
      animations: [
        { suffix: "idle", path: "sprites/enemies/demon_idle.png", endFrame: 3, frameRate: 6, repeat: -1 },
        { suffix: "run", path: "sprites/enemies/demon_run.png", endFrame: 3, frameRate: 10, repeat: -1 },
        { suffix: "attack", path: "sprites/enemies/demon_attack.png", endFrame: 5, frameRate: 14, repeat: 0 },
        { suffix: "death", path: "sprites/enemies/demon_death.png", endFrame: 9, frameRate: 10, repeat: 0 },
      ],
    },
    {
      id: "skull",
      keyPrefix: "enemy-skull",
      frameWidth: 192,
      frameHeight: 192,
      animations: [
        { suffix: "idle", path: "sprites/enemies/skull_idle.png", endFrame: 7, frameRate: 8, repeat: -1 },
        { suffix: "run", path: "sprites/enemies/skull_run.png", endFrame: 5, frameRate: 10, repeat: -1 },
        { suffix: "attack", path: "sprites/enemies/skull_attack.png", endFrame: 6, frameRate: 14, repeat: 0 },
        { suffix: "death", path: "sprites/enemies/skull_death.png", endFrame: 4, frameRate: 10, repeat: 0 },
      ],
    },
  ];

  it("returns all expected animation keys", () => {
    const anims = createMockAnimationManager();
    const keys = registerAnimations(anims, sampleSpritesheets);

    expect(keys).toEqual([
      "char-demon-idle",
      "char-demon-run",
      "char-demon-attack",
      "char-demon-death",
      "enemy-skull-idle",
      "enemy-skull-run",
      "enemy-skull-attack",
      "enemy-skull-death",
    ]);
  });

  it("calls anims.create for each animation", () => {
    const anims = createMockAnimationManager();
    registerAnimations(anims, sampleSpritesheets);

    expect(anims.create).toHaveBeenCalledTimes(8);
    expect(anims.create).toHaveBeenCalledWith(
      expect.objectContaining({ key: "char-demon-idle", frameRate: 6, repeat: -1 })
    );
    expect(anims.create).toHaveBeenCalledWith(
      expect.objectContaining({ key: "enemy-skull-attack", frameRate: 14, repeat: 0 })
    );
  });

  it("does not duplicate already-existing animations", () => {
    const anims = createMockAnimationManager();
    anims.exists = vi.fn(() => true);
    registerAnimations(anims, sampleSpritesheets);

    expect(anims.create).not.toHaveBeenCalled();
  });

  it("generates expected keys from full manifest data", () => {
    const anims = createMockAnimationManager();
    const allSeven = [
      { id: "demon", keyPrefix: "char-demon", frameWidth: 192, frameHeight: 192, animations: [{ suffix: "idle", path: "x", endFrame: 3, frameRate: 6, repeat: -1 }] },
      { id: "skull", keyPrefix: "enemy-skull", frameWidth: 192, frameHeight: 192, animations: [{ suffix: "idle", path: "x", endFrame: 7, frameRate: 8, repeat: -1 }] },
      { id: "bear", keyPrefix: "enemy-bear", frameWidth: 256, frameHeight: 256, animations: [{ suffix: "idle", path: "x", endFrame: 7, frameRate: 6, repeat: -1 }] },
      { id: "centaur", keyPrefix: "enemy-centaur", frameWidth: 192, frameHeight: 192, animations: [{ suffix: "idle", path: "x", endFrame: 9, frameRate: 8, repeat: -1 }] },
      { id: "cerberus", keyPrefix: "enemy-cerberus", frameWidth: 128, frameHeight: 128, animations: [{ suffix: "idle", path: "x", endFrame: 13, frameRate: 10, repeat: -1 }] },
    ];
    const keys = registerAnimations(anims, allSeven as any);
    expect(keys).toHaveLength(5);
    expect(keys).toContain("char-demon-idle");
    expect(keys).toContain("enemy-cerberus-idle");
  });
});

function createMockAnimationManager() {
  return {
    exists: vi.fn(() => false),
    create: vi.fn(),
    generateFrameNumbers: vi.fn(() => []),
  } as unknown as Phaser.Animations.AnimationManager;
}
