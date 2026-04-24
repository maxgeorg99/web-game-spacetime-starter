# Ralph Loop Orchestrator — Oak Woods Beat 'em Up

You are an autonomous orchestrator running a multi-agent loop for the Oak Woods Castle Crashers-style beat 'em up. Each iteration, you assess state and dispatch the next required step.

## Project Quick Facts

- **Stack:** Phaser 3 + TypeScript + Vite (client) at `projects/oakwoods`, Colyseus + Node (server) at `projects/oakwoods/server`.
- **Run commands (from `projects/oakwoods`):**
  - `npm run dev:all` — both client (http://localhost:5173) and server (ws://localhost:2567).
  - `npm run dev` — client only.
  - `npm run dev:server` — server only.
  - `npm run build` — build client.
  - `npm run build:server` — build server.
- **No test runner configured yet.** Agent 2 must introduce one (Vitest) during Phase 1 if tests are written.
- **Assets live at `projects/oakwoods/public/assets/oakwoods/`.** Shipping assets are not in git; pallette-swap variants for the character are computed at runtime via Phaser tinting.

## Step 0 — Assess State

1. Read `PHASE_TRACKER.md` to find the current phase and step progress.
2. Read `ROADMAP.md` to find the current phase spec.
3. Check `git log --oneline -10` for recent work on this branch.
4. If all 3 steps are checked **and** Bug Fix Queue is empty → advance to next phase.
5. If no more phases remain → output `<promise>ALL PHASES COMPLETE</promise>`.
6. Otherwise → execute the next unchecked step.

## Step 1 — Implementation Agent

### Feature Mode (no Bug Fix Queue)

1. Read the current phase spec from `ROADMAP.md` (full section for the current sub-phase).
2. Read conventions from `CLAUDE.md`.
3. Implement the full feature. Edit both client (`src/`) and server (`server/src/`) as needed.
4. Run build checks:
   ```bash
   cd projects/oakwoods && npm run build
   cd projects/oakwoods/server && npm run build
   ```
   Fix all compile errors before committing.
5. Commit: `feat: implement phase {N.M} — {NAME}`
6. Mark Step 1 as checked in `PHASE_TRACKER.md`.

### Fix Mode (Bug Fix Queue exists)

1. Read the Bug Fix Queue from `PHASE_TRACKER.md`.
2. Fix each listed bug.
3. Re-run build checks.
4. Commit: `fix: resolve {BUG_IDS} in phase {N.M}`
5. Mark Step 1 as checked in `PHASE_TRACKER.md`.

## Step 2 — Code Review + Test Writing Agent

1. Run `git diff HEAD~1` to see what changed.
2. Review the diff against the phase spec in `ROADMAP.md`. Look for:
   - Off-by-one errors, nullability bugs, missing null checks on Colyseus schema callbacks.
   - Whether server is authoritative where it should be (positions, combat).
   - Conformance to CLAUDE.md conventions.
3. Fix issues directly (don't just report).
4. If no test runner exists yet, install Vitest in `projects/oakwoods`:
   ```bash
   cd projects/oakwoods && npm i -D vitest
   ```
   Add `"test": "vitest run"` to `package.json`.
5. Write unit tests for pure logic (depth sorting, combo state machine, XZ distance helpers, wave spawn logic).
   - Test files go in `projects/oakwoods/src/**/__tests__/` or `projects/oakwoods/server/src/**/__tests__/`.
   - Skip Phaser/Colyseus integration — focus on pure functions.
6. Run the test suite: `cd projects/oakwoods && npm run test`.
7. Commit fixes: `refactor: review fixes for phase {N.M}` (only if fixes were made).
8. Commit tests: `test: add tests for phase {N.M} — {NAME}`.
9. Mark Step 2 as checked in `PHASE_TRACKER.md`.

## Step 3 — Playwright Evaluation Agent

### Pre-flight

1. Check if dev server is running: `curl -s http://localhost:5173 > /dev/null && echo UP || echo DOWN`.
2. Check Colyseus: `curl -s http://localhost:2567 > /dev/null && echo UP || echo DOWN`.
3. If either is down, start `npm run dev:all` in the background from `projects/oakwoods`.
4. Wait ~3 s for both to come up.

### Browser Verification

1. Use `playwright-cli` skill to open http://localhost:5173 in a real browser (1280×720 viewport).
2. Take a screenshot `docs/verification/phase-{N.M}-initial.png` after 2 s.
3. Drive the feature per spec — e.g. press arrow keys, X for attack, etc. — and take 2–4 more screenshots.
4. Capture any browser-console errors (red ones count as failures).

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

- [list any red errors]
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
4. The next iteration will pick up Step 1 in fix mode.

## Phase Advancement

When all 3 steps are checked and Bug Fix Queue is absent:

1. Remove the Bug Fix Queue section (if any).
2. Move the phase to "Completed Phases" in `PHASE_TRACKER.md` (status: Done, today's date).
3. Update the phase status to "Done" in `ROADMAP.md`.
4. Set the next phase as current; reset all 3 checkboxes.
5. If no more phases: output `<promise>ALL PHASES COMPLETE</promise>`.

## Safety Valves

- **3 consecutive bug-fix iterations on the same phase** → stop and ask the human.
- **Build failures unresolvable after 2 tries** → stop and ask the human.
- **Spec is ambiguous or contradicts existing code** → stop and ask the human.

## Iteration Log

After each step, append a one-line entry to the "Iteration Log" section of `PHASE_TRACKER.md`:

```markdown
- **Iter N** (YYYY-MM-DD): Phase X.Y — Step K ✓
```
