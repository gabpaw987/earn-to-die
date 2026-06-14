/** The six upgrade categories. */
export type UpgradeKey =
  | 'engine'
  | 'wheels'
  | 'fuel'
  | 'armor'
  | 'weapon'
  | 'booster';

/** A single purchasable tier within an upgrade category. */
export interface UpgradeTier {
  /** Display label for this tier (e.g. "V6", "Off-road"). */
  label: string;
  /** Cost in cash to purchase this tier (from the previous tier). */
  cost: number;
  /** Arbitrary numeric effect; interpretation depends on the category. */
  value: number;
}

export interface UpgradeDef {
  key: UpgradeKey;
  name: string;
  blurb: string;
  /** tiers[0] is the starting (owned-by-default) tier; cost there is ignored. */
  tiers: UpgradeTier[];
}

/** Per-category owned tier index (0 = base). */
export type OwnedTiers = Record<UpgradeKey, number>;

export interface SaveData {
  cash: number;
  tiers: OwnedTiers;
  /** Highest stage index unlocked (0-based). */
  stageUnlocked: number;
  /** Best distance (metres) achieved per stage index. */
  bestDistance: Record<number, number>;
  lifetimeKills: number;
}

/** Effective, resolved car stats after applying owned upgrade tiers. */
export interface CarStats {
  engine: number;
  wheels: number;
  maxFuel: number;
  armor: number;
  weaponLevel: number; // 0 = none
  boosterCharges: number;
}

/** Definition of a single stage/level. */
export interface StageDef {
  name: string;
  /** Target distance in metres to reach evac. */
  distanceM: number;
  /** Terrain bumpiness amplitude multiplier. */
  roughness: number;
  /** Zombies per 100m (approx). */
  zombieDensity: number;
  /** Cash multiplier for this stage. */
  cashMult: number;
}

/** Summary of a finished run, handed to ResultScene. */
export interface RunResult {
  stageIndex: number;
  distanceM: number;
  kills: number;
  cashCollected: number;
  reachedEvac: boolean;
}
