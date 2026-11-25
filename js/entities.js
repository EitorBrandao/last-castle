import { sfx } from './audio.js';

export const WORLD_W = 360;

export const world = {
  W: WORLD_W, H: 560, castleY: 478,
  enemies: [], heroes: [], projs: [], parts: [], texts: [], fields: [], fx: [],
  castle: { hp: 500, max: 500, flash: 0 },
  shake: 0, time: 0,
  xp: 0, level: 1, xpNeed: 25, pending: 0,
  runGold: 0, kills: 0, wave: 0,
  metaDmg: 1, lvBonus: 1,
  selected: null,
  onKill: null,
};

export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const rand = (a, b) => a + Math.random() * (b - a);

export function zone() {
  return { x0: 24, x1: WORLD_W - 24, y0: world.castleY - 135, y1: world.castleY - 26 };
}

export function addShake(v) { world.shake = Math.min(1, world.shake + v); }

export function particles(x, y, color, n = 8, speed = 80, life = 0.5, size = 3) {
  if (world.parts.length > 400) return;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.3 + Math.random() * 0.7);
    world.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: life * (0.6 + Math.random() * 0.6), color, size: size * (0.6 + Math.random() * 0.8) });
  }
}

export function floatText(x, y, txt, color = '#fff', size = 12) {
  if (world.texts.length > 70) world.texts.shift();
  world.texts.push({ x: x + rand(-6, 6), y, txt: String(txt), color, size, t: 0, life: 0.8 });
}

export function ring(x, y, r, color, life = 0.35) {
  world.fx.push({ kind: 'ring', x, y, r, color, t: 0, life });
}
export function line(x1, y1, x2, y2, color, life = 0.2, w = 3) {
  world.fx.push({ kind: 'line', x: x1, y: y1, x2, y2, color, t: 0, life, w });
}

export function damageEnemy(e, dmg, crit = false) {
  if (e.dead) return;
  dmg = Math.max(1, Math.round(dmg));
  e.hp -= dmg;
  e.flash = 0.1;
  floatText(e.x, e.y - e.r - 4, crit ? dmg + '!' : dmg, crit ? '#ffd23f' : '#ffffff', crit ? 16 : 12);
  if (e.hp <= 0) {
    e.dead = true;
    if (world.onKill) world.onKill(e);
  } else sfx('hit');
}

export function damageHero(h, dmg) {
  if (h.down) return;
  dmg *= h.armor * (h.dr > 0 ? 0.5 : 1);
  dmg = Math.max(1, Math.round(dmg));
  h.hp -= dmg;
  h.flash = 0.12;
  floatText(h.x, h.y - 20, '-' + dmg, '#ff6b6b', 12);
  if (h.hp <= 0) {
    h.hp = 0; h.down = true; h.revive = 12; h.taunt = 0; h.dr = 0; h.rain = null;
    floatText(h.x, h.y - 30, 'NOCAUTEADO', '#ff9f43', 13);
    particles(h.x, h.y, h.color, 14, 100, 0.6);
    sfx('heroDown');
    if (world.selected === h) world.selected = null;
  }
}

export function damageCastle(dmg) {
  const c = world.castle;
  dmg = Math.max(1, Math.round(dmg));
  c.hp = Math.max(0, c.hp - dmg);
  c.flash = 0.18;
  addShake(0.22);
  floatText(world.W / 2 + rand(-60, 60), world.castleY - 4, '-' + dmg, '#ff4d4d', 14);
  particles(world.W / 2 + rand(-80, 80), world.castleY + 4, '#b9b9c4', 4, 70, 0.4, 3);
  sfx('castle');
}

export function shootProj(p) {
  world.projs.push(Object.assign({ life: 4, hitR: 5, speed: 260, dmg: 1, owner: 'hero', color: '#fff', size: 3 }, p));
}

function hitProj(p) {
  if (p.owner === 'hero') {
    if (p.splash) {
      for (const e of world.enemies) {
        if (e.dead || Math.hypot(e.x - p.x, e.y - p.y) > p.splash + e.r) continue;
        const f = (p.full || e === p.target) ? 1 : 0.6;
        damageEnemy(e, p.dmg * f, p.crit && e === p.target);
      }
      ring(p.x, p.y, p.splash, p.color, 0.3);
      particles(p.x, p.y, p.color, p.fire ? 22 : 8, p.fire ? 150 : 70, 0.5, p.fire ? 4 : 3);
      if (p.fire) { addShake(0.18); sfx('boom'); }
    } else if (p.target && !p.target.dead) {
      damageEnemy(p.target, p.dmg, p.crit);
      particles(p.x, p.y, p.color, 3, 50, 0.25, 2);
    }
  } else {
    const t = p.target;
    if (t.castle) damageCastle(p.dmg);
    else if (!t.down) damageHero(t, p.dmg);
  }
}

export function updateProjs(dt) {
  const arr = world.projs;
  for (let i = arr.length - 1; i >= 0; i--) {
    const p = arr[i];
    const t = p.target;
    if (t && !t.dead && !t.down && !t.castle) { p.tx = t.x; p.ty = t.y; }
    const dx = p.tx - p.x, dy = p.ty - p.y;
    const d = Math.hypot(dx, dy) || 0.001;
    const step = p.speed * dt;
    p.life -= dt;
    if (d <= step + p.hitR) { hitProj(p); arr.splice(i, 1); continue; }
    p.x += (dx / d) * step; p.y += (dy / d) * step;
    p.ang = Math.atan2(dy, dx);
    if (p.life <= 0) arr.splice(i, 1);
  }
}

export function updateFields(dt) {
  for (let i = world.fields.length - 1; i >= 0; i--) {
    const f = world.fields[i];
    f.t += dt; f.tick -= dt;
    if (f.tick <= 0) {
      f.tick = 0.5;
      for (const e of world.enemies) if (!e.dead && Math.hypot(e.x - f.x, e.y - f.y) < f.r + e.r * 0.5) damageEnemy(e, f.dps * 0.5);
    }
    if (f.t >= f.life) world.fields.splice(i, 1);
  }
}

export function updateFx(dt) {
  for (const arr of [world.fx, world.texts, world.parts]) {
    for (let i = arr.length - 1; i >= 0; i--) {
      const o = arr[i];
      o.t += dt;
      if (arr === world.parts) { o.x += o.vx * dt; o.y += o.vy * dt; o.vx *= 0.94; o.vy *= 0.94; }
      if (arr === world.texts) o.y -= 28 * dt;
      if (o.t >= o.life) arr.splice(i, 1);
    }
  }
  world.shake = Math.max(0, world.shake - dt * 2.2);
  world.castle.flash = Math.max(0, world.castle.flash - dt);
}
