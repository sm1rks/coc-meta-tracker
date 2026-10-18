import fs from 'fs';
import path from 'path';
import type { MetaData } from '../types';

export function getMetaData(): MetaData | null {
  const dataPath = path.join(process.cwd(), 'data', 'meta.json');
  let metaData: MetaData | null = null;

  try {
    if (fs.existsSync(dataPath)) {
      metaData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    }
  } catch (e) {
    console.error("Error reading meta data:", e);
  }

  return metaData;
}

// Troops that primarily serve as cleanup/follow-up in dedicated Fireball Value attacks
const FIREBALL_VALUE_TROOPS = new Set([
  "Ruin Witch",
  "Rocket Balloon",
  "Super Minion",
  "Rocket Balloon & Super Minion",
  "Furnace",
  "Healer"
]);

// Helper to get overarching archetype name by stripping opener/equipment prefixes
export function getCoreArmyName(fullName: string): string {
  const hasFireball = fullName.includes("Fireball");
  let name = fullName;
  const prefixes = [
    "Royal Champion Charge",
    "Dragon Duke Charge",
    "Queen Charge",
    "Flame Blower",
    "Fireball",
    "Rocket Backpack"
  ];
  let changed = true;
  while (changed) {
    changed = false;
    for (const prefix of prefixes) {
      if (name.startsWith(prefix + " ")) {
        name = name.slice(prefix.length + 1).trim();
        changed = true;
      } else if (name === prefix) {
        name = "";
        changed = true;
      }
    }
  }
  const baseTroop = name || "Unknown";
  if (hasFireball && (FIREBALL_VALUE_TROOPS.has(baseTroop) || baseTroop === "Unknown")) {
    return "Fireball Value";
  }
  return baseTroop;
}

