import 'dotenv/config';


const API_KEY = process.env.COC_API_KEY;
const BASE_URL = 'https://cocproxy.royaleapi.dev/v1';

async function checkPets() {
  const res = await fetch(`${BASE_URL}/locations/32000006/rankings/players?limit=200`, {
    headers: { Authorization: `Bearer ${API_KEY}` }
  });
  const data = await res.json();
  const tags = data.items.map(p => p.tag.replace('#', '%23'));
  
  const petIds = new Set();
  
  for (let i = 0; i < 50; i++) {
    const pRes = await fetch(`${BASE_URL}/players/${tags[i]}`, {
      headers: { Authorization: `Bearer ${API_KEY}` }
    });
    const pData = await pRes.json();
    if (pData.playerBattleLog) {
      for (const atk of pData.playerBattleLog) {
        if (atk.armyShareCode) {
          const hMatch = atk.armyShareCode.match(/h([^\-dsu]+(?:-[^\-dsu]+)*)/);
          if (hMatch) {
            const heroesList = hMatch[1].split('-');
            for (const h of heroesList) {
              const pMatch = h.match(/p(\d+)/);
              if (pMatch) petIds.add(parseInt(pMatch[1]));
            }
          }
        }
      }
    }
  }
  console.log("Found Pet IDs:", Array.from(petIds).sort((a,b)=>a-b));
}
checkPets();
