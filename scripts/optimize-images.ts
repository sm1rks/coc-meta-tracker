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
