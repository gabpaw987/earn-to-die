# Earn to Die — Evac Run

An **Earn to Die–inspired** 2D physics side-scroller built with **Phaser 3 + TypeScript + Vite**.

Drive your rig across a zombie-infested wasteland, splatter the horde, scavenge fuel and cash, then spend your earnings in the **Garage** to upgrade engine, wheels, fuel tank, armor, and weapons — far enough to reach the evac chopper at the end of each stage.

> Status: **Big content update** on top of the M1 loop — now with synthesized audio, particle/screen-shake juice, kill combos, stunts, 8 themed stages, 3 vehicles, and zombie/obstacle variety. Persistent progress via `localStorage`. All art + audio generated procedurally at runtime (no binary assets committed).

## Features

- **8 themed stages** — a day → dusk → night → blood-moon arc, each with parallax skies, a sun/moon/blood-moon, layered hills, fog, and tinted terrain.
- **Physics driving** — Matter compound car (chassis + sprung wheels), throttle/brake, in-air flip control, fuel, and nitro boost.
- **Synthesized audio** — Web Audio engine drone that tracks speed/throttle plus SFX for impacts, splats, coins, fuel, gunfire, boost, landings, stunts, UI, win/lose. Mute toggle, persisted.
- **Juice** — dust, exhaust, sparks and blood particles, screen shake, camera flash, floating `+$` popups.
- **Kill combos** — chain kills within a short window for a rising cash multiplier (up to 4×).
- **Stunts** — flips and big air award bonus cash.
- **Zombie variety** — walkers, tanky brutes (need speed to splatter), and fast crawlers.
- **Obstacles** — smashable wrecks (cash), blocking rocks (jolt), and launch ramps (stunts).
- **3 vehicles** — Rustbucket, Muscle Car, War Rig — buyable & selectable, with upgrades reflected on the car (armor plate, roof gun, bigger wheels, vehicle colour).
- **Garage economy** — 6 upgrade categories × multiple tiers, persistent cash + progress.
- **Pause menu** (ESC/P) with resume, mute, and quit.

**Tracking:** [GitHub repo](https://github.com/gabpaw987/earn-to-die) · [Linear project](https://linear.app/trampolinegame/project/earn-to-die-evac-run-4c2d9e8d78ba) (roadmap & issues)

## Play / Dev

```bash
npm install
npm run dev      # http://localhost:5180
npm run build    # typecheck + production build to dist/
npm run preview  # serve the production build
```

## Controls

| Action | Keys |
|---|---|
| Accelerate | `→` / `D` |
| Brake / Reverse | `←` / `A` |
| Tilt clockwise (air) | `→` / `D` |
| Tilt counter-clockwise (air) | `←` / `A` |
| Fire weapon (if equipped) | `Space` |
| Pause | `Esc` |

## Game loop

1. **Stage run** — drive as far as you can on the fuel you have. Squash zombies for cash, grab fuel cans and money bags. The run ends when you run out of fuel, flip and get stuck, or reach the **evac** at the stage's end.
2. **Results** — distance, zombies killed, and cash collected are tallied into your bank.
3. **Garage** — spend cash on upgrade tiers. Stats feed directly into the next run.
4. **Progression** — clear a stage to unlock the next, longer and deadlier one.

## Architecture

```
src/
  main.ts            Phaser.Game bootstrap + scene registry
  config.ts          Tunable balance + physics constants
  types.ts           Shared types (upgrades, save data, run results)
  data/
    upgrades.ts      Upgrade catalog (tiers, costs, effects)
    levels.ts        Stage definitions
  state/
    SaveManager.ts   localStorage persistence (cash, upgrade tiers, progress)
  objects/
    Car.ts           Matter compound body (chassis + wheels), controls, fuel
    Terrain.ts       Procedural hilly ground (Matter static chain)
    Zombie.ts        Horde unit
    Pickup.ts        Fuel can / cash bag
  scenes/
    BootScene.ts     Minimal boot
    PreloadScene.ts  Procedural texture generation
    MenuScene.ts     Title + start
    GameScene.ts     The run (physics world)
    UiScene.ts       HUD overlay (fuel, distance, cash, speed)
    ResultScene.ts   Run summary -> bank cash
    GarageScene.ts   Upgrade shop
```

## License

MIT. This is an original implementation inspired by the *Earn to Die* genre; it ships no assets from any commercial game.
