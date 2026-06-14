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
  console.log(`Scanning ${files.length} files in ${iconsDir}...`);

  let totalOriginalSize = 0;
  let totalNewSize = 0;
  let processedCount = 0;

  for (const file of files) {
    const filePath = path.join(iconsDir, file);
    const ext = file.toLowerCase();

    if (ext.endsWith('.png')) {
      const webpFilename = file.substring(0, file.length - 4) + '.webp';
      const webpPath = path.join(iconsDir, webpFilename);

      try {
        const origStats = fs.statSync(filePath);
        totalOriginalSize += origStats.size;

        // Convert PNG to WebP with resize and quality 80
        await sharp(filePath)
          .resize(128, 128, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 80 })
          .toFile(webpPath);

        const newStats = fs.statSync(webpPath);
        totalNewSize += newStats.size;
        processedCount++;

        console.log(`Converted & Resized: ${file} -> ${webpFilename} (${(origStats.size / 1024).toFixed(1)} KB -> ${(newStats.size / 1024).toFixed(1)} KB, -${(((origStats.size - newStats.size) / origStats.size) * 100).toFixed(1)}%)`);

        // Delete the original PNG file
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error(`Failed to convert ${file}:`, err);
      }
    } else if (ext.endsWith('.webp')) {
      try {
        const origStats = fs.statSync(filePath);
        const metadata = await sharp(filePath).metadata();

        // Only resize if dimensions are larger than 128px
        if ((metadata.width && metadata.width > 128) || (metadata.height && metadata.height > 128)) {
          totalOriginalSize += origStats.size;
          const tempPath = filePath + '.tmp';

          await sharp(filePath)
            .resize(128, 128, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80 })
            .toFile(tempPath);

          // Swap file
          fs.unlinkSync(filePath);
          fs.renameSync(tempPath, filePath);

          const newStats = fs.statSync(filePath);
          totalNewSize += newStats.size;
          processedCount++;

          console.log(`Resized: ${file} (${metadata.width}x${metadata.height}) (${(origStats.size / 1024).toFixed(1)} KB -> ${(newStats.size / 1024).toFixed(1)} KB, -${(((origStats.size - newStats.size) / origStats.size) * 100).toFixed(1)}%)`);
        }
      } catch (err) {
        console.error(`Failed to resize ${file}:`, err);
      }
    }
  }

  if (processedCount > 0) {
    const totalSavings = totalOriginalSize - totalNewSize;
    const totalSavingsPct = ((totalSavings / totalOriginalSize) * 100).toFixed(1);
    console.log(`\nImage optimization completed!`);
    console.log(`Optimized ${processedCount} images.`);
    console.log(`Total original size of optimized files: ${(totalOriginalSize / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`Total optimized size: ${(totalNewSize / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`Total size savings: ${(totalSavings / (1024 * 1024)).toFixed(2)} MB (-${totalSavingsPct}%)`);
  } else {
    console.log('\nNo images needed optimization.');
  }
}

run().catch(err => {
  console.error('Fatal error during optimization:', err);
  process.exit(1);
});
