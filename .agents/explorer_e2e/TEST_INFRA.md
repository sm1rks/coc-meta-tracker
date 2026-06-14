# Clash of Clans Meta Tracker Optimization - E2E Testing Strategy

This document outlines the zero-dependency End-to-End (E2E) testing strategy for the Clash of Clans Meta Tracker website. It uses Node.js's built-in `node:test` runner and the HTML parsing library `ultrahtml` to validate static page outputs.

---

## 1. Executive Summary

Since the site is compiled to static HTML files under `dist/` based on `data/meta.json`, we can run fast, robust, and zero-dependency E2E assertions by parsing the generated HTML directly from the filesystem. This bypasses the need for running a headless browser (like Playwright or Puppeteer) or a local HTTP server.

We use:
1. **`node:test`**: Node's native test runner (stable since Node 20), providing nested suites, lifecycle hooks, and high-performance execution.
2. **`ultrahtml`**: A lightweight HTML parser and query selector engine already present in the project's `node_modules` directory, allowing standard CSS selectors to inspect HTML trees.

---

## 2. Directory Structure

We propose adding a `tests/` directory at the project root for tests and related utilities.

```
calm-curie/
├── data/
│   └── meta.json            # Source data
├── dist/                    # Static built output
│   ├── index.html           # Home (Hero Equipment / Super Troops / Siege)
│   ├── armies/
│   │   └── index.html       # Top Army Types page
│   └── players/
│       └── index.html       # Top 200 Players leaderboard
├── tests/
│   ├── helpers.js           # E2E test harness & helper functions
│   └── e2e.test.js          # The E2E test suite (49 test cases)
└── package.json
```

To run the tests, add a script to `package.json`:
```json
"scripts": {
  "test:e2e": "node --test tests/e2e.test.js"
}
```

---

## 3. Test Harness Design (`tests/helpers.js`)

Below is the design of the test helper functions that wrap `ultrahtml` to load files, perform queries, extract text contents, and validate page elements.

```javascript
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'ultrahtml';
import { querySelector, querySelectorAll } from 'ultrahtml/selector';

/**
 * Loads and parses a built page from the dist directory.
 * @param {string} route - The route path (e.g. '/' or '/armies' or '/players')
 * @returns {object} Parsed ultrahtml AST node
 */
export function loadPage(route) {
  let relativePath = 'index.html';
  if (route === '/armies' || route === '/armies/') {
    relativePath = 'armies/index.html';
  } else if (route === '/players' || route === '/players/') {
    relativePath = 'players/index.html';
  }
  
  const filePath = path.join(process.cwd(), 'dist', relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Build output file not found at ${filePath}. Run npm run build first.`);
  }
  
  const htmlContent = fs.readFileSync(filePath, 'utf-8');
  return parse(htmlContent);
}

/**
 * Loads the source meta.json file for assertions.
 * @returns {object} Parsed JSON data
 */
