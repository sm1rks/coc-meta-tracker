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
  assert.ok(html.includes('id="pagination-controls"'), 'Pagination controls are rendered');
  assert.ok(html.includes('player-row'), 'Player rows are tagged for JS processing');
});

test('E2E: Armies Routing', () => {
  if (!fs.existsSync(path.join(distDir, 'armies', 'index.html'))) return;
  const html = fs.readFileSync(path.join(distDir, 'armies', 'index.html'), 'utf-8');
  assert.ok(html.includes('Top Armies'), 'Army types header is present');
});
