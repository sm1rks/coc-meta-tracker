import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const API_KEY = process.env.COC_API_KEY;
const BASE_URL = 'https://cocproxy.royaleapi.dev/v1';

if (!API_KEY) {
  console.error("Missing COC_API_KEY in .env file. Please add it to fetch real data.");
  process.exit(1);
}

// Ensure the data directory exists
const dir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

async function fetchWithRetry(url: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${API_KEY}` } });
    if (res.status === 429) {
      console.log("Rate limited. Waiting...");
      await new Promise(r => setTimeout(r, 2000));
      continue;
    }
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} ${await res.text()}`);
    }
    return res.json();
  }
  throw new Error(`Failed to fetch ${url} after ${retries} retries`);
}

async function fetchMeta() {
  try {
    console.log("Fetching Global Rankings (Top Players)...");
    // We use the global rankings to get the top players currently
    const rankingsData = await fetchWithRetry(`${BASE_URL}/locations/global/rankings/players?limit=200`);
    const playerTags = rankingsData.items.map((p: any) => p.tag);
    const topPlayersMap = new Map();
    rankingsData.items.forEach((p: any) => {
      topPlayersMap.set(p.tag, p.rank);
    });
    console.log(`Found ${playerTags.length} players. Analyzing profiles...`);

    const KNOWN_EQUIPMENT: Record<string, string[]> = {
      "Barbarian King": ["Barbarian Puppet", "Rage Vial", "Earthquake Boots", "Vampstache", "Giant Gauntlet", "Spiky Ball", "Snake Bracelet", "Stick Horse"],
      "Archer Queen": ["Archer Puppet", "Invisibility Vial", "Giant Arrow", "Healer Puppet", "Frozen Arrow", "Magic Mirror", "Action Figure"],
      "Grand Warden": ["Eternal Tome", "Life Gem", "Rage Gem", "Healing Tome", "Fireball", "Lavaloon Puppet", "Heroic Torch"],
      "Royal Champion": ["Royal Gem", "Seeking Shield", "Hog Rider Puppet", "Haste Vial", "Rocket Spear", "Electro Boots", "Frost Flake"],
      "Minion Prince": ["Henchmen Puppet", "Dark Orb", "Metal Pants", "Noble Iron", "Dark Crown", "Meteor Staff"],
      "Dragon Duke": ["Fire Heart", "Stun Blaster", "Flame Blower", "Electro Fangs", "Rocket Backpack"]
    };

    const stats = {
      playersAnalyzed: 0,
      heroes: {} as Record<string, { count: number, totalLevel: number }>,
      equipments: {} as Record<string, Record<string, number>>, // hero -> equipment -> count
      combos: {} as Record<string, Record<string, number>>, // hero -> combo -> count
      superTroops: {} as Record<string, number>,
      topPlayersList: [] as any[]
    };

    for (const [heroName, equips] of Object.entries(KNOWN_EQUIPMENT)) {
      stats.heroes[heroName] = { count: 0, totalLevel: 0 };
      stats.equipments[heroName] = {};
      stats.combos[heroName] = {};
      for (const eq of equips) {
        stats.equipments[heroName][eq] = 0;
      }
      for (let i = 0; i < equips.length; i++) {
        for (let j = i + 1; j < equips.length; j++) {
          const combo = [equips[i], equips[j]].sort().join(' + ');
          stats.combos[heroName][combo] = 0;
        }
      }
    }

    // To respect rate limits, fetch in small batches sequentially
    const batchSize = 10;
    for (let i = 0; i < playerTags.length; i += batchSize) {
      const batch = playerTags.slice(i, i + batchSize);
      process.stdout.write(`Fetching batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(playerTags.length/batchSize)}... `);
      
      const promises = batch.map((tag: string) => fetchWithRetry(`${BASE_URL}/players/${encodeURIComponent(tag)}`));
      const players = await Promise.all(promises);

      for (const player of players) {
        stats.playersAnalyzed++;
        
        // Track Top Players Real Badges
        stats.topPlayersList.push({
          rank: topPlayersMap.get(player.tag) || 0,
          name: player.name,
          tag: player.tag,
          trophies: player.trophies,
          clanName: player.clan ? player.clan.name : '',
          clanBadge: player.clan && player.clan.badgeUrls ? player.clan.badgeUrls.small : ''
        });

        // Track Super Troops
        const activeSuperTroops = (player.troops || []).filter((t: any) => t.superTroopIsActive);
        for (const st of activeSuperTroops) {
          stats.superTroops[st.name] = (stats.superTroops[st.name] || 0) + 1;
        }

        const homeHeroes = (player.heroes || []).filter((h: any) => h.village === 'home' && h.equipment && h.equipment.length > 0);
        
        for (const hero of homeHeroes) {
          // Initialize stats if not exist
          if (!stats.heroes[hero.name]) {
            stats.heroes[hero.name] = { count: 0, totalLevel: 0 };
            stats.equipments[hero.name] = {};
            stats.combos[hero.name] = {};
          }

          stats.heroes[hero.name].count++;
          stats.heroes[hero.name].totalLevel += hero.level;

          const equipments = hero.equipment || [];
          const eqNames = equipments.map((eq: any) => eq.name).sort();

          for (const eqName of eqNames) {
            stats.equipments[hero.name][eqName] = (stats.equipments[hero.name][eqName] || 0) + 1;
          }

          if (eqNames.length >= 2) {
            // Usually 2 equipments are active
            const comboName = eqNames.join(' + ');
            stats.combos[hero.name][comboName] = (stats.combos[hero.name][comboName] || 0) + 1;
          }
        }
      }
      
      console.log("Done");
      // Small delay between batches to avoid rate limit
      await new Promise(r => setTimeout(r, 200));
    }

    // Sort top players
    stats.topPlayersList.sort((a, b) => a.rank - b.rank);

    // Format output
    const outputData = {
      lastUpdated: new Date().toISOString(),
      playersAnalyzed: stats.playersAnalyzed,
      heroes: [] as any[],
      equipments: [] as any[],
      combos: [] as any[],
      superTroops: [] as any[],
      topPlayers: stats.topPlayersList
    };

    // Process Super Troops
    for (const [stName, count] of Object.entries(stats.superTroops)) {
      const usagePct = stats.playersAnalyzed ? (count / stats.playersAnalyzed) * 100 : 0;
      if (usagePct > 0) {
        outputData.superTroops.push({
          name: stName,
          usage: parseFloat(usagePct.toFixed(1))
        });
      }
    }
    // Sort super troops highest to lowest
    outputData.superTroops.sort((a, b) => b.usage - a.usage);

    // Only include main heroes (to avoid pets cluttering if we don't have their icons yet, but we can include them and their icons will just 404/hide)
    for (const [heroName, heroStat] of Object.entries(stats.heroes)) {
      const usagePct = stats.playersAnalyzed ? (heroStat.count / stats.playersAnalyzed) * 100 : 0;
      const avgLevel = heroStat.count ? heroStat.totalLevel / heroStat.count : 0;
      outputData.heroes.push({ name: heroName, usage: parseFloat(usagePct.toFixed(1)), avgLevel: parseFloat(avgLevel.toFixed(1)) });

      // Equipments
      const heroEquips = stats.equipments[heroName] || {};
      for (const [eqName, count] of Object.entries(heroEquips)) {
        const eqUsage = stats.playersAnalyzed ? (count / stats.playersAnalyzed) * 100 : 0;
        outputData.equipments.push({
          hero: heroName,
          name: eqName,
          usage: parseFloat(eqUsage.toFixed(1))
        });
      }

      // Combos
      const heroCombos = stats.combos[heroName] || {};
      for (const [comboName, count] of Object.entries(heroCombos)) {
        if (count > 0) {
          const comboUsage = stats.playersAnalyzed ? (count / stats.playersAnalyzed) * 100 : 0;
          outputData.combos.push({
            hero: heroName,
            name: comboName,
            usage: parseFloat(comboUsage.toFixed(1))
          });
        }
      }
    }

    fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(outputData, null, 2));
    console.log("Successfully wrote data/meta.json with REAL data!");

  } catch (err) {
    console.error("Failed to fetch data:", err);
    process.exit(1);
  }
}

fetchMeta();
