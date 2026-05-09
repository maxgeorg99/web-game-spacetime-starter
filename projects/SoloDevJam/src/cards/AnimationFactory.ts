import { ManifestSpritesheet } from "../types";

export function registerAnimations(
  anims: Phaser.Animations.AnimationManager,
  spritesheets: ManifestSpritesheet[]
): string[] {
  const keys: string[] = [];

  for (const sheet of spritesheets) {
    for (const animDef of sheet.animations) {
      const key = `${sheet.keyPrefix}-${animDef.suffix}`;
      keys.push(key);

      if (!anims.exists(key)) {
        anims.create({
          key,
          frames: anims.generateFrameNumbers(key, {
            start: 0,
            end: animDef.endFrame,
          }),
          frameRate: animDef.frameRate,
          repeat: animDef.repeat,
        });
      }
    }
  }

  return keys;
}
