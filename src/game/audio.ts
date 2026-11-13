// Tiny synthesized sound layer (no files). All calls are no-ops until unlocked by a user gesture.
import { useGame } from "./store";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let engineGain: GainNode | null = null;
let engineFilter: BiquadFilterNode | null = null;

function noiseBuffer(c: AudioContext, seconds: number, brown = false) {
  const buf = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    if (brown) {
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    } else d[i] = w;
  }
  return buf;
}

export function unlockAudio() {
  if (ctx) {
    void ctx.resume();
    return;
  }
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = useGame.getState().muted ? 0 : 0.6;
  master.connect(ctx.destination);
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 3, true);
  src.loop = true;
  engineFilter = ctx.createBiquadFilter();
  engineFilter.type = "lowpass";
  engineFilter.frequency.value = 400;
  engineGain = ctx.createGain();
  engineGain.gain.value = 0;
  src.connect(engineFilter).connect(engineGain).connect(master);
  src.start();
  useGame.subscribe((s) => {
    if (master && ctx) master.gain.setTargetAtTime(s.muted ? 0 : 0.6, ctx.currentTime, 0.05);
  });
}

export function setEngine(level: number) {
  if (!ctx || !engineGain || !engineFilter) return;
  engineGain.gain.setTargetAtTime(level * 0.9, ctx.currentTime, 0.08);
  engineFilter.frequency.setTargetAtTime(250 + level * 650, ctx.currentTime, 0.1);
}

export function beep(freq = 880, dur = 0.12, type: OscillatorType = "square", vol = 0.12) {
  if (!ctx || !master) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  o.connect(g).connect(master);
  o.start();
  o.stop(ctx.currentTime + dur + 0.02);
}

export function boom(big = true) {
  if (!ctx || !master) return;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, big ? 3 : 0.5);
  const f = ctx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.setValueAtTime(big ? 2400 : 1800, ctx.currentTime);
  f.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + (big ? 2.6 : 0.4));
  const g = ctx.createGain();
  g.gain.setValueAtTime(big ? 1.2 : 0.5, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (big ? 2.8 : 0.45));
  src.connect(f).connect(g).connect(master);
  src.start();
}
