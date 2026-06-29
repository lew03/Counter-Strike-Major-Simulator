let ctx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    ctx = new AudioCtx();
  }
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

export function setMuted(value: boolean) {
  muted = value;
}

export function isMuted() {
  return muted;
}

function tone(freq: number, startOffset: number, duration: number, type: OscillatorType = "sine", gainPeak = 0.18) {
  const audioCtx = getCtx();
  if (!audioCtx || muted) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = audioCtx.currentTime + startOffset;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(gainPeak, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export function playPickSound() {
  tone(660, 0, 0.1, "triangle", 0.12);
}

export function playWinSound() {
  tone(523, 0, 0.12, "triangle");
  tone(659, 0.08, 0.14, "triangle");
  tone(784, 0.16, 0.22, "triangle", 0.2);
}

export function playLossSound() {
  tone(330, 0, 0.18, "sawtooth", 0.1);
  tone(220, 0.1, 0.22, "sawtooth", 0.08);
}

export function playChampionSound() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((f, i) => tone(f, i * 0.14, 0.3, "triangle", 0.16));
}

export function playEliminatedSound() {
  const notes = [392, 349, 311, 261];
  notes.forEach((f, i) => tone(f, i * 0.12, 0.25, "sawtooth", 0.1));
}
