/**
 * Authored level plans for the 8 stages — designed by a multi-agent design pass
 * and reconciled into an escalating campaign. Each stage is an ordered list of
 * segments (a pacing curve: calm -> build -> climax -> evac) with a signature
 * set-piece and a risky "item challenge" cache.
 *
 * GameScene consumes `segments` to place terrain features + spawns per segment;
 * SEGMENT_BEHAVIOR maps each segment type to terrain/spawn parameters.
 */

export type SegmentType =
  | 'calm'
  | 'rollers'
  | 'climb'
  | 'descent'
  | 'gap'
  | 'horde'
  | 'brutewall'
  | 'crawlerpit'
  | 'junkyard'
  | 'rampline'
  | 'fuelgauntlet'
  | 'treasure';

export interface Segment {
  type: SegmentType;
  lengthM: number;
  intensity: number;
  note: string;
}

export interface LevelPlan {
  intro: string;
  signature: string;
  fuelTightness: number;
  itemChallenge: string;
  segments: Segment[];
}

/**
 * Per-segment-type behavior. Densities are "per 100m" baselines scaled by the
 * segment's intensity. zMix is the relative weight of each zombie type.
 * slope < 0 trends uphill, > 0 downhill. roughMult scales terrain amplitude.
 */
export interface SegmentBehavior {
  roughMult: number;
  slope: number;
  zPer100: number;
  zMix: { walker: number; brute: number; crawler: number };
  obstPer100: number;
  obstMix: { wreck: number; rock: number; ramp: number };
  fuelPer100: number;
  cashPer100: number;
  isGap?: boolean;
  /** Drops a launch ramp at the segment start (gaps + ramplines). */
  leadRamp?: boolean;
  /** High-value guarded cache. */
  cache?: boolean;
}

export const SEGMENT_BEHAVIOR: Record<SegmentType, SegmentBehavior> = {
  calm: { roughMult: 0.4, slope: 0, zPer100: 1.5, zMix: { walker: 1, brute: 0, crawler: 0.2 }, obstPer100: 0.4, obstMix: { wreck: 1, rock: 0.3, ramp: 0.3 }, fuelPer100: 0.8, cashPer100: 1.2 },
  rollers: { roughMult: 1.2, slope: 0, zPer100: 3, zMix: { walker: 1, brute: 0.05, crawler: 0.3 }, obstPer100: 1, obstMix: { wreck: 1, rock: 0.5, ramp: 0.6 }, fuelPer100: 0.7, cashPer100: 1.4 },
  climb: { roughMult: 0.6, slope: -0.55, zPer100: 2, zMix: { walker: 1, brute: 0.15, crawler: 0.2 }, obstPer100: 1.2, obstMix: { wreck: 0.5, rock: 1, ramp: 0.2 }, fuelPer100: 0.9, cashPer100: 1.2 },
  descent: { roughMult: 0.8, slope: 0.5, zPer100: 2.5, zMix: { walker: 1, brute: 0.05, crawler: 0.4 }, obstPer100: 1.6, obstMix: { wreck: 0.8, rock: 0.4, ramp: 1.2 }, fuelPer100: 0.6, cashPer100: 1.6 },
  gap: { roughMult: 0.3, slope: 0, zPer100: 0, zMix: { walker: 1, brute: 0, crawler: 0 }, obstPer100: 0, obstMix: { wreck: 0, rock: 0, ramp: 0 }, fuelPer100: 0, cashPer100: 0, isGap: true, leadRamp: true },
  horde: { roughMult: 0.6, slope: 0, zPer100: 9, zMix: { walker: 1, brute: 0.08, crawler: 0.4 }, obstPer100: 0.4, obstMix: { wreck: 1, rock: 0.2, ramp: 0.2 }, fuelPer100: 0.4, cashPer100: 1.8 },
  brutewall: { roughMult: 0.6, slope: -0.1, zPer100: 5, zMix: { walker: 0.3, brute: 1, crawler: 0.1 }, obstPer100: 0.5, obstMix: { wreck: 1, rock: 0.4, ramp: 0.2 }, fuelPer100: 0.4, cashPer100: 1.5 },
  crawlerpit: { roughMult: 0.7, slope: 0, zPer100: 8, zMix: { walker: 0.2, brute: 0.05, crawler: 1 }, obstPer100: 0.4, obstMix: { wreck: 0.6, rock: 0.6, ramp: 0.2 }, fuelPer100: 0.5, cashPer100: 1.6 },
  junkyard: { roughMult: 0.9, slope: 0, zPer100: 2.5, zMix: { walker: 1, brute: 0.1, crawler: 0.2 }, obstPer100: 4, obstMix: { wreck: 1, rock: 0.8, ramp: 0.4 }, fuelPer100: 0.5, cashPer100: 1.6 },
  rampline: { roughMult: 0.7, slope: 0, zPer100: 1.5, zMix: { walker: 1, brute: 0, crawler: 0.2 }, obstPer100: 3, obstMix: { wreck: 0.2, rock: 0.1, ramp: 1 }, fuelPer100: 0.6, cashPer100: 1.8, leadRamp: true },
  fuelgauntlet: { roughMult: 0.7, slope: 0, zPer100: 3, zMix: { walker: 1, brute: 0.1, crawler: 0.3 }, obstPer100: 0.8, obstMix: { wreck: 1, rock: 0.5, ramp: 0.3 }, fuelPer100: 0.15, cashPer100: 1 },
  treasure: { roughMult: 0.6, slope: 0, zPer100: 5, zMix: { walker: 0.3, brute: 0.1, crawler: 1 }, obstPer100: 0.6, obstMix: { wreck: 0.5, rock: 1, ramp: 0.2 }, fuelPer100: 1.5, cashPer100: 6, cache: true },
};

