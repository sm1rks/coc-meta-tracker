# Clash of Clans Meta Tracker

A web dashboard tracking troop, hero equipment, siege machine, and army archetype usage among the top 200 Clash of Clans players globally.

Built with [Astro](https://astro.build) and [Tailwind CSS](https://tailwindcss.com/).

## Features

- **Hero Equipment Analytics**: View usage rates and combinations for Barbarian King, Archer Queen, Grand Warden, Royal Champion, Minion Prince, and Dragon Duke.
- **Super Troops & Siege Machines**: Track active super troop boosts and preferred siege machines across top players.
- **Army Archetypes**: Categorized breakdown of strategy compositions (Root Rider, Lalo, etc.) and associated hero equipment setups (`/armies`).
- **Player Leaderboard**: Searchable and paginated top 200 player rankings with detailed troop, equipment, and clan data (`/players`).

## Tech Stack

- **Framework**: Astro 6 (Static Site Generation)
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
- `npm run fetch-data`: Execute the data processing pipeline (`scripts/fetch-meta.ts`)
- `npm run test:e2e`: Run E2E build artifact tests (`tests/e2e.test.js`)

## Deployment

Continuous deployment is handled via GitHub Actions in `.github/workflows/deploy-pages.yml`. When triggered, the workflow fetches the latest player meta using the `COC_API_KEY` repository secret, builds the static site, and deploys it to GitHub Pages.

