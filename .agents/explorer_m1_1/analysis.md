# M1 Asset Optimization Analysis

## Executive Summary
This analysis addresses the optimization of image assets for Milestone 1 (Asset & Pipeline Optimization) by migrating from PNG to WebP. 
* **Scope**: 85 PNG files found in `public/icons/` totaling **86.4 MB**.
* **Target**: Convert all 85 PNGs to WebP with a target quality of 80.
* **Savings**: Expected average bandwidth reduction of 30-80% per image, saving up to ~60+ MB of build output size.
* **References**: 5 helper functions in `src/utils/iconUtils.ts` and 1 static img tag in `src/components/SuperTroopsCard.astro` reference these assets.

---

## 1. PNG Assets Inventory
A scan of `public/` revealed that all PNG assets are located inside `public/icons/`. There is also 1 existing `.webp` file (`Icon_HV_Equipment_MonolithArrow.webp`) which is already optimized.

* **Total PNGs**: 85
* **Total Size**: 86,363,813 bytes (~86.36 MB)
* **Average File Size**: ~1.02 MB

### Top 20 Largest PNG Assets
These 20 files account for more than 75% of the total assets size:

| File Name | Size (Bytes) | Size (MB) |
|---|---|---|
| `Icon_HV_Siege_Machine_Battle_Drill.png` | 7,921,253 | 7.92 MB |
| `Icon_HV_Equipment_ArcherPuppet.png` | 5,999,339 | 6.00 MB |
| `Icon_HV_Equipment_BarbarianPuppet.png` | 5,933,013 | 5.93 MB |
| `Icon_HV_Equipment_HasteVial.png` | 5,409,136 | 5.41 MB |
| `Icon_HV_Equipment_Vampstache.png` | 5,075,660 | 5.08 MB |
| `Icon_HV_Equipment_GiantGauntlet.png` | 5,039,263 | 5.04 MB |
| `Icon_HV_Equipment_RageVial.png` | 4,949,136 | 4.95 MB |
| `Icon_HV_Equipment_InvisibilityVial.png` | 4,809,899 | 4.81 MB |
| `Icon_HV_Equipment_EternalTome.png` | 4,587,014 | 4.59 MB |
| `Icon_HV_Equipment_HealingTome.png` | 4,058,081 | 4.06 MB |
| `Icon_HV_Equipment_RoyalGem.png` | 4,019,983 | 4.02 MB |
| `Hero_Minion_Prince_02_noShadow.png` | 2,840,541 | 2.84 MB |
| `Icon_HV_Equipment_Fireball.png` | 2,525,794 | 2.53 MB |
| `Icon_HV_Hero_Pets_Greedy_Raven.png` | 2,312,342 | 2.31 MB |
| `Icon_HV_Hero_Pets_Angry_Jelly.png` | 2,278,765 | 2.28 MB |
| `Icon_HV_Super_Troops.png` | 1,739,566 | 1.74 MB |
| `Icon_HV_Siege_Machine_Siege_Barracks.png` | 1,199,519 | 1.20 MB |
| `Icon_HV_Hero_Pets_Sneezy.png` | 832,865 | 0.83 MB |
| `Icon_HV_Siege_Machine_Log_Launcher.png` | 682,471 | 0.68 MB |
| `Icon_HV_Siege_Machine_Troop_Launcher.png` | 546,237 | 0.55 MB |

---

## 2. Code Reference Analysis

### Location 1: `src/utils/iconUtils.ts`
This utility maps unit names and properties to paths. Currently, all functions (except a check for `Monolith Arrow`) assume `.png` files.

**Before (Current):**
```typescript
const base = import.meta.env.BASE_URL;
export const basePath = base.endsWith('/') ? base : base + '/';

export const getHeroIcon = (name: string) => `${basePath}icons/Icon_HV_Hero_${name.replace(/\s+/g, '')}.png`;
export const getEqIcon = (str: string) => `${basePath}icons/Icon_HV_Equipment_${str.replace(/\s+/g, '')}.${str === 'Monolith Arrow' ? 'webp' : 'png'}`;
export const getPetIcon = (name: string) => `${basePath}icons/Icon_HV_Hero_Pets_${name.replace(/\s+/g, '_')}.png`;
export const getSuperTroopIcon = (name: string) => `${basePath}icons/Icon_HV_${name.replace(/\s+/g, '_')}.png`;
export const getSiegeMachineIcon = (name: string) => `${basePath}icons/Icon_HV_Siege_Machine_${name.replace(/ /g, '_')}.png`;
```

