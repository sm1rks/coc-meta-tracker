const fs = require('fs');
const code = fs.readFileSync('scripts/fetch-meta.ts', 'utf8');
const script = code.replace(
  'const armyName =',
  'if (coreTroop === "Thrower") { console.log(JSON.stringify(troopCounts, null, 2)); } const armyName ='
);
fs.writeFileSync('scratch/test6.ts', script);
