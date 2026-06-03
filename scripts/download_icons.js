import fs from 'fs';
import path from 'path';

const target_dir = "C:\\Users\\Jack\\Documents\\antigravity\\calm-curie\\public\\icons";
if (!fs.existsSync(target_dir)) fs.mkdirSync(target_dir, { recursive: true });

const pets = ["Minion Prince", "Dragon Duke"];
const equipment = [
    "Earthquake Boots", "Spiky Ball", "Giant Gauntlet", "Stick Horse", 
    "Snake Bracelet", "Rage Vial", "Action Figure", "Giant Arrow", 
    "Magic Mirror", "Healer Puppet", "Eternal Tome", "Healing Tome", 
    "Heroic Torch", "Rage Gem", "Life Gem", "Fireball", "Lavaloon Puppet", 
    "Rocket Spear", "Seeking Shield", "Electro Boots", "Haste Vial", 
    "Frost Flake", "Hog Rider Puppet", "Dark Orb", "Meteor Staff", 
    "Dark Crown", "Metal Pants", "Henchmen Puppet", "Noble Iron", 
    "Flame Blower", "Rocket Backpack", "Electro Fangs", "Fire Heart", 
    "Stun Blaster"
];

async function fetchWikiImage(itemName) {
    const fileName = `File:${itemName.replace(/ /g, '_')}.png`;
    const apiUrl = `https://clashofclans.fandom.com/api.php?action=query&titles=${encodeURIComponent(fileName)}&prop=imageinfo&iiprop=url&format=json`;
    try {
        const res = await fetch(apiUrl);
        const data = await res.json();
        const pages = data.query.pages;
        const pageId = Object.keys(pages)[0];
        if (pageId === "-1" || !pages[pageId].imageinfo) {
            console.error(`Missing on wiki: ${itemName}`);
            return null;
        }
        // Wikia URLs might need splitting off revision params for raw PNG, but modern browsers/fetch handle it fine
        return pages[pageId].imageinfo[0].url.split('/revision')[0];
    } catch (e) {
        console.error(`Error fetching wiki API for ${itemName}:`, e);
        return null;
    }
}

async function run() {
    let downloaded = 0;
    
    for (const p of pets) {
        const name_no_spaces = p.replace(/ /g, "");
        const targetFilename = `Icon_HV_Hero_${name_no_spaces}.png`;
        const filePath = path.join(target_dir, targetFilename);
        
        if (!fs.existsSync(filePath)) {
            const url = await fetchWikiImage(p);
            if (url) {
                console.log(`Downloading ${p} -> ${targetFilename}`);
                const buf = await (await fetch(url)).arrayBuffer();
                fs.writeFileSync(filePath, Buffer.from(buf));
                downloaded++;
            }
        }
    }

    for (const e of equipment) {
        const name_no_spaces = e.replace(/ /g, "");
        const targetFilename = `Icon_HV_Equipment_${name_no_spaces}.png`;
        const filePath = path.join(target_dir, targetFilename);
        
        if (!fs.existsSync(filePath)) {
            const url = await fetchWikiImage(e);
            if (url) {
                console.log(`Downloading ${e} -> ${targetFilename}`);
                const buf = await (await fetch(url)).arrayBuffer();
                fs.writeFileSync(filePath, Buffer.from(buf));
                downloaded++;
            }
        }
    }
    console.log(`Successfully downloaded ${downloaded} items.`);
}

run();
