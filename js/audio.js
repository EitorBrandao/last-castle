let ac = null;
let muted = false;
const last = {};

export function setMuted(m) { muted = m; }
export function isMuted() { return muted; }

export function unlock() {
  if (!ac) {
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; }
  }
  if (ac && ac.state === 'suspended') ac.resume();
}

function tone(f, d, type = 'square', vol = 0.05, slide = 0, delay = 0) {
  if (muted || !ac) return;
  const t = ac.currentTime + delay;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g); g.connect(ac.destination);
  o.start(t); o.stop(t + d + 0.03);
}

function noise(d, vol = 0.08, delay = 0) {
  if (muted || !ac) return;
  const t = ac.currentTime + delay;
  const n = Math.floor(ac.sampleRate * d);
  const buf = ac.createBuffer(1, n, ac.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = ac.createBufferSource();
  const g = ac.createGain();
  g.gain.value = vol;
  s.buffer = buf; s.connect(g); g.connect(ac.destination);
  s.start(t);
}

export function sfx(name) {
  if (muted || !ac) return;
  const now = performance.now();
  if (last[name] && now - last[name] < 50) return;
  last[name] = now;
  switch (name) {
    case 'hit': tone(220 + Math.random() * 80, 0.06, 'square', 0.035, -80); break;
    case 'shoot': tone(520, 0.07, 'triangle', 0.03, 200); break;
    case 'kill': tone(300, 0.1, 'sawtooth', 0.04, -200); break;
    case 'boom': noise(0.35, 0.12); tone(120, 0.3, 'sawtooth', 0.06, -80); break;
    case 'cast': tone(380, 0.18, 'sine', 0.06, 400); break;
    case 'spin': noise(0.2, 0.08); tone(200, 0.2, 'sawtooth', 0.04, 200); break;
    case 'castle': noise(0.25, 0.14); tone(90, 0.25, 'square', 0.07, -40); break;
    case 'heroDown': tone(300, 0.4, 'sawtooth', 0.06, -250); break;
    case 'revive': tone(400, 0.12, 'sine', 0.06, 300); tone(600, 0.15, 'sine', 0.06, 300, 0.1); break;
    case 'level': [440, 554, 659, 880].forEach((f, i) => tone(f, 0.15, 'triangle', 0.06, 0, i * 0.08)); break;
    case 'wave': tone(180, 0.35, 'sawtooth', 0.06, 60); tone(240, 0.35, 'sawtooth', 0.05, 60, 0.15); break;
    case 'boss': tone(90, 0.7, 'sawtooth', 0.09, -30); noise(0.5, 0.1); break;
    case 'over': [330, 262, 196, 130].forEach((f, i) => tone(f, 0.3, 'triangle', 0.07, 0, i * 0.2)); break;
    case 'click': tone(600, 0.05, 'square', 0.03); break;
    case 'deny': tone(140, 0.1, 'square', 0.04); break;
    case 'heal': tone(700, 0.12, 'sine', 0.03, 300); break;
    default: break;
  }
}
