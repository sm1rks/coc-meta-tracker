import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { EquipmentMap, HeroMap } from '../src/data/equipmentMap.js';
import { TroopMap, SpellMap, PetMap, ALL_SIEGE_MACHINES, ALL_SUPER_TROOPS } from '../src/data/UnitMap.js';

const TROOP_HOUSING_SPACES: Record<string, number> = {
  "Barbarian": 1,
  "Archer": 1,
  "Goblin": 1,
  "Giant": 5,
  "Wall Breaker": 2,
  "Balloon": 5,
  "Wizard": 4,
  "Healer": 14,
  "Dragon": 20,
  "P.E.K.K.A": 25,
  "Minion": 2,
  "Hog Rider": 5,
  "Valkyrie": 8,
  "Golem": 30,
  "Witch": 12,
  "Bowler": 6,
  "Baby Dragon": 10,
  "Miner": 6,
  "Super Barbarian": 5,
  "Super Archer": 12,
  "Super Wall Breaker": 8,
  "Super Giant": 10,
  "Sneaky Goblin": 3,
  "Super Miner": 24,
  "Rocket Balloon": 8,
  "Ice Golem": 15,
  "Electro Dragon": 30,
  "Inferno Dragon": 15,
  "Super Valkyrie": 20,
  "Dragon Rider": 25,
  "Super Witch": 40,
  "Ice Hound": 40,
  "Super Bowler": 30,
  "Super Dragon": 40,
  "Headhunter": 6,
  "Super Wizard": 10,
  "Super Minion": 12,
  "Electro Titan": 32,
  "Apprentice Warden": 20,
  "Super Hog Rider": 12,
  "Root Rider": 20,
  "Druid": 16,
  "Thrower": 16,
  "Super Yeti": 35,
  "Ruin Witch": 26,
  "Lava Hound": 30,
  "Yeti": 18,
  "Furnace": 18,
  "Meteor Golem": 40
};

const SPELL_HOUSING_SPACES: Record<string, number> = {
  "Lightning Spell": 1,
  "Healing Spell": 2,
  "Rage Spell": 2,
  "Jump Spell": 2,
  "Freeze Spell": 1,
  "Poison Spell": 1,
  "Earthquake Spell": 1,
  "Haste Spell": 1,
  "Clone Spell": 3,
  "Skeleton Spell": 1,
  "Bat Spell": 1,
  "Invisibility Spell": 1,
  "Recall Spell": 2,
  "Overgrowth Spell": 2,
  "Revive Spell": 2,
  "Ice Block Spell": 1,
  "Totem Spell": 1,
  "Angry Spell": 1
};

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

function mergeCounts(
  attacks: any[],
  key: "troopCounts" | "mainTroopCounts" | "ccTroopCounts" | "mainSpellCounts" | "ccSpellCounts",
  spaceMap: Record<string, number>,
  bestSourceAttack: any,
  absoluteMax: number
): Record<string, number> {
  let capacityLimit = 0;
  for (const attack of attacks) {
    let space = 0;
    const counts = attack[key] || {};
    for (const [name, count] of Object.entries(counts)) {
      space += (count as number) * (spaceMap[name] || 1);
    }
    if (space > capacityLimit) {
      capacityLimit = space;
    }
  }

  if (capacityLimit > absoluteMax) {
    capacityLimit = absoluteMax;
  }

  const merged: Record<string, number> = { ...(bestSourceAttack[key] || {}) };

  const getMergedSpace = () => {
    let space = 0;
    for (const [name, count] of Object.entries(merged)) {
      space += count * (spaceMap[name] || 1);
    }
    return space;
  };

  for (const attack of attacks) {
    const counts = attack[key] || {};
    for (const [name, count] of Object.entries(counts)) {
      const currentCount = merged[name] || 0;
      const targetCount = count as number;
      if (targetCount > currentCount) {
        const spaceDiff = (targetCount - currentCount) * (spaceMap[name] || 1);
        if (getMergedSpace() + spaceDiff <= capacityLimit) {
          merged[name] = targetCount;
        }
      }
    }
  }

  return merged;
}