/** 0-based stage index -> authored plan. */
export const LEVEL_PLANS: Record<number, LevelPlan> = {
  0: {
    intro: 'Clear morning on a quiet cul-de-sac. Ease off the curb, learn the throttle, and turn the first few shamblers into hood ornaments.',
    signature: 'The Backyard Pool Jump',
    fuelTightness: 0.2,
    itemChallenge: 'A garage cache of cash + fuel behind a crawler-filled driveway dip — grab it and punch out before they swarm.',
    segments: [
      { type: 'calm', lengthM: 28, intensity: 0.05, note: 'roll off the driveway' },
      { type: 'rollers', lengthM: 32, intensity: 0.2, note: 'gentle lawns teach momentum' },
      { type: 'horde', lengthM: 30, intensity: 0.3, note: 'first loose walkers' },
      { type: 'junkyard', lengthM: 26, intensity: 0.35, note: 'stalled cars; smash through' },
      { type: 'treasure', lengthM: 30, intensity: 0.55, note: 'garage cache, crawler dip' },
      { type: 'calm', lengthM: 22, intensity: 0.15, note: 'breather; line up speed' },
      { type: 'rampline', lengthM: 24, intensity: 0.45, note: 'warm-up ramps' },
      { type: 'gap', lengthM: 16, intensity: 0.6, note: 'SIGNATURE: pool jump' },
      { type: 'horde', lengthM: 30, intensity: 0.5, note: 'climax walker pack' },
      { type: 'fuelgauntlet', lengthM: 22, intensity: 0.4, note: 'watch the gauge' },
      { type: 'descent', lengthM: 40, intensity: 0.25, note: 'coast into evac' },
    ],
  },
  1: {
    intro: 'Hazy sun bleeds through smog over a chained-up freeway, one long stalled funeral procession.',
    signature: 'The Jackknife (collapsed overpass)',
    fuelTightness: 0.32,
    itemChallenge: 'A median cache ringed by a sunken crawler pit — biggest payout on the stage if you commit and survive.',
    segments: [
      { type: 'calm', lengthM: 55, intensity: 0.15, note: 'open on-ramp' },
      { type: 'horde', lengthM: 70, intensity: 0.4, note: 'first real walker pack' },
      { type: 'junkyard', lengthM: 75, intensity: 0.5, note: 'traffic jam of wrecks' },
      { type: 'treasure', lengthM: 60, intensity: 0.65, note: 'median cache, crawler pit' },
      { type: 'rollers', lengthM: 50, intensity: 0.35, note: 'rebuild nitro' },
      { type: 'brutewall', lengthM: 60, intensity: 0.7, note: 'first brute cluster' },
      { type: 'rampline', lengthM: 55, intensity: 0.55, note: 'car-hauler ramps' },
      { type: 'gap', lengthM: 70, intensity: 0.85, note: 'THE JACKKNIFE leap' },
      { type: 'horde', lengthM: 65, intensity: 0.75, note: 'climax swarm' },
      { type: 'descent', lengthM: 40, intensity: 0.3, note: 'off-ramp to evac' },
    ],
  },
  2: {
    intro: 'Dusk bleeds gold through the pines as the road narrows into the deep woods.',
    signature: 'The Deadfall Leap (toppled redwood ramp)',
    fuelTightness: 0.42,
    itemChallenge: 'A fern-draped hollow of fuel + cash reached only by dropping into a crawler pit — refuels the back half if you nail it.',
    segments: [
      { type: 'calm', lengthM: 90, intensity: 0.2, note: 'quiet pine road' },
      { type: 'rollers', lengthM: 110, intensity: 0.4, note: 'blind-rise ambushes' },
      { type: 'horde', lengthM: 70, intensity: 0.55, note: 'shaded hollow pack' },
      { type: 'climb', lengthM: 120, intensity: 0.55, note: 'long mossy ridge climb' },
      { type: 'treasure', lengthM: 90, intensity: 0.7, note: 'fern hollow cache' },
      { type: 'brutewall', lengthM: 70, intensity: 0.62, note: 'brutes in a gully' },
      { type: 'gap', lengthM: 80, intensity: 0.88, note: 'DEADFALL LEAP' },
      { type: 'descent', lengthM: 100, intensity: 0.6, note: 'fast downhill smash run' },
      { type: 'rampline', lengthM: 40, intensity: 0.8, note: 'log-ramp flip chain' },
      { type: 'fuelgauntlet', lengthM: 130, intensity: 0.55, note: 'sprint on fumes' },
    ],
  },
  3: {
    intro: 'The sun bleeds violet-to-orange over scorched mesas. Out here the land itself is the enemy.',
    signature: "The Devil's Gulch Launch (canyon mega-ramp)",
    fuelTightness: 0.52,
    itemChallenge: 'The Dry Wash Hoard — fuel/cash pooled in a crawler dip right before the long mesa climb you need fuel for.',
    segments: [
      { type: 'calm', lengthM: 90, intensity: 0.2, note: 'dusty mesa flats' },
      { type: 'rollers', lengthM: 120, intensity: 0.35, note: 'rolling dunes' },
      { type: 'junkyard', lengthM: 110, intensity: 0.5, note: 'caravan wrecks' },
      { type: 'crawlerpit', lengthM: 90, intensity: 0.65, note: 'Dry Wash crawler dip' },
      { type: 'treasure', lengthM: 60, intensity: 0.72, note: 'loot under swarm' },
      { type: 'climb', lengthM: 160, intensity: 0.72, note: 'grind up the mesa' },
      { type: 'rampline', lengthM: 80, intensity: 0.78, note: 'summit stutter ramps' },
      { type: 'gap', lengthM: 130, intensity: 0.9, note: "DEVIL'S GULCH launch" },
      { type: 'descent', lengthM: 90, intensity: 0.62, note: 'far-rim landing slope' },
      { type: 'brutewall', lengthM: 90, intensity: 0.82, note: 'brutes on the rim' },
      { type: 'fuelgauntlet', lengthM: 110, intensity: 0.78, note: 'parched range test' },
      { type: 'calm', lengthM: 70, intensity: 0.3, note: 'coast to evac' },
    ],
  },
  4: {
    intro: 'Midnight in the dead factory district. Sodium haze, screaming brutes, and a molten smelter that wants you in it.',
    signature: 'The Smelter Gap (conveyor ramps over slag)',
    fuelTightness: 0.62,
    itemChallenge: 'A sunken loading bay of cash + fuel one drop below the road — crawler nest floor, guard brute on the only ramp out.',
    segments: [
      { type: 'calm', lengthM: 120, intensity: 0.2, note: 'factory gates' },
      { type: 'rollers', lengthM: 150, intensity: 0.38, note: 'cracked loading yard' },
      { type: 'junkyard', lengthM: 170, intensity: 0.54, note: 'scrapheap alley' },
      { type: 'horde', lengthM: 130, intensity: 0.62, note: 'shift-change crowd' },
      { type: 'brutewall', lengthM: 120, intensity: 0.76, note: 'dock-foreman brutes' },
      { type: 'treasure', lengthM: 130, intensity: 0.82, note: 'loading-bay cache' },
      { type: 'crawlerpit', lengthM: 130, intensity: 0.78, note: 'drainage trench' },
      { type: 'climb', lengthM: 140, intensity: 0.7, note: 'slag-heap incline' },
      { type: 'rampline', lengthM: 110, intensity: 0.74, note: 'conveyor ramps' },
      { type: 'gap', lengthM: 110, intensity: 0.93, note: 'SMELTER GAP + nitro' },
      { type: 'descent', lengthM: 100, intensity: 0.6, note: 'cooling-tower downhill' },
      { type: 'calm', lengthM: 90, intensity: 0.28, note: 'ash-quiet to evac' },
    ],
  },
  5: {
    intro: 'Deep night swallows the switchbacks as your headlights claw up frozen cliffs. The only way out is over the peak.',
    signature: 'The Hairpin Chasm (summit collapse jump)',
    fuelTightness: 0.72,
    itemChallenge: 'A cash/fuel cache on a narrow cliff ledge over a sheer drop — overshoot and you sail off; brake too hard and you roll back.',
    segments: [
      { type: 'calm', lengthM: 150, intensity: 0.2, note: 'moonlit trailhead' },
      { type: 'climb', lengthM: 220, intensity: 0.5, note: 'first long grade' },
      { type: 'rollers', lengthM: 160, intensity: 0.48, note: 'snowy ridge rhythm' },
      { type: 'crawlerpit', lengthM: 130, intensity: 0.62, note: 'icy crawler dip' },
      { type: 'climb', lengthM: 250, intensity: 0.72, note: 'steep cliff ascent' },
      { type: 'treasure', lengthM: 140, intensity: 0.78, note: 'cliff-ledge cache' },
      { type: 'descent', lengthM: 160, intensity: 0.62, note: 'plunging speed run' },
      { type: 'rampline', lengthM: 130, intensity: 0.68, note: 'big-air ramps' },
      { type: 'brutewall', lengthM: 120, intensity: 0.84, note: 'brute roadblock' },
      { type: 'climb', lengthM: 170, intensity: 0.88, note: 'last push to summit' },
      { type: 'gap', lengthM: 90, intensity: 0.96, note: 'HAIRPIN CHASM' },
      { type: 'calm', lengthM: 80, intensity: 0.28, note: 'plateau coast to evac' },
    ],
  },
  6: {
    intro: 'An arctic night swallows the world: pale moon, blizzard haze, black ice where every throttle tap sends you sliding. Fuel is scarce — every litre is a heartbeat.',
    signature: 'The Frozen Lake Crevasse (long ice jump)',
    fuelTightness: 0.82,
    itemChallenge: 'The richest grab of the run on a wind-scoured ice shelf past a gap — but the detour and icy landing burn the fuel you came to steal.',
    segments: [
      { type: 'calm', lengthM: 200, intensity: 0.18, note: 'frozen approach' },
      { type: 'descent', lengthM: 250, intensity: 0.45, note: 'first black-ice slope' },
      { type: 'crawlerpit', lengthM: 200, intensity: 0.62, note: 'iced crawler dip' },
      { type: 'rollers', lengthM: 200, intensity: 0.52, note: 'slick drifts' },
      { type: 'fuelgauntlet', lengthM: 300, intensity: 0.58, note: 'whiteout, one lone can' },
      { type: 'rampline', lengthM: 180, intensity: 0.66, note: 'ice ramps, top off nitro' },
      { type: 'gap', lengthM: 220, intensity: 0.96, note: 'LAKE CREVASSE leap' },
      { type: 'brutewall', lengthM: 200, intensity: 0.9, note: 'frost-brutes, no grip' },
      { type: 'treasure', lengthM: 180, intensity: 0.84, note: 'icy-shelf cache' },
      { type: 'fuelgauntlet', lengthM: 170, intensity: 0.76, note: 'final dry sprint' },
    ],
  },
  7: {
    intro: 'The blood moon hangs swollen and crimson over a dead world, and every horror you have outrun waits on this last road.',
    signature: 'The Severed Span (collapsing crimson mega-bridge)',
    fuelTightness: 0.9,
    itemChallenge: 'The Crimson Vault — the richest cache in the game in a deep crawler dip past the bridge, when your tank is already bleeding out.',
    segments: [
      { type: 'calm', lengthM: 130, intensity: 0.22, note: 'deceptive calm' },
      { type: 'rollers', lengthM: 160, intensity: 0.4, note: 'build the combo early' },
      { type: 'junkyard', lengthM: 180, intensity: 0.55, note: 'wreck + rock field' },
      { type: 'horde', lengthM: 170, intensity: 0.62, note: 'first wall of walkers' },
      { type: 'rampline', lengthM: 210, intensity: 0.6, note: 'rooftop stunt chain' },
      { type: 'climb', lengthM: 200, intensity: 0.74, note: 'uphill to the bridge' },
      { type: 'rampline', lengthM: 100, intensity: 0.66, note: 'run-up ramp' },
      { type: 'gap', lengthM: 220, intensity: 1, note: 'SEVERED SPAN leap' },
      { type: 'descent', lengthM: 160, intensity: 0.62, note: 'relief plunge' },
      { type: 'treasure', lengthM: 150, intensity: 0.86, note: 'CRIMSON VAULT' },
      { type: 'brutewall', lengthM: 230, intensity: 0.92, note: 'brute phalanx' },
      { type: 'crawlerpit', lengthM: 260, intensity: 0.96, note: 'crawler swarm, fuel critical' },
      { type: 'fuelgauntlet', lengthM: 140, intensity: 0.9, note: 'last range test' },
      { type: 'calm', lengthM: 90, intensity: 0.35, note: 'final coast to evac' },
    ],
  },
};
