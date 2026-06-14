# M1 Pipeline Optimization Analysis

This report presents the read-only analysis of Milestone 1 (Asset & Pipeline Optimization), focusing on the regex issue in the data fetching script, proposing caching and concurrency enhancements, and exploring environmental and runtime constraints.

---

## 1. Regex Bug Analysis in `scripts/fetch-meta.ts`

### Direct Observation
In `scripts/fetch-meta.ts`, line 158:
```typescript
const hMatch = attack.armyShareCode.match(/h([^\-dsu]+(?:-[^\-dsu]+)*)/);
```

### The Problem
The Clash of Clans army share code contains sections designated by specific prefix letters:
- `u` for Main Troops
- `s` for Spells
- `h` for Heroes (and their associated equipment and pets)
- `i` for Clan Castle Troops (including siege machines)
- `d` for Clan Castle Spells

The regular expression `h([^\-dsu]+(?:-[^\-dsu]+)*)` is designed to capture the heroes block (which starts with `h`) up until the next section.
However, the character class `[^\-dsu]` (which matches any character except `-`, `d`, `s`, or `u`) **does not exclude `i`**. 

As a result, if the clan castle troop section (`i`) immediately follows the heroes section (`h`) in the share code (e.g., `...h0e10_51-1e15_3p4i5x3s...`), the regex matches and ingests the `i` section as part of the hero section.

### Impact
When `hMatch` captures the `i` section:
1. The extracted hero string becomes malformed (e.g., `1e15_3p4i5x3` instead of `1e15_3p4`).
2. Splitting by `-` yields an item `1e15_3p4i5x3`.
3. When parsing this item:
   - `idMatch` (`/^(\d+)/`) still matches `1`.
   - `eMatch` (`/e(\d+)(?:_(\d+))?/`) still matches `e15` and `_3`.
   - `pMatch` (`/p(\d+)/`) matches `p4`.
   - But the trailing `i5x3` is ignored for parsing but could theoretically lead to unmapped warnings if it contains letters matched by other patterns, or it represents a bug where hero data contains extra characters.
   - Although `parseUnits` searches the entire string and still finds the `i` section, the hero-parsing logic retains this extra data, which makes the parser fragile.

### The Fix
Update the regex to exclude the character `i` in addition to `d`, `s`, and `u`.
```typescript
const hMatch = attack.armyShareCode.match(/h([^\-dsui]+(?:-[^\-dsui]+)*)/);
```
Or equivalently:
```typescript
const hMatch = attack.armyShareCode.match(/h([^\-disu]+(?:-[^\-disu]+)*)/);
```

### Verification
A verification script was run locally (using Python) to compare the behavior of both regular expressions on the input share code `u2x1-3x2h0e10_51-1e15_3p4i5x3s1x2`:
- **Current Regex**: Matches `h0e10_51-1e15_3p4i5x3` and extracts `0e10_51-1e15_3p4i5x3`, splitting into `['0e10_51', '1e15_3p4i5x3']` (malformed last element).
- **Proposed Regex**: Matches `h0e10_51-1e15_3p4` and extracts `0e10_51-1e15_3p4`, splitting into `['0e10_51', '1e15_3p4']` (correctly parsed).

---

## 2. Caching & Concurrency Optimization Proposal

### Concurrency Bottlenecks in the Current Code
1. **Burst Rate Limiting**: The current code processes players in sequential batches of 20 (`batchSize = 20`). In each batch, it launches 20 concurrent tasks, each executing two asynchronous fetches (`players/${pTag}` and `players/${pTag}/battlelog`) in parallel. This creates a sudden burst of 40 requests to the API proxy, which easily triggers `429 Too Many Requests`.
2. **Head-of-Line Blocking**: The code waits for all 20 players in the current batch to complete (`await Promise.all(promises)`) before delaying for 200ms and moving to the next batch. If one request in the batch is slow (e.g., due to a network delay or a 3-second retry loop on server errors), the entire script waits, idling the connection for the other 19 players.

### Proposed Concurrency Solution: Sliding Window Concurrency Queue (Worker Pool)
Instead of batching, we should use a sliding-window queue (e.g., using a custom `asyncPool` implementation or a library like `p-limit`) to limit concurrency to a steady number (e.g., 5 or 10 parallel operations). 
This keeps the connection saturated at a safe, non-bursty throughput and avoids head-of-line blocking.

#### Code Snippet for Sliding-Window Queue:
```typescript
async function asyncPool<T, R>(
  limit: number,
  items: T[],
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  const promises: Promise<void>[] = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const currentIndex = index++;
      const item = items[currentIndex];
      results[currentIndex] = await fn(item);
    }
  }

  for (let i = 0; i < Math.min(limit, items.length); i++) {
    promises.push(worker());
  }

  await Promise.all(promises);
  return results;
}
```

### Caching and Resumability Proposal
Currently, there is no caching. If the script fails halfway through the 200 players, the developer must restart the script, refetching everything.

#### Cache Design:
1. **Cache Location**: Use a local cache directory (e.g., `data/.cache/`).
2. **Granularity**: Cache each player's profile and battlelog separately:
   - `data/.cache/player_${encodedTag}.json`
   - `data/.cache/battlelog_${encodedTag}.json`
3. **Cache Validation (TTL)**: 
   - A TTL of 12 or 24 hours is suitable since the script is intended to run daily.
   - If a cached file exists and is newer than the TTL, the script loads it from disk.
4. **Cache Bypass**: Allow bypassing the cache by passing a `--force` or `--no-cache` flag (using `process.argv`).
5. **Robustness**: If the API call fails after all retries, the script can fall back to the cached data (if available) as a graceful degradation mechanism instead of crashing the entire pipeline.

---

## 3. Dependency & Runtime Environment Analysis

### ESM (ES Modules) vs CommonJS
- The `package.json` specifies `"type": "module"`.
- This means the runtime executes in ESM mode.
- In ESM, TypeScript compiles output requiring `.js` in imports. The script imports maps using:
  `import { EquipmentMap, HeroMap } from '../src/data/equipmentMap.js';`
  `import { TroopMap, SpellMap, PetMap, ALL_SIEGE_MACHINES, ALL_SUPER_TROOPS } from '../src/data/UnitMap.js';`
- Although these source files are `.ts` files, their imports specify `.js`. The resolver resolves this under ESM mode.

### TSX Runtime
- The script is executed via `"fetch-data": "tsx scripts/fetch-meta.ts"`.
- `tsx` compiles TypeScript on the fly using `esbuild` and resolves the `.js` imports to `.ts` files transparently.
- Running the script directly with `node` will fail unless TS execution is enabled (e.g., via Node 22 `--experimental-strip-types` or `--import tsx`).

### Node.js Version & Global API Dependencies
- The project specifies `"engines": { "node": ">=22.12.0" }`.
- The script uses the global `fetch` API. `fetch` became stable and enabled by default in Node.js 18.
- Running the script in any Node.js environment below version 18 will crash with a `ReferenceError` for `fetch` unless a polyfill (like `node-fetch`) is imported.

### Working Directory Sensitivity
- The script resolves paths using:
  `const dir = path.join(process.cwd(), 'data');`
- `process.cwd()` returns the directory where the command was initiated, not the directory of the script.
- Therefore, the script **must** be run from the repository root. Running it from inside the `scripts/` directory will write the fetched data to `scripts/data/meta.json` instead of the root `data/meta.json`, causing the Astro build to fail or use stale data.
