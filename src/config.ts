/**
 * Central tunable constants. Keeping balance here makes iteration painless.
 */
export const GAME = {
  width: 1280,
  height: 720,
  // World is far wider than the viewport; terrain is generated to the stage length.
  gravityY: 1.6,
  bg: '#1b2733',
} as const;

export const PHYSICS = {
  // Wheel motor: base angular speed (rad/tick) and torque-ish stiffness.
  wheelBaseSpeed: 0.22,
  wheelBaseTorque: 0.16,
  // Air control torque applied to the chassis.
  airTorque: 0.0009,
  // Damping that bleeds car speed when grinding through a zombie cluster.
  zombieDrag: 0.86,
} as const;

export const FUEL = {
  baseMax: 100,
  idleDrainPerSec: 1.2,
  throttleDrainPerSec: 7.5,
  fuelCanRestore: 28,
} as const;

export const RUN = {
  // Run ends if the car moves less than this many px over the stall window.
  stallSpeedPx: 14,
  stallWindowMs: 2600,
  // Pixels-per-metre for the distance HUD.
  pxPerMetre: 26,
} as const;

export const REWARD = {
  cashPerZombie: 6,
  cashPerMetre: 0.7,
  cashBagValue: 40,
} as const;

/** localStorage key + schema version. Bump version to migrate/reset saves. */
export const SAVE_KEY = 'earn-to-die:save:v1';

/** Scene keys, centralized to avoid stringly-typed typos. */
export const SCENES = {
  Boot: 'Boot',
  Preload: 'Preload',
  Menu: 'Menu',
  Game: 'Game',
  Ui: 'Ui',
  Result: 'Result',
  Garage: 'Garage',
  Pause: 'Pause',
} as const;

/** Texture keys generated procedurally in PreloadScene. */
export const TEX = {
  chassis: 'tex-chassis',
  wheel: 'tex-wheel',
  zombie: 'tex-zombie',
  zombieBrute: 'tex-zombie-brute',
  zombieCrawler: 'tex-zombie-crawler',
  fuelCan: 'tex-fuelcan',
  cashBag: 'tex-cashbag',
  dirt: 'tex-dirt',
  particle: 'tex-particle',
  evac: 'tex-evac',
  bullet: 'tex-bullet',
  wreck: 'tex-wreck',
  rock: 'tex-rock',
  ramp: 'tex-ramp',
  gun: 'tex-gun',
  armorPlate: 'tex-armor',
} as const;

/** Kill-combo tuning: chained kills within the window multiply cash. */
export const COMBO = {
  windowMs: 2500,
  /** cash multiplier = 1 + (combo-1) * step, capped. */
  step: 0.25,
  maxMult: 4,
} as const;

/** Stunt rewards (flips + big air while airborne). */
export const STUNT = {
  /** Degrees of rotation in the air to count as a flip. */
  flipDegrees: 320,
  flipCash: 60,
  /** Milliseconds airborne to count as "big air". */
  bigAirMs: 900,
  bigAirCash: 30,
} as const;

/** Matter collision categories (bitmask). */
export const CAT = {
  terrain: 0x0001,
  car: 0x0002,
  zombie: 0x0004,
  pickup: 0x0008,
  bullet: 0x0010,
} as const;
