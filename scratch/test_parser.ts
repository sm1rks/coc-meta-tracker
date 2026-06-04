export function decodeArmyShareCode(code: string) {
  // e.g. G...u10x12-15x13s2x4-1x5h0p9e32_14-1p16e17_48
  // Actually, we don't need to parse troops and spells for the Most Used Army Types card!
  // Wait, the Most Used Army Types card DOES need to know the Army Type (e.g. Lavaloon).
  // To know the Army Type, we need to know the troops used!
  // But for the MVP, let's just extract the equipment IDs!
  
  const equipmentIds: number[] = [];
  const matches = code.matchAll(/e(\d+)_(\d+)/g);
  for (const match of matches) {
    equipmentIds.push(parseInt(match[1], 10));
    equipmentIds.push(parseInt(match[2], 10));
  }
  return equipmentIds;
}

const testCode = "h0p9e32_14-1p16e17_48-2p7e4_19-7p10e52_59";
console.log(decodeArmyShareCode(testCode));
