import { world, dist, rand, damageHero, damageCastle, shootProj, particles, floatText, ring, addShake, line } from './entities.js';
import { sfx } from './audio.js';

export const ENEMY_DEFS = {
  goblin: { name: 'Goblin', hp: 16, spd: 64, dmg: 4, r: 8, rate: 0.8, xp: 2, gold: 1, color: '#6fbf3b' },
  orc: { name: 'Orc', hp: 80, spd: 30, dmg: 11, r: 13, rate: 1.2, xp: 6, gold: 3, color: '#3f7d3a' },
  archer: { name: 'Arqueiro', hp: 22, spd: 34, dmg: 6, r: 8, rate: 1.7, range: 150, xp: 4, gold: 2, color: '#c98a4b', ranged: true },
  shaman: { name: 'Xamã', hp: 42, spd: 28, dmg: 3, r: 9, rate: 2, xp: 7, gold: 3, color: '#9b59b6', heal: true },
  boss: { name: 'Chefe', hp: 650, spd: 16, dmg: 26, r: 24, rate: 1.4, xp: 60, gold: 25, color: '#b3302b', boss: true },
};

export function waveScale(n) {
  return { hp: 1 + 0.1 * (n - 1) + 0.004 * (n - 1) * (n - 1), dmg: 1 + 0.05 * (n - 1) };
}

export function spawnEnemy(type, wave) {
  const d = ENEMY_DEFS[type];
  const sc = waveScale(wave);
  let hpMul = sc.hp;
  if (d.boss) hpMul *= 1 + 0.35 * (wave / 5 - 1);
  const hp = Math.round(d.hp * hpMul);
  const e = {
    type, def: d, x: rand(24, world.W - 24), y: -20, r: d.r,
    hp, max: hp, dmgMul: sc.dmg, spdMul: 1 + Math.min(0.5, wave * 0.015) * rand(0.8, 1.2),
    cd: rand(0, d.rate), flash: 0, dead: false, anim: Math.random() * 6,
    healT: 2, slamT: 3, wind: 0, slow: 1,
  };
  world.enemies.push(e);
  return e;
}

function nearestHero(e, maxD) {
  let best = null, bd = maxD;
  for (const h of world.heroes) {
    if (h.down) continue;
    const dd = dist(e, h);
    if (dd < bd) { bd = dd; best = h; }
  }
  return best;
}

function doSlam(e) {
  const R = 85;
  ring(e.x, e.y, R, '#ff7043', 0.45);
  particles(e.x, e.y, '#ffb74d', 20, 160, 0.6, 4);
  addShake(0.45);
  sfx('boom');
  for (const h of world.heroes) if (!h.down && dist(e, h) < R + 10) damageHero(h, e.def.dmg * 2 * e.dmgMul);
  if (e.y + e.r >= world.castleY - 50) damageCastle(e.def.dmg * 1.8 * e.dmgMul);
}

export function updateEnemy(e, dt) {
  const d = e.def;
  e.flash = Math.max(0, e.flash - dt);
  e.anim += dt;
  let slow = 1;
  for (const f of world.fields) if (Math.hypot(e.x - f.x, e.y - f.y) < f.r) slow = Math.min(slow, 1 - f.slow);
  e.slow = slow;
  const sdt = dt * slow;
  e.cd -= sdt;
  e.slamT -= sdt;

  // Xamã cura aliados
  const others = world.enemies.some((o) => !o.dead && o.type !== 'shaman');
  if (d.heal) {
    e.healT -= sdt;
    if (e.healT <= 0) {
      e.healT = 2.6;
      let healed = false;
      for (const o of world.enemies) {
        if (o.dead || o === e || o.hp >= o.max || dist(o, e) > 110) continue;
        const amt = Math.round(o.max * 0.18);
        o.hp = Math.min(o.max, o.hp + amt);
        floatText(o.x, o.y - o.r - 6, '+' + amt, '#7dff9b', 11);
        line(e.x, e.y, o.x, o.y, '#7dff9b', 0.25, 2);
        healed = true;
      }
      if (healed) { sfx('heal'); particles(e.x, e.y, '#7dff9b', 6, 40, 0.5, 2); }
    }
  }

  if (e.wind > 0) {
    e.wind -= dt;
    if (e.wind <= 0) doSlam(e);
    return;
  }

  // escolha de alvo
  let target = null, kind = null;
  if (d.ranged) {
    const h = nearestHero(e, d.range);
    if (h) { target = h; kind = 'hero'; }
    else if (e.y >= world.castleY - d.range + 10) kind = 'castle';
  } else {
    const tank = world.heroes.find((h) => h.taunt > 0 && !h.down);
    if (tank && dist(e, tank) < 260) { target = tank; kind = 'hero'; }
    else {
      const h = nearestHero(e, e.r + 40);
      if (h) { target = h; kind = 'hero'; }
      else if (e.y + e.r >= world.castleY) kind = 'castle';
    }
  }

  if (kind) {
    const reach = d.ranged ? Infinity : (kind === 'hero' ? e.r + 16 : 0);
    if (kind === 'hero' && !d.ranged && dist(e, target) > reach) {
      const dd = dist(e, target) || 1;
      e.x += ((target.x - e.x) / dd) * d.spd * e.spdMul * slow * dt;
      e.y += ((target.y - e.y) / dd) * d.spd * e.spdMul * slow * dt;
    } else {
      if (d.boss && e.slamT <= 0) { e.wind = 0.9; e.slamT = 4.5; sfx('boss'); return; }
      if (e.cd <= 0) {
        e.cd = d.rate;
        if (d.ranged) {
          const tgt = kind === 'hero' ? target : { castle: true, x: world.W / 2 + rand(-80, 80), y: world.castleY + 6 };
          shootProj({ x: e.x, y: e.y, tx: tgt.x, ty: tgt.y, target: tgt, speed: 210, dmg: d.dmg * e.dmgMul, owner: 'enemy', color: '#e0c080', size: 2.5 });
        } else if (kind === 'hero') damageHero(target, d.dmg * e.dmgMul);
        else damageCastle(d.dmg * e.dmgMul);
        e.lunge = 0.12;
      }
    }
  } else {
    // andar para baixo
    if (d.heal && others && e.y >= 170) { /* paira atrás dos aliados */ }
    else {
      e.y += d.spd * e.spdMul * slow * dt;
      e.x += Math.sin(e.anim * 2 + e.max) * 6 * dt;
    }
  }
  if (e.lunge) e.lunge = Math.max(0, e.lunge - dt);
  e.x = Math.max(e.r, Math.min(world.W - e.r, e.x));
  e.y = Math.min(e.y, world.castleY + e.r * 0.3);
}

export function separate() {
  const a = world.enemies;
  for (let i = 0; i < a.length; i++) {
    const p = a[i];
    if (p.dead) continue;
    for (let j = i + 1; j < a.length; j++) {
      const q = a[j];
      if (q.dead) continue;
      const dx = q.x - p.x, dy = q.y - p.y;
      const min = (p.r + q.r) * 0.8;
      const d2 = dx * dx + dy * dy;
      if (d2 < min * min && d2 > 0.0001) {
        const d = Math.sqrt(d2);
        const push = (min - d) * 0.25;
        const ux = dx / d, uy = dy / d;
        p.x -= ux * push; p.y -= uy * push * 0.5;
        q.x += ux * push; q.y += uy * push * 0.5;
      }
    }
  }
}
