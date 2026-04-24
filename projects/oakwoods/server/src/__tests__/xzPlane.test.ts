import { describe, expect, it } from "vitest";
import {
  BASE_BACK_Y,
  BASE_FRONT_Y,
  Z_MAX,
  clampZ,
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
