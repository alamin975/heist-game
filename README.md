# The Midnight Vault

[![make.fun](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/alamin975/heist-game/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/alamin975/heist-game/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)

A top-down stealth heist game: one thief, one vault room, three patrolling guards
with vision cones, two sweeping security cameras, a diamond in the safe — and an
alarm meter that fills every second you are seen.

## How to play

- **WASD / arrow keys** — move (or click the floor to walk there)
- **Shift** — sprint (fast, but loud: guards spot you quicker)
- **C** — sneak (slow, but harder to see)
- **Q** — smoke bomb: a cloud that blocks every cone for 6 seconds (2 per run)
- **E** — toss a coin: the nearest guard leaves its patrol to investigate (3 per run)
- **M** — mute, **R** — restart

Steal the diamond from the safe, then slip out the green EXIT door on the left wall.
Grab the three loot bags on the way for extra points — and finish fast for a time bonus.
If the alarm hits 100%, the guards close in and the run is over.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to
`/output` and writes `/output/dossier.json` with the vendored make.fun library.
