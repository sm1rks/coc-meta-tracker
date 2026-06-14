# E2E Test Suite Implementation Plan

## Objective
Design and implement a robust E2E test suite covering the 4 main application features, yielding at least 49 total test cases (Tiers 1-4).

## Decomposition
1. **Milestone 1: Exploration and Infrastructure Setup**
   - Explore repository structure, locate existing tests, determine the test runner and framework (Vitest, Playwright, Cypress, Jest, etc.).
   - Define layout for E2E tests.
   - Create `TEST_INFRA.md` in the working directory.
   - Set up test runner scripts in package.json.

2. **Milestone 2: Tier 1 & Tier 2 Test Design and Implementation**
   - Tier 1: Feature Coverage (>=5 tests per feature: Hero Equipment, Super Troops, Top Armies, Top Players; total >=20)
   - Tier 2: Boundary & Corner Cases (>=5 tests per feature, total >=20)
   - Delegate test writing to teamwork_preview_worker.

3. **Milestone 3: Tier 3 & Tier 4 Test Design and Implementation**
   - Tier 3: Cross-Feature Combinations (>=4 tests covering pairwise interactions)
   - Tier 4: Real-World Application Scenarios (>=5 application workload test cases)
   - Delegate test writing to teamwork_preview_worker.

4. **Milestone 4: Verification and Audit Gating**
   - Run tests using worker/reviewer.
   - Run challenger on tests.
   - Run forensic auditor on test logic and implementation.
   - Fix issues found by verification/audit.

5. **Milestone 5: Publishing and Reporting**
   - Publish `TEST_READY.md` in the project root.
   - Send completion message to parent.
