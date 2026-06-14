# Feature Backlog — Earn to Die: Evac Run

Comprehensive future-iteration backlog from a multi-agent design pass (feature
panel + economy analyst). Priorities P0 (highest) → P3. The actionable items are
also filed as Linear issues in the TRA "Earn to Die — Evac Run" project.

## P0 — core fairness / reach
- **Fuel-low warning + run-end telegraph** (playability): pulse the fuel bar red < 25%, heartbeat < 10%, and show a "RECOVER!" countdown ring while the stall timer accrues; distinguish out-of-fuel vs flipped deaths. No silent/cheap deaths.
- **Authored item-challenge caches** (challenge): first-class `PickupCache` — high-value clustered cash/fuel gated behind a ramp apex / gap / ledge / brute wall, with a glint + "CACHE CLEARED" bonus. *(Partially delivered via `treasure` segments; this is the polished version.)*
- **Touch / mobile controls** (accessibility): on-screen gas/brake/tilt pedals + nitro + fire, device-tilt option, auto-detected layout. *(Tracked as TRA-407.)*

## P1 — feel, readability, meta
- **Flip-recovery / self-righting assist**: hold to apply righting torque (small fuel cost) when flipped — converts instant-loss into a recoverable mistake.
- **Air-control assist & landing forgiveness** (tunable Off/Assist/Auto): subtle airborne stabilization + near-level landing window; deliberate flips still player-driven.
- **Speed-reactive camera**: dynamic zoom-out + look-ahead at speed; zoom punch on nitro/big-air so hazards/caches read earlier.
- **Pickup magnetism + airborne collectibles**: gentle magnetic pull, pickups at varied heights, cash fountains from stunts/smashes you can drive through.
- **Combo timer bar + escalating juice**: shrinking combo-window ring, hotter text, slow-mo/zoom punch at high combos, "COMBO LOST" cue.
- **Nitro charge UI**: discrete charge pips + cooldown sweep + meaty blast (speed lines, FOV punch); optional hold-to-burn for gap clears.
- **Onboarding tutorial + coach marks**: first-run coached Suburbs run (throttle, air-tilt, ramps=stunts, low fuel, EVAC goal); first-run flag in save, skippable.
- **Run-end results breakdown**: itemized animated cash tally (distance/zombie-by-type/wreck/stunt/combo), death-reason banner, new-record badges, "next upgrade you can afford" nudge.
- **Stage-select / level map**: all 8 with lock state, best distance, medals, cash multiplier; free replay to farm; signature-setpiece teaser.
- **Economy rebalance + difficulty validation**: keep validating the curve so stage 1 is near-stock-beatable and stage 8 needs heavy investment. *(Tracked as TRA-405; first pass applied.)*

## P2 — content & polish
- **Daily challenge + personal bests**: seeded stage + modifier, scored run, local records (best distance/combo/cash/air/kills).
- **Achievements / milestones**: goal-driven unlocks off lifetime stats with cash bounties + toasts.
- **More vehicles + handling identity & unlocks**: buggy (air control), hearse (built-in gun), APC (ignores brute drag); stage-clear unlocks; garage stat bars.
- **New zombie variants (telegraphed)**: exploder, spitter/acid, armored/riot — distinct silhouettes + clear tells.
- **Hazard & weapon variety**: fuel barrels, tar pits, falling debris, spring pads; secondary weapons (flamethrower, mines, shockwave horn).
- **Audio overhaul**: expressive rpm engine, layered impact/skid/bog SFX, low-fuel heartbeat, combo risers, adaptive per-theme music with ducking; separate music/SFX volume.
- **Impact & carnage juice**: hit-stop on brute splats/wreck smashes, momentum-scaled shake, gore decals, big-air/evac slow-mo, landing squash; reduce-effects toggle.
- **Accessibility suite**: key rebinding, colorblind-safe palette (fuel/combo/threat), reduce-motion, volume sliders, high-contrast HUD, difficulty presets.
- **Performance hardening**: pool bullets/particles, cull off-screen zombies/obstacles, lazy terrain bodies near camera, low-quality mode, FPS guard. *(Tracked as TRA-408.)*
- **Ground material textures**: regenerate dirt/asphalt/snow tileable materials (gpt-image-2) and texture the terrain surface — *deferred when the OpenAI billing hard limit was hit mid-generation.*

## P3 — infrastructure
- **Garage UX upgrade**: live vehicle preview reflecting upgrades, animated stat-delta bars, "recommended next buy", confirm/refund.
- **Settings persistence + save schema migration**: settings/data screen, export/import save, confirmed reset, versioned `migrate()` so new fields never wipe progress.
- **Deploy to GitHub Pages via CI**. *(Tracked as TRA-406.)*

## Economy model — validated tuning (first pass applied)
A fuel-distance + cash model found the economy was a snowball (one clear funded
many upgrades) and fuel stopped mattering by mid-game. Applied: fuel drain ↑,
flatter engine top-speed, additive fuel tiers, `cashPerMetre` 0.7→0.3, cash bag
40→28, stage `cashMult` cap 3.6→2.4, trimmed stunt cash, steeper upgrade costs,
and **60% cash on death / 100% on evac**. Remaining: per-stage fuel-can spacing
that tightens on long stages, and a soft catch-up so wiped runs still progress.
