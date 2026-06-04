import 'dotenv/config';
import { TroopMap } from '../src/data/UnitMap';

const BASE_URL = 'https://cocproxy.royaleapi.dev/v1';
const API_TOKEN = process.env.COC_API_KEY;

async function fetchWithRetry(url: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Accept': 'application/json'
        }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e: any) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

async function analyze() {
  console.log("Fetching top 200 players...");
  const rankingsData = await fetchWithRetry(`${BASE_URL}/locations/global/rankings/players?limit=200`);
  const playerTags = rankingsData.items.map((p: any) => p.tag);
  
  console.log(`Analyzing ${playerTags.length} players for Custom/Other armies...`);
  
  const troopTally: Record<string, number> = {};
  const armyComps: Record<string, number> = {};
  let customAttacks = 0;

  const batchSize = 10;
  for (let i = 0; i < playerTags.length; i += batchSize) {
    const batch = playerTags.slice(i, i + batchSize);
    
    const promises = batch.map(async (tag: string) => {
      const pTag = encodeURIComponent(tag);
      return fetchWithRetry(`${BASE_URL}/players/${pTag}/battlelog`);
    });
    
    const results = await Promise.all(promises);

    for (const battlelog of results) {
      if (!battlelog || !battlelog.items) continue;
      const rankedAttacks = battlelog.items.filter((b: any) => b.attack === true && b.battleType === 'ranked');
      
      for (const attack of rankedAttacks) {
        if (!attack.armyShareCode) continue;

        const troopCounts: Record<string, number> = {};
        const uMatch = attack.armyShareCode.match(/u([^\-ds]+(?:-[^\-ds]+)*)/);
        if (uMatch) {
          const unitParts = uMatch[1].split('-');
          for (const p of unitParts) {
            const parts = p.split('x');
            if (parts.length === 2) {
              const count = parseInt(parts[0]);
              const id = parseInt(parts[1]);
              const tName = TroopMap[id];
              if (tName) troopCounts[tName] = (troopCounts[tName] || 0) + count;
            }
          }
        }

        // Rule-based logic verbatim from fetch-meta
        let armyType = "Custom / Other";
        const dragons = troopCounts["Dragon"] || 0;
        const superDragons = troopCounts["Super Dragon"] || 0;
        const dragonRiders = troopCounts["Dragon Rider"] || 0;
        const rootRiders = troopCounts["Root Rider"] || 0;
        const throwers = troopCounts["Thrower"] || 0;
        const superBowlers = troopCounts["Super Bowler"] || 0;
        const superYetis = troopCounts["Super Yeti"] || 0;
        const superWitches = troopCounts["Super Witch"] || 0;
        const meteorGolems = troopCounts["Meteor Golem"] || 0;
        const edrags = troopCounts["Electro Dragon"] || 0;
        const rocketLoons = troopCounts["Rocket Balloon"] || 0;
        const yetis = troopCounts["Yeti"] || 0;
        const witches = troopCounts["Witch"] || 0;

        if (superBowlers >= 3) armyType = "Super Bowler";
        else if ((dragons > 0 || superDragons > 0) && dragonRiders > 0) armyType = "Dragon & Dragon Rider";
        else if (dragonRiders >= 4 && superDragons > 0) armyType = "Dragon Rider & Super Dragon";
        else if (dragonRiders >= 4) armyType = "Dragon Rider";
        else if (rootRiders >= 4) armyType = "Root Rider";
        else if (superYetis >= 3) armyType = "Super Yeti";
        else if (superWitches >= 3) armyType = "Super Witch";
        else if (throwers >= 6) armyType = "Thrower";
        else if (meteorGolems >= 5) armyType = "Meteor Golem";
        else if (edrags >= 4) armyType = "Electro Dragon";
        else if (rocketLoons >= 8) armyType = "Rocket Balloon";
        else if (yetis >= 3 && witches >= 4) armyType = "Yeti & Witch";
        else if (dragons >= 6) armyType = "Dragon";

        if (armyType === "Custom / Other") {
          customAttacks++;
          
          // What defines this army? Let's look at the troops that take up the most housing space
          // Since we don't have housing space mapped, we'll just tally the most numerous troops or just count presence
          let mainTroops = Object.entries(troopCounts)
            .filter(([t, c]) => !["Wall Breaker", "Balloon", "Minion", "Archer", "Barbarian", "Goblin", "Sneaky Goblin", "Ice Golem"].includes(t)) // Filter out common support
            .sort((a, b) => b[1] - a[1]);
          
          if (mainTroops.length > 0) {
            const comp = mainTroops.slice(0, 2).map(t => t[0]).join(' + ');
            armyComps[comp] = (armyComps[comp] || 0) + 1;
            
            for (const [tName, count] of mainTroops) {
               troopTally[tName] = (troopTally[tName] || 0) + 1;
            }
          }
        }
      }
    }
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log(`\nFound ${customAttacks} 'Custom / Other' attacks.`);
  
  console.log("\nTop Core Troop Combos in 'Custom / Other':");
  Object.entries(armyComps)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([comp, count]) => console.log(`${comp}: ${count} attacks`));

  console.log("\nTop Individual Core Troops in 'Custom / Other':");
  Object.entries(troopTally)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([troop, count]) => console.log(`${troop}: present in ${count} attacks`));
}

analyze().catch(console.error);
