# Optimization Project Plan

## Steps

### Step 1: Initialization & Heartbeat Setup
- Initialize orchestrator workspace.
- Start heartbeat cron (schedule tool, every 10 min) to maintain liveness.

### Step 2: Codebase Exploration & Analysis
- Spawn a `teamwork_preview_explorer` subagent.
- Explorer will analyze:
  - Performance bottleneck candidates (large assets, blocking JS/CSS, unoptimized renders).
  - UI/UX improvements (responsiveness, accessibility, micro-animations, styling consistency).
  - Code layout, build system, and any existing test configurations.
- Wait for Explorer handoff report.

### Step 3: Project Decomposition (`PROJECT.md`)
- Aggregate findings from exploration.
- Define architecture and code layout conventions.
- Formulate concrete milestones:
  - E2E Testing Track (opaque-box, requirement-driven, Tiers 1-4).
  - Implementation milestones (modularized by component/module boundaries).
  - Final Milestone (pass all E2E tests + Tier 5 adversarial hardening).
- Record decomposition in `PROJECT.md`.

### Step 4: Dispatch Tracks
- Spawn E2E Testing Track sub-orchestrator.
- Spawn Implementation Track sub-orchestrators for milestones (managing dependencies).
- Coordinate the publication of `TEST_READY.md`.

### Step 5: Verification & Gating
- Ensure all milestone gates pass (builds ok, reviews pass, challengers confirm, forensic audit is clean).
- Run Tier 5 adversarial coverage hardening.
- Run final Forensic Audit.

### Step 6: Handoff and Reporting
- Compile findings, changes, and verification reports.
- Present final report to the user.
