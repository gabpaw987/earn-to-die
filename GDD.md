# Game Design Document — Earn to Die: Evac Run

## 1. Concept
A side-scrolling physics driving game. The player pilots a vehicle across procedurally bumpy zombie-infested terrain, trying to travel as far as possible on a limited fuel supply. Killing zombies and collecting pickups earns **cash**, which is spent between runs on **upgrades**. The meta-goal is to upgrade enough to drive the full length of each **stage** and reach the evac point, unlocking the next stage.

This is the core *Earn to Die* loop: **drive → die (or evac) → earn → upgrade → drive further.**

## 2. Pillars
- **Tactile physics.** The car is a real Matter.js compound body with sprung wheels; momentum, flips, and landings matter.
- **Tight reward loop.** Every run yields cash; every upgrade is immediately felt on the next run.
- **Readable carnage.** Zombies splatter satisfyingly and clearly; HUD always shows fuel/distance/cash.

## 3. Core mechanics
### Driving
- **Throttle** drives the wheels forward; **brake/reverse** drives them back.
- In the air, the same left/right inputs apply **angular torque** to the chassis for flip control.
- **Fuel** drains continuously while throttling (and a small idle drain). Fuel = your run timer.

### Combat / hazards
- **Zombies** stand along the terrain. Hitting one at speed kills it (cash + small speed cost). Hitting a dense cluster slowly can **bog the car down**.
- Optional **weapon** upgrade (roof gun) auto/space-fires forward, clearing zombies ahead.
- **Armor** reduces the speed penalty from zombie impacts.

### Pickups
- **Fuel cans** — restore fuel mid-run (crucial for distance).
- **Cash bags** — instant cash.

### Run end
A run ends when any of:
- Fuel hits 0 **and** the car has effectively stopped.
- The car is flipped/stuck and not moving for N seconds.
- The car reaches the **evac** marker at the stage's end → stage cleared.

## 4. Economy & upgrades
Cash is the single currency. Upgrade categories (each with multiple tiers, rising cost):

| Upgrade | Effect |
|---|---|
| **Engine** | Higher top speed + torque |
| **Wheels** | More grip, better climb, softer landings |
| **Fuel Tank** | Larger starting + max fuel |
| **Armor** | Less speed loss on zombie/obstacle impact, more durability |
| **Weapon** | Roof gun: fire rate / damage to clear zombies ahead |
| **Booster** | Nitro burst (limited charges per run) for big speed/jumps |

Balance intent: early stages are *impossible* on tier-0 gear — the player is meant to fail, bank partial cash, and upgrade. Each stage's full distance should be reachable a couple of upgrade tiers in.

## 5. Progression
- **Stages** are ordered, each with a target distance, zombie density, terrain roughness, and a cash multiplier.
- Reaching evac marks the stage cleared and unlocks the next.
- Earlier stages remain replayable to farm cash.

## 6. Persistence
`localStorage` stores: bank cash, owned tier per upgrade, highest stage unlocked, best distance per stage, lifetime zombie kills.

## 7. Art & audio (M1)
- **Procedural textures** generated at runtime via Phaser `Graphics.generateTexture` — car body, wheels, zombie, fuel can, cash bag, dirt/sky. No external/binary assets (keeps the repo clean and license-safe).
- Audio: deferred to a later milestone (WebAudio beeps optional).

## 8. Milestones
- **M1 (this):** Full loop — drivable physics run, zombies/pickups/HUD, results, garage with all 6 upgrade categories, economy + persistence, ≥3 stages with progression. Browser-verified end to end.
- **M2:** Audio, juice (particles, screen shake, camera), more vehicles, better terrain art, tuning pass.
- **M3:** Meta (daily challenge, achievements), deploy to GitHub Pages / itch.io.

## 9. Tech
Phaser 3 (Matter physics), TypeScript (strict), Vite. Target: modern desktop browsers; keyboard controls (touch later).
