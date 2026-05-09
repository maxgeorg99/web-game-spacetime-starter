import { describe, it, expect } from "vitest";
import { Combo } from "../Combo";

describe("Combo", () => {
  it("starts at tier 0 and not active", () => {
    const c = new Combo();
    expect(c.tier).toBe(0);
    expect(c.active).toBe(false);
  });

  it("first card sets tier to 1 but does not advance", () => {
    const c = new Combo();
    const result = c.recordPlay(1);
    expect(result.tier).toBe(1);
    expect(result.advanced).toBe(false);
    expect(c.active).toBe(true);
  });

  it("sequential ascending costs increase tier", () => {
    const c = new Combo();
    c.recordPlay(1);
    const r2 = c.recordPlay(2);
    expect(r2.tier).toBe(2);
    expect(r2.advanced).toBe(true);

    const r3 = c.recordPlay(3);
    expect(r3.tier).toBe(3);
    expect(r3.advanced).toBe(true);
  });

  it("full 1→2→3→4→5 sequence reaches tier 5", () => {
    const c = new Combo();
    for (let i = 1; i <= 5; i++) {
      c.recordPlay(i);
    }
    expect(c.tier).toBe(5);
    expect(c.active).toBe(true);
  });

  it("does not exceed max tier 5", () => {
    const c = new Combo();
    for (let i = 1; i <= 6; i++) {
      c.recordPlay(i);
    }
    expect(c.tier).toBe(5);
  });

  it("non-sequential cost resets to tier 1", () => {
    const c = new Combo();
    c.recordPlay(1);
    c.recordPlay(2);
    const result = c.recordPlay(4);
    expect(result.tier).toBe(1);
    expect(result.advanced).toBe(false);
    expect(c.active).toBe(true);
  });

  it("same cost twice resets to tier 1", () => {
    const c = new Combo();
    c.recordPlay(1);
    const result = c.recordPlay(1);
    expect(result.tier).toBe(1);
    expect(result.advanced).toBe(false);
  });

  it("descending cost resets to tier 1", () => {
    const c = new Combo();
    c.recordPlay(3);
    const result = c.recordPlay(2);
    expect(result.tier).toBe(1);
    expect(result.advanced).toBe(false);
  });

  it("reset clears tier and deactivates", () => {
    const c = new Combo();
    c.recordPlay(1);
    c.recordPlay(2);
    c.reset();
    expect(c.tier).toBe(0);
    expect(c.active).toBe(false);

    const result = c.recordPlay(1);
    expect(result.tier).toBe(1);
  });

  it("active is true when tier > 0", () => {
    const c = new Combo();
    expect(c.active).toBe(false);
    c.recordPlay(1);
    expect(c.active).toBe(true);
    c.reset();
    expect(c.active).toBe(false);
  });
});
