import { world } from './entities.js';
import { spawnEnemy } from './enemies.js';

export const ws = { phase: 'break', timer: 3, queue: [], spawnT: 0 };

export function resetWaves() {
  ws.phase = 'break'; ws.timer = 3; ws.queue = []; ws.spawnT = 0;
}

const COST = { goblin: 1, orc: 3, archer: 2, shaman: 3 };

function compose(n) {
  const q = [];
  let budget = 5 + n * 3.2 + n * n * 0.08;
  const boss = n % 5 === 0;
  if (boss) budget *= 0.7;
  const avail = ['goblin'];
  if (n >= 2) avail.push('orc', 'goblin');
  if (n >= 3) avail.push('archer');
  if (n >= 4) avail.push('shaman');
  let guard = 0;
  while (budget > 0 && guard++ < 200) {
    const pool = avail.filter((t) => COST[t] <= budget);
    if (!pool.length) break;
    const t = pool[Math.floor(Math.random() * pool.length)];
    q.push(t); budget -= COST[t];
  }
  for (let i = q.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [q[i], q[j]] = [q[j], q[i]];
  }
  if (boss) q.splice(Math.floor(q.length / 2), 0, 'boss');
  return q;
}

export function updateWaves(dt, ev) {
  if (ws.phase === 'break') {
    ws.timer -= dt;
    if (ws.timer <= 0) {
      world.wave++;
      ws.queue = compose(world.wave);
      ws.phase = 'spawn';
      ws.spawnT = 0.5;
      ev.waveStart(world.wave, world.wave % 5 === 0);
    }
  } else {
    ws.spawnT -= dt;
    if (ws.queue.length && ws.spawnT <= 0) {
      spawnEnemy(ws.queue.shift(), world.wave);
      ws.spawnT = Math.max(0.25, 0.95 - world.wave * 0.03) * (0.7 + Math.random() * 0.6);
    }
    if (!ws.queue.length && world.enemies.every((e) => e.dead)) {
      ws.phase = 'break'; ws.timer = 6;
      ev.waveEnd(world.wave);
    }
  }
}
