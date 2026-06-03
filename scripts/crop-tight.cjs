const { Jimp } = require('jimp');

async function main() {
    try {
        const sourcePath = 'public/icons/Hero_Minion_Prince_02_noShadow.png';
        const image = await Jimp.read(sourcePath);
        console.log(`Original: ${image.bitmap.width}x${image.bitmap.height}`);
        
        image.autocrop();
        console.log(`Autocropped: ${image.bitmap.width}x${image.bitmap.height}`);
        
        // Tighter crop for a headshot (approx 45% of width to focus on the head/face area)
        const size = Math.floor(image.bitmap.width * 0.45);
        const x = Math.floor((image.bitmap.width - size) / 2);
        const y = Math.floor(image.bitmap.height * 0.05);
        
        image.crop({ x, y, w: size, h: size });
        image.resize({ w: 256, h: 256 });
        
        const targetPath = 'public/icons/Icon_HV_Hero_MinionPrince.png';
        await image.write(targetPath);
        console.log('Saved tight headshot from user-provided file!');
    } catch (err) {
        console.error(err);
    }
}
main();
