import type { ClanCastleComboStat, MetaData, UsageStat } from '../types.js';

export interface StatSummary {
  usage: number;
  threeStarRate?: number;
}

export interface MetaSummary {
  lastUpdated: string;
  armies: Record<string, StatSummary>;
  heroes: Record<string, StatSummary>;
  combos: Record<string, StatSummary>;
  pets: Record<string, StatSummary>;
  superTroops: Record<string, StatSummary>;
  siegeMachines: Record<string, StatSummary>;
  squads: Record<string, StatSummary>;
  spells: Record<string, StatSummary>;
  ccTroopCombos: Record<string, StatSummary>;
  ccSpells: Record<string, StatSummary>;
}

const round1 = (n: number) => parseFloat(n.toFixed(1));

function toSummaryMap<T extends { name: string; usage: number; threeStarRate?: number }>(
  items: T[] = [],
  keyFn: (item: T) => string = (item) => item.name
): Record<string, StatSummary> {
  const map: Record<string, StatSummary> = {};
  for (const item of items) {
    const entry: StatSummary = { usage: round1(item.usage) };
    if (item.threeStarRate !== undefined) {
      entry.threeStarRate = round1(item.threeStarRate);
    }
    map[keyFn(item)] = entry;
  }
  return map;
}

export function buildMetaSummary(meta: MetaData): MetaSummary {
  const ccTroopCombos: Record<string, StatSummary> = {};
  for (const c of meta.ccTroopCombos || []) {
    const entry: StatSummary = { usage: round1(c.usage) };
    if (c.threeStarRate !== undefined) entry.threeStarRate = round1(c.threeStarRate);
    ccTroopCombos[c.key] = entry;
  }

  return {
    lastUpdated: meta.lastUpdated,
    armies: toSummaryMap(meta.armies || []),
    heroes: toSummaryMap(meta.heroes || []),
    combos: toSummaryMap(meta.combos || [], (c) => `${c.hero || ''}::${c.name}`),
    pets: toSummaryMap(meta.pets || [], (p) => `${p.hero || ''}::${p.name}`),
    superTroops: toSummaryMap(meta.superTroops || []),
    siegeMachines: toSummaryMap(meta.siegeMachines || []),
    squads: toSummaryMap(meta.squads || []),
    spells: toSummaryMap(meta.spells || []),
    ccTroopCombos,
    ccSpells: toSummaryMap(meta.ccSpells || []),
  };
}

export function isValidTrendBaseline(
  prevTimestamp: string | undefined,
  currentTimestamp: string,
  minAgeHours = 12
): boolean {
  if (!prevTimestamp) return false;
  const prevMs = Date.parse(prevTimestamp);
  const currMs = Date.parse(currentTimestamp);
  if (Number.isNaN(prevMs) || Number.isNaN(currMs)) return false;
  const ageHours = (currMs - prevMs) / (1000 * 60 * 60);
  return ageHours >= minAgeHours;
}

function applyItemDeltas<T extends { usage: number; usageDelta?: number; threeStarRate?: number; threeStarDelta?: number }>(
  items: T[] = [],
  prevMap: Record<string, StatSummary> = {},
  keyFn: (item: T) => string
): void {
  for (const item of items) {
    const prev = prevMap[keyFn(item)];
    if (!prev) continue;
    const uDelta = round1(round1(item.usage) - prev.usage);
    if (Math.abs(uDelta) >= 0.1) {
      item.usageDelta = uDelta;
    }
    if (item.threeStarRate !== undefined && prev.threeStarRate !== undefined) {
      const sDelta = round1(round1(item.threeStarRate) - prev.threeStarRate);
      if (Math.abs(sDelta) >= 0.1) {
        item.threeStarDelta = sDelta;
      }
    }
  }
}

export function applyTrends(meta: MetaData, prev: MetaSummary): void {
  meta.prevUpdated = prev.lastUpdated;
  applyItemDeltas(meta.armies, prev.armies, (a) => a.name);
  applyItemDeltas(meta.heroes, prev.heroes, (h) => h.name);
  applyItemDeltas(meta.combos, prev.combos, (c) => `${c.hero || ''}::${c.name}`);
  applyItemDeltas(meta.pets, prev.pets, (p) => `${p.hero || ''}::${p.name}`);
  applyItemDeltas(meta.superTroops, prev.superTroops, (s) => s.name);
  applyItemDeltas(meta.siegeMachines, prev.siegeMachines, (m) => m.name);
  applyItemDeltas(meta.squads || [], prev.squads, (q) => q.name);
  applyItemDeltas(meta.spells || [], prev.spells, (s) => s.name);
  applyItemDeltas<ClanCastleComboStat>(meta.ccTroopCombos || [], prev.ccTroopCombos, (c) => c.key);
  applyItemDeltas<UsageStat>(meta.ccSpells || [], prev.ccSpells, (s) => s.name);
}
