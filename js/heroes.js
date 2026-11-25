import { world, dist, rand, zone, damageEnemy, particles, floatText, ring, line, shootProj, addShake } from './entities.js';
import { sfx } from './audio.js';

export const HERO_DEFS = {
  warrior: {
    name: 'Guerreiro', color: '#4da3ff', hp: 340, armor: 0.7, dmg: 16, range: 44, rate: 1.1, speed: 200,
    skills: [
      { id: 'spin', name: 'Golpe Giratório', short: 'Giratório', cd: 7 },
      { id: 'shout', name: 'Grito de Guerra', short: 'Grito', cd: 15 },
    ],
  },
  mage: {
    name: 'Mago', color: '#b56cff', hp: 120, armor: 1, dmg: 17, range: 160, rate: 0.8, speed: 190,
    skills: [
      { id: 'fireball', name: 'Bola de Fogo', short: 'Bola Fogo', cd: 9 },
      { id: 'blizzard', name: 'Nevasca', short: 'Nevasca', cd: 14 },
    ],
  },
  rogue: {
    name: 'Ladino', color: '#4cd964', hp: 150, armor: 0.9, dmg: 8, range: 110, rate: 2.2, speed: 260, crit: 0.25,
    skills: [
      { id: 'daggers', name: 'Chuva de Adagas', short: 'Adagas', cd: 10 },
      { id: 'shadow', name: 'Sombra', short: 'Sombra', cd: 13 },
    ],
  },
};

export function createHeroes() {
  const ids = ['warrior', 'mage', 'rogue'];
  const z = zone();
  return ids.map((id, i) => {
    const d = HERO_DEFS[id];
    const hp = Math.round(d.hp * world.lvBonus);
    return {
      id, def: d, name: d.name, color: d.color,
      x: 70 + i * 110, y: (z.y0 + z.y1) / 2 + (id === 'warrior' ? -25 : 15), tx: 0, ty: 0,
      hp, max: hp, armor: d.armor, dmgMul: 1, spdMul: 1,
      cd: 0, flash: 0, down: false, revive: 0, dr: 0, taunt: 0, rain: null, ang: -Math.PI / 2, swing: 0,
      skills: d.skills.map((s) => ({ ...s, base: s.cd, left: 3, lc: 0, rc: 0, dc: 0 })),
    };
  }).map((h) => { h.tx = h.x; h.ty = h.y; return h; });
}

export const power = (h) => h.dmgMul * world.metaDmg * world.lvBonus;
export const cdMax = (h, i) => h.skills[i].base * Math.pow(0.85, h.skills[i].lc);
const radMul = (h, i) => 1 + 0.15 * h.skills[i].rc;
const sdmg = (h, i) => 1 + 0.25 * h.skills[i].dc;

function nearestEnemy(h, range) {
  let best = null, bd = range;
  for (const e of world.enemies) {
    if (e.dead || e.y < -5) continue;
    const dd = dist(h, e) - e.r;
    if (dd < bd) { bd = dd; best = e; }
  }
  return best;
}

function densest(radius) {
  let best = null, bc = 0;
  for (const e of world.enemies) {
    if (e.dead || e.y < 0) continue;
    let c = 0;
    for (const o of world.enemies) if (!o.dead && o.y > 0 && Math.hypot(o.x - e.x, o.y - e.y) <= radius) c++;
    if (c > bc || (c === bc && best && e.y > best.y)) { bc = c; best = e; }
  }
  return best;
}

