import { TEX } from '../config';

/**
 * Generated sprite manifest: maps a texture key to its PNG in `public/sprites/`.
 * PreloadScene loads these; anything that fails to load falls back to the
 * procedural texture generated in PreloadScene.create().
 *
 * Art is produced by `tools/gen-art.mjs` (gpt-image-2) + `tools/process-art.mjs`.
 */
export interface SpriteFile {
  key: string;
  file: string;
  /** Opaque tileable ground material (no transparency expected). */
  material?: boolean;
}

export const SPRITE_FILES: SpriteFile[] = [
  { key: TEX.vehTruck, file: 'veh-truck-body' },
  { key: TEX.vehMuscle, file: 'veh-muscle-body' },
  { key: TEX.vehRig, file: 'veh-rig-body' },
  { key: TEX.wheel, file: 'wheel' },
  { key: TEX.zombie, file: 'zombie-walker' },
  { key: TEX.zombieBrute, file: 'zombie-brute' },
  { key: TEX.zombieCrawler, file: 'zombie-crawler' },
  { key: TEX.fuelCan, file: 'fuelcan' },
  { key: TEX.cashBag, file: 'cashbag' },
  { key: TEX.rock, file: 'rock' },
  { key: TEX.wreck, file: 'wreck' },
  { key: TEX.ramp, file: 'ramp' },
  { key: TEX.gun, file: 'gun' },
  { key: TEX.armorPlate, file: 'armor' },
  { key: TEX.evac, file: 'evac' },
  // Ground materials (mat-dirt/rock/snow) await regeneration — see Linear backlog.
];

/** Vehicle key -> body texture key. */
export const VEHICLE_TEX: Record<string, string> = {
  truck: TEX.vehTruck,
  muscle: TEX.vehMuscle,
  rig: TEX.vehRig,
};
