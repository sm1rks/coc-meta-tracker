const { Jimp } = require('jimp');

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
    
    image.crop({ x, y, w: size, h: size });
    image.resize({ w: 256, h: 256 });
    
    await image.write(imgPath);
    console.log('Done!');
  } catch (err) {
    console.error(err);
  }
}
main();
