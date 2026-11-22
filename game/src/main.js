// The Midnight Vault's boot: canvas, input, sound, the game loop, and the ?shot= scenes.
import { createWorld, SCREEN_TITLE, SCREEN_PLAY, SCREEN_CAUGHT, SCREEN_WIN } from './world.js';
import { render, W, H } from './render.js';
import { createInput } from './input.js';
import { SoundBank } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
canvas.width = W;
canvas.height = H;
const ctx = canvas.getContext('2d');

const world = createWorld(7);
const sounds = new SoundBank();
let lastAlarmBeep = 0;

const input = createInput(canvas, (code) => {
  sounds.ensure();
  if (code === 'KeyM') sounds.toggleMute();
  if (code === 'Enter' && world.screen === SCREEN_TITLE) {
    world.start();
    announce();
  } else if (code === 'Enter' && (world.screen === SCREEN_CAUGHT || world.screen === SCREEN_WIN)) {
    world.start();
    announce();
  } else if (code === 'KeyR' && world.screen !== SCREEN_TITLE) {
    world.start();
    announce();
  }
});

canvas.addEventListener('mousedown', () => {
  sounds.ensure();
  if (world.screen === SCREEN_TITLE) {
    world.start();
    announce();
  }
});

function announce() {
  const text =
    world.screen === SCREEN_TITLE
      ? 'The Midnight Vault. Press Enter to start.'
      : world.screen === SCREEN_PLAY
        ? 'Playing. Steal the diamond and reach the exit.'
        : world.screen === SCREEN_CAUGHT
          ? 'Caught. Press R to try again.'
          : 'Clean getaway. Press R to play again.';
  statusEl.textContent = text;
}

function playEvents() {
  for (const event of world.events) {
    if (event === 'pickup') sounds.pickup();
    else if (event === 'loot') sounds.loot();
    else if (event === 'coin') sounds.coin();
    else if (event === 'smoke') sounds.smoke();
    else if (event === 'caught') sounds.caught();
    else if (event === 'win') sounds.win();
  }
  if (world.alarm > 50 && world.time - lastAlarmBeep > 1) {
    lastAlarmBeep = world.time;
    sounds.alarmBlip();
  }
}

// A debug handle for playtesting: warp the thief, read the state, start a fresh run.
window.__vault = {
  state: () => ({
    screen: world.screen,
    alarm: Math.round(world.alarm),
    score: world.score,
    time: Math.round(world.time * 10) / 10,
    x: Math.round(world.player.x),
    y: Math.round(world.player.y),
    hasDiamond: world.player.hasDiamond,
    loot: world.player.loot,
    smokeLeft: world.smokeLeft,
    coinsLeft: world.coinsLeft,
  }),
  warp: (x, y) => {
    world.player.x = x;
    world.player.y = y;
  },
  setAlarm: (v) => {
    world.alarm = v;
  },
  giveDiamond: () => {
    world.diamondTaken = true;
    world.player.hasDiamond = true;
  },
  start: () => world.start(),
};
window.__game = world;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  const staged = stageShot(shot, world);
  render(ctx, world);
  window.__shot = { name: shot, screen: staged.screen, forced: staged.forced === true };
  window.__shotReady = true;
} else {
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (world.screen === SCREEN_PLAY) {
      world.step(dt, input.sample());
      playEvents();
    } else {
      input.sample();
    }
    render(ctx, world);
    requestAnimationFrame(frame);
  }
  announce();
  requestAnimationFrame(frame);
}
