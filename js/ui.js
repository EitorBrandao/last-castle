import { data, persist, UPGRADES, buy } from './save.js';
import { cdMax } from './heroes.js';
import { sfx, setMuted, isMuted, unlock } from './audio.js';

const $ = (id) => document.getElementById(id);
const SCREENS = ['menu', 'upgrades', 'record', 'pause', 'levelup', 'gameover'];
let barRefs = [];
let bannerT = 0;
const cache = {};

export function show(name) {
  for (const s of SCREENS) $(s).classList.toggle('on', s === name);
}

function setIf(el, key, val, fn) {
  if (cache[key] !== val) { cache[key] = val; fn(el, val); }
}

export function initUI(h) {
  document.addEventListener('pointerdown', unlock, { once: false });
  const click = (id, fn) => $(id).addEventListener('click', () => { unlock(); sfx('click'); fn(); });
  click('btnPlay', h.play);
  click('btnUpg', () => { renderUpgrades(); show('upgrades'); });
  click('btnRec', () => { renderRecord(); show('record'); });
  document.querySelectorAll('.back').forEach((b) => b.addEventListener('click', () => { sfx('click'); show('menu'); refreshMenu(); }));
  click('btnPause', h.pause);
  click('btnResume', h.resume);
  click('btnQuit', h.quit);
  click('btnRetry', h.play);
  click('btnMenu2', h.quit);
  document.querySelectorAll('.muteBtn').forEach((b) => b.addEventListener('click', () => {
    unlock(); setMuted(!isMuted()); data.mute = isMuted(); persist(); refreshMute(); sfx('click');
  }));
  setMuted(!!data.mute);
  refreshMute();
  refreshMenu();
}

export function refreshMute() {
  document.querySelectorAll('.muteBtn').forEach((b) => { b.textContent = isMuted() ? 'Som: OFF' : 'Som: ON'; });
}

export function refreshMenu() {
  $('menuBest').textContent = `Recorde: onda ${data.best}`;
  $('menuGold').textContent = `Ouro: ${data.gold}`;
}

export function renderUpgrades() {
  $('upgGold').textContent = `Ouro: ${data.gold}`;
  const box = $('upgList');
  box.innerHTML = '';
  for (const u of UPGRADES) {
    const lvl = data.upg[u.id];
    const maxed = lvl >= u.max;
    const cost = u.cost(lvl);
    const row = document.createElement('div');
    row.className = 'upg';
    row.innerHTML = `<div class="ut"><b>${u.nome}</b><span>Nv ${lvl}/${u.max}</span></div><p>${u.desc}</p>`;
    const b = document.createElement('button');
    b.className = 'btn small';
    b.textContent = maxed ? 'MÁXIMO' : `Comprar (${cost})`;
    b.disabled = maxed || data.gold < cost;
    b.addEventListener('click', () => { if (buy(u.id)) { sfx('level'); renderUpgrades(); } else sfx('deny'); });
    row.appendChild(b);
    box.appendChild(row);
  }
}

export function renderRecord() {
  $('recBody').innerHTML = `<div class="big">${data.best}</div><p>melhor onda alcançada</p>
    <p>Partidas jogadas: ${data.games}</p><p>Inimigos derrotados: ${data.totalKills}</p><p>Ouro guardado: ${data.gold}</p>`;
}

export function banner(text, ms = 1800) {
  const b = $('banner');
  b.textContent = text; b.classList.add('show');
  bannerT = ms / 1000;
}

export function tickBanner(dt) {
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $('banner').classList.remove('show'); }
}

export function setCountdown(sec) {
  const el = $('countdown');
  setIf(el, 'cd', sec === null ? '' : `Próxima onda em ${sec}s`, (e, v) => { e.textContent = v; e.style.display = v ? 'block' : 'none'; });
}