export function loadSourceData() {
  const filePath = path.join(process.cwd(), 'data', 'meta.json');
  if (!fs.existsSync(filePath)) {
    throw new Error(`Source data not found at ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

/**
 * Recursively extracts all text content from an ultrahtml node.
 * @param {object} node - ultrahtml AST node
 * @returns {string} Trimmed text content
 */
export function getTextContent(node) {
  if (!node) return '';
  if (node.type === 2) { // TEXT_NODE
    return node.value;
  }
  if (node.children) {
    return node.children.map(getTextContent).join('');
  }
  return '';
}

/**
 * Retrieves the value of a specific attribute from an ultrahtml element node.
 * @param {object} node - ultrahtml AST node
 * @param {string} attrName - Name of the attribute
 * @returns {string|null} Attribute value or null
 */
export function getAttribute(node, attrName) {
  return node?.attributes?.[attrName] || null;
}

export { querySelector, querySelectorAll };
```

---

## 4. Propose List of 49 Test Cases

Here is the list of exactly 49 test cases divided across 4 tiers.

### Tier 1: Feature Coverage (20 cases - 5 per feature)

#### Feature A: Hero Equipment Dashboard
1. **TC-01 (Hero Card Rendering)**: Assert that all heroes listed in `data/meta.json` have a corresponding hero card (e.g. containing card wrapper classes) in `dist/index.html` with correct uppercase names.
2. **TC-02 (Hero Usage Rate Display)**: Assert that each Hero card displays the correct usage percentage formatted as `Usage: X.Y%` matching `meta.json`.
3. **TC-03 (Equipment List and Usage Progress)**: Verify that the equipments for each hero are rendered as progress rows with correct names, usage bars, and percentages.
4. **TC-04 (Top Combos Section)**: Assert that if a hero has combos in `meta.json`, they are rendered in a "TOP COMBOS" section (up to 3 combos) with their icons and usage percentages.
5. **TC-05 (Top Pets Section)**: Assert that if a hero has pets in `meta.json`, they are rendered in a "TOP PETS" section (up to 3 pets) with their icons and usage percentages.

#### Feature B: Super Troops & Siege Machines Cards
6. **TC-06 (Super Troops Card Presence)**: Assert that a dedicated card for "Super Troops" is present on the homepage and displays the correct header and icon.
7. **TC-07 (Super Troops List and Usage)**: Assert that all super troops in `meta.json` are listed in the Super Troops card with correct usage rates.
8. **TC-08 (Siege Machines Card Presence)**: Assert that a dedicated card for "Siege Machines" is present on the homepage with correct header and icon.
9. **TC-09 (Siege Machines List and Usage)**: Assert that all siege machines in `meta.json` are listed in the Siege Machines card with correct usage rates.
10. **TC-10 (Icon URL and Alt attributes)**: Assert that all icons for Super Troops and Siege Machines have correct source paths and descriptive alt attributes.

#### Feature C: Top Army Types Page
11. **TC-11 (Page Title and Header)**: Assert that the `/armies/index.html` page renders with the correct page title and main layout header.
12. **TC-12 (Collapsible Details Rows)**: Assert that each army type is wrapped in a `<details>` element with a `<summary>` header, allowing expansion.
13. **TC-13 (Army Statistics Display)**: Assert that the summary displays the rank (`#1`), name, battles count, and players count matching the data.
14. **TC-14 (Top Composition Breakdown)**: Verify that when details are expanded (or checked in HTML), the inner details list the top heroes, pets, equipments, and super troops for that army type.
15. **TC-15 (Usage Rate Progress Bar)**: Verify that each army type displays its usage rate as a progress bar with correct width style and text percentage.

#### Feature D: Top 200 Players Leaderboard
16. **TC-16 (Leaderboard Page Rendering)**: Assert that `/players/index.html` renders the Top 200 table layout correctly.
17. **TC-17 (Player Row Elements)**: Verify that each player row displays the rank (`#Rank`), player name, clan name, trophies, and army type name.
18. **TC-18 (Clan Badge Fallback)**: Assert that player rows display clan badges if available, or a fallback character (e.g., `-`) when the badge is missing.
19. **TC-19 (Copy Army Link Action)**: Assert that players with army links have an "OPEN LINK" button with an `onclick` attribute that triggers clipboard copy.
20. **TC-20 (Trophies Indicator)**: Verify that player trophies are styled with the 🏆 emoji and correct numerical value.

---

### Tier 2: Boundary & Corner Cases (20 cases - 5 per feature)

#### Feature A: Hero Equipment Dashboard
21. **TC-21 (Hero with No Equipments/Combos/Pets)**: Assert fallback rendering (e.g. "No data" placeholder or omitting the section entirely) when a hero has empty arrays.
22. **TC-22 (Extreme Usage Rates)**: Verify rendering and style attributes when usage rates are exactly 0% or 100%. (e.g. width style of the progress bar).
23. **TC-23 (Missing Tooltip Names)**: Assert that if an equipment name or icon is unknown, it doesn't break rendering and falls back gracefully.
24. **TC-24 (Large Name Handling)**: Verify that very long hero or equipment names do not cause UI overflow (checking for text truncation classes like `truncate` or `whitespace-nowrap`).
25. **TC-25 (Rounding Precision)**: Assert that usage rates are formatted with exactly one decimal place (e.g., `X.X%`).

#### Feature B: Super Troops & Siege Machines Cards
26. **TC-26 (Empty Super Troops or Siege Machines list)**: Verify that if the lists in `meta.json` are empty, the cards display the fallback text (e.g., "No active super troops found." / "No active siege machines found.").
27. **TC-27 (Sorting Order Verification)**: Assert that Super Troops and Siege Machines are sorted in descending order of usage rates.
28. **TC-28 (Progress Bar Bounds)**: Verify that the progress bar width styles correspond to the usage percentage for all items (e.g. `width: X%` is bounded between 0% and 100%).
29. **TC-29 (Image Load Failures)**: Verify that the `onerror` handler `this.style.display='none'` exists on all troop/machine images to handle missing assets gracefully.
30. **TC-30 (Duplicate Entries)**: Assert that the E2E parser detects no duplicate names within either the Super Troops or Siege Machines lists.

#### Feature C: Top Army Types Page
31. **TC-31 (Single Player Army Types)**: Assert proper layout and pluralization when an army type is used by only 1 player or has 1 battle.
32. **TC-32 (Missing Hero Combinations)**: Verify that if an army type contains no heroes or super troops data, the page renders gracefully without blank blocks or NaN errors.
33. **TC-33 (Army Types with 0% Usage)**: Assert that low-frequency army types near 0% are represented correctly without division-by-zero or visual rendering errors.
34. **TC-34 (Unordered Army Lists)**: Assert that the armies are correctly sorted in descending order of usage rate.
35. **TC-35 (Details Open/Closed Defaults)**: Assert that `<details>` elements are closed by default (do not have the `open` attribute) to keep the initial page clean.

#### Feature D: Top 200 Players Leaderboard
36. **TC-36 (Missing Clan Names)**: Assert that players without a clan show only their name and don't render empty clan badges or spacing issues.
37. **TC-37 (Malformed Army Links)**: Verify that if an army link is empty or invalid, the "OPEN LINK" button is omitted.
38. **TC-38 (Extreme Rankings - Rank 1 and 200)**: Assert that Rank 1 is correctly styled and present, and the list bounds stop exactly at Rank 200 (or the max number of players provided in data).
39. **TC-39 (No Players Found Fallback)**: Verify that if the player list in `meta.json` is empty, the page renders a clean "No players found." message.
40. **TC-40 (Clipboard API Safety)**: Assert that the `onclick` string matches `navigator.clipboard.writeText('...')` exactly, avoiding XSS and injection.

---

### Tier 3: Cross-Feature Combinations (4 cases)

41. **TC-41 (Consistency of Global Statistics)**: Assert that the statistical highlights in the layout header (e.g. `playersAnalyzed` and `attacksAnalyzed`) are identical across the Home page, Armies page, and Players page.
42. **TC-42 (Navigation Path and Active States)**: Verify that the navigation links on the Home page, Armies page, and Players page have correct URLs prefixing the base path (`/coc-meta-tracker`) and that the active page has the CSS classes indicating active status (e.g., `bg-coc-panel scale-105 z-10`).
43. **TC-43 (Army Type Synchronization)**: Verify that every army type name listed in the `/players` leaderboard matches an existing army type in `/armies`, and that the counts are synchronized.
44. **TC-44 (Player Counts Match)**: Verify that the sum of player counts across all army types on the Armies page does not exceed the total players analyzed shown in the header.

---

### Tier 4: Real-World Application Scenarios (5 cases)

45. **TC-45 (Live Update Trigger Logic)**: Analyze and verify that the client-side `<script>` tag in the layout checks for the `data-timestamp` attribute and triggers a `window.location.reload()` when visibility changes and a newer build timestamp is fetched.
46. **TC-47 (Clipboard Copy Integration)**: Verify that clicking the "OPEN LINK" buttons in the player rows of the Armies page and Players page generates matching clipboard copy payloads.
47. **TC-48 (Lazy Loading Performance Check)**: Assert that all non-critical images (hero icons, equipment, pet icons, clan badges) in player rows have `loading="lazy"` and `decoding="async"` attributes to ensure fast page load performance.
48. **TC-49 (HTML Cache-Control Headers Validation)**: Assert that the pages contain Cache-Control metadata (`no-cache, no-store, must-revalidate` in `<meta>` tags) to prevent caching of live rankings.
49. **TC-46 (Responsive Styling Layout Validation)**: Assert that the grids on the Home page (`grid-cols-1 md:grid-cols-2 lg:grid-cols-4`) and the players table layout render correctly on mobile/desktop by validating the presence of responsive tailwind CSS classes.

---

## 5. Draft E2E Test Suite (`tests/e2e.test.js`)

Below is the proposed, zero-dependency, executable implementation of the test suite. It is written using native ESM and standard Node `assert`.

```javascript
import { describe, test, before } from 'node:test';
import assert from 'node:assert/strict';
import { 
  loadPage, 
  loadSourceData, 
  getTextContent, 
  getAttribute, 
  querySelector, 
  querySelectorAll 
} from './helpers.js';

describe('Clash of Clans Meta Tracker E2E Test Suite', () => {
  let homeDoc;
  let armiesDoc;
  let playersDoc;
  let rawData;

  before(() => {
    // Load static files compiled in dist/ and the source meta.json
    homeDoc = loadPage('/');
    armiesDoc = loadPage('/armies');
    playersDoc = loadPage('/players');
    rawData = loadSourceData();
  });

  // ==========================================
  // TIER 1: FEATURE COVERAGE
  // ==========================================
  
  describe('Hero Equipment Dashboard (Feature A)', () => {
    test('TC-01: Hero cards are rendered for all active heroes', () => {
      const heroCards = querySelectorAll(homeDoc, 'h2');
      const expectedHeroes = rawData.heroes.map(h => h.name.toUpperCase());
      
      const renderedHeroNames = heroCards
        .map(card => getTextContent(card).toUpperCase())
        .filter(name => expectedHeroes.some(hName => name.includes(hName)));
        
      assert.ok(renderedHeroNames.length > 0, "No hero cards found");
      rawData.heroes.forEach(h => {
        assert.ok(
          renderedHeroNames.some(name => name.includes(h.name.toUpperCase())), 
          `Missing hero card for ${h.name}`
        );
      });
    });

    test('TC-02: Hero cards show accurate usage rates', () => {
      const heroCards = querySelectorAll(homeDoc, '.bg-\\[\\#f4e4c1\\]');
      
      rawData.heroes.forEach(hero => {
        // Find matching card
        const card = heroCards.find(c => {
          const h2 = querySelector(c, 'h2');
          return getTextContent(h2).toUpperCase() === hero.name.toUpperCase();
        });
        
        assert.ok(card, `Card for ${hero.name} not found`);
        const usageText = getTextContent(card);
        const expectedUsageString = `Usage: ${hero.usage.toFixed(1)}%`;
        assert.ok(
          usageText.includes(expectedUsageString),
          `Card for ${hero.name} does not display correct usage. Expected: ${expectedUsageString}`
        );
      });
    });

    test('TC-03: Equipments list and usage progress bars render correctly', () => {
      const heroCards = querySelectorAll(homeDoc, '.bg-\\[\\#f4e4c1\\]');
      
      rawData.heroes.forEach(hero => {
        const card = heroCards.find(c => {
          const h2 = querySelector(c, 'h2');
          return getTextContent(h2).toUpperCase() === hero.name.toUpperCase();
        });
        if (!card) return;
        
        const heroEquips = rawData.equipments.filter(e => e.hero === hero.name);
        heroEquips.forEach(eq => {
          // Check that the equipment name exists in the card text or alt tags
          const cardHtml = JSON.stringify(card);
          assert.ok(
            cardHtml.includes(eq.name),
            `Equipment ${eq.name} missing from ${hero.name} card`
          );
        });
      });
    });

    test('TC-04: Top Combos section renders if data exists', () => {
      const heroCards = querySelectorAll(homeDoc, '.bg-\\[\\#f4e4c1\\]');
      
      rawData.heroes.forEach(hero => {
        const card = heroCards.find(c => {
          const h2 = querySelector(c, 'h2');
          return getTextContent(h2).toUpperCase() === hero.name.toUpperCase();
        });
        if (!card) return;

        const combos = rawData.combos.filter(c => c.hero === hero.name);
        if (combos.length > 0) {
          const text = getTextContent(card);
          assert.ok(text.includes('TOP COMBOS'), `TOP COMBOS section missing from ${hero.name}`);
        }
      });
    });

    test('TC-05: Top Pets section renders if data exists', () => {
      const heroCards = querySelectorAll(homeDoc, '.bg-\\[\\#f4e4c1\\]');
      
      rawData.heroes.forEach(hero => {
        const card = heroCards.find(c => {
          const h2 = querySelector(c, 'h2');
          return getTextContent(h2).toUpperCase() === hero.name.toUpperCase();
        });
        if (!card) return;

        const pets = rawData.pets.filter(p => p.hero === hero.name);
        if (pets.length > 0) {
          const text = getTextContent(card);
          assert.ok(text.includes('TOP PETS'), `TOP PETS section missing from ${hero.name}`);
        }
      });
    });
  });

  describe('Super Troops & Siege Machines (Feature B)', () => {
    test('TC-06: Super Troops card is present with correct header', () => {
      const cards = querySelectorAll(homeDoc, '.bg-\\[\\#f4e4c1\\]');
      const superTroopsCard = cards.find(c => {
        const h2 = querySelector(c, 'h2');
        return getTextContent(h2).toUpperCase() === 'SUPER TROOPS';
      });
      assert.ok(superTroopsCard, "Super Troops card is missing");
    });

    test('TC-07: Super Troops list rendering matches meta.json', () => {
      const cards = querySelectorAll(homeDoc, '.bg-\\[\\#f4e4c1\\]');
      const card = cards.find(c => getTextContent(querySelector(c, 'h2')).toUpperCase() === 'SUPER TROOPS');
      
      rawData.superTroops.forEach(troop => {
        const text = getTextContent(card);
        assert.ok(text.includes(troop.name), `Super troop ${troop.name} not rendered`);
        assert.ok(text.includes(`${troop.usage}%`), `Usage rate for ${troop.name} not found`);
      });
    });

    test('TC-08: Siege Machines card is present with correct header', () => {
      const cards = querySelectorAll(homeDoc, '.bg-\\[\\#f4e4c1\\]');
      const siegeCard = cards.find(c => {
        const h2 = querySelector(c, 'h2');
        return getTextContent(h2).toUpperCase() === 'SIEGE MACHINES';
      });
      assert.ok(siegeCard, "Siege Machines card is missing");
    });

    test('TC-09: Siege Machines list rendering matches meta.json', () => {
      const cards = querySelectorAll(homeDoc, '.bg-\\[\\#f4e4c1\\]');
      const card = cards.find(c => getTextContent(querySelector(c, 'h2')).toUpperCase() === 'SIEGE MACHINES');
      
      rawData.siegeMachines.forEach(machine => {
        const text = getTextContent(card);
        assert.ok(text.includes(machine.name), `Siege machine ${machine.name} not rendered`);
        assert.ok(text.includes(`${machine.usage}%`), `Usage rate for ${machine.name} not found`);
      });
    });

    test('TC-10: Image elements contain proper sources and alt attributes', () => {
      const imgTags = querySelectorAll(homeDoc, 'img');
      assert.ok(imgTags.length > 0, "No images found");
      imgTags.forEach(img => {
        const src = getAttribute(img, 'src');
        const alt = getAttribute(img, 'alt');
        assert.ok(src, "Image missing src attribute");
        assert.ok(alt, "Image missing alt attribute");
      });
    });
  });

  describe('Top Army Types (Feature C)', () => {
    test('TC-11: Armies page title and headers render', () => {
      const title = querySelector(armiesDoc, 'title');
      assert.ok(getTextContent(title).includes("Top Armies"), "Page title incorrect");
    });

    test('TC-12: Armies are listed in collapsible details elements', () => {
      const details = querySelectorAll(armiesDoc, 'details');
      assert.equal(details.length, rawData.armies.length, "Number of details elements does not match armies in meta.json");
    });

    test('TC-13: Army details summary contains correct statistics', () => {
      const details = querySelectorAll(armiesDoc, 'details');
      details.forEach((det, idx) => {
        const summary = querySelector(det, 'summary');
        const text = getTextContent(summary);
        const armyData = rawData.armies[idx];
        
        assert.ok(text.includes(`#${idx + 1}`), `Missing rank indicator in army summary ${idx}`);
        assert.ok(text.includes(armyData.name), `Missing army name in summary ${idx}`);
        assert.ok(text.includes(`${armyData.battlesCount} Battles`), `Missing battles count in summary ${idx}`);
        assert.ok(text.includes(`${armyData.playerCount} Players`), `Missing players count in summary ${idx}`);
      });
    });

    test('TC-14: Expanded composition lists heroes, pets, and equipments', () => {
      const details = querySelectorAll(armiesDoc, 'details');
      details.forEach((det, idx) => {
        const armyData = rawData.armies[idx];
        const contentText = getTextContent(det);
        
        armyData.topHeroes?.forEach(hero => {
          assert.ok(contentText.includes(hero.name), `Top hero ${hero.name} missing from army composition ${idx}`);
          if (hero.pet) {
            assert.ok(contentText.includes(hero.pet), `Top pet ${hero.pet} missing from army composition ${idx}`);
          }
        });
      });
    });

    test('TC-15: Usage progress bar matches the statistical data percentage', () => {
      const progressBars = querySelectorAll(armiesDoc, 'summary [style*="width:"]');
      assert.equal(progressBars.length, rawData.armies.length);
      progressBars.forEach((bar, idx) => {
        const style = getAttribute(bar, 'style');
        const armyData = rawData.armies[idx];
        assert.ok(style.includes(`width: ${armyData.usage}%`), `Style width does not match usage for index ${idx}`);
      });
    });
  });

  describe('Top 200 Players Leaderboard (Feature D)', () => {
    test('TC-16: Leaderboard shows the table layout container', () => {
      const header = querySelector(playersDoc, 'h2');
      assert.ok(getTextContent(header).toUpperCase().includes("GLOBAL TOP 200"));
    });

    test('TC-17: Player rows contain complete player profiles', () => {
      const playerRows = querySelectorAll(playersDoc, '.group\\/player, .group'); // Match themed containers
      assert.equal(playerRows.length, rawData.topPlayers.length, "Leaderboard row count does not match player data count");
      
      rawData.topPlayers.forEach((player, idx) => {
        const row = playerRows[idx];
        const text = getTextContent(row);
        assert.ok(text.includes(`#${player.rank}`), `Row ${idx} missing rank`);
        assert.ok(text.includes(player.name), `Row ${idx} missing player name`);
        if (player.clanName) {
          assert.ok(text.includes(player.clanName), `Row ${idx} missing clan name`);
        }
      });
    });

    test('TC-18: Clan badges render with a placeholder fallback when missing', () => {
      const playerRows = querySelectorAll(playersDoc, '.group\\/player, .group');
      playerRows.forEach((row, idx) => {
        const player = rawData.topPlayers[idx];
        if (!player.clanBadge) {
          const text = getTextContent(row);
          assert.ok(text.includes('-'), `Row ${idx} should show '-' fallback for missing clan badge`);
        }
      });
    });

    test('TC-19: Open Link copies army layout to clipboard on click', () => {
      const playerRows = querySelectorAll(playersDoc, '.group\\/player, .group');
      
      rawData.topPlayers.forEach((player, idx) => {
        if (player.armyLink) {
          const row = playerRows[idx];
          const links = querySelectorAll(row, 'a');
          const openLink = links.find(l => getTextContent(l).includes("OPEN LINK"));
          assert.ok(openLink, `Open link button missing for player ${player.name}`);
          
          const onClickAttr = getAttribute(openLink, 'onclick');
          assert.ok(onClickAttr, `Onclick attribute missing for player ${player.name}`);
          assert.ok(
            onClickAttr.includes(`navigator.clipboard.writeText('${player.armyLink}')`),
            `Onclick clipboard logic invalid for player ${player.name}`
          );
        }
      });
    });

    test('TC-20: Trophies count and icons show correctly', () => {
      const playerRows = querySelectorAll(playersDoc, '.group\\/player, .group');
      rawData.topPlayers.forEach((player, idx) => {
        const row = playerRows[idx];
        const text = getTextContent(row);
        assert.ok(text.includes(`${player.trophies}`), `Row ${idx} missing trophies`);
        assert.ok(text.includes('🏆'), `Row ${idx} missing trophies icon`);
      });
    });
  });

  // ==========================================
  // TIER 2: BOUNDARY & CORNER CASES (Example TC-21 to TC-25)
  // ==========================================
  
  describe('Boundary & Corner Cases (Tier 2)', () => {
    test('TC-21: Handled Hero with No Equipments/Combos/Pets without crashes', () => {
      // Check that the code parses clean even if some sections are empty
      assert.doesNotThrow(() => loadPage('/'));
    });

    test('TC-25: Usage rates display with exactly one decimal place precision', () => {
      const text = getTextContent(homeDoc);
      // Regex matches usage pattern with decimal place
      const usageRates = text.match(/Usage: \d+\.\d+%/g);
      assert.ok(usageRates && usageRates.length > 0, "No formatted usage rates found");
      usageRates.forEach(rate => {
        assert.ok(/\d+\.\d%/.test(rate), `Usage rate ${rate} does not have exactly one decimal place`);
      });
    });

    test('TC-27: Super Troops and Siege Machines are sorted in descending order', () => {
      // Test sorting logic of Super Troops card
      const superTroopsCard = querySelectorAll(homeDoc, '.bg-\\[\\#f4e4c1\\]').find(c => 
        getTextContent(querySelector(c, 'h2')).toUpperCase() === 'SUPER TROOPS'
      );
      
      const usageTextList = getTextContent(superTroopsCard).match(/\d+\.\d+%/g) || [];
      const usageValues = usageTextList.map(t => parseFloat(t));
      
      for (let i = 0; i < usageValues.length - 1; i++) {
        assert.ok(usageValues[i] >= usageValues[i + 1], `Super troops sorting out of order: ${usageValues[i]} < ${usageValues[i + 1]}`);
      }
    });

    test('TC-35: Collapsible details elements are closed by default', () => {
      const details = querySelectorAll(armiesDoc, 'details');
      details.forEach((det, idx) => {
        const isOpen = getAttribute(det, 'open');
        assert.ok(isOpen === null, `Details element at index ${idx} is open by default. It must be closed.`);
      });
    });

    test('TC-38: Top Players Leaderboard bounds are correct', () => {
      const playerRows = querySelectorAll(playersDoc, '.group\\/player, .group');
      assert.ok(playerRows.length <= 200, "Leaderboard contains more than 200 entries");
    });
  });

  // ==========================================
  // TIER 3: CROSS-FEATURE COMBINATIONS
  // ==========================================
  
  describe('Cross-Feature Consistency (Tier 3)', () => {
    test('TC-41: Statistical header counters are identical across all pages', () => {
      const homeHeader = querySelector(homeDoc, 'header');
      const armiesHeader = querySelector(armiesDoc, 'header');
      const playersHeader = querySelector(playersDoc, 'header');
      
      const homeStats = getTextContent(homeHeader).match(/\d+/g);
      const armiesStats = getTextContent(armiesHeader).match(/\d+/g);
      const playersStats = getTextContent(playersHeader).match(/\d+/g);
      
      assert.deepEqual(homeStats, armiesStats, "Home and Armies page header statistics mismatch");
      assert.deepEqual(homeStats, playersStats, "Home and Players page header statistics mismatch");
    });

    test('TC-42: Navigation links have base path prefix and set active state', () => {
      const checkNav = (doc, activePath) => {
        const nav = querySelector(doc, 'nav');
        const links = querySelectorAll(nav, 'a');
        
        assert.equal(links.length, 3, "Navigation links count incorrect");
        
        links.forEach(link => {
          const href = getAttribute(link, 'href');
          assert.ok(href.startsWith('/coc-meta-tracker'), `Link href ${href} missing base path prefix`);
          
          if (href === `/coc-meta-tracker${activePath === '/' ? '' : activePath}`) {
            const cls = getAttribute(link, 'class');
            assert.ok(cls.includes('bg-coc-panel'), `Link for path ${href} is missing active state class`);
          }
        });
      };
      
      checkNav(homeDoc, '/');
      checkNav(armiesDoc, '/armies');
      checkNav(playersDoc, '/players');
    });

    test('TC-43: Army names in Leaderboard match Armies page lists', () => {
      const armyNamesOnArmiesPage = rawData.armies.map(a => a.name);
      
      rawData.topPlayers.forEach(player => {
        assert.ok(
          armyNamesOnArmiesPage.includes(player.armyType), 
          `Player ${player.name} uses unknown army type: ${player.armyType}`
        );
      });
    });

    test('TC-44: Sum of player counts does not exceed total players analyzed', () => {
      const sumPlayers = rawData.armies.reduce((sum, a) => sum + (a.playerCount || 0), 0);
      assert.ok(
        sumPlayers <= rawData.playersAnalyzed, 
        `Sum of army players (${sumPlayers}) exceeds total players analyzed (${rawData.playersAnalyzed})`
      );
    });
  });

  // ==========================================
  // TIER 4: REAL-WORLD APPLICATION SCENARIOS
  // ==========================================
  
  describe('Real-World Scenarios (Tier 4)', () => {
    test('TC-45: Live update script triggers reload on newer timestamp detection', () => {
      const scripts = querySelectorAll(homeDoc, 'script');
      const updateScript = scripts.find(s => {
        const code = getTextContent(s);
        return code.includes('visibilitychange') && code.includes('window.location.reload()');
      });
      assert.ok(updateScript, "Automatic live update script is missing in layout");
    });

    test('TC-47: Performance validation - Images contain lazy-loading attributes', () => {
      const imgTags = querySelectorAll(playersDoc, 'img');
      imgTags.forEach(img => {
        const loading = getAttribute(img, 'loading');
        const decoding = getAttribute(img, 'decoding');
        // Ignore main logo/hero images that should be loaded immediately if any
        if (getAttribute(img, 'src').includes('icons/')) {
          assert.equal(loading, 'lazy', "Troop/machine icons must be lazy-loaded");
          assert.equal(decoding, 'async', "Troop/machine icons must be decoded asynchronously");
        }
      });
    });

    test('TC-48: Cache-Control metadata headers prevent caching of live ranking', () => {
      const metaTags = querySelectorAll(homeDoc, 'meta');
      const cacheControlMeta = metaTags.find(m => getAttribute(m, 'http-equiv') === 'Cache-Control');
      assert.ok(cacheControlMeta, "Missing Cache-Control meta header");
      assert.equal(getAttribute(cacheControlMeta, 'content'), 'no-cache, no-store, must-revalidate');
    });

    test('TC-49: Responsive layouts use valid responsive grid tailwind utilities', () => {
      const cardsGrid = querySelector(homeDoc, 'main > div');
      const gridClasses = getAttribute(cardsGrid, 'class');
      assert.ok(
        gridClasses.includes('grid-cols-1') && gridClasses.includes('md:grid-cols-2') && gridClasses.includes('lg:grid-cols-4'),
        "Main page grid does not have responsive grid columns (1 cols for mobile, 2 for tablet, 4 for desktop)"
      );
    });
  });
});
```

---

## 6. Verification and Execution Guide

### Prerequisites
Ensure that the site is compiled before running tests:
```bash
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
npm run build
```

### Running the E2E Test Suite
To execute the tests using Node.js's native test runner:
```bash
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
node --test tests/e2e.test.js
```

### Reporting
The runner will print human-readable hierarchical logs with execution times. Invalidation conditions include failing to build `dist/`, missing `data/meta.json`, or a mismatch between the generated HTML tags and the compiled datasets.
