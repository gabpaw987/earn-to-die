# Earn to Die — Evac Run

An **Earn to Die–inspired** 2D physics side-scroller built with **Phaser 3 + TypeScript + Vite**.

Drive your rig across a zombie-infested wasteland, splatter the horde, scavenge fuel and cash, then spend your earnings in the **Garage** to upgrade engine, wheels, fuel tank, armor, and weapons — far enough to reach the evac chopper at the end of each stage.

> Status: **M1 — full game loop** (run → results → garage/upgrades → next stage), persistent progress via `localStorage`. All art is generated procedurally at runtime (no binary assets committed).

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
