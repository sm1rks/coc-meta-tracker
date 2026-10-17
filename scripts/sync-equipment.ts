import fs from 'fs';
import path from 'path';

let sharp: any = null;
try {
  const sharpModule = await import('sharp');
  sharp = sharpModule.default || sharpModule;
  if (sharp?.cache) sharp.cache(false);
} catch {
  // sharp optional fallback
}

const STATIC_DATA_URL = 'https://assets.clashk.ing/static_data.json';
const MANIFEST_URL = 'https://assets.clashk.ing/manifest.json';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const dataDir = path.join(process.cwd(), 'data');
const staticDataPath = path.join(dataDir, 'static_data.json');
const equipmentMapPath = path.join(process.cwd(), 'src', 'data', 'equipmentMap.ts');
const unitMapPath = path.join(process.cwd(), 'src', 'data', 'UnitMap.ts');
const iconsDir = path.join(process.cwd(), 'public', 'icons');

interface StaticUnit {
  _id: number;
  name: string;
  hero?: string;
  village?: string;
  production_building?: string;
  super_troop?: any;
  housing_space?: number;
  [key: string]: any;
}

interface ManifestEntry {
  path: string;
  display_name: string;
  sha?: string;
  animated?: boolean;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT }
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT }
  });
  if (!res.ok) {
    throw new Error(`Failed to download ${url}: HTTP ${res.status} ${res.statusText}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Smart icon save:
 * If the image is already square-like (0.85 <= ratio <= 1.18, e.g. Revenge Deck, Pets, Super Troops),
 * we save the raw buffer as-is without any modification.
 * If distinctly non-square (ratio < 0.85 or > 1.18, e.g. Sky Wagon 0.65, Stone Slammer 0.73),
 * we pad it onto a transparent 128x128 square canvas so it won't be zoomed/clipped by object-cover.
 */
async function saveSmartIcon(buffer: Buffer, destPath: string): Promise<void> {
  if (!sharp) {
    fs.writeFileSync(destPath, buffer);
    return;
  }

  try {
    const meta = await sharp(buffer).metadata();
    const width = meta.width || 128;
    const height = meta.height || 128;
    const ratio = width / height;

    if (ratio >= 0.85 && ratio <= 1.18) {
      // Square-like icon: standardize to 128x128 WebP with high quality
      await sharp(buffer)
        .resize(128, 128, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toFile(destPath);
    } else {
      // Distinctly non-square (e.g. Sky Wagon, Stone Slammer) - pad onto a square canvas
      console.log(`📐 Auto-squaring non-square icon (${width}x${height}, ratio=${ratio.toFixed(2)}) for ${path.basename(destPath)}`);
      await sharp(buffer)
        .resize(128, 128, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .webp({ quality: 90 })
        .toFile(destPath);
    }
  } catch (err) {
    console.warn(`Could not process with sharp, saving raw icon:`, err);
    fs.writeFileSync(destPath, buffer);
  }
}

function normalizeName(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const placeholderPath = path.join(iconsDir, 'placeholder.webp');

async function ensurePlaceholderExists(): Promise<void> {
  if (fs.existsSync(placeholderPath)) return;
  const svg = `<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#3d2c1e"/>
      <stop offset="100%" stop-color="#1f1610"/>
    </radialGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffe28a"/>
      <stop offset="50%" stop-color="#d4af37"/>
      <stop offset="100%" stop-color="#997316"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.6"/>
    </filter>
  </defs>
  <rect x="6" y="6" width="116" height="116" rx="26" fill="url(#bg)" stroke="url(#gold)" stroke-width="6" filter="url(#shadow)"/>
  <rect x="12" y="12" width="104" height="104" rx="20" fill="none" stroke="#5a422d" stroke-width="2" stroke-dasharray="4 4"/>
  <text x="64" y="85" font-family="sans-serif" font-size="64" font-weight="900" fill="url(#gold)" text-anchor="middle" filter="url(#shadow)">?</text>
</svg>`;

  if (sharp) {
    await sharp(Buffer.from(svg))
      .webp({ quality: 90 })
      .toFile(placeholderPath);
  } else {
    fs.writeFileSync(placeholderPath, Buffer.from(svg));
  }
}

function isPlaceholder(filePath: string): boolean {
  if (!fs.existsSync(filePath) || !fs.existsSync(placeholderPath)) return false;
  try {
    return fs.statSync(filePath).size === fs.statSync(placeholderPath).size;
  } catch {
    return false;
  }
}

function applyPlaceholder(destPath: string): void {
  if (fs.existsSync(placeholderPath)) {
    fs.copyFileSync(placeholderPath, destPath);
  }
}

export async function syncAll(): Promise<void> {
  console.log('🔄 Checking for new equipment, heroes, pets, troops, spells, and siege machines...');

  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  await ensurePlaceholderExists();

  // 1. Fetch remote static_data.json
  const remoteData = await fetchJson<{
    equipment?: StaticUnit[];
    heroes?: StaticUnit[];
    pets?: StaticUnit[];
    troops?: StaticUnit[];
    spells?: StaticUnit[];
    [key: string]: any;
  }>(STATIC_DATA_URL);

  const remoteEquipments = remoteData.equipment || [];
  const remoteHeroes = remoteData.heroes || [];
  const remotePets = remoteData.pets || [];
  const remoteTroops = remoteData.troops || [];
  const remoteSpells = remoteData.spells || [];

  // 2. Fetch manifest.json to locate assets
  console.log('📦 Fetching clashk.ing asset manifest...');
  const manifest = await fetchJson<{
    assets?: {
      equipment?: ManifestEntry[];
      heroes?: ManifestEntry[];
      pets?: ManifestEntry[];
      troops?: ManifestEntry[];
      spells?: ManifestEntry[];
    };
  }>(MANIFEST_URL);

  const manifestEquipment = manifest.assets?.equipment || [];
  const manifestHeroes = manifest.assets?.heroes || [];
  const manifestPets = manifest.assets?.pets || [];
  const manifestTroops = manifest.assets?.troops || [];
  const manifestSpells = manifest.assets?.spells || [];

  const equipmentMapAsset = new Map<string, string>();
  for (const entry of manifestEquipment) {
    equipmentMapAsset.set(normalizeName(entry.display_name), entry.path);
    equipmentMapAsset.set(normalizeName(path.basename(entry.path, path.extname(entry.path))), entry.path);
  }

  const heroMapAsset = new Map<string, string>();
  for (const entry of manifestHeroes) {
    heroMapAsset.set(normalizeName(entry.display_name), entry.path);
    heroMapAsset.set(normalizeName(path.basename(path.dirname(entry.path))), entry.path);
    heroMapAsset.set(normalizeName(path.basename(entry.path, path.extname(entry.path))), entry.path);
  }

  const petMapAsset = new Map<string, string>();
  for (const entry of manifestPets) {
    petMapAsset.set(normalizeName(entry.display_name), entry.path);
    petMapAsset.set(normalizeName(path.basename(path.dirname(entry.path))), entry.path);
  }

  const troopMapAsset = new Map<string, string>();
  for (const entry of manifestTroops) {
    troopMapAsset.set(normalizeName(entry.display_name), entry.path);
    troopMapAsset.set(normalizeName(path.basename(path.dirname(entry.path))), entry.path);
    troopMapAsset.set(normalizeName(path.basename(entry.path, path.extname(entry.path))), entry.path);
  }

  const spellMapAsset = new Map<string, string>();
  for (const entry of manifestSpells) {
    spellMapAsset.set(normalizeName(entry.display_name), entry.path);
    spellMapAsset.set(normalizeName(path.basename(entry.path, path.extname(entry.path))), entry.path);
    const withoutSpellSuffix = entry.display_name.replace(/\s*spell$/i, '');
    spellMapAsset.set(normalizeName(withoutSpellSuffix), entry.path);
  }

  // 3. Sync Hero Equipment
  console.log('⚔️ Checking Hero Equipment...');
  const newEquipments: string[] = [];
  const currentEquipmentMapEntries: Record<number, string> = {};

  if (fs.existsSync(equipmentMapPath)) {
    try {
      const content = fs.readFileSync(equipmentMapPath, 'utf8');
      const eqMatch = content.match(/export const EquipmentMap: Record<number, string> = {([\s\S]*?)};/);
      if (eqMatch) {
        const lines = eqMatch[1].split('\n');
        for (const line of lines) {
          const match = line.match(/\s*(\d+):\s*"([^"]+)"/);
          if (match) {
            currentEquipmentMapEntries[parseInt(match[1])] = match[2];
          }
        }
      }
    } catch (e) {
      console.warn("Could not parse existing equipmentMap.ts:", e);
    }
  }

  for (const eq of remoteEquipments) {
    const eqId = eq._id - 90000000;
    currentEquipmentMapEntries[eqId] = eq.name;
    const cleanName = eq.name.replace(/\s+/g, '');
    const iconFilename = `Icon_HV_Equipment_${cleanName}.webp`;
    const iconPath = path.join(iconsDir, iconFilename);

    const matchPath = equipmentMapAsset.get(normalizeName(eq.name));
    if (matchPath) {
      if (!fs.existsSync(iconPath) || isPlaceholder(iconPath)) {
        console.log(`⬇️ Downloading icon for Equipment: ${eq.name}`);
        const buf = await fetchBuffer(`https://assets.clashk.ing/${matchPath}`);
        await saveSmartIcon(buf, iconPath);
        newEquipments.push(eq.name);
      }
    } else if (!fs.existsSync(iconPath)) {
      console.log(`📦 [Placeholder] Asset not yet published on clashk.ing. Used placeholder for Equipment: ${eq.name}`);
      applyPlaceholder(iconPath);
      newEquipments.push(eq.name);
    }
  }

  // Also verify icons for any preserved auto-discovered equipment
  for (const [idStr, eqName] of Object.entries(currentEquipmentMapEntries)) {
    const cleanName = eqName.replace(/\s+/g, '');
    const iconFilename = `Icon_HV_Equipment_${cleanName}.webp`;
    const iconPath = path.join(iconsDir, iconFilename);

    const matchPath = equipmentMapAsset.get(normalizeName(eqName));
    if (matchPath) {
      if (!fs.existsSync(iconPath) || isPlaceholder(iconPath)) {
        console.log(`⬇️ Downloading icon for Equipment: ${eqName}`);
        const buf = await fetchBuffer(`https://assets.clashk.ing/${matchPath}`);
        await saveSmartIcon(buf, iconPath);
        newEquipments.push(eqName);
      }
    } else if (!fs.existsSync(iconPath)) {
      console.log(`📦 [Placeholder] Asset not yet published on clashk.ing. Used placeholder for Equipment: ${eqName}`);
      applyPlaceholder(iconPath);
      newEquipments.push(eqName);
    }
  }

  // 4. Sync Heroes & generate equipmentMap.ts (with dynamic HeroMap)
  console.log('👑 Checking Heroes...');
  const currentHeroMapEntries: Record<number, string> = {};
  for (const h of remoteHeroes) {
    const heroId = h._id - 28000000;
    currentHeroMapEntries[heroId] = h.name;
    const cleanName = h.name.replace(/\s+/g, '');
    const iconFilename = `Icon_HV_Hero_${cleanName}.webp`;
    const iconPath = path.join(iconsDir, iconFilename);

    const matchPath = heroMapAsset.get(normalizeName(h.name));
    if (matchPath) {
      if (!fs.existsSync(iconPath) || isPlaceholder(iconPath)) {
        console.log(`⬇️ Downloading icon for Hero: ${h.name}`);
        const buf = await fetchBuffer(`https://assets.clashk.ing/${matchPath}`);
        await saveSmartIcon(buf, iconPath);
      }
    } else if (!fs.existsSync(iconPath)) {
      applyPlaceholder(iconPath);
    }
  }

  const sortedEqIds = Object.keys(currentEquipmentMapEntries).map(Number).sort((a, b) => a - b);
  const formattedEqEntries = sortedEqIds
    .map(id => `  ${id}: ${JSON.stringify(currentEquipmentMapEntries[id])}`)
    .join(',\n');

  const sortedHeroIds = Object.keys(currentHeroMapEntries).map(Number).sort((a, b) => a - b);
  const formattedHeroEntries = sortedHeroIds
    .map(id => `  ${id}: ${JSON.stringify(currentHeroMapEntries[id])}`)
    .join(',\n');

  const equipmentMapContent = `// Auto-generated mappings from static_data.json
export const EquipmentMap: Record<number, string> = {
${formattedEqEntries}
};

export const HeroMap: Record<number, string> = {
${formattedHeroEntries}
};
`;
  fs.writeFileSync(equipmentMapPath, equipmentMapContent, 'utf-8');

  // 5. Sync Hero Pets
  console.log('🐾 Checking Hero Pets...');
  const newPets: string[] = [];
  const currentPetMapEntries: Record<number, string> = {};

  for (const p of remotePets) {
    const petId = p._id - 73000000;
    currentPetMapEntries[petId] = p.name;
    const cleanName = p.name.replace(/\s+/g, '_');
    const iconFilename = `Icon_HV_Hero_Pets_${cleanName}.webp`;
    const iconPath = path.join(iconsDir, iconFilename);

    const matchPath = petMapAsset.get(normalizeName(p.name));
    if (matchPath) {
      if (!fs.existsSync(iconPath) || isPlaceholder(iconPath)) {
        console.log(`⬇️ Downloading icon for Pet: ${p.name}`);
        const buf = await fetchBuffer(`https://assets.clashk.ing/${matchPath}`);
        await saveSmartIcon(buf, iconPath);
        newPets.push(p.name);
      }
    } else if (!fs.existsSync(iconPath)) {
      console.log(`📦 [Placeholder] Asset not yet published on clashk.ing. Used placeholder for Pet: ${p.name}`);
      applyPlaceholder(iconPath);
      newPets.push(p.name);
    }
  }

  // 6. Sync Troops (Regular, Dark, Super Troops, and Siege Machines)
  console.log('🛡️ Checking Troops, Super Troops & Siege Machines...');
  const currentTroopMapEntries: Record<number, string> = {};
  const siegeMachinesList: string[] = [];
  const superTroopsList: string[] = [];
  const newTroops: string[] = [];
  const newSieges: string[] = [];
  const newSupers: string[] = [];

  for (const t of remoteTroops) {
    if (t.village && t.village !== 'home') continue;

    const troopId = t._id - 4000000;
    currentTroopMapEntries[troopId] = t.name;

    const isSiege = t.production_building === 'Workshop';
    const isSuper = t.super_troop != null;

    if (isSiege && !siegeMachinesList.includes(t.name)) {
      siegeMachinesList.push(t.name);
    }
    if (isSuper && !superTroopsList.includes(t.name)) {
      superTroopsList.push(t.name);
    }

    // Determine standard icon filename
    let iconFilename: string;
    if (isSiege) {
      iconFilename = `Icon_HV_Siege_Machine_${t.name.replace(/ /g, '_')}.webp`;
    } else {
      iconFilename = `Icon_HV_${t.name.replace(/\s+/g, '_')}.webp`;
    }

    const iconPath = path.join(iconsDir, iconFilename);
    const matchPath = troopMapAsset.get(normalizeName(t.name));
    if (matchPath) {
      if (!fs.existsSync(iconPath) || isPlaceholder(iconPath)) {
        console.log(`⬇️ Downloading icon for Troop (${isSiege ? 'Siege' : isSuper ? 'Super' : 'Regular'}): ${t.name}`);
        const buf = await fetchBuffer(`https://assets.clashk.ing/${matchPath}`);
        await saveSmartIcon(buf, iconPath);
        if (isSiege) newSieges.push(t.name);
        else if (isSuper) newSupers.push(t.name);
        else newTroops.push(t.name);
      }
    } else if (!fs.existsSync(iconPath)) {
      console.log(`📦 [Placeholder] Asset not yet published on clashk.ing. Used placeholder for Troop: ${t.name}`);
      applyPlaceholder(iconPath);
      if (isSiege) newSieges.push(t.name);
      else if (isSuper) newSupers.push(t.name);
      else newTroops.push(t.name);
    }
  }

  // 7. Sync Spells
  console.log('✨ Checking Spells...');
  const currentSpellMapEntries: Record<number, string> = {};
  const newSpells: string[] = [];

  for (const s of remoteSpells) {
    if (s.village && s.village !== 'home') continue;

    const spellId = s._id - 26000000;
    currentSpellMapEntries[spellId] = s.name;

    const cleanSpellName = s.name.replace(/\s*Spell$/i, '').replace(/\s+/g, '_');
    const iconFilename = `Icon_HV_Spell_${cleanSpellName}.webp`;
    const iconPath = path.join(iconsDir, iconFilename);

    const norm1 = normalizeName(s.name);
    const norm2 = normalizeName(s.name.replace(/\s*Spell$/i, ''));
    const matchPath = spellMapAsset.get(norm1) || spellMapAsset.get(norm2);

    if (matchPath) {
      if (!fs.existsSync(iconPath) || isPlaceholder(iconPath)) {
        console.log(`⬇️ Downloading icon for Spell: ${s.name}`);
        const buf = await fetchBuffer(`https://assets.clashk.ing/${matchPath}`);
        await saveSmartIcon(buf, iconPath);
        newSpells.push(s.name);
      }
    } else if (!fs.existsSync(iconPath)) {
      console.log(`📦 [Placeholder] Asset not yet published on clashk.ing. Used placeholder for Spell: ${s.name}`);
      applyPlaceholder(iconPath);
      newSpells.push(s.name);
    }
  }

  // 8. Update src/data/UnitMap.ts
  const sortedTroopIds = Object.keys(currentTroopMapEntries).map(Number).sort((a, b) => a - b);
  const formattedTroopEntries = sortedTroopIds
    .map(id => `  "${id}": ${JSON.stringify(currentTroopMapEntries[id])}`)
    .join(',\n');

  const sortedSpellIds = Object.keys(currentSpellMapEntries).map(Number).sort((a, b) => a - b);
  const formattedSpellEntries = sortedSpellIds
    .map(id => `  "${id}": ${JSON.stringify(currentSpellMapEntries[id])}`)
    .join(',\n');

  const sortedPetIds = Object.keys(currentPetMapEntries).map(Number).sort((a, b) => a - b);
  const formattedPetEntries = sortedPetIds
    .map(id => `  "${id}": ${JSON.stringify(currentPetMapEntries[id])}`)
    .join(',\n');

  const formattedSieges = siegeMachinesList
    .map(s => JSON.stringify(s))
    .join(', ');

  const formattedSupers = superTroopsList
    .map(st => JSON.stringify(st))
    .join(', ');

  const unitMapContent = `// Auto-generated mappings from static_data.json
export const TroopMap: Record<number, string> = {
${formattedTroopEntries}
};

export const SpellMap: Record<number, string> = {
${formattedSpellEntries}
};

export const PetMap: Record<number, string> = {
${formattedPetEntries}
};

export const ALL_SIEGE_MACHINES = new Set([
  ${formattedSieges}
]);

export const ALL_SUPER_TROOPS = new Set([
  ${formattedSupers}
]);
`;

  fs.writeFileSync(unitMapPath, unitMapContent, 'utf-8');
  console.log('📝 Updated src/data/UnitMap.ts (TroopMap, SpellMap, PetMap, ALL_SIEGE_MACHINES, ALL_SUPER_TROOPS)');

  // 9. Update data/static_data.json while preserving any auto-discovered equipment
  if (fs.existsSync(staticDataPath)) {
    try {
      const existingData = JSON.parse(fs.readFileSync(staticDataPath, 'utf8'));
      const remoteEqNames = new Set((remoteData.equipment || []).map((e: any) => e.name));
      for (const eq of existingData.equipment || []) {
        if (!remoteEqNames.has(eq.name)) {
          if (!remoteData.equipment) remoteData.equipment = [];
          remoteData.equipment.push(eq);
        }
      }
    } catch {}
  }
  fs.writeFileSync(staticDataPath, JSON.stringify(remoteData, null, 2), 'utf-8');
  console.log(`💾 Saved updated static_data.json`);

  console.log('\n✅ Synchronization summary:');
  console.log(`   - Equipment: ${newEquipments.length > 0 ? newEquipments.join(', ') : 'Up to date'}`);
  console.log(`   - Heroes: ${Object.keys(currentHeroMapEntries).length} mapped`);
  console.log(`   - Pets: ${newPets.length > 0 ? newPets.join(', ') : 'Up to date'}`);
  console.log(`   - Troops: ${newTroops.length > 0 ? newTroops.join(', ') : 'Up to date'}`);
  console.log(`   - Spells: ${newSpells.length > 0 ? newSpells.join(', ') : 'Up to date'}`);
  console.log(`   - Siege Machines: ${newSieges.length > 0 ? newSieges.join(', ') : 'Up to date'}`);
  console.log(`   - Super Troops: ${newSupers.length > 0 ? newSupers.join(', ') : 'Up to date'}`);
}

if (process.argv[1]?.includes('sync-equipment') || process.argv[1]?.includes('sync-units')) {
  syncAll().catch(err => {
    console.error('❌ Error during synchronization:', err);
    process.exit(1);
  });
}
