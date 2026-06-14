# Handoff Report: M1 Pipeline Explorer

This handoff report summarizes the findings, reasoning, and recommendations for the **M1 (Asset & Pipeline Optimization)** milestone.

---

## 1. Observation

- **Regex Code Location**:
  In `scripts/fetch-meta.ts`, line 158:
  ```typescript
  const hMatch = attack.armyShareCode.match(/h([^\-dsu]+(?:-[^\-dsu]+)*)/);
  ```
- **Share Code Structure**:
  The script parses several sections of `attack.armyShareCode` utilizing specific letter prefixes:
  - Line 250: `parseUnits(/u([0-9x\-]+)/, TroopMap, mainTroopCounts);` (Main Troops, prefix `u`)
  - Line 251: `parseUnits(/i([0-9x\-]+)/, TroopMap, ccTroopCounts);` (Clan Castle Troops, prefix `i`)
  - Line 254: `parseUnits(/s([0-9x\-]+)/, SpellMap, mainSpellCounts);` (Spells, prefix `s`)
  - Line 255: `parseUnits(/d([0-9x\-]+)/, SpellMap, ccSpells, ccSpellCounts);` (Clan Castle Spells, prefix `d`)
- **Regex Verification Run**:
  Running the custom validation script `.agents/explorer_m1_2/verify_regex.py` on the test share code `u2x1-3x2h0e10_51-1e15_3p4i5x3s1x2` yields:
  - **Current Regex Match**: `h0e10_51-1e15_3p4i5x3`, captured group: `0e10_51-1e15_3p4i5x3`, splitting into `['0e10_51', '1e15_3p4i5x3']`.
  - **Proposed Regex Match**: `h0e10_51-1e15_3p4`, captured group: `0e10_51-1e15_3p4`, splitting into `['0e10_51', '1e15_3p4']`.
- **Runtime and Dependencies**:
  - `package.json` engines requirement: `"node": ">=22.12.0"`.
  - Dependency: `"tsx": "^4.22.4"` used via script `"fetch-data": "tsx scripts/fetch-meta.ts"`.
  - Global `fetch` is used on line 22 of `scripts/fetch-meta.ts`.
  - Directory resolution on line 16 of `scripts/fetch-meta.ts`: `const dir = path.join(process.cwd(), 'data');`.

---

## 2. Logic Chain

1. **Premise**: In the Clash of Clans army share code, the hero section starts with `h` and can be immediately followed by other sections starting with letters like `i` (clan castle troops), `d` (clan castle spells), `s` (spells), or `u` (troops).
2. **Current Defect**: The regular expression `/h([^\-dsu]+(?:-[^\-dsu]+)*)/` stops matching when it encounters `-d`, `-s`, or `-u`. However, it does not stop when encountering the `i` section (clan castle troops) because the character class `[^\-dsu]` does not exclude the character `i`.
3. **Reasoning on Impact**: When `i` follows `h` directly, the regex matches the `i` character and continues, causing the `i` section (e.g. `i5x3`) to be absorbed into the captured hero block. The trailing string for the last hero becomes malformed (e.g., `1e15_3p4i5x3`), which gets parsed as having extra garbage characters.
4. **Resolution**: By updating the character class to exclude `i` (becoming `[^\-dsui]`), the engine terminates the match as soon as it hits the `i` section prefix. This separates the hero section perfectly, and is confirmed by the python validation script.
5. **Concurrency reasoning**: The current pipeline bursts 40 requests in parallel and waits for all of them sequentially, risking rate limits and causing head-of-line blocking. A sliding window concurrency queue avoids this.
6. **Caching reasoning**: Adding a file-cache under `data/.cache/` with a 12/24 hour TTL provides reliability and saves bandwidth. If the pipeline crashes, it can resume from cache instead of restarting.

---

## 3. Caveats

- **API Limits**: The actual rate limits of the `cocproxy.royaleapi.dev` proxy or the official Clash of Clans API are not documented in the repository. The proposed concurrency window (e.g., 5 or 10 concurrent requests) assumes standard API quotas and is configurable.
- **Node Environment**: The investigation was conducted in an environment where `node` and `npm` were not globally available on the system path, preventing direct runtime execution of `scripts/fetch-meta.ts`. However, Python was used to verify the JS/TS-compatible regex logic, and environment constraints were deduced directly from `package.json` and system env vars.

---

## 4. Conclusion

- The regex bug in `scripts/fetch-meta.ts` must be resolved by updating the pattern to:
  ```typescript
  const hMatch = attack.armyShareCode.match(/h([^\-dsui]+(?:-[^\-dsui]+)*)/);
  ```
- To optimize pipeline performance and stability, we recommend:
  - Replacing sequential batching with a sliding-window concurrency pool (max concurrency 5-10).
  - Introducing a local file-based cache in `data/.cache/` with a 12 or 24-hour TTL and a command line force option.
- The execution environment requires Node.js >= 18 (for native global `fetch`) and must execute the script using `tsx` from the project's root directory.

---

## 5. Verification Method

- **Regex Verification**:
  Run the Python script `.agents/explorer_m1_2/verify_regex.py` via python to check that the proposed regex matches only the hero section and excludes the CC troop `i` section:
  ```powershell
  python .agents/explorer_m1_2/verify_regex.py
  ```
- **Fetch Script Execution (when Node/npm is present)**:
  Run the pipeline command from the repository root:
  ```bash
  npm run fetch-data
  ```
  Verify that the generated `data/meta.json` is correct and contains valid rankings, super troops, and hero equipment without errors.