async function fetchMeta() {
  try {
    console.log("Fetching Global Rankings (Top Players)...");
    // We use the global rankings to get the top players currently
    const rankingsData = await fetchWithRetry(`${BASE_URL}/locations/global/rankings/players?limit=200`);
    const playerTags = rankingsData.items.map((p: any) => p.tag);
    const topPlayersMap = new Map();
    const topPlayersTrophiesMap = new Map();
    const rankingsPlayersMap = new Map<string, any>();
    rankingsData.items.forEach((p: any) => {
      topPlayersMap.set(p.tag, p.rank);
      topPlayersTrophiesMap.set(p.tag, p.trophies);
      rankingsPlayersMap.set(p.tag, p);
    });

    // Clan Badges Caching
    const cachePath = path.join(process.cwd(), 'data', 'clan_badges_cache.json');
    let clanBadgesCache: Record<string, string> = {};
    if (fs.existsSync(cachePath)) {
      try {
        clanBadgesCache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      } catch (e) {
        console.warn("Failed to parse clan badges cache, starting fresh:", e);
      }
    }

    const missingClanTags = new Set<string>();
    rankingsData.items.forEach((p: any) => {
      if (p.clan && p.clan.tag) {
        const tag = p.clan.tag;
        if (!clanBadgesCache[tag]) {
          missingClanTags.add(tag);
        }
      }
    });

    if (missingClanTags.size > 0) {
      console.log(`Found ${missingClanTags.size} missing clans in cache. Fetching real badge URLs...`);
      const missingTagsArray = Array.from(missingClanTags);
      let clanIndex = 0;
      let activeClanPromises = 0;
      
      await new Promise<void>((resolve) => {
        const runNextClan = async () => {
          if (clanIndex >= missingTagsArray.length) {
            if (activeClanPromises === 0) resolve();
            return;
          }
          
          const cTag = missingTagsArray[clanIndex++];
          activeClanPromises++;
          
          try {
            const encodedTag = encodeURIComponent(cTag);
            const clanData = await fetchWithRetry(`${BASE_URL}/clans/${encodedTag}`);
            if (clanData && clanData.badgeUrls) {
              clanBadgesCache[cTag] = clanData.badgeUrls.small;
            }
          } catch (err) {
            console.error(`Failed to fetch clan ${cTag}:`, err);
          } finally {
            activeClanPromises--;
            runNextClan();
          }
        };
        
        for (let i = 0; i < 8 && i < missingTagsArray.length; i++) {
          runNextClan();
        }
      });
      
      fs.writeFileSync(cachePath, JSON.stringify(clanBadgesCache, null, 2));
      console.log("Updated clan badges cache saved.");
    }

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
      heroes: {} as Record<string, { count: number }>,
      equipments: {} as Record<string, Record<string, number>>, // hero -> equipment -> count
      combos: {} as Record<string, Record<string, number>>, // hero -> combo -> count
      pets: {} as Record<string, Record<string, number>>, // hero -> pet -> count
      superTroops: {} as Record<string, number>,
      siegeMachines: {} as Record<string, number>,
      topPlayersList: [] as any[]
    };

    for (const [heroName, equips] of Object.entries(KNOWN_EQUIPMENT)) {
      stats.heroes[heroName] = { count: 0 };
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
    const CONCURRENCY = 8;
    let activePromises = 0;
    let index = 0;
    let processedCount = 0;
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
          const battlelog = await fetchWithRetry(`${BASE_URL}/players/${pTag}/battlelog`);
          results.push({ tag, battlelog });
        } catch (err) {
          console.error(`\nFailed to fetch player ${tag}:`, err);
        } finally {
          processedCount++;
          process.stdout.write(`\rProgress: ${processedCount}/${playerTags.length}`);
          activePromises--;
          runNext();
        }
      };

      for (let i = 0; i < CONCURRENCY && i < playerTags.length; i++) {
        runNext();
      }
    });

    if (results.length === 0) {
      console.error("Failed to fetch any battle logs!");
      process.exit(1);
    }

    console.log(`\nSuccessfully fetched ${results.length}/${playerTags.length} players. Processing...`);

    const globalArmyBattlesCount: Record<string, number> = {};

    for (const { tag, battlelog } of results) {
      stats.playersAnalyzed++;
      const rankingPlayer = rankingsPlayersMap.get(tag);
      if (!rankingPlayer) continue;

      const playerSuperTroops = new Set<string>();

      // Parse Battlelog for Equipment
      if (battlelog && battlelog.items) {
          const rankedAttacks = battlelog.items.filter((b: any) => b.attack === true && (b.battleType === 'legend' || b.battleType === 'ranked'));
          
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
                    stats.heroes[heroName] = { count: 0 };
                    stats.equipments[heroName] = {};
                    stats.combos[heroName] = {};
                    stats.pets[heroName] = {};
                  }

                  stats.heroes[heroName].count++;

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

            // Collect super troops from the parsed attack (only from the main army)
            const attackSuperTroops = Object.keys(mainTroopCounts).filter(name => ALL_SUPER_TROOPS.has(name));
            for (const st of attackSuperTroops) {
              playerSuperTroops.add(st);
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

            const coreTroops = Object.entries(mainTroopCounts)
              .filter(([name, count]) => {
                if (name === "Rocket Balloon" && count >= 10) return true;
                return !SUPPORT_TROOPS.has(name);
              })
              .map(([name, count]) => ({
                name,
                count,
                space: count * (TROOP_HOUSING_SPACES[name] || 1)
              }))
              .sort((a, b) => b.space - a.space);

            let armyType: string;
            if (coreTroops.length === 0) {
              // Pure support/funnel army — use top deployed troop by space
              const topSupport = Object.entries(mainTroopCounts)
                .map(([name, count]) => ({ name, space: count * (TROOP_HOUSING_SPACES[name] || 1) }))
                .sort((a, b) => b.space - a.space)[0];
              armyType = topSupport ? topSupport.name : "Unknown";
            } else if (coreTroops.length === 1 || coreTroops[0].space >= (coreTroops[1]?.space || 0) * 1.5) {
              // One dominant core troop in terms of housing space
              armyType = coreTroops[0].name;
            } else {
              // Two roughly equal core troops — combine them alphabetically for consistency
              const top2 = [coreTroops[0].name, coreTroops[1].name].sort();
              armyType = `${top2[0]} & ${top2[1]}`;
              if (armyType === "Dragon & Dragon Rider") {
                armyType = "Hydra";
              }
            }

            // Build prefixes (go at the front of the army name)
            const prefixes: string[] = [];
            const eqSpells = allSpellCounts["Earthquake Spell"] || 0;

            // Charge detection: 4+ invis spells + Spirit Fox on RC or Duke
            const invisSpells = allSpellCounts["Invisibility Spell"] || 0;
            const hasFireballOrMonolith = equipNames.has("Fireball") || equipNames.has("Monolith Arrow");
            if (invisSpells >= 4 && !hasFireballOrMonolith) {
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

            // Fireball prefix
            const hasFireball = equipNames.has("Fireball");

            // Flame Blower prefix (Dragon Duke equipment)
            const dukeHero = attackHeroes.find(h => h.hero === "Dragon Duke");
            const hasFlameBlower = dukeHero && equipNames.has("Flame Blower");

            if (hasFlameBlower) {
              const minEqRequired = hasFireball ? 3 : 1;
              if (eqSpells >= minEqRequired) {
                prefixes.push("Flame Blower");
              }
            }

            if (hasFireball) {
              prefixes.push("Fireball");
            }

            // Rocket Backpack prefix
            if (equipNames.has("Giant Arrow") && equipNames.has("Rocket Backpack") && eqSpells >= 3) {
              prefixes.push("Rocket Backpack");
            }

            if (prefixes.length > 0) {
              armyType = `${prefixes.join(" ")} ${armyType}`;
            }

            playerArmies[armyType] = (playerArmies[armyType] || 0) + 1;
            if (!playerHeroData[armyType]) playerHeroData[armyType] = [];
            playerHeroData[armyType].push({
              heroes: attackHeroes,
              troopCounts: allTroopCounts,
              mainTroopCounts,
              ccTroopCounts,
              spellCounts: allSpellCounts,
              mainSpellCounts,
              ccSpellCounts,
              shareCode: attack.armyShareCode
            });
          }

          for (const st of playerSuperTroops) {
            stats.superTroops[st] = (stats.superTroops[st] || 0) + 1;
          }

          let mainArmyType = null;
          let maxCount = 0;
          for (const [aType, count] of Object.entries(playerArmies)) {
            globalArmyBattlesCount[aType] = (globalArmyBattlesCount[aType] || 0) + count;
            if (count > maxCount) {
              maxCount = count;
              mainArmyType = aType;
            }
          }

          let bestAttack = null;
          if (mainArmyType && playerHeroData[mainArmyType].length > 0) {
            const attacks = playerHeroData[mainArmyType];
            
            // 1. Calculate average count for each troop and spell across all attacks of this army type
            const unitAverages: Record<string, number> = {};
            const unitNames = new Set<string>();
            for (const attack of attacks) {
              for (const [name] of Object.entries(attack.troopCounts as Record<string, number>)) {
                unitNames.add(name);
              }
              for (const [name] of Object.entries(attack.spellCounts as Record<string, number>)) {
                unitNames.add(name);
              }
            }
            for (const name of unitNames) {
              let total = 0;
              for (const attack of attacks) {
                total += (attack.troopCounts[name] || attack.spellCounts[name] || 0);
              }
              unitAverages[name] = total / attacks.length;
            }

            // 2. Score each attack based on similarity to the average (lower distance is better)
            let bestSourceAttack = attacks[0];
            let minDistance = Infinity;
            let maxTotalUnits = -1;

            for (const attack of attacks) {
              let distance = 0;
              let totalUnits = 0;
              for (const name of unitNames) {
                const count = (attack.troopCounts[name] || attack.spellCounts[name] || 0);
                distance += Math.abs(count - unitAverages[name]);
                totalUnits += count;
              }

              // We want to minimize distance. If distance is equal, we maximize totalUnits as a tie-breaker.
              if (distance < minDistance || (Math.abs(distance - minDistance) < 1e-9 && totalUnits > maxTotalUnits)) {
                minDistance = distance;
                maxTotalUnits = totalUnits;
                bestSourceAttack = attack;
              }
            }

            // 3. Reconstruct the full trained army using capacity-constrained greedy merge
            bestAttack = {
              ...bestSourceAttack,
              troopCounts: mergeCounts(attacks, 'troopCounts', TROOP_HOUSING_SPACES, bestSourceAttack, 407),
              mainTroopCounts: mergeCounts(attacks, 'mainTroopCounts', TROOP_HOUSING_SPACES, bestSourceAttack, 352),
              ccTroopCounts: mergeCounts(attacks, 'ccTroopCounts', TROOP_HOUSING_SPACES, bestSourceAttack, 55),
              mainSpellCounts: mergeCounts(attacks, 'mainSpellCounts', SPELL_HOUSING_SPACES, bestSourceAttack, 11),
              ccSpellCounts: mergeCounts(attacks, 'ccSpellCounts', SPELL_HOUSING_SPACES, bestSourceAttack, 4),
              shareCode: bestSourceAttack.shareCode
            };
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
            rank: rankingPlayer.rank || 0,
            name: rankingPlayer.name,
            tag: tag,
            trophies: rankingPlayer.trophies || 0,
            clanName: rankingPlayer.clan ? rankingPlayer.clan.name : '',
            clanBadge: rankingPlayer.clan && rankingPlayer.clan.tag && clanBadgesCache[rankingPlayer.clan.tag]
              ? 'https://images.weserv.nl/?url=' + encodeURIComponent(clanBadgesCache[rankingPlayer.clan.tag]) + '&w=32&h=32' 
              : '',
            armyType: mainArmyType || "Unknown",
            heroes: bestAttack ? bestAttack.heroes : [],
            siegeMachine: bestSiegeMachine,
            superTroops: bestSuperTroops,
            armyLink: armyLink,
            troops: bestAttack ? Object.entries(bestAttack.mainTroopCounts)
              .filter(([name]) => !ALL_SIEGE_MACHINES.has(name))
              .map(([name, count]) => ({ name, count }))
              .sort((a, b) => {
                const spaceA = a.count * (TROOP_HOUSING_SPACES[a.name] || 1);
                const spaceB = b.count * (TROOP_HOUSING_SPACES[b.name] || 1);
                if (spaceB !== spaceA) return spaceB - spaceA;
                return b.count - a.count;
              }) : [],
            spells: bestAttack ? Object.entries(bestAttack.mainSpellCounts)
              .map(([name, count]) => ({ name, count }))
              .sort((a, b) => {
                const spaceA = a.count * (SPELL_HOUSING_SPACES[a.name] || 1);
                const spaceB = b.count * (SPELL_HOUSING_SPACES[b.name] || 1);
                if (spaceB !== spaceA) return spaceB - spaceA;
                return b.count - a.count;
              }) : [],
            ccTroops: bestAttack ? Object.entries(bestAttack.ccTroopCounts)
              .filter(([name]) => !ALL_SIEGE_MACHINES.has(name))
              .map(([name, count]) => ({ name, count }))
              .sort((a, b) => {
                const spaceA = a.count * (TROOP_HOUSING_SPACES[a.name] || 1);
                const spaceB = b.count * (TROOP_HOUSING_SPACES[b.name] || 1);
                if (spaceB !== spaceA) return spaceB - spaceA;
                return b.count - a.count;
              }) : [],
            ccSpells: bestAttack ? Object.entries(bestAttack.ccSpellCounts)
              .map(([name, count]) => ({ name, count }))
              .sort((a, b) => {
                const spaceA = a.count * (SPELL_HOUSING_SPACES[a.name] || 1);
                const spaceB = b.count * (SPELL_HOUSING_SPACES[b.name] || 1);
                if (spaceB !== spaceA) return spaceB - spaceA;
                return b.count - a.count;
              }) : []
          });

          if (mainArmyType) {
            if (!stats.armies[mainArmyType]) {
              stats.armies[mainArmyType] = { count: 0, battlesCount: 0, playerTags: new Set(), heroes: {}, troopTotals: {} };
            }
            stats.armies[mainArmyType].count++;
            stats.armies[mainArmyType].playerTags.add(tag);

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
      const representativePlayer = stats.topPlayersList.find(p => p.armyType === armyName);
      formattedArmies.push({
        name: armyName,
        usage: stats.playersAnalyzed ? (armyStat.count / stats.playersAnalyzed) * 100 : 0,
        count: armyStat.count,
        battlesCount: globalArmyBattlesCount[armyName] || 0,
        playerCount: armyStat.playerTags.size,
        topHeroes,
        topSecondaryTroops,
        topSiegeMachine,
        troops: representativePlayer ? representativePlayer.troops : [],
        spells: representativePlayer ? representativePlayer.spells : [],
        ccTroops: representativePlayer ? representativePlayer.ccTroops : [],
        ccSpells: representativePlayer ? representativePlayer.ccSpells : []
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
      outputData.heroes.push({ name: heroName, usage: parseFloat(usagePct.toFixed(1)) });

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

    // Write tiny last-updated.json to public/ for the client-side auto-refresh check
    const lastUpdatedPath = path.join(process.cwd(), 'public', 'last-updated.json');
    fs.writeFileSync(lastUpdatedPath, JSON.stringify({ lastUpdated: outputData.lastUpdated }));
    console.log("Successfully wrote public/last-updated.json!");

  } catch (err) {
    console.error("Failed to fetch data:", err);
    process.exit(1);
  }
}

fetchMeta();
