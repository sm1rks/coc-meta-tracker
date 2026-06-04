import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const key = process.env.COC_API_KEY;

async function run() {
  console.log("Fetching random clans to find low level players...");
  const clanRes = await fetch('https://cocproxy.royaleapi.dev/v1/clans?name=level%201&limit=50', {
    headers: { Authorization: `Bearer ${key}` }
  });
  const clanData = await clanRes.json();
  const playerTags: string[] = [];
  
  if (clanData.items) {
    for (const clan of clanData.items) {
      const membersRes = await fetch(`https://cocproxy.royaleapi.dev/v1/clans/${clan.tag.replace('#', '%23')}/members`, {
        headers: { Authorization: `Bearer ${key}` }
      });
      const membersData = await membersRes.json();
      if (membersData.items) {
        playerTags.push(...membersData.items.map((m: any) => m.tag));
      }
    }
  }

  // Shuffle to get a mix and pick 300
  playerTags.sort(() => Math.random() - 0.5);
  const selectedTags = playerTags.slice(0, 300);

  // Mapping of equipment ID to a Set of possible names
  const possibleNames: Record<number, Set<string>> = {};

  console.log(`Processing ${selectedTags.length} low-level players...`);
  
  for (let i = 0; i < selectedTags.length; i++) {
    const tag = selectedTags[i].replace('#', '%23');
    
    // Fetch profile
    const pRes = await fetch(`https://cocproxy.royaleapi.dev/v1/players/${tag}`, {
      headers: { Authorization: `Bearer ${key}` }
    });
    const player = await pRes.json();
    if (!player.heroEquipment) continue;

    // Fetch battlelog
    const bRes = await fetch(`https://cocproxy.royaleapi.dev/v1/players/${tag}/battlelog`, {
      headers: { Authorization: `Bearer ${key}` }
    });
    const battlelog = await bRes.json();
    if (!battlelog.items) continue;

    const myEquipmentNames = new Set<string>(player.heroEquipment.map(e => e.name));

    // Find all equipment IDs used in their battle log
    const idsUsed = new Set<number>();
    battlelog.items.forEach(b => {
      if (b.armyShareCode) {
        // armyShareCode format: ...e32_14...
        // let's extract everything after 'e' and before the next letter
        // e.g. e32_14 -> 32, 14
        const matches = b.armyShareCode.matchAll(/e(\d+)_(\d+)/g);
        for (const match of matches) {
          idsUsed.add(parseInt(match[1]));
          idsUsed.add(parseInt(match[2]));
        }
      }
    });

    // Constrain the mapping
    for (const id of idsUsed) {
      if (!possibleNames[id]) {
        possibleNames[id] = new Set(myEquipmentNames);
      } else {
        // Intersect
        const intersection = new Set<string>();
        for (const name of possibleNames[id]) {
          if (myEquipmentNames.has(name)) {
            intersection.add(name);
          }
        }
        possibleNames[id] = intersection;
      }
    }
  }

  console.log("=== Equipment ID Mapping Constraints ===");
  for (const id in possibleNames) {
    console.log(`ID ${id}: ${Array.from(possibleNames[id]).join(', ')}`);
  }
}

run();
