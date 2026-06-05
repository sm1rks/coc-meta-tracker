import 'dotenv/config';
const $fetch = async (url: string) => {
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${process.env.COC_API_KEY}` }
  });
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
};

const BASE_URL = 'https://cocproxy.royaleapi.dev/v1';

async function run() {
  console.log('Fetching top 200 players...');
  const loc = await $fetch(`${BASE_URL}/locations/global/rankings/players`);
  const top200 = loc.items.slice(0, 200);
  console.log(`Found ${top200.length} players. Checking battlelogs...`);
  
  for (let i = 0; i < top200.length; i++) {
    const player = top200[i];
    const pTag = encodeURIComponent(player.tag);
    
    let battlelog;
    try {
      battlelog = await $fetch(`${BASE_URL}/players/${pTag}/battlelog`);
    } catch (e) {
      console.log(`[Rank ${i+1}] Player ${player.name} (${player.tag}) API Error fetching battlelog.`);
      continue;
    }
    
    if (!battlelog || !battlelog.items || battlelog.items.length === 0) {
      console.log(`[Rank ${i+1}] Player ${player.name} (${player.tag}) has an EMPTY battlelog.`);
      continue;
    }
    
    const rankedAttacks = battlelog.items.filter((b: any) => b.attack === true && b.battleType === 'ranked');
    if (rankedAttacks.length === 0) {
      console.log(`[Rank ${i+1}] Player ${player.name} (${player.tag}) has NO ranked attacks in log.`);
      continue;
    }
    
    let hasShareCode = false;
    for (const attack of rankedAttacks) {
      if (attack.armyShareCode) hasShareCode = true;
    }
    
    if (!hasShareCode) {
      console.log(`[Rank ${i+1}] Player ${player.name} (${player.tag}) has ${rankedAttacks.length} ranked attacks, but NONE have an armyShareCode.`);
    }
  }
  console.log('Done checking 200 players.');
}
run();
