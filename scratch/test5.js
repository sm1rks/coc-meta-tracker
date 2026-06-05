const data = require('./data/meta.json');
const throwerArmy = data.armies.find(a => a.name.includes('Thrower'));
console.log('Thrower army in meta.json:', JSON.stringify(throwerArmy, null, 2));

// find actual players that use Thrower
// We don't have raw share codes in meta.json.
