import { world, WORLD_W, zone, dist, updateProjs, updateFields, updateFx, particles, floatText, ring } from './entities.js';
import { createHeroes, updateHero, castSkill, moveHero, clampToZone, makeCards } from './heroes.js';
import { updateEnemy, separate } from './enemies.js';
import { ws, resetWaves, updateWaves } from './waves.js';
import { render, genScenery } from './render.js';
import * as ui from './ui.js';
import { data, persist } from './save.js';
import { sfx } from './audio.js';

const S = { state: 'menu', canvas: null, ctx: null, dpr: 1, cw: 0, ch: 0, scale: 1, offX: 0, last: 0, runTime: 0 };

const xpNeed = (lv) => Math.round(20 + 12 * (lv - 1) + 2 * lv * lv);

function resetWorld() {
  Object.assign(world, { enemies: [], projs: [], parts: [], texts: [], fields: [], fx: [], shake: 0, time: 0, xp: 0, pending: 0, runGold: 0, kills: 0, wave: 0, selected: null });
  world.metaDmg = 1 + 0.08 * data.upg.dmg;
  world.lvBonus = 1 + 0.04 * data.upg.level;
  world.level = 1 + data.upg.level;
  world.xpNeed = xpNeed(world.level);
  const max = 500 + 60 * data.upg.castle;
  world.castle = { hp: max, max, flash: 0 };
  world.heroes = createHeroes();
  world.onKill = onKill;
  S.runTime = 0;
  resetWaves();
}

function onKill(e) {
  world.kills++;
  world.xp += Math.round(e.def.xp * (1 + 0.03 * world.wave));
  world.runGold += e.def.gold;
  particles(e.x, e.y, e.def.color, e.def.boss ? 30 : 8, e.def.boss ? 180 : 90, 0.5, e.def.boss ? 5 : 3);
  sfx('kill');
  if (e.def.boss) { ring(e.x, e.y, 90, '#ffd23f', 0.6); floatText(e.x, e.y - 30, 'CHEFE DERROTADO!', '#ffd23f', 15); }
}

export function startGame() {
  resetWorld();
  ui.buildBar(world.heroes, castFromBar);
  ui.show(null);
  S.state = 'playing';
  ui.updateHud(world);
  ui.banner('Prepare-se!', 1500);
}

function castFromBar(hi, si) {
  if (S.state !== 'playing') return;
  const h = world.heroes[hi];
  castSkill(h, si);
}

function endRun() {
  const newRecord = world.wave > data.best;
  if (newRecord) data.best = world.wave;
  data.gold += world.runGold;
  data.games++;
  data.totalKills += world.kills;
  persist();
  return newRecord;
}

function gameOver() {
  S.state = 'over';
  sfx('over');
  const nr = endRun();
  const t = Math.floor(S.runTime);
  ui.showGameOver({
    wave: world.wave, best: data.best, newRecord: nr, kills: world.kills, level: world.level, gold: world.runGold,
    time: `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`,
  });
}

export function pauseGame() {
  if (S.state !== 'playing') return;
  S.state = 'paused';
  ui.show('pause');
}
export function resumeGame() {
  if (S.state !== 'paused') return;
  S.state = 'playing';
  ui.show(null);
}
export function quitToMenu() {
  if (S.state === 'playing' || S.state === 'paused' || S.state === 'levelup') endRun();
  S.state = 'menu';
  ui.refreshMenu();
  ui.show('menu');
}

function openLevelUp() {
  S.state = 'levelup';
  sfx('level');
  const cards = makeCards(3);
  ui.showCards(cards, (i) => {
    cards[i].apply();
    world.pending--;
    ui.updateBar(world.heroes);
    if (world.pending > 0) openLevelUp();
    else { S.state = 'playing'; ui.show(null); }
  });
}

const waveEv = {
  waveStart(n, boss) {
    ui.banner(boss ? `Onda ${n} - CHEFE!` : `Onda ${n}`, 1800);
    sfx(boss ? 'boss' : 'wave');
  },
  waveEnd(n) {
    const bonus = 5 + n * 2;
    world.runGold += bonus;
    const c = world.castle;
    c.hp = Math.min(c.max, c.hp + c.max * 0.08);
    ui.banner(`Onda ${n} concluída! +${bonus} ouro`, 2200);
    sfx('level');
  },
};

