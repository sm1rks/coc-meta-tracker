import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { EquipmentMap, HeroMap } from '../src/data/equipmentMap.js';
import { TroopMap, SpellMap, PetMap, ALL_SIEGE_MACHINES, ALL_SUPER_TROOPS } from '../src/data/UnitMap.js';

const API_KEY = process.env.COC_API_KEY;
const BASE_URL = 'https://cocproxy.royaleapi.dev/v1';

if (!API_KEY) {
  console.error("Missing COC_API_KEY in .env file. Please add it to fetch real data.");
  process.exit(1);
}

// Ensure the data directory exists
const dir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

async function fetchWithRetry(url: string, retries = 5) {

  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${API_KEY}` } });
      
      if (res.status === 429) {
        console.log("Rate limited. Waiting...");
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      
      if (!res.ok) {
        // If it's a 403 (Forbidden) or 404 (Not Found), it's a hard fail
        if (res.status === 403 || res.status === 404) {
          throw new Error(`API Error: ${res.status} ${await res.text()}`);
        }
        
        // For 520 or any other server error, log and let the retry loop handle it
        console.log(`Received ${res.status}. Retrying (${i + 1}/${retries})...`);
        await new Promise(r => setTimeout(r, 3000)); // Wait 3 seconds before retry
        continue;
      }
      
      const data = await res.json();
      return data;
    } catch (e: any) {
      if (i === retries - 1) throw e;
      console.log(`Network error: ${e.message}. Retrying (${i + 1}/${retries})...`);
      await new Promise(r => setTimeout(r, 3000));
    }
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
      "Archer Queen": ["Archer Puppet", "Invisibility Vial", "Giant Arrow", "Healer Puppet", "Frozen Arrow", "Magic Mirror", "Action Figure", "Monolith Arrow"],
      "Grand Warden": ["Eternal Tome", "Life Gem", "Rage Gem", "Healing Tome", "Fireball", "Lavaloon Puppet", "Heroic Torch"],
      "Royal Champion": ["Royal Gem", "Seeking Shield", "Hog Rider Puppet", "Haste Vial", "Rocket Spear", "Electro Boots", "Frost Flake"],
      "Minion Prince": ["Henchmen Puppet", "Dark Orb", "Metal Pants", "Noble Iron", "Dark Crown", "Meteor Staff"],
      "Dragon Duke": ["Fire Heart", "Stun Blaster", "Flame Blower", "Electro Fangs", "Rocket Backpack"]
    };

    type HeroArmyStat = {
      count: number;
      equipments: Record<string, number>;
      pets: Record<string, number>;
    };
    type ArmyStat = {
      count: number;
      battlesCount: number;
      playerTags: Set<string>;
      heroes: Record<string, HeroArmyStat>;
      troopTotals: Record<string, number>;
    };



    const stats = {
      playersAnalyzed: 0,
      attacksAnalyzed: 0,
      armies: {} as Record<string, ArmyStat>,
      heroes: {} as Record<string, { count: number, totalLevel: number }>,
      equipments: {} as Record<string, Record<string, number>>, // hero -> equipment -> count
      combos: {} as Record<string, Record<string, number>>, // hero -> combo -> count
      pets: {} as Record<string, Record<string, number>>, // hero -> pet -> count
      superTroops: {} as Record<string, number>,
      siegeMachines: {} as Record<string, number>,
      topPlayersList: [] as any[]
    };

    for (const [heroName, equips] of Object.entries(KNOWN_EQUIPMENT)) {
      stats.heroes[heroName] = { count: 0, totalLevel: 0 };
      stats.equipments[heroName] = {};
      stats.combos[heroName] = {};
      stats.pets[heroName] = {};
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

    // Sliding window concurrency pool
    const CONCURRENCY = 3;
    let activePromises = 0;
    let index = 0;
    const results: any[] = [];
    
    console.log(`Fetching profiles and battlelogs for ${playerTags.length} players with concurrency ${CONCURRENCY}...`);

    await new Promise<void>((resolve, reject) => {
      const runNext = async () => {
        if (index >= playerTags.length) {
          if (activePromises === 0) resolve();
          return;
        }

        const tag = playerTags[index++];
        activePromises++;
        
        try {
          const pTag = encodeURIComponent(tag);
          const [player, battlelog] = await Promise.all([
            fetchWithRetry(`${BASE_URL}/players/${pTag}`),
            fetchWithRetry(`${BASE_URL}/players/${pTag}/battlelog`)
          ]);
          results.push({ player, battlelog });
          
          if (results.length % 20 === 0) {
             process.stdout.write(`\rProgress: ${results.length}/${playerTags.length}`);
          }
        } catch (err) {
          reject(err);
        } finally {
          activePromises--;
          runNext();
        }
      };

      for (let i = 0; i < CONCURRENCY && i < playerTags.length; i++) {
        runNext();
      }
    });

    console.log(`\nAll ${playerTags.length} players fetched successfully. Processing...`);

    for (const { player, battlelog } of results) {
      stats.playersAnalyzed++;
      const activeSuperTroops = (player.troops || []).filter((t: any) => t.superTroopIsActive);
      for (const st of activeSuperTroops) {
          stats.superTroops[st.name] = (stats.superTroops[st.name] || 0) + 1;
        }

        // Parse Battlelog for Equipment
        if (battlelog && battlelog.items) {
          const rankedAttacks = battlelog.items.filter((b: any) => b.attack === true && b.battleType === 'ranked');
          
          const playerArmies: Record<string, number> = {};
          const playerHeroData: Record<string, any[]> = {};

          for (const attack of rankedAttacks) {
            if (!attack.armyShareCode) continue;

            stats.attacksAnalyzed++;

            const heroesDeployed = new Set<string>();
            const equipNames = new Set<string>();
            const attackHeroes: { hero: string, combo: string | null, pet: string | null }[] = [];

            // Extract heroes section: starts with 'h', ends with 'd' or 'u' or 's' or 'i' or end of string
            const hMatch = attack.armyShareCode.match(/h([^\-dsui]+(?:-[^\-dsui]+)*)/);
            if (hMatch) {
              const heroesStr = hMatch[1];
              // Each hero is separated by '-'
              const heroesList = heroesStr.split('-');
              for (const heroStr of heroesList) {
                // heroStr looks like "0p11e10_51" or "0e10_51"
                const idMatch = heroStr.match(/^(\d+)/);
                const pMatch = heroStr.match(/p(\d+)/);
                const eMatch = heroStr.match(/e(\d+)(?:_(\d+))?/);
                
                if (idMatch && eMatch) {
                  const heroId = parseInt(idMatch[1]);
                  const eq1 = parseInt(eMatch[1]);
                  const eq2 = eMatch[2] ? parseInt(eMatch[2]) : null;
                  const petId = pMatch ? parseInt(pMatch[1]) : null;

                  const heroName = HeroMap[heroId];
                  if (!heroName) continue;
                  
                  const petName = petId !== null ? PetMap[petId] : null;
                  if (petId !== null && !petName) {
                    console.log(`Unmapped Pet ID found: ${petId}`);
                  }

                  heroesDeployed.add(heroName);

                  const eq1Name = EquipmentMap[eq1];
                  const eq2Name = eq2 ? EquipmentMap[eq2] : null;

                  if (eq1Name) equipNames.add(eq1Name);
                  if (eq2Name) equipNames.add(eq2Name);

                  if (!stats.heroes[heroName]) {
                    stats.heroes[heroName] = { count: 0, totalLevel: 0 };
                    stats.equipments[heroName] = {};
                    stats.combos[heroName] = {};
                    stats.pets[heroName] = {};
                  }

                  stats.heroes[heroName].count++;
                  stats.heroes[heroName].totalLevel += 1; // Assuming max for simplicity if not looking up

                  const eqNames = [];
                  if (eq1Name) {
                    stats.equipments[heroName][eq1Name] = (stats.equipments[heroName][eq1Name] || 0) + 1;
                    eqNames.push(eq1Name);
                  }
                  if (eq2Name) {
                    stats.equipments[heroName][eq2Name] = (stats.equipments[heroName][eq2Name] || 0) + 1;
                    eqNames.push(eq2Name);
                  }

                  let comboName = null;
                  if (eqNames.length >= 2) {
                    comboName = eqNames.sort().join(' + ');
                    stats.combos[heroName][comboName] = (stats.combos[heroName][comboName] || 0) + 1;
                  }

                  if (petName) {
                    if (!stats.pets[heroName]) stats.pets[heroName] = {};
                    stats.pets[heroName][petName] = (stats.pets[heroName][petName] || 0) + 1;
                  }

                  attackHeroes.push({ hero: heroName, combo: comboName, pet: petName });
                }
              }
            }

            // --- TROOPS & SPELLS ---
            const mainTroopCounts: Record<string, number> = {};
            const ccTroopCounts: Record<string, number> = {};
            const mainSpellCounts: Record<string, number> = {};
            const ccSpellCounts: Record<string, number> = {};
            
            const parseUnits = (regex: RegExp, map: Record<number, string>, counts: Record<string, number>) => {
              const match = attack.armyShareCode.match(regex);
              if (match) {
                const parts = match[1].split('-');
                for (const p of parts) {
                  const [countStr, idStr] = p.split('x');
                  if (countStr && idStr) {
                    const count = parseInt(countStr);
                    const id = parseInt(idStr);
                    const name = map[id];
                    if (name) counts[name] = (counts[name] || 0) + count;
                  }
                }
              }
            };

            // u = troops, i = clan castle troops (includes siege machine)
            parseUnits(/u([0-9x\-]+)/, TroopMap, mainTroopCounts);
            parseUnits(/i([0-9x\-]+)/, TroopMap, ccTroopCounts);

            // s = spells, d = clan castle spells
            parseUnits(/s([0-9x\-]+)/, SpellMap, mainSpellCounts);
            parseUnits(/d([0-9x\-]+)/, SpellMap, ccSpellCounts);

            const allTroopCounts = { ...mainTroopCounts };
            for (const [k, v] of Object.entries(ccTroopCounts)) allTroopCounts[k] = (allTroopCounts[k] || 0) + v;
            
            const allSpellCounts = { ...mainSpellCounts };
            for (const [k, v] of Object.entries(ccSpellCounts)) allSpellCounts[k] = (allSpellCounts[k] || 0) + v;

            // Track global siege machine usage
            const deployedSiegeMachines = Object.entries(allTroopCounts).filter(([name]) => ALL_SIEGE_MACHINES.has(name));
            for (const [smName, count] of deployedSiegeMachines) {
              stats.siegeMachines[smName] = (stats.siegeMachines[smName] || 0) + 1;
            }

            // --- DYNAMIC CLASSIFICATION ---
            // Filter out common support/funnel troops to find the core army identity
            const SUPPORT_TROOPS = new Set([
              "Barbarian", "Archer", "Goblin", "Giant", "Wall Breaker", "Balloon",
              "Wizard", "Minion", "Hog Rider", "Valkyrie", "Sneaky Goblin",
              "Super Wall Breaker", "Headhunter", "Ice Golem", "Baby Dragon",
              "Raged Barbarian", "Sneaky Archer", "Beta Minion", "Boxer Giant",
              "Bomber", "Power P.E.K.K.A", "Cannon Cart", "Drop Ship",
              "Wall Wrecker", "Battle Blimp", "Stone Slammer", "Hog Glider",
              "Siege Barracks", "Log Launcher", "Flame Flinger", "Battle Drill",
              "Sky Wagon", "Troop Launcher",
              "Super Barbarian", "Super Archer", "Super Giant", "Rocket Balloon", "Inferno Dragon", "Healer",
            ]);

            const coreTroops = Object.entries(allTroopCounts)
              .filter(([name]) => !SUPPORT_TROOPS.has(name))
              .sort((a, b) => b[1] - a[1]);

            let armyType: string;
            if (coreTroops.length === 0) {
              // Pure support/funnel army — use top deployed troop
              const topSupport = Object.entries(allTroopCounts).sort((a, b) => b[1] - a[1])[0];
              armyType = topSupport ? topSupport[0] : "Unknown";
            } else if (coreTroops.length === 1 || coreTroops[0][1] >= coreTroops[1]?.[1] * 2) {
              // One dominant core troop
              armyType = coreTroops[0][0];
            } else {
              // Two roughly equal core troops — combine them alphabetically for consistency
              const top2 = [coreTroops[0][0], coreTroops[1][0]].sort();
              armyType = `${top2[0]} & ${top2[1]}`;
              if (armyType === "Dragon & Dragon Rider") {
                armyType = "Hydra";
              }
            }

            // Build prefixes (go at the front of the army name)
            const prefixes: string[] = [];

            // Charge detection: 4+ invis spells + Spirit Fox on RC or Duke
            const invisSpells = allSpellCounts["Invisibility Spell"] || 0;
            if (invisSpells >= 4) {
              const rcWithFox = attackHeroes.find(h => h.hero === "Royal Champion" && h.pet === "Spirit Fox");
              const dukeWithFox = attackHeroes.find(h => h.hero === "Dragon Duke" && h.pet === "Spirit Fox");
              if (rcWithFox) prefixes.push("Royal Champion Charge");
              else if (dukeWithFox) prefixes.push("Dragon Duke Charge");
            }

            // Queen Charge detection: Monolith Arrow on Archer Queen
            const aqHero = attackHeroes.find(h => h.hero === "Archer Queen");
            if (aqHero && equipNames.has("Monolith Arrow")) {
              prefixes.push("Queen Charge");
            }

            // Flame Blower prefix (Dragon Duke equipment)
            const dukeHero = attackHeroes.find(h => h.hero === "Dragon Duke");
            if (dukeHero && equipNames.has("Flame Blower")) prefixes.push("Flame Blower");

            // Fireball prefix
            if (equipNames.has("Fireball")) prefixes.push("Fireball");

            // Rocket Backpack prefix
            const eqSpells = allSpellCounts["Earthquake Spell"] || 0;
            if (equipNames.has("Giant Arrow") && equipNames.has("Rocket Backpack") && eqSpells >= 3) {
              prefixes.push("Rocket Backpack");
            }

            if (prefixes.length > 0) {
              armyType = `${prefixes.join(" ")} ${armyType}`;
            }

            playerArmies[armyType] = (playerArmies[armyType] || 0) + 1;
            if (!playerHeroData[armyType]) playerHeroData[armyType] = [];
            playerHeroData[armyType].push({ heroes: attackHeroes, troopCounts: allTroopCounts, mainTroopCounts, spellCounts: allSpellCounts, shareCode: attack.armyShareCode });
          }

          let mainArmyType = null;
          let maxCount = 0;
          for (const [aType, count] of Object.entries(playerArmies)) {
            if (count > maxCount) {
              maxCount = count;
              mainArmyType = aType;
            }
          }

          let bestAttack = null;
          if (mainArmyType && playerHeroData[mainArmyType].length > 0) {
            const attacks = playerHeroData[mainArmyType];
            bestAttack = { ...attacks[0], troopCounts: {}, mainTroopCounts: {} };
            
            // The API's armyShareCode in battlelogs only includes DEPLOYED troops.
            // To reconstruct the player's full trained army (including troops they didn't deploy in some attacks),
            // we take the maximum count of each troop deployed across all their attacks with this army type.
            for (const attack of attacks) {
              for (const [troop, count] of Object.entries(attack.troopCounts as Record<string, number>)) {
                bestAttack.troopCounts[troop] = Math.max(bestAttack.troopCounts[troop] || 0, count);
              }
              for (const [troop, count] of Object.entries(attack.mainTroopCounts as Record<string, number>)) {
                bestAttack.mainTroopCounts[troop] = Math.max(bestAttack.mainTroopCounts[troop] || 0, count);
              }
            }
          }

          let bestSiegeMachine = null;
          let bestSuperTroops = [];
          if (bestAttack) {


            bestSiegeMachine = Object.entries(bestAttack.troopCounts)
              .filter(([name]) => ALL_SIEGE_MACHINES.has(name))
              .sort((a, b) => b[1] - a[1])[0]?.[0] || null;
            bestSuperTroops = Object.keys(bestAttack.mainTroopCounts || bestAttack.troopCounts)
              .filter(name => ALL_SUPER_TROOPS.has(name))
              .sort((a, b) => (bestAttack.mainTroopCounts || bestAttack.troopCounts)[b] - (bestAttack.mainTroopCounts || bestAttack.troopCounts)[a])
              .slice(0, 2);
          }

          let armyLink = "";
          if (bestAttack && bestAttack.shareCode) {
            armyLink = `https://link.clashofclans.com/en?action=CopyArmy&army=${bestAttack.shareCode}`;
          }

          stats.topPlayersList.push({
            rank: topPlayersMap.get(player.tag) || 0,
            name: player.name,
            tag: player.tag,
            trophies: player.trophies,
            clanName: player.clan ? player.clan.name : '',
            clanBadge: player.clan && player.clan.badgeUrls ? player.clan.badgeUrls.small : '',
            armyType: mainArmyType || "Unknown",
            heroes: bestAttack ? bestAttack.heroes : [],
            siegeMachine: bestSiegeMachine,
            superTroops: bestSuperTroops,
            armyLink: armyLink
          });

          if (mainArmyType) {
            if (!stats.armies[mainArmyType]) {
              stats.armies[mainArmyType] = { count: 0, battlesCount: 0, playerTags: new Set(), heroes: {}, troopTotals: {} };
            }
            stats.armies[mainArmyType].count++;
            stats.armies[mainArmyType].battlesCount += maxCount;
            stats.armies[mainArmyType].playerTags.add(player.tag);

            for (const { heroes: attackHeroes, troopCounts: attackTroops } of playerHeroData[mainArmyType]) {
              // Track heroes
              for (const h of attackHeroes) {
                if (!stats.armies[mainArmyType].heroes[h.hero]) {
                  stats.armies[mainArmyType].heroes[h.hero] = { count: 0, equipments: {}, pets: {} };
                }
                stats.armies[mainArmyType].heroes[h.hero].count++;
                if (h.combo) {
                  stats.armies[mainArmyType].heroes[h.hero].equipments[h.combo] = (stats.armies[mainArmyType].heroes[h.hero].equipments[h.combo] || 0) + 1;
                }
                if (h.pet) {
                  stats.armies[mainArmyType].heroes[h.hero].pets[h.pet] = (stats.armies[mainArmyType].heroes[h.hero].pets[h.pet] || 0) + 1;
                }
              }
              // Track all troops by total count
              for (const [tName, tCount] of Object.entries(attackTroops)) {
                stats.armies[mainArmyType].troopTotals[tName] = (stats.armies[mainArmyType].troopTotals[tName] || 0) + tCount;
              }
            }
          }
        }
      }
      
      // We no longer delay because of concurrency control, but we must close out the loop
      // Wait, there is no loop, all results are processed at once now!

    // Sort top players
    stats.topPlayersList.sort((a, b) => a.rank - b.rank);

    // Format output
    const formattedArmies = [];
    for (const [armyName, armyStat] of Object.entries(stats.armies)) {
      const topHeroes = Object.entries(armyStat.heroes)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 4)
        .map(([hName, hStat]) => {
           const topEq = Object.entries(hStat.equipments).sort((a,b) => b[1] - a[1])[0]?.[0] || null;
           const topPet = Object.entries(hStat.pets).sort((a,b) => b[1] - a[1])[0]?.[0] || null;
           return { name: hName, equipment: topEq, pet: topPet };
        });
      // Top 2 super troops used in this army (all super troops, including non-"Super " named ones)
      const ALL_SUPER_TROOPS = new Set([
        "Super Barbarian", "Super Archer", "Super Wall Breaker", "Super Giant",
        "Sneaky Goblin", "Rocket Balloon", "Super Wizard", "Inferno Dragon",
        "Super Minion", "Super Valkyrie", "Super Bowler", "Ice Hound",
        "Super Dragon", "Super Witch", "Super Yeti", "Super Miner", "Super Hog Rider",
      ]);
      const topSecondaryTroops = Object.entries(armyStat.troopTotals)
        .filter(([name]) => ALL_SUPER_TROOPS.has(name))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([name]) => name);

      const topSiegeMachine = Object.entries(armyStat.troopTotals)
        .filter(([name]) => ALL_SIEGE_MACHINES.has(name))
        .sort((a, b) => b[1] - a[1])[0]?.[0] || null;
      formattedArmies.push({
        name: armyName,
        usage: stats.playersAnalyzed ? (armyStat.count / stats.playersAnalyzed) * 100 : 0,
        count: armyStat.count,
        battlesCount: armyStat.battlesCount,
        playerCount: armyStat.playerTags.size,
        topHeroes,
        topSecondaryTroops,
        topSiegeMachine
      });
    }
    formattedArmies.sort((a, b) => b.usage - a.usage);

    const outputData = {
      lastUpdated: new Date().toISOString(),
      playersAnalyzed: stats.playersAnalyzed,
      attacksAnalyzed: stats.attacksAnalyzed,
      armies: formattedArmies,
      heroes: [] as any[],
      equipments: [] as any[],
      combos: [] as any[],
      pets: [] as any[],
      superTroops: [] as any[],
      topPlayers: stats.topPlayersList
    };

    // Process Super Troops (still based on playersAnalyzed since it's profile data)
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

    // Process Siege Machines globally
    outputData.siegeMachines = [];
    for (const [smName, count] of Object.entries(stats.siegeMachines)) {
      const usagePct = stats.attacksAnalyzed ? (count / stats.attacksAnalyzed) * 100 : 0;
      if (usagePct > 0) {
        outputData.siegeMachines.push({
          name: smName,
          usage: parseFloat(usagePct.toFixed(1))
        });
      }
    }
    outputData.siegeMachines.sort((a: any, b: any) => b.usage - a.usage);

    // Only include main heroes
    for (const [heroName, heroStat] of Object.entries(stats.heroes)) {
      // For heroes, denominator is stats.attacksAnalyzed. 
      // If a hero is not in an attack, they weren't used.
      const usagePct = stats.attacksAnalyzed ? (heroStat.count / stats.attacksAnalyzed) * 100 : 0;
      // Note: avgLevel is rough here because we assumed 1.
      const avgLevel = heroStat.count ? heroStat.totalLevel / heroStat.count : 0;
      outputData.heroes.push({ name: heroName, usage: parseFloat(usagePct.toFixed(1)), avgLevel: parseFloat(avgLevel.toFixed(1)) });

      // Equipments
      const heroEquips = stats.equipments[heroName] || {};
      for (const [eqName, count] of Object.entries(heroEquips)) {
        // Equipment usage is out of the number of attacks the hero was used in!
        const eqUsage = heroStat.count ? (count / heroStat.count) * 100 : 0;
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
          const comboUsage = heroStat.count ? (count / heroStat.count) * 100 : 0;
          outputData.combos.push({
            hero: heroName,
            name: comboName,
            usage: parseFloat(comboUsage.toFixed(1))
          });
        }
      }

      // Pets
      const heroPets = stats.pets[heroName] || {};
      for (const [petName, count] of Object.entries(heroPets)) {
        const petUsage = heroStat.count ? (count / heroStat.count) * 100 : 0;
        outputData.pets.push({
          hero: heroName,
          name: petName,
          usage: parseFloat(petUsage.toFixed(1))
        });
      }
    }

    fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(outputData));
    console.log("Successfully wrote data/meta.json with REAL data!");

  } catch (err) {
    console.error("Failed to fetch data:", err);
    process.exit(1);
  }
}

fetchMeta();
