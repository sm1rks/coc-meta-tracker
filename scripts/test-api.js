import 'dotenv/config';
import fs from 'fs';

const API_KEY = process.env.COC_API_KEY;
const BASE_URL = 'https://api.clashofclans.com/v1';

async function test() {
  try {
    console.log("Fetching global rankings...");
    let res = await fetch(`${BASE_URL}/locations/global/rankings/players?limit=5`, { headers: { Authorization: `Bearer ${API_KEY}` } });
    if (!res.ok) throw new Error(await res.text());
    let data = await res.json();
    console.log("Got players!", data.items.length);
    const playerTag = data.items[0].tag.replace('#', '%23');
    console.log("Fetching player:", playerTag);
    res = await fetch(`${BASE_URL}/players/${playerTag}`, { headers: { Authorization: `Bearer ${API_KEY}` } });
    const player = await res.json();
    fs.writeFileSync('data/player.json', JSON.stringify(player, null, 2));
    console.log("Success! Wrote data/player.json");
  } catch (err) {
    console.error(err);
  }
}
test();
