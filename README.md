# Clash of Clans Meta Tracker

A web dashboard tracking troop, hero equipment, siege machine, and army archetype usage among the top 200 Clash of Clans players globally.

Built with [Astro](https://astro.build) and [Tailwind CSS](https://tailwindcss.com/).

## Features

- **Hero Equipment Analytics**: View usage rates and combinations for Barbarian King, Archer Queen, Grand Warden, Royal Champion, Minion Prince, and Dragon Duke.
- **Super Troops & Siege Machines**: Track active super troop boosts and preferred siege machines across top players.
- **Army Archetypes**: Categorized breakdown of strategy compositions (Root Rider, Lalo, etc.) and associated hero equipment setups (`/armies`).
- **Player Leaderboard**: Searchable and paginated top 200 player rankings with detailed troop, equipment, and clan data (`/players`).

## Tech Stack

- **Framework**: Astro 7 (Static Site Generation)
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`)
- **Language**: TypeScript / Node.js (v22.12+)
- **API**: Clash of Clans API (via [RoyaleAPI Proxy](https://docs.royaleapi.com/proxy.html))
- **Deployment**: GitHub Pages

## Getting Started

### Prerequisites

- Node.js 22.12.0 or higher
- Clash of Clans Developer API Key

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/sm1rks/coc-meta-tracker.git
   cd coc-meta-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env` file in the root directory:
   ```env
   COC_API_KEY=your_clash_api_key_here
   ```
   *Note: When creating your key on the [Clash of Clans Developer Portal](https://developer.clashofclans.com/), include `45.79.218.79` in the allowed IP list to work with the RoyaleAPI proxy.*

4. **Fetch meta data**
   ```bash
   npm run fetch-data
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

## Available Scripts

- `npm run dev`: Start Astro dev server
- `npm run build`: Build static site for production to `./dist`
- `npm run check`: Run Astro component diagnostics via `@astrojs/check`
- `npm run typecheck`: Strict TypeScript type checking across the project (`tsc --noEmit`)
- `npm run sync-equipment`: Synchronize equipment, pets, siege machines, super troops, and icons from ClashKing
- `npm run optimize-images`: Optimize and convert icon assets to WebP
- `npm run fetch-data`: Execute the data processing pipeline (`scripts/fetch-meta.ts`)
- `npm test`: Run automated tests (`tests/sync.test.js` & `tests/e2e.test.js`)

## Deployment & Automation

Continuous deployment is handled via GitHub Actions in `.github/workflows/deploy-pages.yml`. When triggered via `workflow_dispatch`, the workflow automatically syncs new equipment/units and icons, fetches the latest player meta using the `COC_API_KEY` repository secret, bakes the fresh data into static HTML, and deploys it to GitHub Pages. Any new icons or metadata are automatically committed back to the repository.

To guarantee accurate end-of-day stats right before the Clash of Clans League Day reset, an external cron service ([cron-job.org](https://cron-job.org)) triggers the GitHub Actions workflow via the GitHub API daily at 04:55 UTC (12:55 AM EDT).

## Acknowledgements & Legal

- **Data & Assets**: Static game data and unit icons are sourced from the community asset catalog at [ClashKing](https://clashk.ing). Support the creators using Creator Code: `ClashKing`.
- **API Proxy**: Player rankings and battle logs are proxied via [RoyaleAPI](https://docs.royaleapi.com/proxy.html).
- **Supercell Fan Content Policy**: This material is unofficial and is not endorsed by Supercell. For more information see [Supercell's Fan Content Policy](https://supercell.com/en/fan-content-policy/).


