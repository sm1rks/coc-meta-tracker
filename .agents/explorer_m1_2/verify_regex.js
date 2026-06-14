const shareCode = "u2x1-3x2h0e10_51-1e15_3p4i5x3s1x2";
// Current regex in scripts/fetch-meta.ts
const currentRegex = /h([^\-dsu]+(?:-[^\-dsu]+)*)/;
// Proposed regex
const proposedRegex = /h([^\-dsui]+(?:-[^\-dsui]+)*)/;

const currentMatch = shareCode.match(currentRegex);
const proposedMatch = shareCode.match(proposedRegex);

console.log("Input Share Code:", shareCode);
console.log("Current Regex Match:", currentMatch ? currentMatch[0] : "null");
console.log("Current Captured Section:", currentMatch ? currentMatch[1] : "null");
console.log("Proposed Regex Match:", proposedMatch ? proposedMatch[0] : "null");
console.log("Proposed Captured Section:", proposedMatch ? proposedMatch[1] : "null");

// Let's test how they are parsed as hero strings:
if (currentMatch) {
  const heroesList = currentMatch[1].split('-');
  console.log("Current split heroes list:", heroesList);
  heroesList.forEach(heroStr => {
    const idMatch = heroStr.match(/^(\d+)/);
    const pMatch = heroStr.match(/p(\d+)/);
    const eMatch = heroStr.match(/e(\d+)(?:_(\d+))?/);
    console.log(`  HeroStr: "${heroStr}" -> idMatch: ${!!idMatch}, eMatch: ${!!eMatch}, pMatch: ${!!pMatch}`);
  });
}
if (proposedMatch) {
  const heroesList = proposedMatch[1].split('-');
  console.log("Proposed split heroes list:", heroesList);
  heroesList.forEach(heroStr => {
    const idMatch = heroStr.match(/^(\d+)/);
    const pMatch = heroStr.match(/p(\d+)/);
    const eMatch = heroStr.match(/e(\d+)(?:_(\d+))?/);
    console.log(`  HeroStr: "${heroStr}" -> idMatch: ${!!idMatch}, eMatch: ${!!eMatch}, pMatch: ${!!pMatch}`);
  });
}
