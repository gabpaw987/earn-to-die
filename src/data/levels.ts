/**
 * Stage and theme definitions for Earn to Die — Evac Run.
 *
 * Fully self-contained: every type is declared here so consumers never need to
 * import from `types.ts` (which carries engine-specific fields irrelevant to
 * level/theme data). All colours are plain 0xRRGGBB integers.
 *
 * The eight stages trace a deliberate lighting arc:
 *
 *   day ──────────── dusk ──────────── night ──────────── blood moon
 *   1 Suburbs   2 Highway   3 Forest   4 Badlands
 *               5 Industrial   6 Mountain Pass   7 Frozen Wastes
 *                                                8 Blood Moon Finale
 *
 * Difficulty (distance, density, brute/crawler mix, obstacles) escalates
 * monotonically so that stage 1 is beatable with a near-stock vehicle and
 * stage 8 demands a heavily upgraded one.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Visual palette for a single stage's background. All colours are 0xRRGGBB. */
export interface Theme {
  /** Top-of-sky gradient colour (zenith). */
  skyTop: number;
  /** Bottom-of-sky gradient colour (horizon). */
  skyBottom: number;
  /** Main fill colour for the terrain bulk. */
  groundFill: number;
  /** Thin highlight line drawn along the terrain surface. */
  groundTop: number;
  /** Distant hill silhouette colour. */
  hillFar: number;
  /** Nearer hill silhouette colour. */
  hillNear: number;
  /** Which celestial body hangs in the sky. */
  celestial: 'sun' | 'moon' | 'bloodmoon';
  /**
   * Fog overlay strength as a white-sheet alpha.
   * `0` = clear, `1` = fully opaque. Typical range 0.0–0.30.
   */
  fog: number;
}

/** All data needed to configure a single stage run. */
export interface Stage {
  /** Human-readable stage name shown in the UI. */
  name: string;
  /** Distance in metres the player must cover to reach evac. */
  distanceM: number;
  /**
   * Terrain amplitude multiplier. `1.0` = baseline rolling hills;
   * values > 1 produce steeper, more punishing terrain.
   */
  roughness: number;
  /** Average zombies spawned per 100 m of terrain. */
  zombieDensity: number;
  /** Cash multiplier applied to all rewards earned in this stage. */
  cashMult: number;
  /** Visual / environmental palette. */
  theme: Theme;
  /**
   * Fraction (0–1) of the horde that are Brutes (large, tanky).
   * `brutePct + crawlerPct` must be ≤ 1; the remainder are Walkers.
   */
  brutePct: number;
  /** Fraction (0–1) of the horde that are Crawlers (low, fast). */
  crawlerPct: number;
  /** Average destructible/static obstacles placed per 100 m of terrain. */
  obstacleDensity: number;
}

// ---------------------------------------------------------------------------
// Stage data
// ---------------------------------------------------------------------------

