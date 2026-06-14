# Level Design — Earn to Die: Evac Run

Eight authored stages with a day → dusk → night → blood-moon arc. Each stage is
an ordered list of **segments** (a pacing curve) with one signature set-piece and
a risky "item challenge" cache. The data lives in `src/data/levelPlans.ts`;
`SEGMENT_BEHAVIOR` maps each segment type to terrain (roughness/slope/gaps) and
spawn parameters consumed by `GameScene.buildFromPlan()`.

Segment vocabulary: `calm, rollers, climb, descent, gap, horde, brutewall,
crawlerpit, junkyard, rampline, fuelgauntlet, treasure`.

| # | Stage | Dist | Signature set-piece | Item challenge |
|---|-------|------|---------------------|----------------|
| 1 | Suburbs | 300m | **Backyard Pool Jump** — plywood ramp over a drained pool onto a roof-deck | Garage cache behind a crawler-filled driveway dip |
| 2 | Highway | 600m | **The Jackknife** — wreck-stacked ramp over a collapsed overpass span | Median cache ringed by a sunken crawler pit |
| 3 | Forest | 900m | **The Deadfall Leap** — toppled redwood ramp over a crawler ravine | Fern-hollow fuel/cash reached by dropping into a crawler pit |
| 4 | Badlands | 1200m | **Devil's Gulch Launch** — cliff mega-ramp across a canyon, cash mid-arc | Dry Wash Hoard in a crawler dip right before the climb you need fuel for |
| 5 | Industrial | 1500m | **The Smelter Gap** — conveyor ramps over a molten slag pit (needs nitro) | Sunken loading-bay cache: crawler nest floor + guard brute |
| 6 | Mountain Pass | 1800m | **The Hairpin Chasm** — summit jump over a collapsed road | Cliff-ledge cache over a sheer drop |
| 7 | Frozen Wastes | 2100m | **Frozen Lake Crevasse** — long ice jump onto cracking ice | Wind-scoured ice-shelf cache past a gap (burns the fuel you steal) |
| 8 | Blood Moon Finale | 2400m | **The Severed Span** — collapsing crimson mega-bridge, the make-or-break leap | The Crimson Vault — richest cache in the game, in a crawler dip, tank bleeding out |

Difficulty escalates monotonically: stage 1 is beatable near-stock; stage 8
demands a heavily upgraded rig. Each stage opens calm (learn/breathe), builds
(hordes/junk/climbs), peaks at its signature gap/climax, then eases to the evac.

Designed via a multi-agent design pass (8 parallel level designers + economy
analyst + synthesis), reconciled into this escalating campaign.
