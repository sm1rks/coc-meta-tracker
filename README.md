# 👑 Clash of Clans: Top 200 Global Meta Tracker

An automated, open-source, and fully autonomous dashboard that tracks exactly what the top 200 Clash of Clans players in the world are using. 

Built with **Astro**, **Tailwind CSS**, and the **Official Clash of Clans API**.

## 🚀 Features

- **Hero Equipment Meta**: Automatically analyzes the Top 200 global players to see exactly what equipment combinations they are running on the Barbarian King, Archer Queen, Grand Warden, Royal Champion, Minion Prince, and Dragon Duke.
- **Super Troop Usage**: Tracks the exact usage rates of active Super Troops being boosted by the best players in the world.
- **Global Leaderboard**: A sleek, scrollable Top 200 leaderboard showing real-time ranks, clan associations, and trophy counts.
- **Fully Autonomous**: Powered by GitHub Actions. A cron job wakes up automatically at `04:55 UTC` (right before League Day reset), fetches the absolute final locked-in meta of the day via a secure RoyaleAPI proxy, and automatically rebuilds the static HTML!

## 🛠️ Tech Stack

- **Framework**: [Astro](https://astro.build) (Output: `static` for blazing-fast 0-JS load times)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Data Pipeline**: TypeScript + Node fetch
- **API Proxy**: [RoyaleAPI CoC Proxy](https://docs.royaleapi.com/proxy.html) (Bypasses GitHub Actions dynamic IP restrictions)
- **Deployment**: GitHub Pages (100% Free Hosting)

## ⚙️ Local Development

Want to run the dashboard locally on your own machine? 

1. **Clone the repository**
   ```bash
   git clone https://github.com/sm1rks/coc-meta-tracker.git
   cd coc-meta-tracker
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set up your API Key**
   - Go to the [Clash of Clans Developer Portal](https://developer.clashofclans.com/) and create a new key.
   - For the Allowed IPs, you **must** enter `45.79.218.79` (This is the static IP of the RoyaleAPI proxy).
   - Create a `.env` file in the root directory of this project.
   - Add your token like this:
     ```env
     COC_API_KEY=your_long_jwt_token_here
     ```

4. **Fetch Live Data**
   Run the data pipeline script to securely fetch and analyze the latest Top 200 players:
   ```bash
   npm run fetch-data
   ```

5. **Start the Dev Server**
   Start Astro's local development server to see the site live:
   ```bash
   npm run dev
   ```

## 🤖 GitHub Actions Automation

This repository comes pre-configured with a dual-action automated CI/CD pipeline!

1. `.github/workflows/update-meta.yml`: Runs daily on a cron timer. It pings the Clash of Clans API, generates a fresh `data/meta.json`, and commits it directly to the `main` branch.
2. `.github/workflows/deploy-pages.yml`: Listens for that new commit, instantly runs `npm run build` to bake the new JSON data into static HTML, and publishes it flawlessly to GitHub Pages.

*Note: For the automation to work, you must add your `COC_API_KEY` as a Repository Secret in GitHub Settings!*