export const STAGES: Stage[] = [
  // 1 — Suburbs ──────────────────────────────────────────────────────────────
  // Bright clear morning. Cornflower sky, lush green verges, gentle hills.
  {
    name: 'Suburbs',
    distanceM: 300,
    roughness: 0.7,
    zombieDensity: 4,
    cashMult: 1.0,
    brutePct: 0.0,
    crawlerPct: 0.1,
    obstacleDensity: 1,
    theme: {
      skyTop: 0x2f7fd0, // crisp cornflower zenith
      skyBottom: 0xbfe3f5, // soft pale-blue horizon
      groundFill: 0x6f4e2c, // warm topsoil brown
      groundTop: 0x86c63c, // bright spring grass
      hillFar: 0x6aa86a, // hazy distant treeline
      hillNear: 0x4d8a47, // closer green hills
      celestial: 'sun',
      fog: 0.0,
    },
  },

  // 2 — Highway ───────────────────────────────────────────────────────────────
  // Hazy midday. Sun-bleached blue washed by smog; dusty asphalt and scrub.
  {
    name: 'Highway',
    distanceM: 600,
    roughness: 1.0,
    zombieDensity: 6,
    cashMult: 1.3,
    brutePct: 0.05,
    crawlerPct: 0.15,
    obstacleDensity: 2,
    theme: {
      skyTop: 0x5fa0c4, // washed midday blue
      skyBottom: 0xdce8e0, // smoggy off-white horizon
      groundFill: 0x615239, // dusty earth under tarmac
      groundTop: 0x9a9a6e, // sun-dried verge scrub
      hillFar: 0x8a937a, // smog-greyed distant ridge
      hillNear: 0x6d7458, // olive-khaki near ridge
      celestial: 'sun',
      fog: 0.07,
    },
  },

  // 3 — Forest ────────────────────────────────────────────────────────────────
  // Warm late afternoon. Lowering sun, teal sky, deep mossy canopy.
  {
    name: 'Forest',
    distanceM: 900,
    roughness: 1.25,
    zombieDensity: 7,
    cashMult: 1.6,
    brutePct: 0.1,
    crawlerPct: 0.2,
    obstacleDensity: 2.5,
    theme: {
      skyTop: 0x2d6f86, // deep teal afternoon
      skyBottom: 0xe8c878, // warm gold light through the trees
      groundFill: 0x3a2c1b, // dark forest loam
      groundTop: 0x5a8a2c, // mossy ground cover
      hillFar: 0x35603a, // distant forest silhouette
      hillNear: 0x244226, // near-black canopy
      celestial: 'sun',
      fog: 0.09,
    },
  },

  // 4 — Badlands ──────────────────────────────────────────────────────────────
  // Full sunset. Violet zenith bleeding into molten orange; scorched mesas.
  {
    name: 'Badlands',
    distanceM: 1200,
    roughness: 1.5,
    zombieDensity: 8,
    cashMult: 1.9,
    brutePct: 0.15,
    crawlerPct: 0.2,
    obstacleDensity: 3,
    theme: {
      skyTop: 0x3d1763, // deep violet zenith
      skyBottom: 0xf07a2e, // molten orange horizon
      groundFill: 0x6f3415, // burnt clay
      groundTop: 0xc4682c, // scorched rock crust
      hillFar: 0x9a4424, // far mesa in sunset light
      hillNear: 0x5f2410, // near dark rock ridge
      celestial: 'sun',
      fog: 0.1,
    },
  },

  // 5 — Industrial ────────────────────────────────────────────────────────────
  // Nightfall. Moonlit factory district choked in toxic haze.
  {
    name: 'Industrial',
    distanceM: 1500,
    roughness: 1.6,
    zombieDensity: 9,
    cashMult: 2.2,
    brutePct: 0.2,
    crawlerPct: 0.25,
    obstacleDensity: 3.5,
    theme: {
      skyTop: 0x0b1020, // near-black night sky
      skyBottom: 0x223152, // sodium-lit indigo horizon
      groundFill: 0x202329, // dark concrete
      groundTop: 0x474d55, // dim grey surface
      hillFar: 0x1a2236, // distant factory skyline
      hillNear: 0x121622, // near silhouette, almost black
      celestial: 'moon',
      fog: 0.15,
    },
  },

  // 6 — Mountain Pass ─────────────────────────────────────────────────────────
  // Deep night. Cold moon over snow-dusted peaks; thin, treacherous air.
  {
    name: 'Mountain Pass',
    distanceM: 1800,
    roughness: 1.9,
    zombieDensity: 10,
    cashMult: 2.6,
    brutePct: 0.22,
    crawlerPct: 0.25,
    obstacleDensity: 4,
    theme: {
      skyTop: 0x070b16, // almost black
      skyBottom: 0x16233e, // navy horizon glow
      groundFill: 0x2b3340, // dark slate rock
      groundTop: 0xc9d6e4, // moonlit snow line
      hillFar: 0x1b2740, // distant jagged peaks
      hillNear: 0x283242, // near cliff face
      celestial: 'moon',
      fog: 0.13,
    },
  },

  // 7 — Frozen Wastes ─────────────────────────────────────────────────────────
  // Arctic night. Pale cold moon, blizzard haze, ice-crusted permafrost.
  {
    name: 'Frozen Wastes',
    distanceM: 2100,
    roughness: 2.0,
    zombieDensity: 11,
    cashMult: 3.0,
    brutePct: 0.25,
    crawlerPct: 0.3,
    obstacleDensity: 4,
    theme: {
      skyTop: 0x0a1322, // icy dark sky
      skyBottom: 0x2a4868, // cold blue-grey horizon
      groundFill: 0x33414f, // frozen dark tundra
      groundTop: 0xeef4fa, // ice-white snow crust
      hillFar: 0x223450, // distant drifts under moonlight
      hillNear: 0x2b3d54, // near frozen ridge
      celestial: 'moon',
      fog: 0.24, // blizzard haze
    },
  },

  // 8 — Blood Moon Finale ─────────────────────────────────────────────────────
  // Apocalypse. A swollen blood moon drowns the world in dark crimson.
  {
    name: 'Blood Moon Finale',
    distanceM: 2400,
    roughness: 2.2,
    zombieDensity: 13,
    cashMult: 3.6,
    brutePct: 0.3,
    crawlerPct: 0.3,
    obstacleDensity: 5,
    theme: {
      skyTop: 0x170006, // black-crimson zenith
      skyBottom: 0x6e0d12, // deep blood-red horizon
      groundFill: 0x2c090a, // charred dark-red earth
      groundTop: 0x7a1414, // smouldering surface
      hillFar: 0x3c0709, // far maroon silhouette
      hillNear: 0x2a0506, // near black-red ridge
      celestial: 'bloodmoon',
      fog: 0.18,
    },
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Total number of defined stages. */
export function stageCount(): number {
  return STAGES.length;
}
