import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, '..', 'dist');

test('E2E: Build artifacts exist', () => {
  assert.ok(fs.existsSync(distDir), 'dist/ directory exists. Did you run build?');
  assert.ok(fs.existsSync(path.join(distDir, 'index.html')), 'index.html exists');
  assert.ok(fs.existsSync(path.join(distDir, 'players', 'index.html')), 'players/index.html exists');
  assert.ok(fs.existsSync(path.join(distDir, 'armies', 'index.html')), 'armies/index.html exists');
});

test('E2E: Homepage Feature Coverage', () => {
  if (!fs.existsSync(path.join(distDir, 'index.html'))) return;
  const html = fs.readFileSync(path.join(distDir, 'index.html'), 'utf-8');
  
  // Header and layout
  assert.ok(html.includes('META TRACKER'), 'Header is present');
  
  // Component assertions
  assert.ok(html.includes('Super Troops'), 'Super Troops section is present');
  assert.ok(html.includes('Siege Machines'), 'Siege Machines section is present');
  
  // Verify WebP migration
  assert.ok(!html.includes('.png'), 'No PNG images should be rendered on the homepage');
  assert.ok(html.includes('.webp'), 'WebP images should be rendered instead');
});

test('E2E: Leaderboard Validation', () => {
  if (!fs.existsSync(path.join(distDir, 'players', 'index.html'))) return;
  const html = fs.readFileSync(path.join(distDir, 'players', 'index.html'), 'utf-8');
  
  // Ensure the DOM optimization is present
  assert.ok(html.includes('id="player-search"'), 'Client-side pagination search input is rendered');
  assert.ok(html.includes('Search by player, clan, or tag...'), 'Search input has multi-field placeholder');
  assert.ok(html.includes('id="pagination-controls"'), 'Pagination controls are rendered');
  assert.ok(html.includes('player-row'), 'Player rows are tagged for JS processing');
  assert.ok(html.includes('data-name='), 'Player rows must have data-name attribute');
  assert.ok(html.includes('data-clan='), 'Player rows must have data-clan attribute');
  assert.ok(html.includes('data-tag='), 'Player rows must have data-tag attribute');
});

test('E2E: Armies Routing', () => {
  if (!fs.existsSync(path.join(distDir, 'armies', 'index.html'))) return;
  const html = fs.readFileSync(path.join(distDir, 'armies', 'index.html'), 'utf-8');
  assert.ok(html.includes('Top Armies'), 'Army types header is present');
});

test('E2E: HeroCard 3-slot placeholder consistency', () => {
  if (!fs.existsSync(path.join(distDir, 'index.html'))) return;
  const html = fs.readFileSync(path.join(distDir, 'index.html'), 'utf-8');
  
  // Royal Champion has fewer than 3 combos and pets
  const rcSection = html.slice(html.indexOf('>Royal Champion<'));
  assert.ok(rcSection.includes('border-dashed'), 'Placeholder dashed slots must be rendered for missing combos/pets');
  assert.ok(rcSection.includes('—'), 'Placeholder text dash must be rendered for empty slots');
});

test('E2E: SEO, Canonical & Social Open Graph', () => {
  if (!fs.existsSync(path.join(distDir, 'index.html'))) return;
  const html = fs.readFileSync(path.join(distDir, 'index.html'), 'utf-8');

  assert.ok(html.includes('rel="canonical"'), 'Canonical URL link must be present');
  assert.ok(html.includes('property="og:title"'), 'og:title must be present');
  assert.ok(html.includes('property="og:description"'), 'og:description must be present');
  assert.ok(html.includes('name="twitter:card"'), 'Twitter card must be present');
  assert.ok(html.includes('name="theme-color"'), 'Theme color meta tag must be present');
  assert.ok(fs.existsSync(path.join(distDir, 'robots.txt')), 'robots.txt must be generated in dist');
  assert.ok(fs.existsSync(path.join(distDir, 'sitemap-index.xml')), 'sitemap-index.xml must be generated in dist');
});

test('E2E: Accessibility & a11y standards', () => {
  if (!fs.existsSync(path.join(distDir, 'players', 'index.html'))) return;
  const playerHtml = fs.readFileSync(path.join(distDir, 'players', 'index.html'), 'utf-8');
  assert.ok(playerHtml.includes('aria-label="Search players by name, clan, or tag"'), 'Search input has descriptive aria-label');
  assert.ok(playerHtml.includes('role="tooltip"'), 'Global tooltip has role="tooltip"');
  assert.ok(playerHtml.includes('type="search"'), 'Search input has native search type');
});
