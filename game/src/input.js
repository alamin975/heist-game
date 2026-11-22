// Keyboard and mouse for The Midnight Vault. Keys are tracked as a held set; one-shot
// actions (smoke, coin) are consumed once per press. Clicking the floor sets a walk target.
import { FIELD, HUD_H } from './config.js';

export function createInput(canvas, onAction) {
  const held = new Set();
  const pressed = new Set();
  let click = null;
  let scale = 1;

  function fieldPoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    scale = rect.width / canvas.width;
    return {
      x: (clientX - rect.left) / scale,
      y: (clientY - rect.top) / scale - HUD_H,
    };
  }

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (!e.repeat) pressed.add(e.code);
    held.add(e.code);
    if (onAction) onAction(e.code);
  });
  window.addEventListener('keyup', (e) => held.delete(e.code));
  window.addEventListener('blur', () => held.clear());
  canvas.addEventListener('mousedown', (e) => {
    const p = fieldPoint(e.clientX, e.clientY);
    if (p.y >= 0 && p.y <= FIELD.height) click = p;
  });

  function sample() {
    const input = {
      up: held.has('KeyW') || held.has('ArrowUp'),
      down: held.has('KeyS') || held.has('ArrowDown'),
      left: held.has('KeyA') || held.has('ArrowLeft'),
      right: held.has('KeyD') || held.has('ArrowRight'),
      sprint: held.has('ShiftLeft') || held.has('ShiftRight'),
      sneak: held.has('KeyC') || held.has('ControlLeft'),
      smoke: pressed.has('KeyQ') || pressed.has('Digit1'),
      coin: pressed.has('KeyE') || pressed.has('Digit2'),
      click,
    };
    pressed.clear();
    if (click) {
      // Keep walking to the click until a key moves the thief or it arrives.
      if (input.up || input.down || input.left || input.right) click = null;
    }
    return input;
  }

  function consume(code) {
    if (pressed.has(code)) {
      pressed.delete(code);
      return true;
    }
    return false;
  }

  return { sample, consume, held };
}
