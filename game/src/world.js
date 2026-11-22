// The Midnight Vault's rules: movement, guard and camera sight, the alarm meter,
// smoke and coin tools, loot, and the win / caught endings.
import { FIELD, PLAYER, GUARD, CAMERA, ALARM, TOOLS } from './config.js';
import { buildLevel } from './level.js';
import { mulberry32 } from './rng.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_WIN = 'win';

const TAU = Math.PI * 2;

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  return d;
}

function circleHitsRect(cx, cy, r, rect) {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

function pointInRect(px, py, rect) {
  return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
}

export function createWorld(seed = 7) {
  const level = buildLevel();
  const rng = mulberry32(seed);
  const world = {
    seed,
    rng,
    level,
    screen: SCREEN_TITLE,
    time: 0,
    alarm: 0,
    score: 0,
    best: 0,
    smokeLeft: TOOLS.smoke,
    coinsLeft: TOOLS.coins,
    diamondTaken: false,
    lootTaken: new Set(),
    smokes: [],
    coins: [],
    lastSeen: null,
    loseSight: 0,
    events: [],
    player: {
      x: level.playerStart.x,
      y: level.playerStart.y,
      angle: 0,
      stance: 'walk',
      moving: false,
      hasDiamond: false,
      loot: 0,
    },
    guards: level.guards.map((g) => ({
      waypoints: g.waypoints,
      x: g.waypoints[0][0],
      y: g.waypoints[0][1],
      angle: 0,
      wp: 1,
      pause: 0,
      mode: 'patrol',
      target: null,
      wait: 0,
      seesPlayer: false,
    })),
    cameras: level.cameras.map((c) => ({ x: c.x, y: c.y, base: c.base, angle: c.base, t: rng() * 6, seesPlayer: false })),
  };

  function solids() {
    return [...world.level.walls, ...world.level.crates, world.level.safe];
  }

  function blockedAt(x, y, r) {
    for (const rect of solids()) {
      if (circleHitsRect(x, y, r, rect)) return true;
    }
    return false;
  }

  function moveCircle(body, dx, dy, r) {
    const nx = body.x + dx;
    if (!blockedAt(nx, body.y, r)) body.x = nx;
    const ny = body.y + dy;
    if (!blockedAt(body.x, ny, r)) body.y = ny;
    body.x = Math.max(r, Math.min(FIELD.width - r, body.x));
    body.y = Math.max(r, Math.min(FIELD.height - r, body.y));
  }

  // True when the straight line from (x1,y1) to (x2,y2) is not cut by a wall,
  // a crate, the safe, or a smoke cloud.
  function lineOfSight(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(dist / 6));
    for (let i = 1; i < steps; i++) {
      const px = x1 + (dx * i) / steps;
      const py = y1 + (dy * i) / steps;
      for (const rect of solids()) {
        if (pointInRect(px, py, rect)) return false;
      }
      for (const s of world.smokes) {
        if ((px - s.x) * (px - s.x) + (py - s.y) * (py - s.y) < s.r * s.r) return false;
      }
    }
    return true;
  }

  function coneSees(eye, range, halfAngle, px, py) {
    const dx = px - eye.x;
    const dy = py - eye.y;
    const dist = Math.hypot(dx, dy);
    if (dist > range) return 0;
    const ang = Math.atan2(dy, dx);
    if (Math.abs(angleDiff(ang, eye.angle)) > halfAngle) return 0;
    if (!lineOfSight(eye.x, eye.y, px, py)) return 0;
    return 1.3 - (dist / range) * 0.7;
  }

  function stanceFactor() {
    const p = world.player;
    if (p.stance === 'sprint') return 1.6;
    if (p.stance === 'sneak') return 0.55;
    return 1;
  }

  function reset(seedValue) {
    const fresh = createWorld(seedValue === undefined ? world.seed : seedValue);
    fresh.best = world.best;
    // Copy the fresh state's data only: the methods (reset/start/step/lineOfSight/
    // coneSees) stay this world's own closures, so they keep reading this world's state.
    for (const k of Object.keys(fresh)) {
      if (k === 'reset' || k === 'start' || k === 'step' || k === 'lineOfSight' || k === 'coneSees') continue;
      world[k] = fresh[k];
    }
    world.screen = SCREEN_PLAY;
  }

  function start() {
    reset(world.seed);
  }

  function step(dt, input) {
    if (world.screen !== SCREEN_PLAY) return;
    world.time += dt;
    world.events.length = 0;
    const p = world.player;

    // --- player movement ---
    let mx = 0;
    let my = 0;
    if (input.up) my -= 1;
    if (input.down) my += 1;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;
    if (input.click) {
      const dx = input.click.x - p.x;
      const dy = input.click.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > 6) {
        mx = dx / d;
        my = dy / d;
      }
    }
    const len = Math.hypot(mx, my);
    p.stance = input.sprint ? 'sprint' : input.sneak ? 'sneak' : 'walk';
    const speed = p.stance === 'sprint' ? PLAYER.sprint : p.stance === 'sneak' ? PLAYER.sneak : PLAYER.walk;
    p.moving = len > 0;
    if (len > 0) {
      p.angle = Math.atan2(my, mx);
      moveCircle(p, (mx / len) * speed * dt, (my / len) * speed * dt, PLAYER.radius);
    }

    // --- tools ---
    if (input.smoke && world.smokeLeft > 0) {
      world.smokes.push({ x: p.x, y: p.y, r: TOOLS.smokeRadius, t: TOOLS.smokeTime });
      world.smokeLeft -= 1;
      world.events.push('smoke');
    }
    if (input.coin && world.coinsLeft > 0) {
      const cx = p.x + Math.cos(p.angle) * TOOLS.coinRange;
      const cy = p.y + Math.sin(p.angle) * TOOLS.coinRange;
      world.coins.push({ x: Math.max(20, Math.min(FIELD.width - 20, cx)), y: Math.max(20, Math.min(FIELD.height - 20, cy)), t: 8 });
      world.coinsLeft -= 1;
      world.events.push('coin');
      let nearest = null;
      let nearestD = TOOLS.coinLure;
      for (const g of world.guards) {
        const d = Math.hypot(g.x - cx, g.y - cy);
        if (d < nearestD) {
          nearest = g;
          nearestD = d;
        }
      }
      if (nearest) {
        nearest.mode = 'investigate';
        nearest.target = { x: cx, y: cy };
        nearest.wait = 5;
      }
    }

    // --- smoke and coin timers ---
    for (const s of world.smokes) s.t -= dt;
    world.smokes = world.smokes.filter((s) => s.t > 0);
    for (const c of world.coins) c.t -= dt;
    world.coins = world.coins.filter((c) => c.t > 0);

    // --- cameras sweep ---
    for (const cam of world.cameras) {
      cam.t += dt;
      cam.angle = cam.base + Math.sin(cam.t * CAMERA.sweep) * CAMERA.sweepArc;
    }

    // --- guards move ---
    for (const g of world.guards) {
      if (g.mode === 'chase') {
        const dx = p.x - g.x;
        const dy = p.y - g.y;
        const d = Math.hypot(dx, dy);
        if (d > 4) {
          g.angle = Math.atan2(dy, dx);
          moveCircle(g, (dx / d) * GUARD.chase * dt, (dy / d) * GUARD.chase * dt, GUARD.radius);
        }
        continue;
      }
      if (g.mode === 'investigate' && g.target) {
        const dx = g.target.x - g.x;
        const dy = g.target.y - g.y;
        const d = Math.hypot(dx, dy);
        if (d > 8) {
          g.angle = Math.atan2(dy, dx);
          moveCircle(g, (dx / d) * GUARD.patrol * 1.4 * dt, (dy / d) * GUARD.patrol * 1.4 * dt, GUARD.radius);
        } else {
          g.wait -= dt;
          g.angle += dt * 0.9;
          if (g.wait <= 0) {
            g.mode = 'patrol';
            g.target = null;
          }
        }
        continue;
      }
      if (g.pause > 0) {
        g.pause -= dt;
        continue;
      }
      const target = g.waypoints[g.wp];
      const dx = target[0] - g.x;
      const dy = target[1] - g.y;
      const d = Math.hypot(dx, dy);
      if (d < 4) {
        g.wp = (g.wp + 1) % g.waypoints.length;
        g.pause = GUARD.pause;
      } else {
        g.angle = Math.atan2(dy, dx);
        moveCircle(g, (dx / d) * GUARD.patrol * dt, (dy / d) * GUARD.patrol * dt, GUARD.radius);
      }
    }

    // --- sight and alarm ---
    let spotters = 0;
    let heat = 0;
    const factor = stanceFactor() * (p.moving ? 1 : 0.8);
    for (const g of world.guards) {
      const seen = coneSees(g, GUARD.range, GUARD.halfAngle, p.x, p.y);
      g.seesPlayer = seen > 0;
      if (seen > 0) {
        spotters += 1;
        heat += seen * factor;
      }
    }
    for (const cam of world.cameras) {
      const seen = coneSees(cam, CAMERA.range, CAMERA.halfAngle, p.x, p.y);
      cam.seesPlayer = seen > 0;
      if (seen > 0) {
        spotters += 1;
        heat += seen * factor * 0.8;
      }
    }
    if (spotters > 0) {
      world.alarm = Math.min(100, world.alarm + ALARM.rise * heat * dt);
      world.lastSeen = { x: p.x, y: p.y };
      world.loseSight = 0;
      if (world.alarm >= ALARM.chaseAt) {
        for (const g of world.guards) {
          if (g.seesPlayer) g.mode = 'chase';
        }
      }
      if (world.alarm >= 100) {
        world.screen = SCREEN_CAUGHT;
        world.events.push('caught');
        return;
      }
    } else {
      world.alarm = Math.max(0, world.alarm - ALARM.decay * dt);
      world.loseSight += dt;
      if (world.loseSight > 3) {
        for (const g of world.guards) {
          if (g.mode === 'chase') g.mode = 'patrol';
        }
      }
    }

    // --- pickups ---
    if (!world.diamondTaken) {
      const d = Math.hypot(p.x - world.level.diamond.x, p.y - world.level.diamond.y);
      if (d < 64) {
        world.diamondTaken = true;
        p.hasDiamond = true;
        world.score += 500;
        world.events.push('pickup');
      }
    }
    world.level.loot.forEach((bag, i) => {
      if (world.lootTaken.has(i)) return;
      const d = Math.hypot(p.x - bag.x, p.y - bag.y);
      if (d < 26) {
        world.lootTaken.add(i);
        p.loot += 1;
        world.score += 250;
        world.events.push('loot');
      }
    });

    // --- the getaway ---
    if (p.hasDiamond && pointInRect(p.x, p.y, world.level.exit)) {
      const timeBonus = Math.max(0, 500 - Math.floor(world.time) * 5);
      world.score += timeBonus;
      world.best = Math.max(world.best, world.score);
      world.screen = SCREEN_WIN;
      world.events.push('win');
    }
  }

  world.reset = reset;
  world.start = start;
  world.step = step;
  world.lineOfSight = lineOfSight;
  world.coneSees = coneSees;
  return world;
}
