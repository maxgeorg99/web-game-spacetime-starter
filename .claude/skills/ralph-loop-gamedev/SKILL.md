---
name: ralph-loop-gamedev
description: >
  Multi-agent Ralph Loop orchestrator for game development. Coordinates 3 agents (Implementation,
  Code Review + Tests, Playwright Evaluation) in a self-healing loop. Use when setting up autonomous
  feature delivery with quality gates for game projects. Trigger: "ralph loop", "multi-agent loop",
  "autonomous game dev", "set up orchestrator", "PROMPT.md template".
---

# Ralph Loop Game Dev Orchestrator

A multi-agent orchestration pattern where one Claude session coordinates three specialized agents
in a loop, with a self-healing bug fix cycle driven by Playwright browser verification.

This skill provides the orchestrator template and setup guide. It requires the
[Ralph Loop plugin](https://github.com/anthropics/claude-code-plugins) to be installed
for the actual loop execution (`/ralph-loop` command).

---

## Architecture

```
ROADMAP.md            PHASE_TRACKER.md           CLAUDE.md
(what to build)   →   (where we are)         →   (how to build it)
     │                      │                         │
     └──────────────────────┼─────────────────────────┘
                            │
                      ┌─────▼─────┐
                      │ORCHESTRATOR│  ← reads state, dispatches agents
                      └─────┬─────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
     ┌─────────────┐ ┌───────────┐ ┌──────────────┐
     │IMPLEMENTATION│ │  REVIEW   │ │  PLAYWRIGHT  │
     │    AGENT     │ │  + TEST   │ │  EVALUATOR   │
     │              │ │  AGENT    │ │              │
     │ Reads spec   │ │ git diff  │ │ Starts app   │
     │ Writes code  │ │ Code review│ │ Real browser │
     │ Builds/tests │ │ Writes tests│ │ Screenshots │
     │ Commits      │ │ Commits   │ │ Bug report   │
     └──────────────┘ └───────────┘ └──────────────┘
            │               │               │
            ▼               ▼               ▼
         feat: ...      test: ...     ✅ pass / ❌ bugs
                                           │
                                      ❌ triggers
                                      BUG FIX LOOP
                                           │
                                      ┌────▼────┐
                                      │ Reset   │
                                      │ steps,  │
                                      │ queue   │
                                      │ bugs    │
                                      └────┬────┘
                                           │
                                           ▼
                                      Back to
                                      IMPLEMENTATION
                                      (fix mode)
```

---

## Quick Start

### 1. Create the state files in your project

Copy the templates from `references/` into your project root:
- [prompt-template.md](references/prompt-template.md) → `PROMPT.md`
- [phase-tracker-template.md](references/phase-tracker-template.md) → `PHASE_TRACKER.md`

### 2. Write your ROADMAP.md

Define phases with clear specs. Each phase should be independently deliverable:

```markdown
## Phase 1: Player Movement

### 1.1: Basic WASD Movement
- Player entity with position and velocity
- Keyboard input handling
- Camera follow
- Collision with world bounds

### 1.2: Multiplayer Sync
- SpacetimeDB Player table
- Movement reducer
- Client subscription + interpolation
```

### 3. Ensure your CLAUDE.md has conventions

The better your CLAUDE.md, the better the agents perform. Include:
- Tech stack and versions
- File structure conventions
- Build/run/test commands
- Architecture patterns
- What NOT to do

### 4. Run the loop

```bash
/ralph-loop "Read PROMPT.md and execute the orchestrator loop." --max-iterations 30 --completion-promise "ALL PHASES COMPLETE"
```

---

## The Three Agents

### Agent 1: Implementation

**Mode: Feature** (normal) or **Fix** (when bugs queued)

In feature mode:
1. Read current phase spec from ROADMAP.md
2. Read project conventions from CLAUDE.md
3. Implement the feature
4. Run build checks (`npm run build`, `npm run check`, etc.)
5. If using SpacetimeDB: `spacetime build` → `spacetime publish` → `spacetime generate`
6. Commit: `feat: implement phase {N} — {NAME}`

In fix mode:
1. Read Bug Fix Queue from PHASE_TRACKER.md
2. Fix each bug
3. Re-run build checks
4. Commit: `fix: resolve {BUG_IDS} in phase {N}`

### Agent 2: Code Review + Test Writing

1. Run `git diff HEAD~1` to see what changed
2. Review against the roadmap spec — fix issues directly (don't just report)
3. Write unit/integration tests for all new logic
4. Run full test suite
5. Commit separately: `test: add tests for phase {N} — {NAME}`

### Agent 3: Playwright Evaluator

1. Pre-flight: verify backend is running (e.g., `curl http://localhost:3000` for SpacetimeDB)
2. Start dev server (e.g., `npm run dev`)
3. Open the app in a real browser via Playwright
4. Navigate to affected pages/scenes
5. Verify features visually — take screenshots as evidence
6. Produce verification report: `docs/verification/phase-{N}.md`
7. **If any failures**: trigger the bug fix loop

---

## Bug Fix Loop (Self-Healing)

When the Playwright evaluator finds bugs:

1. All step checkboxes in PHASE_TRACKER.md **reset** (unchecked)
2. Bugs are documented in a **Bug Fix Queue** section
3. Implementation Agent re-runs in **fix mode** — reads the queue, not the spec
4. Review Agent verifies fixes + updates tests
5. Playwright re-verifies in the browser
6. Loop repeats until clean pass
7. **After 3 failed iterations → ask the human**

### Bug Documentation Format

```markdown
## Bug Fix Queue

- **B1**: [Description of what's broken]
  - Expected: [what should happen]
  - Actual: [what happens instead]
  - Screenshot: docs/verification/phase-N-bug-B1.png

- **B2**: [Description]
  - Expected: ...
  - Actual: ...
```

---

## State Machine: File-Based, Git-Native

No database. No API. Just markdown files tracked in git.

| File | Role |
|------|------|
| `ROADMAP.md` | What to build (phase specs) |
| `PHASE_TRACKER.md` | Where we are (checkboxes, bug queue, log) |
| `CLAUDE.md` | How to build (conventions, rules, patterns) |
| `PROMPT.md` | Orchestrator instructions (the agent reads this) |
| `docs/verification/` | Playwright reports + screenshots |

**Why this works:**
- Every agent reads the same state files
- Crash recovery is free — re-read the tracker, resume where you left off
- Full audit trail in git history
- Human can intervene at any checkpoint

---

## SpacetimeDB Integration

When your project uses SpacetimeDB, the Implementation Agent must run these commands
after any server-side code changes:

| Operation | Command | When |
|-----------|---------|------|
| Build | `spacetime build` | After server module changes |
| Publish | `spacetime publish <db-name> --module-path <path>` | After build |
| Publish (reset) | `spacetime publish <db-name> --clear-database -y --module-path <path>` | When schema changes break data |
| Generate bindings | `spacetime generate --lang typescript --out-dir <client>/src/module_bindings --module-path <server>` | After publish |
| Check server | `curl -s http://localhost:3000` | Before Playwright testing |
| Start server | `spacetime start` | If check fails |

Add these to your CLAUDE.md as mandatory build steps.

---

## Phase Advancement

A phase advances when:
1. All 3 agent steps are checked ✅
2. Playwright found no ❌ failures
3. Bug Fix Queue is empty

On advancement:
1. Remove the Bug Fix Queue section
2. Move phase to "Completed Phases" table in PHASE_TRACKER.md
3. Update ROADMAP.md status to "Done"
4. Set next phase, reset checkboxes
5. If no more phases: output `<promise>ALL PHASES COMPLETE</promise>`

---

## What the Human Does

The human is not coding. The human is:

- **Architect**: writes the roadmap and CLAUDE.md conventions
- **Product owner**: makes design decisions when asked
- **Infrastructure**: starts servers, manages deployments
- **Quality gate**: spots things Playwright can't (UX taste, domain correctness)

---

## When to Use This Pattern

**Good fit:**
- Greenfield features with clear specs
- Multi-phase game development (locations, combat, multiplayer, UI)
- Projects with good test infrastructure
- SpacetimeDB multiplayer games (build → publish → generate cycle)

**Less ideal:**
- Heavy refactoring of unfamiliar legacy code
- Highly ambiguous requirements needing constant dialogue
- Performance optimization (needs profiling data, not specs)

---

## Reference Files

| When you need... | Read |
|------------------|------|
| The PROMPT.md template to copy into your project | [prompt-template.md](references/prompt-template.md) |
| The PHASE_TRACKER.md template | [phase-tracker-template.md](references/phase-tracker-template.md) |