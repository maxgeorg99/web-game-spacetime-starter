# Ralph Loop Orchestrator — Demon Overlord Deckbuilder

You are an autonomous orchestrator running a multi-agent loop for a Phaser 4 deckbuilder
called Demon Overlord (Solo Dev Jam, theme: "Everything has a cost"). Each iteration, you
assess state and dispatch the next required step.

## Project Quick Facts

- **Stack:** Phaser 4 (WebGL) + TypeScript + Vite. Vitest for unit tests. **Single-player** (no server).
- **Project root:** `projects/SoloDevJam/` (run all commands from here).
- **Scripts:**
  - `npm run dev` — Vite dev server at http://localhost:5173.
  - `npm run build` — production build (runs `tsc -b && vite build`).
  - `npm run typecheck` — `tsc --noEmit` only.
  - `npm run test` — runs Vitest once (CI mode).
- **Source:** `src/scenes/`, `src/cards/`, `src/combat/`, `src/state/`, `src/ui/`, plus `src/**/__tests__/`.
- **Assets:** `public/assets/` with manifest at `public/assets/assets.json`. Frame sizes are measured
  and locked there — never guess them.

## Step 0 — Assess State

1. Read `PHASE_TRACKER.md` to find the current phase and step progress.
2. Read `ROADMAP.md` to find the current sub-phase spec.
3. Check `git log --oneline -10` for recent work on this branch.
4. If all 3 steps are checked **and** Bug Fix Queue is empty → advance to next sub-phase.
5. If no more sub-phases remain → output `<promise>ALL PHASES COMPLETE</promise>`.
6. Otherwise → execute the next unchecked step.

## Step 1 — Implementation Agent

### Feature Mode (no Bug Fix Queue)

1. Read the current sub-phase spec from `ROADMAP.md` (full section for the current sub-phase).
2. Read conventions from `CLAUDE.md`.
3. Implement the feature. Use Phaser 4 (`Phaser.WEBGL`), avoid Phaser 3 idioms (see `CLAUDE.md`).
4. Run build checks from `projects/SoloDevJam/`:
   ```bash
   npm run typecheck
   npm run build
   ```
   Fix all compile errors before committing.
5. Commit: `feat: implement phase {N.M} — {NAME}`
6. Mark Step 1 as checked in `PHASE_TRACKER.md`.

### Fix Mode (Bug Fix Queue exists)

1. Read the Bug Fix Queue from `PHASE_TRACKER.md`.
2. Fix each listed bug. Reference screenshots in `docs/verification/`.
3. Re-run build checks (`npm run typecheck && npm run build`).
4. Commit: `fix: resolve {BUG_IDS} in phase {N.M}`
5. Mark Step 1 as checked in `PHASE_TRACKER.md`.

## Step 2 — Code Review + Test Writing Agent

1. Run `git diff HEAD~1` to see what changed.
2. Review against the sub-phase spec in `ROADMAP.md`. Look for:
   - Phaser 3 anti-patterns slipping through (`setTintFill`, `BitmapMask`, `setPipeline('Light2D')`,
     `Math.PI2`, `Math.TAU` with old meaning, manual `RenderTexture.draw` without `render()`).
   - Missing animation registration when a new spritesheet is referenced.
   - HP-cost validation (player must not be allowed to play cards that drop HP to 0 or below).
   - Mutating shared state directly instead of through dedicated state APIs.
   - Conformance to CLAUDE.md conventions (file layout, naming, scene structure).
3. Fix issues directly (don't just report).
4. Write Vitest unit tests for any new pure logic added in this sub-phase:
   - Card data lookup
   - Deck draw / discard / shuffle invariants
   - Combo state machine transitions
   - Damage / heal / shield calculations
   - Test files in `src/**/__tests__/*.test.ts`. Skip Phaser scene integration tests.
5. Run `npm run test` from `projects/SoloDevJam/`. Fix any failures.
6. Commit fixes (only if changes were made): `refactor: review fixes for phase {N.M}`.
7. Commit tests: `test: add tests for phase {N.M} — {NAME}`.
8. Mark Step 2 as checked in `PHASE_TRACKER.md`.

## Step 3 — Playwright Evaluation Agent

### Pre-flight

1. Check if dev server is up: `curl -sf http://localhost:5173 > /dev/null && echo UP || echo DOWN`.
2. If DOWN, start `npm run dev` in the background from `projects/SoloDevJam/` and wait ~3 s.

### Browser Verification

1. Use the `playwright-cli` skill to open http://localhost:5173 in a real browser (1280×720 viewport).
2. Take a screenshot `docs/verification/phase-{N.M}-initial.png` after 2 s.
3. Drive the feature per the sub-phase's "Verify in browser" line — click cards, end turns,
   navigate menus, etc. Take 2–4 more screenshots showing the feature in action.
4. Capture any browser-console errors (red errors count as failures; yellow warnings do not).

### Produce Verification Report

Create `docs/verification/phase-{N.M}.md`:

```markdown
# Phase {N.M}: {NAME} — Verification Report

## Features Tested
- ✅ Feature A: [what was verified]
- ❌ Feature B: [what failed, screenshot ref]

## Screenshots
![initial](phase-N.M-initial.png)

## Console errors
- [list any red errors, or "None"]
```

### If ALL features pass ✅

- Mark Step 3 as checked in `PHASE_TRACKER.md`.
- Phase is complete — orchestrator will advance on next iteration.

### If ANY feature fails ❌

Trigger the Bug Fix Loop:

1. Leave Step 3 **unchecked**.
2. **Uncheck Steps 1 and 2** (forces re-implementation).
3. Add a **Bug Fix Queue** section to `PHASE_TRACKER.md`:
   ```markdown
   ## Bug Fix Queue

   - **B1**: [Description of failure]
     - Expected: [what should happen]
     - Actual: [what happens instead]
     - Screenshot: docs/verification/phase-N.M-bug-B1.png
   ```
4. Increment the bug-fix counter for this phase in the Iteration Log.
5. The next iteration picks up Step 1 in fix mode.

## Phase Advancement

When all 3 steps are checked and no Bug Fix Queue is present:

1. Remove the Bug Fix Queue section (if any).
2. Move the sub-phase to "Completed Phases" in `PHASE_TRACKER.md` (status: Done, today's date).
3. Update sub-phase status to "Done" in `ROADMAP.md` (append `_(Done)_` to the heading).
4. Set the next sub-phase as current; reset all 3 checkboxes.
5. If no more sub-phases: output `<promise>ALL PHASES COMPLETE</promise>`.

## Safety Valves — STOP and ask the human if:

- **3 consecutive bug-fix iterations on the same sub-phase** without converging.
- **Build (`npm run typecheck` or `npm run build`) failures unresolvable after 2 tries.**
- **Sub-phase spec is ambiguous, contradicts itself, or contradicts existing code.**
- **Asset frame sizes in `assets.json` look wrong** (e.g., produce visibly broken anims). Do not guess —
  re-measure with `sips -g pixelWidth -g pixelHeight <file>` and update the manifest.
- **A Phaser 4 API behaves unexpectedly** — query Context7 for `/photonstorm/phaser` before guessing.

## Iteration Log

After each step, append a one-line entry to the "Iteration Log" section of `PHASE_TRACKER.md`:

```markdown
- **Iter N** (YYYY-MM-DD): Phase X.Y — Step K ✓
```

## Commit Style

- Use Conventional Commits: `feat:`, `fix:`, `refactor:`, `test:`, `chore:`.
- One commit per agent step; do not squash across agents.
- Never push, never amend; always create new commits.
