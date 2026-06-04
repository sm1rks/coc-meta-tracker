import fs from 'fs';
import data from './raw_data.json';

const TroopMap: Record<number, string> = {};
const SpellMap: Record<number, string> = {};
const PetMap: Record<number, string> = {};

data.RAW_UNITS.forEach((e: any) => {
  if (e.category === 'troop' && !e.name.includes("L.A.S.S.I") && !e.name.includes("Mighty Yak") && !e.name.includes("Electro Owl") && !e.name.includes("Unicorn") && !e.name.includes("Phoenix") && !e.name.includes("Poison Lizard") && !e.name.includes("Diggy") && !e.name.includes("Frosty") && !e.name.includes("Spirit Fox") && !e.name.includes("Angry Jelly")) {
    TroopMap[e.id] = e.name;
  }
  if (e.category === 'spell') SpellMap[e.id] = e.name;
  
  // Pets are actually labeled as 'troop' in RAW_UNITS, but their ID in the armyShareCode is mapped to 'p'!
  // Let's just create a PetMap manually or catch them:
  if (e.name === "L.A.S.S.I") PetMap[0] = e.name;
  if (e.name === "Mighty Yak") PetMap[1] = e.name;
  if (e.name === "Electro Owl") PetMap[2] = e.name;
  if (e.name === "Unicorn") PetMap[3] = e.name;
  if (e.name === "Phoenix") PetMap[4] = e.name;
  if (e.name === "Poison Lizard") PetMap[7] = e.name;
  if (e.name === "Diggy") PetMap[8] = e.name;
  if (e.name === "Frosty") PetMap[9] = e.name;
  if (e.name === "Spirit Fox") PetMap[10] = e.name;
  if (e.name === "Angry Jelly") PetMap[11] = e.name;
});

const content = `// Auto-generated mappings
export const TroopMap: Record<number, string> = ${JSON.stringify(TroopMap, null, 2)};
export const SpellMap: Record<number, string> = ${JSON.stringify(SpellMap, null, 2)};
export const PetMap: Record<number, string> = ${JSON.stringify(PetMap, null, 2)};
`;

fs.writeFileSync('../src/data/UnitMap.ts', content);
console.log('Successfully wrote src/data/UnitMap.ts');