export function castSkill(h, i) {
  const s = h.skills[i];
  if (!s || h.down || s.left > 0) return false;
  const p = power(h);
  const rad = radMul(h, i), dm = sdmg(h, i);
  const alive = world.enemies.filter((e) => !e.dead && e.y > 0);
  let ok = false;
  switch (s.id) {
    case 'spin': {
      const R = 72 * rad;
      ring(h.x, h.y, R, '#9cd0ff', 0.35);
      particles(h.x, h.y, '#9cd0ff', 16, 140, 0.4);
      h.swing = 0.4; addShake(0.12); sfx('spin');
      for (const e of alive) {
        if (Math.hypot(e.x - h.x, e.y - h.y) <= R + e.r) {
          damageEnemy(e, 48 * dm * p);
          if (!e.def.boss) e.y = Math.max(-10, e.y - 10);
        }
      }
      ok = true; break;
    }
    case 'shout': {
      h.taunt = 5 + s.dc * 0.5; h.dr = h.taunt;
      ring(h.x, h.y, 200 * rad, '#ffd166', 0.6);
      particles(h.x, h.y, '#ffd166', 14, 120, 0.5);
      floatText(h.x, h.y - 32, 'GRITO!', '#ffd166', 14);
      sfx('boom');
      for (const e of alive) if (Math.hypot(e.x - h.x, e.y - h.y) <= 200 * rad) damageEnemy(e, 14 * dm * p);
      ok = true; break;
    }
    case 'fireball': {
      const R = 58 * rad;
      const t = densest(R);
      if (!t) break;
      shootProj({ x: h.x, y: h.y - 10, tx: t.x, ty: t.y, speed: 330, dmg: 78 * dm * p, splash: R, full: true, fire: true, color: '#ff8a3d', size: 6, hitR: 8 });
      sfx('cast'); ok = true; break;
    }
    case 'blizzard': {
      if (!alive.length) break;
      const R = 85 * rad;
      const t = densest(R);
      world.fields.push({ x: t.x, y: t.y, r: R, slow: 0.55, dps: 8 * dm * p, t: 0, life: 5 + s.dc * 0.5, tick: 0.3 });
      ring(t.x, t.y, R, '#bfe9ff', 0.5);
      sfx('cast'); ok = true; break;
    }
    case 'daggers': {
      if (!nearestEnemy(h, 200)) break;
      h.rain = { n: 9, t: 0, dmg: 15 * dm * p };
      sfx('cast'); ok = true; break;
    }
    case 'shadow': {
      let t = null;
      for (const e of alive) if (!t || e.hp > t.hp) t = e;
      if (!t) break;
      line(h.x, h.y, t.x, t.y, '#6b3fa0', 0.3, 5);
      ring(t.x, t.y, 30, '#6b3fa0', 0.35);
      particles(t.x, t.y, '#2d1b4e', 16, 120, 0.5, 4);
      damageEnemy(t, 160 * dm * p * (Math.random() < 0.5 ? 1.5 : 1), true);
      addShake(0.1); sfx('boom'); ok = true; break;
    }
    default: break;
  }
  if (ok) s.left = cdMax(h, i);
  else sfx('deny');
  return ok;
}

export function updateHero(h, dt) {
  h.flash = Math.max(0, h.flash - dt);
  h.swing = Math.max(0, h.swing - dt);
  if (h.down) {
    h.revive -= dt;
    if (h.revive <= 0) {
      h.down = false; h.hp = Math.round(h.max * 0.5);
      floatText(h.x, h.y - 28, 'DE VOLTA!', '#7dff9b', 13);
      particles(h.x, h.y, '#7dff9b', 12, 90, 0.5);
      sfx('revive');
    }
    return;
  }
  h.dr = Math.max(0, h.dr - dt);
  h.taunt = Math.max(0, h.taunt - dt);
  for (const s of h.skills) s.left = Math.max(0, s.left - dt);

  // movimento
  const dx = h.tx - h.x, dy = h.ty - h.y, d = Math.hypot(dx, dy);
  if (d > 2) {
    const st = Math.min(d, h.def.speed * dt);
    h.x += (dx / d) * st; h.y += (dy / d) * st;
  }

  // chuva de adagas
  if (h.rain) {
    h.rain.t -= dt;
    if (h.rain.t <= 0) {
      h.rain.t = 0.13;
      const t = nearestEnemy(h, 220);
      const pool = world.enemies.filter((e) => !e.dead && e.y > 0 && dist(h, e) < 220);
      const tg = pool.length ? pool[Math.floor(Math.random() * pool.length)] : t;
      if (tg) {
        line(h.x, h.y, tg.x, tg.y, '#d6ffd9', 0.12, 2);
        damageEnemy(tg, h.rain.dmg, false);
        particles(tg.x, tg.y, '#d6ffd9', 2, 40, 0.2, 2);
      }
      if (--h.rain.n <= 0) h.rain = null;
    }
  }

  // ataque automático
  h.cd -= dt;
  const t = nearestEnemy(h, h.def.range);
  if (t) h.ang = Math.atan2(t.y - h.y, t.x - h.x);
  if (t && h.cd <= 0) {
    h.cd = 1 / (h.def.rate * h.spdMul);
    const p = power(h);
    if (h.id === 'warrior') {
      damageEnemy(t, h.def.dmg * p);
      h.swing = 0.2;
      particles(t.x, t.y, '#fff', 3, 60, 0.2, 2);
    } else if (h.id === 'mage') {
      shootProj({ x: h.x, y: h.y - 10, tx: t.x, ty: t.y, target: t, speed: 250, dmg: h.def.dmg * p, splash: 28, color: '#c78bff', size: 4 });
      sfx('shoot');
    } else {
      const crit = Math.random() < h.def.crit;
      shootProj({ x: h.x, y: h.y - 6, tx: t.x, ty: t.y, target: t, speed: 460, dmg: h.def.dmg * p * (crit ? 2.4 : 1), crit, color: crit ? '#ffd23f' : '#d6ffd9', size: 2.5 });
    }
  }
}

