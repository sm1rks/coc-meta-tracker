import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// Disable sharp cache to prevent file locking on Windows
sharp.cache(false);

const sourcePng = path.join(process.cwd(), 'public', 'icons', 'Icon_HV_Equipment_DarkCrown.png');
const tempPng = path.join(process.cwd(), '.agents', 'explorer_m1_1', 'temp_test.png');
const tempWebp = path.join(process.cwd(), '.agents', 'explorer_m1_1', 'temp_test.webp');

async function verify() {
  console.log('Starting verification of sharp image conversion...');
  
  if (!fs.existsSync(sourcePng)) {
    throw new Error(`Source test image not found at ${sourcePng}`);
  }

  // Copy the test PNG
  fs.copyFileSync(sourcePng, tempPng);
  console.log(`Copied test image to: ${tempPng}`);

  // Run sharp conversion
  await sharp(tempPng)
    .webp({ quality: 80 })
    .toFile(tempWebp);
  console.log(`Converted test image to WebP: ${tempWebp}`);

  // Verify WebP exists and is non-empty
  if (!fs.existsSync(tempWebp)) {
    throw new Error('Converted WebP file does not exist!');
  }

  const webpStats = fs.statSync(tempWebp);
  const pngStats = fs.statSync(tempPng);

  console.log(`Original PNG Size: ${(pngStats.size / 1024).toFixed(2)} KB`);
  console.log(`Converted WebP Size: ${(webpStats.size / 1024).toFixed(2)} KB`);
  console.log(`Savings: ${((1 - webpStats.size / pngStats.size) * 100).toFixed(1)}%`);

  // Clean up
  fs.unlinkSync(tempPng);
  fs.unlinkSync(tempWebp);
  console.log('Cleaned up temporary test files. Verification successful!');
}

verify().catch(err => {
  console.error('Verification failed:', err);
  // Clean up if files were left behind
  if (fs.existsSync(tempPng)) {
    try { fs.unlinkSync(tempPng); } catch (e) {}
  }
  if (fs.existsSync(tempWebp)) {
    try { fs.unlinkSync(tempWebp); } catch (e) {}
  }
  process.exit(1);
});
