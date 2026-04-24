import { describe, expect, it } from "vitest";
import {
  BASE_BACK_Y,
  BASE_FRONT_Y,
  Z_ATTACK_TOLERANCE,
  Z_MAX,
  clampZ,
  isInMeleeReach,
  xzDistance,
  yToZ,
  zToY,
} from "../shared/xzPlane";

describe("xzPlane constants", () => {
  it("BASE_FRONT_Y equals BASE_BACK_Y + Z_MAX", () => {
    expect(BASE_FRONT_Y).toBe(BASE_BACK_Y + Z_MAX);
  });

  it("Z_MAX is positive", () => {
    expect(Z_MAX).toBeGreaterThan(0);
  });
});

describe("clampZ", () => {
  it("passes through values inside the band", () => {
    expect(clampZ(0)).toBe(0);
    expect(clampZ(Z_MAX / 2)).toBe(Z_MAX / 2);
    expect(clampZ(Z_MAX)).toBe(Z_MAX);
  });

  it("clamps negative values to 0", () => {
    expect(clampZ(-1)).toBe(0);
    expect(clampZ(-9999)).toBe(0);
  });

  it("clamps over-max values to Z_MAX", () => {
    expect(clampZ(Z_MAX + 1)).toBe(Z_MAX);
    expect(clampZ(9999)).toBe(Z_MAX);
  });

  it("maps non-finite inputs (NaN / Infinity) to 0", () => {
    expect(clampZ(Number.NaN)).toBe(0);
    expect(clampZ(Number.POSITIVE_INFINITY)).toBe(0);
    expect(clampZ(Number.NEGATIVE_INFINITY)).toBe(0);
  });
});

describe("yToZ / zToY roundtrip", () => {
  it("yToZ(zToY(z)) == clampZ(z)", () => {
    for (const z of [0, 5, 30, 50, Z_MAX]) {
      expect(yToZ(zToY(z))).toBe(clampZ(z));
    }
  });

  it("zToY places z=0 at BASE_BACK_Y and z=Z_MAX at BASE_FRONT_Y", () => {
    expect(zToY(0)).toBe(BASE_BACK_Y);
    expect(zToY(Z_MAX)).toBe(BASE_FRONT_Y);
  });

  it("yToZ clamps Y outside walkable band", () => {
    expect(yToZ(BASE_BACK_Y - 50)).toBe(0);
    expect(yToZ(BASE_FRONT_Y + 50)).toBe(Z_MAX);
  });
});

describe("xzDistance", () => {
  it("returns 0 for identical points", () => {
    expect(xzDistance(0, 0, 0, 0)).toBe(0);
    expect(xzDistance(10, 20, 10, 20)).toBe(0);
  });

  it("measures pure-X distance", () => {
    expect(xzDistance(0, 30, 5, 30)).toBe(5);
  });

  it("measures pure-Z distance", () => {
    expect(xzDistance(10, 0, 10, 7)).toBe(7);
  });

  it("is euclidean on mixed XZ", () => {
    expect(xzDistance(0, 0, 3, 4)).toBe(5);
  });
});

describe("isInMeleeReach", () => {
  // Attacker at (100, 30), facing right, reach 28, default z tolerance.
  const ax = 100;
  const az = 30;
  const reach = 28;

  it("hits a target directly in front on the same z", () => {
    expect(isInMeleeReach(ax, az, ax + 20, az, 1, reach)).toBe(true);
  });

  it("misses a target behind when facing right", () => {
    expect(isInMeleeReach(ax, az, ax - 20, az, 1, reach)).toBe(false);
  });

  it("hits a target behind when facing left", () => {
    expect(isInMeleeReach(ax, az, ax - 20, az, -1, reach)).toBe(true);
  });

  it("misses a target beyond reach", () => {
    expect(isInMeleeReach(ax, az, ax + reach + 10, az, 1, reach)).toBe(false);
  });

  it("misses a target on a different Z layer", () => {
    const zFar = az + Z_ATTACK_TOLERANCE + 5;
    expect(isInMeleeReach(ax, az, ax + 10, zFar, 1, reach)).toBe(false);
  });

  it("hits within the Z tolerance band", () => {
    const zNear = az + Z_ATTACK_TOLERANCE - 1;
    expect(isInMeleeReach(ax, az, ax + 10, zNear, 1, reach)).toBe(true);
  });

  it("custom z tolerance overrides the default", () => {
    const zFar = az + Z_ATTACK_TOLERANCE + 5;
    expect(isInMeleeReach(ax, az, ax + 10, zFar, 1, reach, Z_ATTACK_TOLERANCE + 10)).toBe(true);
  });
});
