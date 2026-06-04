const fs = require('fs');
const https = require('https');
const path = require('path');

const petUrls = {
  "Icon_HV_Hero_Pets_Electro_Owl": "https://media.ffycdn.net/eu/supercell/YFoCjMhe21yyvScFQUw3.png",
  "Icon_HV_Hero_Pets_Frosty": "https://media.ffycdn.net/eu/supercell/cJRVqD7dUHVVWpdauDMm.png",
  "Icon_HV_Hero_Pets_LASSI": "https://media.ffycdn.net/eu/supercell/Bzwc56omFSPiKxHarbqK.png",
  "Icon_HV_Hero_Pets_Mighty_Yak": "https://media.ffycdn.net/eu/supercell/wuWZJEjbSWJawgodp9or.png",
  "Icon_HV_Hero_Pets_Phoenix": "https://media.ffycdn.net/eu/supercell/FwmAsp7yVFvw8GJVpVEa.png",
  "Icon_HV_Hero_Pets_Poison_Lizard": "https://media.ffycdn.net/eu/supercell/iBuYtUPpccbvGhL668ws.png",
  "Icon_HV_Hero_Pets_Unicorn": "https://media.ffycdn.net/eu/supercell/582CZW2g8LsKdbgNXgNa.png",
  "Icon_HV_Hero_Pets_Diggy": "https://media.ffycdn.net/eu/supercell/LZN43Y6ZV7uavkLL2cQ2.png",
  "Icon_HV_Hero_Pets_Sneezy_1": "https://media.ffycdn.net/eu/supercell/heSRvJXy1LXsJjX7dbxX.png",
  "Icon_HV_Hero_Pets_Sneezy": "https://media.ffycdn.net/eu/supercell/ZHgNNcVFTVPVNeatfk2B.png",
  "Icon_HV_Hero_Pets_Spirit_Fox": "https://media.ffycdn.net/eu/supercell/bwKgWuqbhJENQga4Puij.png",
  "Icon_HV_Hero_Pets_Angry_Jelly": "https://media.ffycdn.net/eu/supercell/CSXSh8ir7zwjB1LMzxKa.png"
};

const targetDir = path.join(__dirname, '..', 'public', 'icons');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

async function downloadAll() {
  for (const [name, url] of Object.entries(petUrls)) {
    // In UnitMap.ts, L.A.S.S.I will have periods. But in ArmyTypesCard it replaces spaces with underscores.
    // Let's normalize it to exactly what the frontend uses!
    // The subagent named it 'Icon_HV_Hero_Pets_LASSI'. 
    // Wait, getPetIcon uses: `Icon_HV_Hero_Pets_${name.replace(/\s+/g, '_')}.png`
    // So L.A.S.S.I will become `Icon_HV_Hero_Pets_L.A.S.S.I.png`
    let fileName = name;
    if (name === "Icon_HV_Hero_Pets_LASSI") fileName = "Icon_HV_Hero_Pets_L.A.S.S.I";
    
    const filePath = path.join(targetDir, `${fileName}.png`);
    await new Promise((resolve, reject) => {
      https.get(url, (res) => {
        const fileStream = fs.createWriteStream(filePath);
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          console.log(`Downloaded ${fileName}.png`);
          resolve();
        });
      }).on('error', (err) => {
        console.error(`Error downloading ${fileName}:`, err);
        reject(err);
      });
    });
  }
}

downloadAll().then(() => console.log('Done'));
