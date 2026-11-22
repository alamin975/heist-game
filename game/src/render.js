// Every pixel of The Midnight Vault: the vault room, the vision cones, the thief,
// the HUD with its alarm meter, and the title, caught and win screens.
import { FIELD, HUD_H, PLAYER, GUARD, CAMERA } from './config.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_CAUGHT, SCREEN_WIN } from './world.js';

const W = FIELD.width;
const H = FIELD.height + HUD_H;

function drawCone(ctx, x, y, angle, range, half, color) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - half, angle + half);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = color.replace(/[\d.]+\)$/, '0.55)');
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(angle - half) * range, y + Math.sin(angle - half) * range);
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(angle + half) * range, y + Math.sin(angle + half) * range);
  ctx.stroke();
}

function drawRect(ctx, rect, fill, stroke) {
  ctx.fillStyle = fill;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
  }
}

function drawField(ctx, world) {
  const level = world.level;
  // Floor: dark tiles with a faint grid, and a worn carpet runner down the middle.
  ctx.fillStyle = '#171a22';
  ctx.fillRect(0, 0, W, FIELD.height);
  ctx.fillStyle = '#1d212c';
  for (let x = 0; x < W; x += 80) {
    for (let y = 0; y < FIELD.height; y += 80) {
      if (((x + y) / 80) % 2 === 0) ctx.fillRect(x, y, 80, 80);
    }
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, FIELD.height);
    ctx.stroke();
  }
  for (let y = 0; y <= FIELD.height; y += 80) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(120,40,50,0.16)';
  ctx.fillRect(420, 0, 120, FIELD.height);

  // Exit door, in the gap of the left wall.
  ctx.fillStyle = '#1d7a3d';
  ctx.fillRect(level.exit.x, level.exit.y, level.exit.w, level.exit.h);
  ctx.fillStyle = '#7dff9e';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.save();
  ctx.translate(14, level.exit.y + level.exit.h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('EXIT', 0, 4);
  ctx.restore();

  // The safe and its diamond.
  drawRect(ctx, level.safe, '#8a6d2f', '#e8c15a');
  ctx.fillStyle = '#5d4a1e';
  ctx.beginPath();
  ctx.arc(level.safe.x + level.safe.w / 2, level.safe.y + level.safe.h / 2, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e8c15a';
  ctx.lineWidth = 2;
  ctx.stroke();
  if (!world.diamondTaken) {
    const cx = level.diamond.x;
    const cy = level.diamond.y;
    const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, 26);
    glow.addColorStop(0, 'rgba(90,220,255,0.8)');
    glow.addColorStop(1, 'rgba(90,220,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7de8ff';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 12);
    ctx.lineTo(cx + 10, cy);
    ctx.lineTo(cx, cy + 12);
    ctx.lineTo(cx - 10, cy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#0b0d12';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('◆', cx, cy + 3);
  }

  // Loot bags.
  level.loot.forEach((bag, i) => {
    if (world.lootTaken.has(i)) return;
    ctx.fillStyle = '#c9a227';
    ctx.beginPath();
    ctx.arc(bag.x, bag.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0b0d12';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('$', bag.x, bag.y + 4);
  });

  // Walls and crates.
  for (const wall of level.walls) drawRect(ctx, wall, '#3a4152', '#565f73');
  for (const crate of level.crates) {
    drawRect(ctx, crate, '#6b4f2a', '#a67c3d');
    ctx.strokeStyle = '#a67c3d';
    ctx.beginPath();
    ctx.moveTo(crate.x + 4, crate.y + 4);
    ctx.lineTo(crate.x + crate.w - 4, crate.y + crate.h - 4);
    ctx.moveTo(crate.x + crate.w - 4, crate.y + 4);
    ctx.lineTo(crate.x + 4, crate.y + crate.h - 4);
    ctx.stroke();
  }

  // Camera cones first, under the guards' cones.
  for (const cam of world.cameras) {
    drawCone(ctx, cam.x, cam.y, cam.angle, CAMERA.range, CAMERA.halfAngle, cam.seesPlayer ? 'rgba(255,60,60,0.30)' : 'rgba(255,80,80,0.16)');
  }
  for (const g of world.guards) {
    const color = g.mode === 'chase' ? 'rgba(255,50,50,0.30)' : g.mode === 'investigate' ? 'rgba(255,150,50,0.26)' : 'rgba(255,200,60,0.18)';
    drawCone(ctx, g.x, g.y, g.angle, GUARD.range, GUARD.halfAngle, color);
  }

  // Cameras on their mounts.
  for (const cam of world.cameras) {
    ctx.fillStyle = '#9aa3b2';
    ctx.beginPath();
    ctx.arc(cam.x, cam.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = cam.seesPlayer ? '#ff4040' : '#c03030';
    ctx.beginPath();
    ctx.arc(cam.x + Math.cos(cam.angle) * 5, cam.y + Math.sin(cam.angle) * 5, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Smoke clouds.
  for (const s of world.smokes) {
    const fade = Math.min(1, s.t / 2);
    ctx.fillStyle = `rgba(180,180,190,${0.35 * fade})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(220,220,230,${0.25 * fade})`;
    ctx.beginPath();
    ctx.arc(s.x - 22, s.y + 12, s.r * 0.55, 0, Math.PI * 2);
    ctx.arc(s.x + 24, s.y - 10, s.r * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Thrown coins.
  for (const c of world.coins) {
    ctx.fillStyle = '#ffd94a';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,217,74,0.6)';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 9, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Guards: red coats with a facing tick.
  for (const g of world.guards) {
    ctx.fillStyle = g.mode === 'chase' ? '#e03030' : '#b03030';
    ctx.beginPath();
    ctx.arc(g.x, g.y, GUARD.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd9d9';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(g.x + Math.cos(g.angle) * (GUARD.radius + 6), g.y + Math.sin(g.angle) * (GUARD.radius + 6));
    ctx.stroke();
    if (g.mode === 'investigate') {
      ctx.fillStyle = '#ffb347';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('?', g.x, g.y - GUARD.radius - 6);
    }
    if (g.mode === 'chase') {
      ctx.fillStyle = '#ff6060';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('!', g.x, g.y - GUARD.radius - 6);
    }
  }

  // The thief: a teal shadow with a white nose, a ring while sneaking.
  const p = world.player;
  ctx.fillStyle = '#19b8a6';
  ctx.beginPath();
  ctx.arc(p.x, p.y, PLAYER.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e6fffa';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + Math.cos(p.angle) * (PLAYER.radius + 5), p.y + Math.sin(p.angle) * (PLAYER.radius + 5));
  ctx.stroke();
  if (p.stance === 'sneak') {
    ctx.strokeStyle = 'rgba(25,184,166,0.7)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, PLAYER.radius + 5, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (p.hasDiamond) {
    ctx.fillStyle = '#7de8ff';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 20);
    ctx.lineTo(p.x + 5, p.y - 13);
    ctx.lineTo(p.x, p.y - 6);
    ctx.lineTo(p.x - 5, p.y - 13);
    ctx.closePath();
    ctx.fill();
  }
}

function drawHud(ctx, world) {
  ctx.fillStyle = '#0d0f15';
  ctx.fillRect(0, FIELD.height, W, HUD_H);
  ctx.strokeStyle = '#2a2f3d';
  ctx.beginPath();
  ctx.moveTo(0, FIELD.height + 0.5);
  ctx.lineTo(W, FIELD.height + 0.5);
  ctx.stroke();

  // Alarm meter.
  const ax = 16;
  const ay = FIELD.height + 14;
  const aw = 220;
  const ah = 16;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ALARM', ax, ay + 12);
  ctx.fillStyle = '#262b38';
  ctx.fillRect(ax + 58, ay, aw, ah);
  const frac = world.alarm / 100;
  const alarmColor = frac < 0.4 ? '#37c978' : frac < 0.7 ? '#e8b93c' : '#e04040';
  ctx.fillStyle = alarmColor;
  ctx.fillRect(ax + 58, ay, Math.max(0, aw * frac), ah);
  ctx.strokeStyle = '#565f73';
  ctx.strokeRect(ax + 58 + 0.5, ay + 0.5, aw - 1, ah - 1);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${Math.floor(world.alarm)}%`, ax + 58 + aw + 8, ay + 12);

  // Objective.
  ctx.textAlign = 'center';
  const objective = world.diamondTaken ? 'Diamond taken — reach the green EXIT!' : 'Steal the diamond from the safe';
  ctx.fillStyle = world.diamondTaken ? '#7dff9e' : '#ffd94a';
  ctx.fillText(objective, W / 2 + 60, FIELD.height + 26);

  // Loot, tools, timer and score.
  ctx.textAlign = 'right';
  const mins = Math.floor(world.time / 60);
  const secs = Math.floor(world.time % 60).toString().padStart(2, '0');
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`◆ ${world.player.loot}/3   smoke ${world.smokeLeft}   coin ${world.coinsLeft}   ${mins}:${secs}   ${world.score} pts`, W - 16, FIELD.height + 26);
  ctx.textAlign = 'left';
}

function overlay(ctx, title, lines, color) {
  ctx.fillStyle = 'rgba(5,6,10,0.82)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText(title, W / 2, 250);
  ctx.fillStyle = '#e8ecf2';
  ctx.font = '17px sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, W / 2, 300 + i * 28));
}

export function render(ctx, world) {
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.translate(0, HUD_H);
  drawField(ctx, world);
  ctx.restore();
  drawHud(ctx, world);

  if (world.screen === SCREEN_TITLE) {
    overlay(ctx, 'THE MIDNIGHT VAULT', [
      'A stealth heist in one room. Sneak past the guards and their cameras,',
      'lift the diamond from the safe, and slip out the green exit.',
      '',
      'WASD / arrows — move      Shift — sprint (loud)      C — sneak (quiet)',
      'Q — smoke bomb      E — toss a coin to lure a guard      M — mute',
      'Click the floor to walk there. Watch the cones. Mind the alarm.',
      '',
      'Press ENTER or click to start',
    ], '#ffd94a');
  } else if (world.screen === SCREEN_CAUGHT) {
    overlay(ctx, 'CAUGHT!', [
      'The alarm hit 100% and the guards closed in.',
      `Score: ${world.score} pts   •   Time: ${Math.floor(world.time)}s`,
      '',
      'Press R to try the vault again',
    ], '#ff5050');
  } else if (world.screen === SCREEN_WIN) {
    overlay(ctx, 'CLEAN GETAWAY!', [
      'The diamond is yours and the vault never saw you leave.',
      `Score: ${world.score} pts   •   Time: ${Math.floor(world.time)}s   •   Best: ${world.best} pts`,
      '',
      'Press R to run the vault again',
    ], '#7dff9e');
  }
  if (world.screen === SCREEN_PLAY) {
    ctx.fillStyle = 'rgba(232,236,242,0.75)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('WASD move · Shift sprint · C sneak · Q smoke · E coin · M mute · R restart', 16, H - 8);
  }
}

export { W, H };
