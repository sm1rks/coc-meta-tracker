import fs from 'fs';
import { PetMap } from '../src/data/UnitMap.js';

const data = JSON.parse(fs.readFileSync('./data/meta.json', 'utf-8'));
// Oh wait, meta.json doesn't have raw share codes anymore.
// Let's parse the actual API data if we saved it? No, fetch-meta.ts doesn't save raw API data.
// Let's modify fetch-meta.ts to just print unmapped pet IDs!
