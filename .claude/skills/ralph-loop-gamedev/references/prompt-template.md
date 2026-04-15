# PROMPT.md Template — Ralph Loop Game Dev Orchestrator

Copy this file to your project root as `PROMPT.md`. Customize the build commands, project paths,
and dev server URLs for your specific stack.

---

# Ralph Loop Orchestrator

You are an autonomous orchestrator running a multi-agent loop. Each iteration, you assess the
current state and dispatch the next required step.

## Step 0 — Assess State

1. Read `PHASE_TRACKER.md` to find the current phase and step progress
2. Read `ROADMAP.md` to find the current phase spec
3. Check `git log --oneline -10` for recent work
4. If all 3 steps are checked and Bug Fix Queue is empty → advance to next phase
5. If no more phases remain → output `<promise>ALL PHASES COMPLETE</promise>`
6. Otherwise → execute the next unchecked step

## Step 1 — Implementation Agent

### Feature Mode (no Bug Fix Queue)

1. Read the current phase spec from `ROADMAP.md`
2. Read project conventions from `CLAUDE.md`
3. Implement the full feature
4. Run build checks:
   ```bash
   # Customize these for your stack:
   npm run check
   npm run build
   ```
5. If using SpacetimeDB, run the mandatory build cycle:
   ```bash
   spacetime build
   spacetime publish <DB_NAME> --module-path <SERVER_PATH>
   spacetime generate --lang typescript --out-dir <CLIENT_PATH>/src/module_bindings --module-path <SERVER_PATH>
   ```
6. Commit: `feat: implement phase {N} — {NAME}`
7. Mark Step 1 as checked in `PHASE_TRACKER.md`

### Fix Mode (Bug Fix Queue exists)

1. Read the Bug Fix Queue from `PHASE_TRACKER.md`
2. Fix each listed bug
3. Run build checks (same as above)
4. If SpacetimeDB: re-run build/publish/generate cycle
5. Commit: `fix: resolve {BUG_IDS} in phase {N}`
6. Mark Step 1 as checked in `PHASE_TRACKER.md`

## Step 2 — Code Review + Test Writing Agent

1. Run `git diff HEAD~1` to see what changed
2. Review the diff against the phase spec in `ROADMAP.md`
3. Fix any issues found (code quality, types, UI/UX, security, performance)
4. Write unit tests for all new logic
   - Place tests in your project's test directory
   - Cover happy path, edge cases, and error conditions
5. Run the full test suite:
   ```bash
   npm run test
   ```
6. Commit fixes: `refactor: review fixes for phase {N}`
7. Commit tests: `test: add tests for phase {N} — {NAME}`
8. Mark Step 2 as checked in `PHASE_TRACKER.md`

## Step 3 — Playwright Evaluation Agent

### Pre-flight Checks

1. If using SpacetimeDB: verify server is running
   ```bash
   curl -s http://localhost:3000 || spacetime start
   ```
2. Start the dev server:
   ```bash
   npm run dev &
   ```
3. Wait for server to be ready

### Browser Verification

1. Open the app in a real browser using Playwright
2. Navigate to all pages/scenes affected by the current phase
3. For each feature in the phase spec, verify:
   - Does it render correctly?
   - Does interaction work?
   - Are there console errors?
4. Take screenshots as evidence
5. Save to `docs/verification/phase-{N}.png`

### Produce Verification Report

Create `docs/verification/phase-{N}.md`:

```markdown
# Phase {N}: {NAME} — Verification Report

## Features Tested

- ✅ Feature A: [description of what was verified]
- ✅ Feature B: [description]
- ❌ Feature C: [what failed and how]

## Screenshots

![phase-N](phase-N.png)

## Notes

[Any observations, edge cases, or concerns]
```

### If ALL features pass ✅

- Mark Step 3 as checked in `PHASE_TRACKER.md`
- Phase is complete — orchestrator will advance on next iteration

### If ANY feature fails ❌

**Trigger the Bug Fix Loop:**

1. Leave Step 3 **unchecked** in `PHASE_TRACKER.md`
2. **Uncheck Steps 1 and 2** (forces re-implementation)
3. Add a **Bug Fix Queue** section to `PHASE_TRACKER.md`:
   ```markdown
   ## Bug Fix Queue

   - **B1**: [Description of failure]
     - Expected: [what should happen]
     - Actual: [what happens instead]
     - Screenshot: docs/verification/phase-N-bug-B1.png
   ```
4. The next iteration will pick up Step 1 in **fix mode**

## Phase Advancement

When all 3 steps are checked and no Bug Fix Queue exists:

1. Remove the Bug Fix Queue section (if any)
2. Add the phase to "Completed Phases" in `PHASE_TRACKER.md`
3. Update the phase status to "Done" in `ROADMAP.md`
4. Set the next phase as current
5. Reset all checkboxes
6. If no more phases: output `<promise>ALL PHASES COMPLETE</promise>`

## Safety Valves

- **3 consecutive bug fix iterations on the same phase**: Stop and ask the human
  for guidance. Document what's been tried and what's still failing.
- **Build failures that can't be resolved**: Stop and ask the human.
- **Unclear spec**: Stop and ask the human what the expected behavior should be.

## Iteration Log

After each step, append to the iteration log in `PHASE_TRACKER.md`:

```markdown
## Iteration Log

- **Iteration 1** (YYYY-MM-DD): Phase 1.1 — Step 1 ✓, Step 2 ✓, Step 3 ✓
- **Iteration 2** (YYYY-MM-DD): Phase 1.2 — Step 1 ✓, Step 2 ✓, Step 3 ❌ (B1, B2)
- **Iteration 2b** (YYYY-MM-DD): Phase 1.2 Bug Fix — B1 fixed, B2 fixed
- **Iteration 2c** (YYYY-MM-DD): Phase 1.2 — Step 3 ✓ (clean pass)
```