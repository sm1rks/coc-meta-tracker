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

## 3. Test Cases List (49 Test Cases)

### Tier 1: Feature Coverage (20 cases - 5 per feature)

#### Feature A: Hero Equipment Dashboard
1. **TC-01 (Hero Card Rendering)**: Assert that all heroes listed in `data/meta.json` have a corresponding hero card in `dist/index.html` with correct uppercase names.
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
14. **TC-14 (Top Composition Breakdown)**: Verify that when details are expanded, the inner details list the top heroes, pets, equipments, and super troops for that army type.
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
21. **TC-21 (Empty Equipments/Combos/Pets arrays)**: Assert fallback rendering (e.g. "No data" placeholder or omitting the section entirely) when a hero has empty arrays.
22. **TC-22 (Extreme Usage Rates)**: Verify rendering of width style of the progress bar when usage rates are exactly 0% or 100%.
23. **TC-23 (Missing/Unknown Icon Names)**: Assert that if an equipment name or icon is unknown, it doesn't break rendering and falls back gracefully.
24. **TC-24 (Large Name Handling)**: Verify that very long hero or equipment names do not cause UI overflow (checking for text truncation classes like `truncate` or `whitespace-nowrap`).
25. **TC-25 (Rounding Precision)**: Assert that usage rates are formatted with exactly one decimal place (e.g., `X.X%`).

#### Feature B: Super Troops & Siege Machines Cards
26. **TC-26 (Empty lists)**: Verify card rendering or custom fallback message when Super Troops or Siege Machines list is empty.
27. **TC-27 (Sorting Order Verification)**: Assert that Super Troops and Siege Machines are sorted in descending order of usage rates.
28. **TC-28 (Progress Bar Bounds)**: Verify that the progress bar width styles correspond to the usage percentage for all items (bounded between 0% and 100%).
29. **TC-29 (Image Load Failures)**: Verify that the `onerror` handler `this.style.display='none'` exists on all troop/machine images.
30. **TC-30 (No Duplicate Entries)**: Assert that there are no duplicate names within either the Super Troops or Siege Machines lists.

#### Feature C: Top Army Types Page
31. **TC-31 (Single Player Army Types)**: Assert proper layout and pluralization when an army type is used by only 1 player or has 1 battle.
32. **TC-32 (Missing Hero/Super Troop data)**: Verify that if an army type contains no heroes or super troops data, the page renders gracefully without blank blocks or NaN errors.
33. **TC-33 (Army Types with 0% Usage)**: Assert that low-frequency army types near 0% are represented correctly.
34. **TC-34 (Unordered Army Lists)**: Assert that the armies are correctly sorted in descending order of usage rate.
35. **TC-35 (Details Open/Closed Defaults)**: Assert that `<details>` elements are closed by default (do not have the `open` attribute).

#### Feature D: Top 200 Players Leaderboard
36. **TC-36 (Missing Clan Names)**: Assert that players without a clan show only their name and don't render empty clan badges or spacing issues.
37. **TC-38 (Leaderboard bounds)**: Assert that the list bounds stop exactly at Rank 200 (or the max number of players provided in data).
38. **TC-39 (No Players Found Fallback)**: Verify that if the player list in `meta.json` is empty, the page renders a clean "No players found." message.
39. **TC-40 (Clipboard API Safety)**: Assert that the `onclick` string matches `navigator.clipboard.writeText('...')` exactly, avoiding XSS and injection.
40. **TC-37 (Malformed Army Links)**: Verify that if an army link is empty or invalid, the "OPEN LINK" button is omitted.

---

### Tier 3: Cross-Feature Combinations (4 cases)

41. **TC-41 (Consistency of Global Statistics)**: Assert that the statistical highlights in the layout header (e.g. `playersAnalyzed` and `attacksAnalyzed`) are identical across the Home page, Armies page, and Players page.
42. **TC-42 (Navigation Path and Active States)**: Verify that the navigation links have correct URLs prefixing the base path (`/coc-meta-tracker`) and that the active page has the CSS classes indicating active status.
43. **TC-43 (Army Type Synchronization)**: Verify that every army type name listed in the `/players` leaderboard matches an existing army type in `/armies`, and that the counts are synchronized.
44. **TC-44 (Player Counts Match)**: Verify that the sum of player counts across all army types on the Armies page does not exceed the total players analyzed shown in the header.

---

### Tier 4: Real-World Application Scenarios (5 cases)

45. **TC-45 (Live Update Trigger Logic)**: Verify that the client-side `<script>` tag in the layout checks for the `data-timestamp` attribute and triggers a reload when visibility changes and a newer build timestamp is fetched.
46. **TC-46 (Responsive Styling Layout Validation)**: Assert that the main grid layouts contain the proper responsive styling class names (e.g. `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`).
47. **TC-48 (Lazy Loading Performance Check)**: Assert that all non-critical images in player rows have `loading="lazy"` and `decoding="async"` attributes to ensure fast page load performance.
48. **TC-49 (HTML Cache-Control Headers Validation)**: Assert that the pages contain Cache-Control metadata in `<meta>` tags to prevent caching of live rankings.
49. **TC-47 (Clipboard Copy Integration)**: Verify that clicking the "OPEN LINK" buttons in the player rows of the Armies page and Players page generates matching clipboard copy payloads.
