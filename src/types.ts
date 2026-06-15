export interface HeroStat {
  name: string;
  equipment: string | null;
  pet: string | null;
}

export interface PlayerData {
  rank: number;
  name: string;
  tag: string;
  trophies: number;
  clanName: string;
  clanBadge: string;
  armyType: string;
  heroes?: { hero: string, combo: string|null, pet: string|null }[];
  siegeMachine?: string | null;
  superTroops?: string[];
  armyLink?: string;
  troops?: { name: string, count: number }[];
  spells?: { name: string, count: number }[];
  ccTroops?: { name: string, count: number }[];
  ccSpells?: { name: string, count: number }[];
}

export interface ArmyData {
  name: string; 
  usage: number;
  count?: number;
  battlesCount?: number;
  playerCount?: number;
  topHeroes?: HeroStat[];
  topSuperTroops?: string[];
  topSecondaryTroops?: string[];
  topSiegeMachine?: string | null;
  troops?: { name: string, count: number }[];
  spells?: { name: string, count: number }[];
  ccTroops?: { name: string, count: number }[];
  ccSpells?: { name: string, count: number }[];
}

export interface UsageStat {
  name: string;
  usage: number;
  hero?: string;
}

export interface MetaData {
  lastUpdated: string;
  playersAnalyzed: number;
  attacksAnalyzed: number;
  topPlayers: PlayerData[];
  heroes: UsageStat[];
  equipments: UsageStat[];
  combos: UsageStat[];
  pets: UsageStat[];
  superTroops: UsageStat[];
  siegeMachines: UsageStat[];
  armies: ArmyData[];
}
