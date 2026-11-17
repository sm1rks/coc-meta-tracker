/**
 * Constituent troop breakdown for each Squad (as deployed in battle).
 * Used to unwrap Squads into their underlying troops for normal army archetype classification.
 */
export const SQUAD_COMPOSITIONS: Record<string, Record<string, number>> = {
  'Barch Squad': { Barbarian: 15, Archer: 15 },
  'Giant Wizard Squad': { Giant: 3, Wizard: 5 },
  'Wall Breaker Squad': { 'Wall Breaker': 5 },
  'Minion Squad': { Minion: 8 },
  'Balloon Squad': { Balloon: 4 },
  'Golem Witch Squad': { Golem: 1, Witch: 4 },
  'Hog Rider Squad': { 'Hog Rider': 12 },
  'Miner Squad': { Miner: 10 },
  'Healer Squad': { Balloon: 1, Healer: 5 },
  'P.E.K.K.A Titan Squad': { 'P.E.K.K.A': 1, 'Electro Titan': 1 },
  'Dragons Squad': { Dragon: 2, 'Dragon Rider': 2 },
  'Dragon Squad': { Dragon: 2, 'Dragon Rider': 2 },
  'Baby Dragon Squad': { 'Baby Dragon': 3 },
};

/**
 * Fallback housing spaces for Squads whose level-varying housing_space is null in static_data.json.
 * Uses base (Level 1-2) housing space so capacity tracking remains conservative.
 */
export const SQUAD_HOUSING_SPACE_FALLBACKS: Record<string, number> = {
  'P.E.K.K.A Titan Squad': 46,
  'Baby Dragon Squad': 26,
};

/**
 * Resolves the housing space of a troop entry from static_data.json,
 * assigning 0 to Workshop siege machines and falling back for null Squad entries.
 */
export function resolveTroopHousingSpace(troop: {
  name?: string;
  production_building?: string;
  housing_space?: number | null;
}): number {
  if (troop.production_building === 'Workshop') return 0;
  if (troop.housing_space != null) return troop.housing_space;
  if (troop.name && SQUAD_HOUSING_SPACE_FALLBACKS[troop.name] !== undefined) {
    return SQUAD_HOUSING_SPACE_FALLBACKS[troop.name];
  }
  return 1;
}

/**
 * Expands any Squad entries in a troop count map into their constituent regular troops
 * so army classification treats Squads identically to their underlying troops.
 */
export function expandSquadTroops(counts: Record<string, number>): Record<string, number> {
  const expanded: Record<string, number> = {};
  for (const [name, count] of Object.entries(counts)) {
    const members = SQUAD_COMPOSITIONS[name];
    if (members) {
      for (const [memberName, memberCount] of Object.entries(members)) {
        expanded[memberName] = (expanded[memberName] || 0) + count * memberCount;
      }
    } else {
      expanded[name] = (expanded[name] || 0) + count;
    }
  }
  return expanded;
}

/**
 * Formats a descriptive tooltip for Squad units showing their constituent troops
 * (e.g. "Healer Squad (1× Balloon, 5× Healer)"), returning non-squad names unchanged.
 */
export function formatSquadTooltip(name: string): string {
  const members = SQUAD_COMPOSITIONS[name];
  if (!members) return name;
  const breakdown = Object.entries(members)
    .map(([unit, count]) => `${count}× ${unit}`)
    .join(', ');
  return `${name} (${breakdown})`;
}
