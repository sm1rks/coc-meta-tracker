import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const key = process.env.COC_API_KEY;

async function run() {
  const rankRes = await fetch('https://cocproxy.royaleapi.dev/v1/locations/global/rankings/players?limit=1', {
    headers: { Authorization: `Bearer ${key}` }
  });
  const rankData = await rankRes.json();
  const playerTag = rankData.items[0].tag.replace('#', '%23');

  const playerRes = await fetch(`https://cocproxy.royaleapi.dev/v1/players/${playerTag}`, {
    headers: { Authorization: `Bearer ${key}` }
  });
  const player = await playerRes.json();

  const battleRes = await fetch(`https://cocproxy.royaleapi.dev/v1/players/${playerTag}/battlelog`, {
    headers: { Authorization: `Bearer ${key}` }
  });
  const battles = await battleRes.json();

  console.log("=== Player Hero Equipment ===");
  console.log(JSON.stringify(player.heroEquipment, null, 2));

  console.log("\n=== Latest Attack BattleLog ===");
  const latestAttack = battles.items.find(b => b.attack === true);
  console.log(`Army Share Code: ${latestAttack?.armyShareCode}`);
}

run();
