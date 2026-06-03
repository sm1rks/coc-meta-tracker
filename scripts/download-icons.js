import fs from 'fs';
import path from 'path';

const urls = {
  "barbarian-king.png": "https://media.ffycdn.net/eu/supercell/WyTCEBPaT8UBkuMDrhc9.png",
  "archer-queen.png": "https://media.ffycdn.net/eu/supercell/gbNgArDD27HqhShCgvoC.png",
  "grand-warden.png": "https://media.ffycdn.net/eu/supercell/JAhvhDizB7sKBvMbARZv.png",
  "royal-champion.png": "https://media.ffycdn.net/eu/supercell/UkwPSLhp7wkAbrVQapjH.png",
  "giant-gauntlet.png": "https://media.ffycdn.net/eu/supercell/XUTVeaSWY49A8r8vTgJh.png",
  "rage-vial.png": "https://media.ffycdn.net/eu/supercell/CRW4X3FoaTpMgMG8z4gY.png",
  "frozen-arrow.png": "https://media.ffycdn.net/eu/supercell/E8QoiZv7ASaLb52honXn.png",
  "invisibility-vial.png": "https://media.ffycdn.net/eu/supercell/DoPzDEH88euWA7uBbAN2.png",
  "eternal-tome.png": "https://media.ffycdn.net/eu/supercell/H1qq9yXGfbz6ZwTGuxQs.png",
  "healing-tome.png": "https://media.ffycdn.net/eu/supercell/W6icw7aWyG2ZKcYH4Wzj.png",
  "haste-vial.png": "https://media.ffycdn.net/eu/supercell/r1J581K5JfUPGVpWDN45.png",
  "royal-gem.png": "https://media.ffycdn.net/eu/supercell/F8KLJGvNMY82qcKvjuox.png"
};

const dir = path.join(process.cwd(), 'public', 'icons');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

async function download() {
  for (const [name, url] of Object.entries(urls)) {
    try {
      const res = await fetch(url);
      const buffer = await res.arrayBuffer();
      fs.writeFileSync(path.join(dir, name), Buffer.from(buffer));
      console.log(`Downloaded ${name}`);
    } catch (e) {
      console.error(`Failed to download ${name}:`, e);
    }
  }
}

download();
