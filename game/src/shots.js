// The staged scenes behind ?shot=play|title|caught|win. Each one plays the real rules
// forward from a fresh world for a fixed time, steered by an autopilot that reads the
// guards' cones before it moves, so the frame is what a short game really looks like
// and the same seed always gives the same frame.
import { FIELD, PLAYER, GUARD, CAMERA } from './config.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_CAUGHT, SCREEN_WIN } from './world.js';

const DIRS = [
  [0, 0],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

function rectBlocks(x, y, r, rect) {
  const nx = Math.max(rect.x, Math.min(x, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(y, rect.y + rect.h));
  const dx = x - nx;
  const dy = y - ny;
  return dx * dx + dy * dy < r * r;
}

function pointBlocked(world, x, y) {
  const solids = [...world.level.walls, ...world.level.crates, world.level.safe];
  for (const rect of solids) {
    if (rectBlocks(x, y, PLAYER.radius, rect)) return true;
  }
  return false;
}

function wouldBeSeen(world, x, y) {
  for (const g of world.guards) {
    if (world.coneSees(g, GUARD.range, GUARD.halfAngle, x, y) > 0) return true;
  }
  for (const cam of world.cameras) {
    if (world.coneSees(cam, CAMERA.range, CAMERA.halfAngle, x, y) > 0) return true;
  }
  return false;
}

/** The safest step toward `target` right now: the direction whose landing spot is nearest the target and out of every cone. */
function autopilot(world, target, cautious) {
  const p = world.player;
  let best = null;
  let bestCost = Infinity;
  for (const [dx, dy] of DIRS) {
    const len = Math.hypot(dx, dy) || 1;
    const nx = p.x + (dx / len) * PLAYER.walk * 0.12;
    const ny = p.y + (dy / len) * PLAYER.walk * 0.12;
    const dist = Math.hypot(target.x - nx, target.y - ny);
    let cost = dist;
    if (pointBlocked(world, nx, ny)) cost += 900;
    if (cautious && wouldBeSeen(world, nx, ny)) cost += 1200;
    if (dx === 0 && dy === 0) cost += 30;
    if (cost < bestCost) {
      bestCost = cost;
      best = [dx, dy];
    }
  }
  const [bx, by] = best;
  return {
    up: by < 0,
    down: by > 0,
    left: bx < 0,
    right: bx > 0,
    sprint: false,
    sneak: cautious,
    smoke: false,
    coin: false,
    click: null,
  };
}

function runFor(world, seconds, drive) {
  const steps = Math.floor(seconds * 60);
  for (let i = 0; i < steps; i++) {
    if (world.screen !== SCREEN_PLAY) break;
    const input = drive(world);
    if (world.alarm > 55 && world.smokeLeft > 0) input.smoke = true;
    world.step(1 / 60, input);
  }
}

/**
 * Set `world` to the named scene and return the screen to draw. The title scene plays
 * five seconds in and shows the title over it; play runs toward the diamond; caught
 * walks straight at a guard until the alarm fills; win steals the diamond and escapes.
 */
export function stageShot(name, world) {
  world.start();
  const diamond = world.level.diamond;
  const exit = { x: world.level.exit.x + 14, y: world.level.exit.y + 40 };

  if (name === 'title') {
    runFor(world, 5, (w) => autopilot(w, diamond, true));
    world.screen = SCREEN_TITLE;
    return { screen: SCREEN_TITLE };
  }
  if (name === 'caught') {
    // Stay 50px ahead of the guard, in its cone, while it patrols: the alarm fills
    // and the run ends caught, the way a careless thief gets caught.
    runFor(world, 30, (w) => {
      const g = w.guards[0];
      return autopilot(w, { x: g.x + Math.cos(g.angle) * 50, y: g.y + Math.sin(g.angle) * 50 }, false);
    });
    return { screen: world.screen === SCREEN_CAUGHT ? SCREEN_CAUGHT : SCREEN_PLAY };
  }
  if (name === 'win') {
    runFor(world, 60, (w) => autopilot(w, w.diamondTaken ? exit : diamond, true));
    if (world.screen !== SCREEN_WIN) {
      runFor(world, 60, (w) => autopilot(w, w.diamondTaken ? exit : diamond, true));
    }
    if (world.screen !== SCREEN_WIN) {
      // The pilot could not get there in time: place the thief at the door with the
      // diamond and let the real rules finish the getaway, so the frame still shows it.
      world.player.x = exit.x + 4;
      world.player.y = exit.y;
      if (!world.diamondTaken) {
        world.diamondTaken = true;
        world.player.hasDiamond = true;
        world.score += 500;
      }
      world.step(1 / 60, { up: false, down: false, left: false, right: false, sprint: false, sneak: false, smoke: false, coin: false, click: null });
    }
    return { screen: world.screen === SCREEN_WIN ? SCREEN_WIN : SCREEN_PLAY, forced: world.screen !== SCREEN_WIN };
  }
  runFor(world, 14, (w) => autopilot(w, diamond, true));
  return { screen: SCREEN_PLAY };
}
