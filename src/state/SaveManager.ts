import { SAVE_KEY } from '../config';
import type { SaveData, UpgradeKey } from '../types';
import { defaultTiers, resolveStats, UPGRADES, nextTier } from '../data/upgrades';

/**
 * Single source of truth for persistent player state.
 * Wraps localStorage with a defensive load (corrupt/old saves -> fresh).
 */
class SaveManagerImpl {
  private data: SaveData = this.fresh();

  private fresh(): SaveData {
    return {
      cash: 0,
      tiers: defaultTiers(),
      stageUnlocked: 0,
      bestDistance: {},
      lifetimeKills: 0,
    };
  }

  load(): SaveData {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SaveData>;
        this.data = {
          ...this.fresh(),
          ...parsed,
          tiers: { ...defaultTiers(), ...(parsed.tiers ?? {}) },
          bestDistance: { ...(parsed.bestDistance ?? {}) },
        };
      }
    } catch {
      this.data = this.fresh();
    }
    return this.data;
  }

  save(): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch {
      /* storage full / disabled — non-fatal, run still works in-memory */
    }
  }

  get(): SaveData {
    return this.data;
  }

  stats() {
    return resolveStats(this.data.tiers);
  }

  addCash(amount: number): void {
    this.data.cash = Math.max(0, Math.round(this.data.cash + amount));
    this.save();
  }

  /** Attempt to buy the next tier of an upgrade. Returns true on success. */
  buyNext(key: UpgradeKey): boolean {
    const owned = this.data.tiers[key];
    const next = nextTier(key, owned);
    if (!next) return false;
    if (this.data.cash < next.tier.cost) return false;
    this.data.cash -= next.tier.cost;
    this.data.tiers[key] = next.index;
    this.save();
    return true;
  }

  /** Current owned tier label for a category. */
  tierLabel(key: UpgradeKey): string {
    return UPGRADES[key].tiers[this.data.tiers[key]].label;
  }

  recordRun(stageIndex: number, distanceM: number, kills: number): void {
    const prevBest = this.data.bestDistance[stageIndex] ?? 0;
    if (distanceM > prevBest) this.data.bestDistance[stageIndex] = Math.round(distanceM);
    this.data.lifetimeKills += kills;
    this.save();
  }

  unlockStage(stageIndex: number): void {
    if (stageIndex > this.data.stageUnlocked) {
      this.data.stageUnlocked = stageIndex;
      this.save();
    }
  }

  reset(): void {
    this.data = this.fresh();
    this.save();
  }
}

/** App-wide singleton. */
export const Save = new SaveManagerImpl();
