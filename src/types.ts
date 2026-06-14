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
  /** Vehicle keys the player owns. */
  ownedVehicles: string[];
  /** Currently selected vehicle key. */
  selectedVehicle: string;
  /** Audio muted? */
  muted: boolean;
  /** Best kill-combo ever reached. */
  bestCombo: number;
  /** Lifetime stunts landed. */
  lifetimeStunts: number;
}

/** Resolved values from upgrade tiers only (before vehicle base is applied). */
export interface UpgradeStats {
  engine: number;
  wheels: number;
  /** Bonus fuel litres added on top of the vehicle's base tank. */
  fuelBonus: number;
  armor: number;
  weaponLevel: number; // 0 = none
  boosterCharges: number;
}

/** Effective, resolved car stats after combining vehicle base + upgrade tiers. */
export interface CarStats {
  engine: number;
  wheels: number;
  maxFuel: number;
  armor: number;
  weaponLevel: number; // 0 = none
  boosterCharges: number;
  /** Chassis density scalar (from the vehicle). */
  mass: number;
  /** Chassis tint 0xRRGGBB (from the vehicle). */
  chassisColor: number;
  /** Selected vehicle key. */
  vehicleKey: string;
}

/** Summary of a finished run, handed to ResultScene. */
export interface RunResult {
  stageIndex: number;
  distanceM: number;
  kills: number;
  cashCollected: number;
  reachedEvac: boolean;
  /** Highest combo reached this run. */
  maxCombo: number;
  /** Stunts (flips / big air) landed this run. */
  stunts: number;
}
