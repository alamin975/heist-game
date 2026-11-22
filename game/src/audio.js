// Small WebAudio sounds for The Midnight Vault: pickups, lures, the alarm and the endings.
// Everything is synthesized, nothing is loaded, and every call is safe when audio is unavailable.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
    } catch {
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  tone(freq, dur, type = 'sine', vol = 0.12, slideTo = null) {
    if (this.muted || !this.ctx) return;
    try {
      const t0 = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      gain.gain.setValueAtTime(vol, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur);
    } catch {
      // Silence is fine when the browser refuses audio.
    }
  }

  pickup() {
    this.tone(660, 0.12, 'sine', 0.14);
    setTimeout(() => this.tone(990, 0.18, 'sine', 0.14), 90);
  }

  loot() {
    this.tone(880, 0.1, 'triangle', 0.12);
  }

  coin() {
    this.tone(1320, 0.08, 'square', 0.06);
    setTimeout(() => this.tone(1760, 0.1, 'square', 0.05), 70);
  }

  smoke() {
    this.tone(220, 0.35, 'sawtooth', 0.05, 90);
  }

  alarmBlip() {
    this.tone(520, 0.09, 'square', 0.05);
  }

  caught() {
    this.tone(330, 0.5, 'sawtooth', 0.14, 110);
    setTimeout(() => this.tone(165, 0.6, 'sawtooth', 0.12, 82), 200);
  }

  win() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.22, 'triangle', 0.13), i * 130));
  }
}