export function clampToZone(h) {
  const z = zone();
  h.tx = Math.max(z.x0, Math.min(z.x1, h.tx));
  h.ty = Math.max(z.y0, Math.min(z.y1, h.ty));
  h.x = Math.max(z.x0, Math.min(z.x1, h.x));
  h.y = Math.max(z.y0, Math.min(z.y1, h.y));
}

export function moveHero(h, x, y) {
  if (h.down) return;
  h.tx = x; h.ty = y;
  clampToZone(h);
  // ajusta ao alvo (clamp afeta só destino)
  const z = zone();
  h.tx = Math.max(z.x0, Math.min(z.x1, x));
  h.ty = Math.max(z.y0, Math.min(z.y1, y));
}

export function makeCards(n = 3) {
  const pool = [];
  for (const h of world.heroes) {
    const tag = h.name;
    pool.push({ tag, color: h.color, title: 'Poder +15%', desc: `${h.name}: dano básico e de habilidades +15%.`, apply: () => { h.dmgMul *= 1.15; } });
    pool.push({ tag, color: h.color, title: 'Vitalidade +20%', desc: `${h.name}: vida máxima +20% e cura parcial.`, apply: () => { const a = Math.round(h.max * 0.2); h.max += a; h.hp = Math.min(h.max, h.hp + a); } });
    pool.push({ tag, color: h.color, title: 'Velocidade +12%', desc: `${h.name}: ataca 12% mais rápido.`, apply: () => { h.spdMul *= 1.12; } });
    h.skills.forEach((s) => {
      pool.push({ tag: s.name, color: h.color, title: 'Raio / Alcance +15%', desc: `${s.name}: área de efeito maior.`, apply: () => { s.rc++; } });
      pool.push({ tag: s.name, color: h.color, title: 'Recarga -15%', desc: `${s.name}: recarrega mais rápido.`, apply: () => { s.lc++; } });
      pool.push({ tag: s.name, color: h.color, title: 'Dano +25%', desc: `${s.name}: mais dano.`, apply: () => { s.dc++; } });
    });
  }
  pool.push({ tag: 'Castelo', color: '#ffb347', title: 'Reparar Castelo', desc: 'Recupera 40% dos PV do castelo.', apply: () => { world.castle.hp = Math.min(world.castle.max, world.castle.hp + world.castle.max * 0.4); } });
  pool.push({ tag: 'Castelo', color: '#ffb347', title: 'Muralha +100 PV', desc: 'PV máximo do castelo +100 (e cura 100).', apply: () => { world.castle.max += 100; world.castle.hp += 100; } });
  const out = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}
