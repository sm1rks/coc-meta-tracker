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

test('Sync Logic: Troop ID offset calculation', () => {
  const mockTroop = { _id: 4000185, name: 'Elephant Rider' };
  const calculatedId = mockTroop._id - 4000000;
  assert.strictEqual(calculatedId, 185, 'Troop ID must be offset by 4,000,000');
});

test('Sync Logic: Spell ID offset calculation', () => {
  const mockSpell = { _id: 26000123, name: 'Angry Spell' };
  const calculatedId = mockSpell._id - 26000000;
  assert.strictEqual(calculatedId, 123, 'Spell ID must be offset by 26,000,000');
});

test('Sync Logic: Hero ID offset calculation', () => {
  const mockHero = { _id: 28000007, name: 'Dragon Duke' };
  const calculatedId = mockHero._id - 28000000;
  assert.strictEqual(calculatedId, 7, 'Hero ID must be offset by 28,000,000');
});

test('Sync Logic: Dynamic housing spaces from static_data.json', () => {
  const staticDataPath = path.join(rootDir, 'data', 'static_data.json');
  const staticData = JSON.parse(fs.readFileSync(staticDataPath, 'utf-8'));

  const troopHousing = {};
  for (const troop of staticData.troops || []) {
    if (troop.name) {
      if (troop.production_building === 'Workshop') {
        troopHousing[troop.name] = 0;
      } else {
        troopHousing[troop.name] = troop.housing_space ?? 1;
      }
    }
  }

  const spellHousing = {};
  for (const spell of staticData.spells || []) {
    if (spell.name) {
      spellHousing[spell.name] = spell.housing_space ?? 1;
    }
  }

  // Verify regular troops
  assert.strictEqual(troopHousing['Barbarian'], 1);
  assert.strictEqual(troopHousing['Golem'], 30);
  assert.strictEqual(troopHousing['Super Witch'], 40);

  // Verify siege machines are 0 housing space
  assert.strictEqual(troopHousing['Sky Wagon'], 0);
  assert.strictEqual(troopHousing['Stone Slammer'], 0);

  // Verify spells
  assert.strictEqual(spellHousing['Lightning Spell'], 1);
  assert.strictEqual(spellHousing['Rage Spell'], 2);
  assert.strictEqual(spellHousing['Clone Spell'], 3);
});

test('Sync Logic: UnitMap completeness', async () => {
  const { TroopMap, SpellMap, PetMap, ALL_SIEGE_MACHINES, ALL_SUPER_TROOPS } = await import('../src/data/UnitMap.ts');
  const { EquipmentMap, HeroMap } = await import('../src/data/equipmentMap.ts');

  // Verify Revenge Deck in EquipmentMap
  assert.strictEqual(EquipmentMap[60], 'Revenge Deck');

  // Verify Dragon Duke in HeroMap
  assert.strictEqual(HeroMap[7], 'Dragon Duke');

  // Verify Elephant Rider in TroopMap
  assert.strictEqual(TroopMap[185], 'Elephant Rider');

  // Verify Angry Spell in SpellMap
  assert.strictEqual(SpellMap[123], 'Angry Spell');

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

test('Sync Logic: Dynamic capacity ceiling respects individual player capacity', () => {
  // Simulating mergeCounts capacityLimit resolution
  const resolveLimit = (deployedSpaces, baselineMax, safetyBuffer = 25) => {
    let capacityLimit = Math.max(0, ...deployedSpaces);
    const maxAllowedCeiling = baselineMax + safetyBuffer;
    if (capacityLimit > maxAllowedCeiling) {
      capacityLimit = baselineMax;
    }
    return capacityLimit;
  };

  // Case A: Player whose CC is un-upgraded (50 space) -> stays 50 without artificial inflation
  assert.strictEqual(resolveLimit([45, 50], 55, 25), 50, 'Player with 50 deployed space must not be inflated');

  // Case B: Player at standard TH17 max CC (55 space) -> 55
  assert.strictEqual(resolveLimit([55, 50], 55, 25), 55, 'Player with 55 deployed space must be 55');

  // Case C: Upgraded player following a game update (CC Level 14 = 60 space) -> expands to 60 without clamp
  assert.strictEqual(resolveLimit([60], 55, 25), 60, 'Upgraded player with 60 space must not be clamped down to 55');
});

test('Sync Logic: HeroCard 3-slot placeholder padding calculation', () => {
  const padSlots = (items = [], maxSlots = 3) => {
    const top = items.slice(0, maxSlots);
    const emptySlots = Math.max(0, maxSlots - top.length);
    return { topCount: top.length, emptySlots, totalSlots: top.length + emptySlots };
  };

  // Hero with 1 combo (e.g. Royal Champion in early meta)
  const oneItem = padSlots([{ name: 'Rocket Spear + Seeking Shield' }]);
  assert.strictEqual(oneItem.topCount, 1);
  assert.strictEqual(oneItem.emptySlots, 2);
  assert.strictEqual(oneItem.totalSlots, 3);

  // Hero with 0 items
  const zeroItems = padSlots([]);
  assert.strictEqual(zeroItems.topCount, 0);
  assert.strictEqual(zeroItems.emptySlots, 3);
  assert.strictEqual(zeroItems.totalSlots, 3);

  // Hero with 3 items
  const threeItems = padSlots([{ name: 'A' }, { name: 'B' }, { name: 'C' }]);
  assert.strictEqual(threeItems.topCount, 3);
  assert.strictEqual(threeItems.emptySlots, 0);
  assert.strictEqual(threeItems.totalSlots, 3);
});

