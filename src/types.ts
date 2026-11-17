export interface HeroStat {
  name: string;
  equipment: string | null;
  pet: string | null;
}

export interface BattleEntry {
  attack: boolean;
  battleType: string;
  stars: number;
  destructionPercentage: number;
  opponentName: string;
  battleTimestamp: string;
  battleTime?: number;
  armyType?: string;
  armyLink?: string;
}

export interface PlayerData {
  rank: number;
  name: string;
  tag: string;
  trophies: number;
  attackWins?: number;
  defenseWins?: number;
  prevSeasonRank?: number;
  prevSeasonTrophies?: number;
  clanName: string;
  clanBadge: string;
  armyType: string;
  attackCount?: number;
  threeStarCount?: number;
  defenseCount?: number;
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
  usageDelta?: number;
  count?: number;
  battlesCount?: number;
  threeStarCount?: number;
  threeStarRate?: number;
  threeStarDelta?: number;
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
  usageDelta?: number;
  threeStarCount?: number;
  threeStarRate?: number;
  threeStarDelta?: number;
  hero?: string;
}

export interface ClanCastleComboStat {
  key: string;
  units: { name: string; count: number }[];
  usage: number;
  count: number;
  usageDelta?: number;
  threeStarCount?: number;
  threeStarRate?: number;
  threeStarDelta?: number;
}

export interface MetaData {
  lastUpdated: string;
  prevUpdated?: string;
  playersAnalyzed: number;
  attacksAnalyzed: number;
  topPlayers: PlayerData[];
  heroes: UsageStat[];
  equipments: UsageStat[];
  combos: UsageStat[];
  pets: UsageStat[];
  superTroops: UsageStat[];
  siegeMachines: UsageStat[];
  squads?: UsageStat[];
  spells?: UsageStat[];
  ccTroopCombos?: ClanCastleComboStat[];
  ccSpells?: UsageStat[];
  armies: ArmyData[];
}
