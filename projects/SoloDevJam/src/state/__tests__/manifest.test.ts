import { describe, it, expect } from "vitest";
import { ManifestEntry } from "../../types";
import manifest from "../../../public/assets/assets.json";

describe("Asset manifest", () => {
  const data = manifest as unknown as ManifestEntry;

  it("has at least one spritesheet entry", () => {
    expect(data.spritesheets.length).toBeGreaterThan(0);
  });

  it("has images", () => {
    expect(data.images.length).toBeGreaterThan(0);
  });

  it("has audio", () => {
    expect(data.audio.length).toBeGreaterThan(0);
  });

  it("each spritesheet has a unique id", () => {
    const ids = data.spritesheets.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each spritesheet has positive frame dimensions", () => {
    for (const sheet of data.spritesheets) {
      expect(sheet.frameWidth).toBeGreaterThan(0);
      expect(sheet.frameHeight).toBeGreaterThan(0);
    }
  });

  it("each animation has a valid suffix, endFrame > 0, and frameRate > 0", () => {
    for (const sheet of data.spritesheets) {
      for (const anim of sheet.animations) {
        expect(anim.suffix).toBeTruthy();
        expect(anim.endFrame).toBeGreaterThan(0);
        expect(anim.frameRate).toBeGreaterThan(0);
      }
    }
  });

  it("each image and audio entry has a key and path", () => {
    for (const img of data.images) {
      expect(img.key).toBeTruthy();
      expect(img.path).toBeTruthy();
    }
    for (const a of data.audio) {
      expect(a.key).toBeTruthy();
      expect(a.path).toBeTruthy();
    }
  });
});
