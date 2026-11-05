// Web Audio sound effects for the auth page desk lamp.
// Created lazily on the first user gesture so autoplay policies never block it.

let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Crisp mechanical switch click. */
export function playSwitchClick() {
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "square";
  o.frequency.setValueAtTime(2600, t);
  o.frequency.exponentialRampToValueAtTime(320, t + 0.045);
  g.gain.setValueAtTime(0.12, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + 0.09);
}

/** Electrical hum ramping up (~120 Hz) and decaying — lamp turning on. */
export function playHumOn() {
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  const o2 = c.createOscillator();
  const g = c.createGain();
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 420;
  o.type = "sine";
  o.frequency.setValueAtTime(72, t);
  o.frequency.linearRampToValueAtTime(120, t + 0.55);
  o2.type = "sine";
  o2.frequency.setValueAtTime(240, t);
  o2.frequency.linearRampToValueAtTime(360, t + 0.55);
  const g2 = c.createGain();
  g2.gain.value = 0.18;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.055, t + 0.35);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
  o.connect(f);
  o2.connect(g2).connect(f);
  f.connect(g).connect(c.destination);
  o.start(t);
  o2.start(t);
  o.stop(t + 2.3);
  o2.stop(t + 2.3);
}

/** Short descending hum — lamp turning off. */
export function playHumOff() {
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(120, t);
  o.frequency.exponentialRampToValueAtTime(48, t + 0.55);
  g.gain.setValueAtTime(0.05, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + 0.7);
}