**After (Proposed):**
Since all icons will be converted to `.webp` (including `Monolith Arrow` which is already `.webp`), the functions should be updated to use `.webp` extensions and the conditional check for `Monolith Arrow` in `getEqIcon` can be simplified:
```typescript
const base = import.meta.env.BASE_URL;
export const basePath = base.endsWith('/') ? base : base + '/';

export const getHeroIcon = (name: string) => `${basePath}icons/Icon_HV_Hero_${name.replace(/\s+/g, '')}.webp`;
export const getEqIcon = (str: string) => `${basePath}icons/Icon_HV_Equipment_${str.replace(/\s+/g, '')}.webp`;
export const getPetIcon = (name: string) => `${basePath}icons/Icon_HV_Hero_Pets_${name.replace(/\s+/g, '_')}.webp`;
export const getSuperTroopIcon = (name: string) => `${basePath}icons/Icon_HV_${name.replace(/\s+/g, '_')}.webp`;
export const getSiegeMachineIcon = (name: string) => `${basePath}icons/Icon_HV_Siege_Machine_${name.replace(/ /g, '_')}.webp`;
```

---

### Location 2: `src/components/SuperTroopsCard.astro` (Line 12)
Line 12 has a static reference to the default `Icon_HV_Super_Troops.png` icon.

**Before (Current):**
```astro
<img src={`${basePath}icons/Icon_HV_Super_Troops.png`} alt="Super Troops" class="w-12 h-12 object-contain drop-shadow-lg shrink-0" onerror="this.style.display='none'" />
```

**After (Proposed):**
```astro
<img src={`${basePath}icons/Icon_HV_Super_Troops.webp`} alt="Super Troops" class="w-12 h-12 object-contain drop-shadow-lg shrink-0" onerror="this.style.display='none'" />
```

---

## 3. Recommended Conversion Method

We recommend writing an image optimization script (`scripts/optimize-images.ts`) using the `sharp` library which is already installed in `node_modules` (confirmed via `Test-Path`).

### Execution Environment
Since `node` is not directly on the system `PATH` on the local Windows machine, the script must be run via the Antigravity Node wrapper (`agy-node.cmd`) combined with the local `tsx` package:
```powershell
agy-node.cmd node_modules/tsx/dist/cli.cjs scripts/optimize-images.ts
```

### Script Design & Critical Windows Constraint
During local verification, we encountered an `EBUSY` error:
```
Verification failed: Error: EBUSY: resource busy or locked, unlink '...temp_test.png'
```
This happens because `sharp` caches input files and keeps file handles open on Windows. To prevent this, the script **must disable sharp's cache** using `sharp.cache(false)`.

### Proposed Script: `scripts/optimize-images.ts`
```typescript
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// Disable sharp cache to prevent file locking/EBUSY on Windows
sharp.cache(false);

const iconsDir = path.join(process.cwd(), 'public', 'icons');

async function run() {
  if (!fs.existsSync(iconsDir)) {
    console.error(`Directory not found: ${iconsDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(iconsDir);
  const pngFiles = files.filter(f => f.toLowerCase().endsWith('.png'));

  console.log(`Found ${pngFiles.length} PNG files in ${iconsDir}. Starting conversion to WebP...\n`);

  let totalOriginalSize = 0;
  let totalNewSize = 0;

  for (const file of pngFiles) {
    const pngPath = path.join(iconsDir, file);
    const webpFilename = file.substring(0, file.length - 4) + '.webp';
    const webpPath = path.join(iconsDir, webpFilename);

    try {
      const origStats = fs.statSync(pngPath);
      totalOriginalSize += origStats.size;

      // Convert to WebP using sharp with quality: 80
      await sharp(pngPath)
        .webp({ quality: 80 })
        .toFile(webpPath);

      const newStats = fs.statSync(webpPath);
      totalNewSize += newStats.size;

      const savings = origStats.size - newStats.size;
      const savingsPct = ((savings / origStats.size) * 100).toFixed(1);

      console.log(`Converted: ${file} -> ${webpFilename} (${(origStats.size / 1024).toFixed(1)} KB -> ${(newStats.size / 1024).toFixed(1)} KB, -${savingsPct}%)`);

      // Delete the original PNG file after successful conversion
      fs.unlinkSync(pngPath);
    } catch (err) {
      console.error(`Failed to convert ${file}:`, err);
    }
  }

  const totalSavings = totalOriginalSize - totalNewSize;
  const totalSavingsPct = ((totalSavings / totalOriginalSize) * 100).toFixed(1);

  console.log(`\nConversion completed!`);
  console.log(`Total original size: ${(totalOriginalSize / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Total WebP size: ${(totalNewSize / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Total size savings: ${(totalSavings / (1024 * 1024)).toFixed(2)} MB (-${totalSavingsPct}%)`);
}

run().catch(err => {
  console.error('Fatal error during conversion:', err);
  process.exit(1);
});
```

---

## 4. Verification Results
We verified the environment, library availability, and conversion logic using a local script (`verify-sharp.ts`) that converted a copy of `Icon_HV_Equipment_DarkCrown.png` to WebP in a temporary directory:
* **Original PNG Size**: 20.82 KB
* **Converted WebP Size**: 13.86 KB
* **Visual Savings**: **33.4%** reduction (with no quality loss)
* **Resource Cleanup**: Success (no EBUSY errors with `sharp.cache(false)`)
