/**
 * Pure data: the roster of purchasable/selectable vehicles.
 * No Phaser imports here — consumed by the garage UI and the car factory alike.
 */

/** Static definition for one vehicle. */
export interface VehicleDef {
  /** Unique key — used as a texture prefix and the save-game identifier. */
  key: string;
  /** Display name in the garage. */
  name: string;
  /** Purchase cost in cash. 0 = free starter. */
  cost: number;
  /** One-line garage flavour text. */
  blurb: string;
  /** Multiplier on the base wheel-motor speed/torque (PHYSICS). 1.0 = truck. */
  baseEngine: number;
  /** Multiplier on wheel grip/friction. 1.0 = truck. */
  baseWheels: number;
  /** Starting fuel capacity in litres (overrides FUEL.baseMax). */
  baseFuel: number;
  /** Chassis density scalar. <1 lighter/faster, >1 heavier/plows harder. */
  mass: number;
  /** Chassis tint as 0xRRGGBB. */
  chassisColor: number;
}

/** The full roster, ordered cheapest-first for the garage carousel. */
export const VEHICLES: VehicleDef[] = [
  {
    key: 'truck',
    name: 'Rustbucket',
    cost: 0,
    blurb: 'A dented pick-up held together by duct tape. Gets the job done.',
    baseEngine: 1.0,
    baseWheels: 1.0,
    baseFuel: 100,
    mass: 1.0,
    chassisColor: 0xb23a2f,
  },
  {
    key: 'muscle',
    name: 'Muscle Car',
    cost: 1500,
    blurb: "Screaming V8. Light body, questionable grip — but god it's fast.",
    baseEngine: 1.35,
    baseWheels: 0.95,
    baseFuel: 90,
    mass: 0.85,
    chassisColor: 0x2d6cdf,
  },
  {
    key: 'rig',
    name: 'War Rig',
    cost: 4000,
    blurb: 'Armoured eighteen-wheeler. Slow but unstoppable. Plows the horde.',
    baseEngine: 1.1,
    baseWheels: 1.2,
    baseFuel: 160,
    mass: 1.6,
    chassisColor: 0x4a5a3a,
  },
];

/** Key of the free starter vehicle. */
export const DEFAULT_VEHICLE = 'truck';

/** Look up a vehicle by key; falls back to the starter for unknown keys. */
export function getVehicle(key: string): VehicleDef {
  return VEHICLES.find((v) => v.key === key) ?? VEHICLES[0];
}
