import Jimp from 'jimp';

async function main() {
  try {
    const imgPath = 'public/icons/Icon_HV_Hero_MinionPrince.png';
    const image = await Jimp.read(imgPath);
    console.log(`Original: ${image.bitmap.width}x${image.bitmap.height}`);
    
    // Autocrop transparent borders
    image.autocrop();
    console.log(`Autocropped: ${image.bitmap.width}x${image.bitmap.height}`);
    
    // Crop a square from the top center
    const size = Math.min(image.bitmap.width, image.bitmap.height);
    const x = Math.floor((image.bitmap.width - size) / 2);
    const y = 0; // Top
    
    image.crop(x, y, size, size);
    image.resize(256, 256);
    
    // writeAsync is reliable in older jimp, write() with await in v1. 
    // We'll try writeAsync first, fallback to write
    if (typeof image.writeAsync === 'function') {
      await image.writeAsync(imgPath);
    } else {
      await image.write(imgPath);
    }
    console.log('Done!');
  } catch (err) {
    console.error(err);
  }
}
main();
