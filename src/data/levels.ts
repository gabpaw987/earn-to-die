import type { StageDef } from '../types';

/**
 * Ordered stages. Each is longer, rougher, and denser than the last, with a
 * rising cash multiplier so later stages are also better farming once cleared.
 * Distances are tuned so stage 1 is reachable a couple of upgrade tiers in.
 */
export const STAGES: StageDef[] = [
  {
    name: 'Suburbs',
    distanceM: 320,
    roughness: 0.7,
    zombieDensity: 4,
    cashMult: 1.0,
  },
  {
    name: 'Highway',
    distanceM: 620,
    roughness: 1.0,
    zombieDensity: 6,
    cashMult: 1.3,
  },
  {
    name: 'Badlands',
    distanceM: 1000,
    roughness: 1.45,
    zombieDensity: 8,
    cashMult: 1.7,
  },
  {
    name: 'The Pass',
    distanceM: 1500,
    roughness: 1.9,
    zombieDensity: 11,
    cashMult: 2.2,
  },
];

export function stageCount(): number {
  return STAGES.length;
}