export function update(dt) {
  world.time += dt;
  S.runTime += dt;
  updateWaves(dt, waveEv);
  for (const h of world.heroes) updateHero(h, dt);
  for (const e of world.enemies) if (!e.dead) updateEnemy(e, dt);
  separate();
  updateProjs(dt);
  updateFields(dt);
  updateFx(dt);
  if (world.enemies.some((e) => e.dead)) world.enemies = world.enemies.filter((e) => !e.dead);
  while (world.xp >= world.xpNeed) {
    world.xp -= world.xpNeed; world.level++; world.pending++; world.xpNeed = xpNeed(world.level);
  }
  if (world.castle.hp <= 0) { gameOver(); return; }
  if (world.pending > 0) openLevelUp();
}

function frame(t) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (t - S.last) / 1000 || 0);
  S.last = t;
  if (S.state === 'playing') {
    update(dt);
    ui.updateHud(world);
    ui.updateBar(world.heroes);
    ui.setCountdown(ws.phase === 'break' ? Math.max(0, Math.ceil(ws.timer)) : null);
    ui.tickBanner(dt);
  } else if (S.state === 'menu') {
    world.time += dt;
    updateFx(dt);
    ui.setCountdown(null);
  }
  draw();
}

function draw() {
  const { ctx, canvas, dpr } = S;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#0d1420';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const sh = world.shake * 6;
  const sx = sh ? (Math.random() - 0.5) * sh : 0, sy = sh ? (Math.random() - 0.5) * sh : 0;
  ctx.setTransform(dpr * S.scale, 0, 0, dpr * S.scale, dpr * (S.offX + sx), dpr * sy);
  ctx.save();
  ctx.beginPath(); ctx.rect(-6, -6, WORLD_W + 12, world.H + 12); ctx.clip();
  render(ctx);
  ctx.restore();
}

function resize() {
  const r = S.canvas.getBoundingClientRect();
  S.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  S.cw = r.width; S.ch = r.height;
  S.canvas.width = Math.max(1, Math.round(r.width * S.dpr));
  S.canvas.height = Math.max(1, Math.round(r.height * S.dpr));
  S.scale = Math.min(S.cw / WORLD_W, S.ch / 520);
  world.H = S.ch / S.scale;
  world.castleY = world.H - 82;
  S.offX = (S.cw - WORLD_W * S.scale) / 2;
  genScenery();
  for (const h of world.heroes) clampToZone(h);
}

function toWorld(ev) {
  const r = S.canvas.getBoundingClientRect();
  return { x: (ev.clientX - r.left - S.offX) / S.scale, y: (ev.clientY - r.top) / S.scale };
}

function onPointer(ev) {
  if (S.state !== 'playing') return;
  ev.preventDefault();
  const p = toWorld(ev);
  let hit = null, bd = 34;
  for (const h of world.heroes) {
    const d = dist(h, p);
    if (!h.down && d < bd) { bd = d; hit = h; }
  }
  if (hit) { world.selected = world.selected === hit ? null : hit; sfx('click'); return; }
  if (world.selected) {
    moveHero(world.selected, p.x, p.y);
    const z = zone();
    ring(Math.max(z.x0, Math.min(z.x1, p.x)), Math.max(z.y0, Math.min(z.y1, p.y)), 14, '#ffe066', 0.3);
  }
}

export function initGame(canvas) {
  S.canvas = canvas; S.ctx = canvas.getContext('2d');
  world.heroes = [];
  resize();
  new ResizeObserver(resize).observe(canvas);
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 150));
  canvas.addEventListener('pointerdown', onPointer, { passive: false });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
  ['gesturestart', 'dblclick'].forEach((n) => document.addEventListener(n, (e) => e.preventDefault()));
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  S.last = performance.now();
  requestAnimationFrame(frame);
  window.__game = { world, S, update, castSkill, startGame };
}
