import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    let fileName = name;
    if (name === "Icon_HV_Hero_Pets_LASSI") fileName = "Icon_HV_Hero_Pets_L.A.S.S.I";
    
    const filePath = path.join(targetDir, `${fileName}.png`);
    const res = await fetch(url);
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filePath, buffer);
    console.log(`Downloaded ${fileName}.png`);
  }
}

downloadAll().then(() => console.log('Done'));
