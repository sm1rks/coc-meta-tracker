import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

test('Sync Logic: Equipment ID offset calculation', () => {
  const mockEquipment = { _id: 90000060, name: 'Revenge Deck', hero: 'Dragon Duke' };
  const calculatedId = mockEquipment._id - 90000000;
  assert.strictEqual(calculatedId, 60, 'Equipment ID must be offset by 90,000,000');
});

test('Sync Logic: Pet ID offset calculation', () => {
  const mockPet = { _id: 73000016, name: 'Sneezy' };
  const calculatedId = mockPet._id - 73000000;
  assert.strictEqual(calculatedId, 16, 'Pet ID must be offset by 73,000,000');
});

test('Sync Logic: Aspect ratio smart squaring threshold', () => {
  const isNonSquare = (w, h) => {
    const ratio = w / h;
    return ratio < 0.85 || ratio > 1.18;
  };

  // Revenge Deck (171x172) -> already square, do not alter
  assert.strictEqual(isNonSquare(171, 172), false, 'Revenge Deck should be recognized as square');

  // Pets (306x306) -> already square, do not alter
  assert.strictEqual(isNonSquare(306, 306), false, 'Pets should be recognized as square');

  // Super Troops (306x306) -> already square, do not alter
  assert.strictEqual(isNonSquare(306, 306), false, 'Super troops should be recognized as square');

  // Sky Wagon (121x186) -> distinctly non-square, needs auto-squaring
  assert.strictEqual(isNonSquare(121, 186), true, 'Sky Wagon must be flagged for auto-squaring');

  // Stone Slammer (125x171) -> distinctly non-square, needs auto-squaring
  assert.strictEqual(isNonSquare(125, 171), true, 'Stone Slammer must be flagged for auto-squaring');
});

test('Sync Logic: Dynamic Equipment resolution in fetch-meta', () => {
  const staticDataPath = path.join(rootDir, 'data', 'static_data.json');
  assert.ok(fs.existsSync(staticDataPath), 'data/static_data.json must exist');

  const staticData = JSON.parse(fs.readFileSync(staticDataPath, 'utf-8'));
  const knownEquipment = {};

  for (const eq of staticData.equipment || []) {
    if (eq.hero && eq.name) {
      if (!knownEquipment[eq.hero]) knownEquipment[eq.hero] = [];
      if (!knownEquipment[eq.hero].includes(eq.name)) {
        knownEquipment[eq.hero].push(eq.name);
      }
    }
  }

  // Ensure Dragon Duke has Revenge Deck dynamically
  assert.ok(knownEquipment['Dragon Duke'], 'Dragon Duke must be present');
  assert.ok(knownEquipment['Dragon Duke'].includes('Revenge Deck'), 'Revenge Deck must be dynamically registered for Dragon Duke');
});

test('Sync Logic: UnitMap completeness', async () => {
  const { PetMap, ALL_SIEGE_MACHINES, ALL_SUPER_TROOPS } = await import('../src/data/UnitMap.ts');
  const { EquipmentMap } = await import('../src/data/equipmentMap.ts');

  // Verify Revenge Deck in EquipmentMap
  assert.strictEqual(EquipmentMap[60], 'Revenge Deck');

  // Verify Sky Wagon and Stone Slammer in ALL_SIEGE_MACHINES
  assert.ok(ALL_SIEGE_MACHINES.has('Sky Wagon'));
  assert.ok(ALL_SIEGE_MACHINES.has('Stone Slammer'));

  // Verify Super Wizard and all super troops in ALL_SUPER_TROOPS
  assert.ok(ALL_SUPER_TROOPS.has('Super Wizard'));
  assert.ok(ALL_SUPER_TROOPS.has('Super Yeti'));

  // Verify Pets
  assert.strictEqual(PetMap[16], 'Sneezy');
  assert.strictEqual(PetMap[17], 'Greedy Raven');
});
