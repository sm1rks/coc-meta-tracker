import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, '..', 'dist');

const readDistHtml = (...segments) => {
  const filePath = path.join(distDir, ...segments);
  assert.ok(fs.existsSync(filePath), `${path.join(...segments)} must exist in dist/`);
  return fs.readFileSync(filePath, 'utf-8');
};

test('E2E: Build artifacts exist', () => {
  assert.ok(fs.existsSync(distDir), 'dist/ directory exists. Did you run build?');
  assert.ok(fs.existsSync(path.join(distDir, 'index.html')), 'index.html exists');
  assert.ok(fs.existsSync(path.join(distDir, 'players', 'index.html')), 'players/index.html exists');
  assert.ok(fs.existsSync(path.join(distDir, 'armies', 'index.html')), 'armies/index.html exists');
  assert.ok(fs.existsSync(path.join(distDir, '404.html')), '404.html exists');
});

test('E2E: Homepage Feature Coverage', () => {
  const html = readDistHtml('index.html');

  assert.ok(html.includes('META TRACKER'), 'Header is present');
  assert.ok(html.includes('Super Troops'), 'Super Troops section is present');
  assert.ok(html.includes('Siege Machines'), 'Siege Machines section is present');
  assert.ok(!html.includes('.png'), 'No PNG images should be rendered on the homepage');
  assert.ok(html.includes('.webp'), 'WebP images should be rendered instead');
});

test('E2E: Navigation links use trailing slashes', () => {
  const html = readDistHtml('index.html');
  assert.ok(html.includes('href="/coc-meta-tracker/"'), 'Stats nav link includes trailing slash');
  assert.ok(html.includes('href="/coc-meta-tracker/armies/"'), 'Armies nav link includes trailing slash');
  assert.ok(html.includes('href="/coc-meta-tracker/players/"'), 'Top 200 nav link includes trailing slash');
  assert.ok(html.includes('aria-current="page"'), 'Active navigation link sets aria-current="page"');
});

test('E2E: Leaderboard Validation', () => {
  const html = readDistHtml('players', 'index.html');

  assert.ok(html.includes('id="player-search"'), 'Client-side pagination search input is rendered');
  assert.ok(html.includes('Search player, clan, troop, equip, pet, spell...'), 'Search input has multi-field placeholder');
  assert.ok(html.includes('id="pagination-controls"'), 'Pagination controls are rendered');
  assert.ok(html.includes('id="results-summary"'), 'Live results summary counter is rendered');
  assert.ok(html.includes('player-row'), 'Player rows are tagged for JS processing');
  assert.ok(html.includes('data-core-army='), 'Player rows must have data-core-army attribute');
  assert.ok(html.includes('data-search='), 'Player rows must have data-search attribute');
  assert.ok(html.includes('data-copy-army='), 'Army links must use delegated data-copy-army attribute');
  assert.ok(!html.includes('onerror="this.onerror'), 'Inline onerror handlers should be replaced with delegated listener');
});

test('E2E: Armies Routing', () => {
  const html = readDistHtml('armies', 'index.html');
  assert.ok(html.includes('Top Armies'), 'Army types header is present');
  assert.ok(!html.includes('onerror="this.onerror'), 'Inline onerror handlers should be replaced with delegated listener');
});

test('E2E: HeroCard 5-combo / 3-pet placeholder consistency', () => {
  const html = readDistHtml('index.html');

  const metaPath = path.join(__dirname, '..', 'data', 'meta.json');
  if (!fs.existsSync(metaPath)) return;
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));

  const heroWithMissing = (meta.heroes || []).find(hero => {
    const heroCombos = (meta.combos || []).filter(c => c.hero === hero.name);
    const heroPets = (meta.pets || []).filter(p => p.hero === hero.name);
    return heroCombos.length < 5 || heroPets.length < 3;
  });

  if (heroWithMissing) {
    const heroIndex = html.indexOf(`>${heroWithMissing.name}<`);
    assert.ok(heroIndex !== -1, `Hero ${heroWithMissing.name} must be rendered on index.html`);
    const heroSection = html.slice(heroIndex);
    assert.ok(heroSection.includes('border-dashed'), `Placeholder dashed slots must be rendered for missing combos/pets (${heroWithMissing.name})`);
    assert.ok(heroSection.includes('—'), `Placeholder text dash must be rendered for empty slots (${heroWithMissing.name})`);
  }
});

test('E2E: SEO, Canonical & Social Open Graph', () => {
  const html = readDistHtml('index.html');

  assert.ok(html.includes('rel="canonical"'), 'Canonical URL link must be present');
  assert.ok(html.includes('property="og:title"'), 'og:title must be present');
  assert.ok(html.includes('property="og:description"'), 'og:description must be present');
  assert.ok(html.includes('name="twitter:card"'), 'Twitter card must be present');
  assert.ok(html.includes('name="theme-color"'), 'Theme color meta tag must be present');
  assert.ok(!html.includes('http-equiv="Cache-Control"'), 'Invalid Cache-Control meta tag should be removed');
  assert.ok(fs.existsSync(path.join(distDir, 'robots.txt')), 'robots.txt must be generated in dist');
  assert.ok(fs.existsSync(path.join(distDir, 'sitemap-index.xml')), 'sitemap-index.xml must be generated in dist');
});

test('E2E: Accessibility & a11y standards', () => {
  const playerHtml = readDistHtml('players', 'index.html');
  assert.ok(playerHtml.includes('aria-label="Search players by name, clan, or tag"'), 'Search input has descriptive aria-label');
  assert.ok(playerHtml.includes('aria-label="Primary"'), 'Primary navigation landmark has aria-label');
  assert.ok(playerHtml.includes('href="#main-content"'), 'Skip to main content link is present');
  assert.ok(playerHtml.includes('role="tooltip"'), 'Global tooltip has role="tooltip"');
  assert.ok(playerHtml.includes('type="search"'), 'Search input has native search type');
});

test('E2E: Placeholder Asset and Fallback Handlers', () => {
  assert.ok(fs.existsSync(distDir), 'dist/ directory must exist');
  assert.ok(fs.existsSync(path.join(distDir, 'icons', 'placeholder.webp')), 'dist/icons/placeholder.webp must exist');

  const html = readDistHtml('index.html');
  assert.ok(html.includes('placeholder.webp'), 'HTML pages must include fallback to placeholder.webp');
});
