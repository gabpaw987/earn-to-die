import type { UpgradeDef, UpgradeKey, OwnedTiers, UpgradeStats } from '../types';

/**
 * Upgrade catalog. tiers[0] is the free starting tier (cost ignored).
 * `value` semantics per category:
 *  - engine:  drive power multiplier
 *  - wheels:  grip/climb multiplier
 *  - fuel:    max fuel (absolute, litres)
 *  - armor:   impact resistance 0..1 (fraction of speed loss negated)
 *  - weapon:  weapon level (0 none, 1+ fire rate tiers)
 *  - booster: nitro charges per run
 */
export const UPGRADES: Record<UpgradeKey, UpgradeDef> = {
  engine: {
    key: 'engine',
    name: 'Engine',
    blurb: 'Top speed & torque. The single biggest factor in distance.',
    tiers: [
      { label: 'Stock I4', cost: 0, value: 1.0 },
      { label: 'Tuned I4', cost: 250, value: 1.22 },
      { label: 'V6', cost: 650, value: 1.48 },
      { label: 'V8', cost: 1500, value: 1.78 },
      { label: 'Supercharged', cost: 3400, value: 2.15 },
    ],
  },
  wheels: {
    key: 'wheels',
    name: 'Wheels',
    blurb: 'Grip, hill-climb, and softer landings so you flip less.',
    tiers: [
      { label: 'Bald street', cost: 0, value: 1.0 },
      { label: 'All-season', cost: 200, value: 1.18 },
      { label: 'Off-road', cost: 560, value: 1.4 },
      { label: 'Monster', cost: 1400, value: 1.7 },
    ],
  },
  fuel: {
    key: 'fuel',
    name: 'Fuel Tank',
    blurb: 'Bonus fuel on top of your vehicle tank = a longer run.',
    tiers: [
      { label: 'Stock', cost: 0, value: 0 },
      { label: '+50L', cost: 240, value: 50 },
      { label: '+110L', cost: 650, value: 110 },
      { label: '+180L', cost: 1400, value: 180 },
      { label: '+270L', cost: 3000, value: 270 },
    ],
  },
  armor: {
    key: 'armor',
    name: 'Armor',
    blurb: 'Plow through the horde with far less speed loss on impact.',
    tiers: [
      { label: 'None', cost: 0, value: 0.0 },
      { label: 'Bull bar', cost: 240, value: 0.3 },
      { label: 'Plated', cost: 680, value: 0.55 },
      { label: 'Tank hull', cost: 1600, value: 0.78 },
    ],
  },
  weapon: {
    key: 'weapon',
    name: 'Weapon',
    blurb: 'Roof-mounted gun. Hold SPACE to clear zombies ahead.',
    tiers: [
      { label: 'Unarmed', cost: 0, value: 0 },
      { label: 'Pistol', cost: 300, value: 1 },
      { label: 'SMG', cost: 850, value: 2 },
      { label: 'Minigun', cost: 2100, value: 3 },
    ],
  },
  booster: {
    key: 'booster',
    name: 'Nitro',
    blurb: 'Limited boost charges per run for big speed and jumps.',
    tiers: [
      { label: 'None', cost: 0, value: 0 },
      { label: '1 charge', cost: 260, value: 1 },
      { label: '2 charges', cost: 720, value: 2 },
      { label: '4 charges', cost: 1700, value: 4 },
    ],
  },
};

export const UPGRADE_ORDER: UpgradeKey[] = [
  'engine',
  'wheels',
  'fuel',
  'armor',
  'weapon',
  'booster',
];

export function defaultTiers(): OwnedTiers {
  return { engine: 0, wheels: 0, fuel: 0, armor: 0, weapon: 0, booster: 0 };
}

/** Resolve owned tier indices into upgrade-only stats (vehicle base applied later). */
export function resolveStats(tiers: OwnedTiers): UpgradeStats {
  const v = (k: UpgradeKey) =>
    UPGRADES[k].tiers[Math.min(tiers[k], UPGRADES[k].tiers.length - 1)].value;
  return {
    engine: v('engine'),
    wheels: v('wheels'),
    fuelBonus: v('fuel'),
    armor: v('armor'),
    weaponLevel: v('weapon'),
    boosterCharges: v('booster'),
  };
}

/** The next purchasable tier for a category, or null if maxed. */
export function nextTier(key: UpgradeKey, owned: number) {
  const def = UPGRADES[key];
  const idx = owned + 1;
  if (idx >= def.tiers.length) return null;
  return { index: idx, tier: def.tiers[idx] };
}