export function updateHud(w) {
  setIf($('waveTxt'), 'w', `Onda ${w.wave}`, (e, v) => { e.textContent = v; });
  setIf($('lvTxt'), 'l', `Nv ${w.level}`, (e, v) => { e.textContent = v; });
  setIf($('goldTxt'), 'g', `Ouro ${w.runGold}`, (e, v) => { e.textContent = v; });
  const f = Math.round((w.xp / w.xpNeed) * 100);
  setIf($('xpFill'), 'x', f, (e, v) => { e.style.width = v + '%'; });
}

export function buildBar(heroes, onCast) {
  const bar = $('bar');
  bar.innerHTML = '';
  barRefs = [];
  heroes.forEach((h, hi) => {
    const g = document.createElement('div');
    g.className = 'grp';
    g.style.setProperty('--c', h.color);
    g.innerHTML = `<div class="gname"><span>${h.name}</span><i class="hpb"><b></b></i></div><div class="btns"></div>`;
    const btns = g.querySelector('.btns');
    const refs = { hp: g.querySelector('.hpb b'), grp: g, sk: [] };
    h.skills.forEach((s, si) => {
      const b = document.createElement('button');
      b.className = 'sk';
      b.innerHTML = `<span class="ic">${s.short[0]}</span><span class="nm">${s.short}</span><span class="cdo"></span><span class="cdt"></span>`;
      b.addEventListener('pointerdown', (ev) => { ev.preventDefault(); onCast(hi, si); });
      btns.appendChild(b);
      refs.sk.push({ b, o: b.querySelector('.cdo'), t: b.querySelector('.cdt'), last: -1, lt: '' });
    });
    bar.appendChild(g);
    barRefs.push(refs);
  });
}

export function updateBar(heroes) {
  heroes.forEach((h, hi) => {
    const r = barRefs[hi];
    if (!r) return;
    const hp = Math.round((h.hp / h.max) * 100);
    if (r.lhp !== hp) { r.lhp = hp; r.hp.style.width = hp + '%'; }
    if (r.ldown !== h.down) { r.ldown = h.down; r.grp.classList.toggle('down', h.down); }
    h.skills.forEach((s, si) => {
      const k = r.sk[si];
      const max = cdMax(h, si);
      const f = h.down ? 1 : Math.min(1, s.left / max);
      const deg = Math.round(f * 360 / 3) * 3;
      if (k.last !== deg) {
        k.last = deg;
        k.o.style.background = f > 0 ? `conic-gradient(rgba(8,10,20,.78) ${deg}deg, transparent 0)` : 'none';
        k.b.classList.toggle('ready', f <= 0);
      }
      const txt = h.down ? 'KO' : s.left > 0 ? (s.left >= 10 ? Math.ceil(s.left) : s.left.toFixed(1)) : '';
      if (k.lt !== txt) { k.lt = txt; k.t.textContent = txt; }
    });
  });
}

export function showCards(cards, onPick) {
  const box = $('cards');
  box.innerHTML = '';
  cards.forEach((c, i) => {
    const el = document.createElement('button');
    el.className = 'card';
    el.style.setProperty('--c', c.color);
    el.innerHTML = `<small>${c.tag}</small><b>${c.title}</b><p>${c.desc}</p>`;
    el.addEventListener('click', () => { sfx('click'); onPick(i); });
    box.appendChild(el);
  });
  show('levelup');
}

export function showGameOver(st) {
  $('goBody').innerHTML = `<div class="big">Onda ${st.wave}</div>
    <p>${st.newRecord ? '<b class="rec">NOVO RECORDE!</b>' : `Recorde: onda ${st.best}`}</p>
    <table><tr><td>Inimigos derrotados</td><td>${st.kills}</td></tr>
    <tr><td>Nível dos heróis</td><td>${st.level}</td></tr>
    <tr><td>Tempo</td><td>${st.time}</td></tr>
    <tr><td>Ouro ganho</td><td>${st.gold}</td></tr></table>`;
  show('gameover');
}
