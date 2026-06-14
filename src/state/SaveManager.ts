import { SAVE_KEY } from '../config';
import type { SaveData, UpgradeKey, CarStats } from '../types';
import { defaultTiers, resolveStats, UPGRADES, nextTier } from '../data/upgrades';
import { VEHICLES, getVehicle, DEFAULT_VEHICLE } from '../data/vehicles';

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
      ownedVehicles: [DEFAULT_VEHICLE],
      selectedVehicle: DEFAULT_VEHICLE,
      muted: false,
      bestCombo: 0,
      lifetimeStunts: 0,
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
          ownedVehicles: parsed.ownedVehicles?.length
            ? parsed.ownedVehicles
            : [DEFAULT_VEHICLE],
          selectedVehicle: parsed.selectedVehicle ?? DEFAULT_VEHICLE,
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

  /** Effective car stats = selected vehicle base × upgrade tiers. */
  stats(): CarStats {
    const veh = getVehicle(this.data.selectedVehicle);
    const u = resolveStats(this.data.tiers);
    return {
      engine: veh.baseEngine * u.engine,
      wheels: veh.baseWheels * u.wheels,
      maxFuel: veh.baseFuel + u.fuelBonus,
      armor: u.armor,
      weaponLevel: u.weaponLevel,
      boosterCharges: u.boosterCharges,
      mass: veh.mass,
      chassisColor: veh.chassisColor,
      vehicleKey: veh.key,
    };
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

  // --- Vehicles ---

  ownsVehicle(key: string): boolean {
    return this.data.ownedVehicles.includes(key);
  }

  /** Buy a vehicle if affordable + not owned. Returns true on success. */
  buyVehicle(key: string): boolean {
    if (this.ownsVehicle(key)) return false;
    const veh = VEHICLES.find((v) => v.key === key);
    if (!veh || this.data.cash < veh.cost) return false;
    this.data.cash -= veh.cost;
    this.data.ownedVehicles.push(key);
    this.save();
    return true;
  }

  /** Select an owned vehicle. Returns true on success. */
  selectVehicle(key: string): boolean {
    if (!this.ownsVehicle(key)) return false;
    this.data.selectedVehicle = key;
    this.save();
    return true;
  }

  // --- Audio ---

  get muted(): boolean {
    return this.data.muted;
  }
  setMuted(m: boolean): void {
    this.data.muted = m;
    this.save();
  }

  recordRun(stageIndex: number, distanceM: number, kills: number, maxCombo: number, stunts: number): void {
    const prevBest = this.data.bestDistance[stageIndex] ?? 0;
    if (distanceM > prevBest) this.data.bestDistance[stageIndex] = Math.round(distanceM);
    this.data.lifetimeKills += kills;
    this.data.lifetimeStunts += stunts;
    if (maxCombo > this.data.bestCombo) this.data.bestCombo = maxCombo;
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
