import { world, zone } from './entities.js';

let tufts = [];
export function genScenery() {
  let s = 12345;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  tufts = [];
  for (let i = 0; i < 70; i++) tufts.push({ x: r() * world.W, y: r() * world.H, s: 2 + r() * 3, c: r() });
}

function circ(ctx, x, y, r, fill) {
  ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

function drawBackground(ctx) {
  const W = world.W, H = world.H, cy = world.castleY;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#2e5a34'); g.addColorStop(1, '#3d7040');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (const t of tufts) {
    ctx.fillStyle = t.c > 0.5 ? '#35663a' : '#497f48';
    ctx.fillRect(t.x, t.y, t.s, t.s * 0.6);
  }
  // estrada
  ctx.fillStyle = '#8a7350';
  ctx.beginPath(); ctx.moveTo(W / 2 - 55, 0); ctx.lineTo(W / 2 + 55, 0); ctx.lineTo(W / 2 + 40, cy); ctx.lineTo(W / 2 - 40, cy); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let y = 10; y < cy; y += 34) ctx.fillRect(W / 2 - 3 + Math.sin(y) * 14, y, 6, 3);
  // árvores nas bordas
  for (let y = 30; y < cy - 120; y += 90) {
    for (const x of [14, W - 14]) {
      circ(ctx, x, y + 6, 16, 'rgba(0,0,0,0.2)');
      circ(ctx, x, y, 15, '#1f4a2a'); circ(ctx, x - 3, y - 4, 10, '#2a6034');
    }
  }
  // zona dos heróis
  const z = zone();
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fillRect(z.x0 - 10, z.y0 - 14, z.x1 - z.x0 + 20, z.y1 - z.y0 + 28);
}

function drawCastle(ctx) {
  const W = world.W, H = world.H, cy = world.castleY, c = world.castle;
  ctx.fillStyle = '#6c6f7d'; ctx.fillRect(0, cy, W, H - cy + 40);
  ctx.fillStyle = '#7d8090'; ctx.fillRect(0, cy, W, 8);
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1;
  for (let y = cy + 16; y < H + 40; y += 14) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    for (let x = ((y / 14) % 2) * 15; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x, y - 14); ctx.lineTo(x, y); ctx.stroke(); }
  }
  ctx.fillStyle = '#7d8090';
  for (let x = 4; x < W; x += 24) ctx.fillRect(x, cy - 9, 14, 10);
  // torres
  for (const x of [0, W - 46]) {
    ctx.fillStyle = '#8a8d9d'; ctx.fillRect(x, cy - 26, 46, H - cy + 66);
    ctx.fillStyle = '#9a9dae';
    for (let i = 0; i < 3; i++) ctx.fillRect(x + 2 + i * 16, cy - 36, 11, 12);
    ctx.fillStyle = '#2b2d38'; ctx.fillRect(x + 19, cy - 6, 8, 16);
  }
  // portão
  const gx = W / 2;
  ctx.fillStyle = '#4a3322';
  ctx.beginPath(); ctx.moveTo(gx - 24, H + 40); ctx.lineTo(gx - 24, cy + 30); ctx.arc(gx, cy + 30, 24, Math.PI, 0); ctx.lineTo(gx + 24, H + 40); ctx.fill();
  ctx.strokeStyle = '#2d1f14'; ctx.lineWidth = 2;
  for (let i = -16; i <= 16; i += 8) { ctx.beginPath(); ctx.moveTo(gx + i, cy + 12); ctx.lineTo(gx + i, H + 40); ctx.stroke(); }
  if (c.flash > 0) { ctx.fillStyle = `rgba(255,60,60,${c.flash * 2.2})`; ctx.fillRect(0, cy - 36, W, H - cy + 80); }
  // barra de vida
  const bw = 250, bx = (W - bw) / 2, by = cy + 12;
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(bx - 2, by - 2, bw + 4, 16);
  const f = Math.max(0, c.hp / c.max);
  ctx.fillStyle = f > 0.5 ? '#4cd964' : f > 0.25 ? '#ffb347' : '#ff4d4d';
  ctx.fillRect(bx, by, bw * f, 12);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 10px system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(`Castelo ${Math.ceil(c.hp)} / ${c.max}`, W / 2, by + 10);
}

function bar(ctx, x, y, w, f, col) {
  ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, 5);
  ctx.fillStyle = col; ctx.fillRect(x - w / 2, y, w * Math.max(0, f), 3);
}

function drawHero(ctx, h) {
  const { x, y } = h;
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(x, y + 11, 12, 5, 0, 0, 7); ctx.fill();
  if (h === world.selected) {
    ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.arc(x, y, 20 + Math.sin(world.time * 6) * 1.5, 0, 7); ctx.stroke(); ctx.setLineDash([]);
  }
  const body = h.down ? '#777' : h.flash > 0 ? '#fff' : h.color;
  const dark = h.down ? '#555' : '#222';
  if (h.taunt > 0) { ctx.strokeStyle = 'rgba(255,209,102,0.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 18, 0, 7); ctx.stroke(); }
  if (h.id === 'warrior') {
    circ(ctx, x, y, 12, body);
    ctx.fillStyle = h.down ? '#666' : '#cfd8e3'; ctx.beginPath(); ctx.arc(x, y - 6, 8, Math.PI, 0); ctx.fill(); // elmo
    circ(ctx, x, y - 3, 5, h.down ? '#999' : '#f2c9a0');
    ctx.fillStyle = dark; ctx.fillRect(x - 3, y - 4, 6, 2);
    // escudo + espada
    ctx.fillStyle = h.down ? '#666' : '#2d6cb3'; ctx.fillRect(x - 17, y - 4, 7, 12);
    const a = h.ang + (h.swing > 0 ? (h.swing * 12 - 1.2) : 0);
    ctx.strokeStyle = '#e8eef5'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 8, y + Math.sin(a) * 8); ctx.lineTo(x + Math.cos(a) * 24, y + Math.sin(a) * 24); ctx.stroke();
    if (h.swing > 0.2) { ctx.strokeStyle = 'rgba(200,230,255,0.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 72 * 0.4 + 10, 0, 7); ctx.stroke(); }
  } else if (h.id === 'mage') {
    ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(x - 12, y + 10); ctx.lineTo(x, y - 12); ctx.lineTo(x + 12, y + 10); ctx.fill();
    circ(ctx, x, y - 6, 5, h.down ? '#999' : '#f2c9a0');
    ctx.fillStyle = h.down ? '#555' : '#5a2c99'; ctx.beginPath(); ctx.moveTo(x - 8, y - 8); ctx.lineTo(x, y - 24); ctx.lineTo(x + 8, y - 8); ctx.fill();
    ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 13, y + 10); ctx.lineTo(x + 13, y - 12); ctx.stroke();
    circ(ctx, x + 13, y - 14, 4, h.down ? '#777' : '#ff9f43');
  } else {
    circ(ctx, x, y + 1, 11, body);
    ctx.fillStyle = h.down ? '#555' : '#1f6b34'; ctx.beginPath(); ctx.arc(x, y - 3, 9, Math.PI, 0); ctx.lineTo(x, y - 14); ctx.fill();
    circ(ctx, x, y - 2, 5, h.down ? '#999' : '#f2c9a0');
    ctx.fillStyle = dark; ctx.fillRect(x - 4, y - 3, 8, 2);
    ctx.strokeStyle = '#dfe6e9'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - 14, y + 4); ctx.lineTo(x - 8, y - 3); ctx.moveTo(x + 14, y + 4); ctx.lineTo(x + 8, y - 3); ctx.stroke();
  }
  if (h.down) {
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(Math.ceil(h.revive) + 's', x, y - 18);
  } else bar(ctx, x, y - 24, 28, h.hp / h.max, '#4cd964');
}

function drawEnemy(ctx, e) {
  const { x, y, r } = e;
  const fl = e.flash > 0;
  const col = fl ? '#fff' : e.def.color;
  const bob = Math.sin(e.anim * 8) * 1.2;
  ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(x, y + r * 0.8, r, r * 0.4, 0, 0, 7); ctx.fill();
  const yy = y + bob;
  switch (e.type) {
    case 'goblin':
      circ(ctx, x, yy, r, col);
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - r, yy - 2); ctx.lineTo(x - r - 6, yy - 6); ctx.lineTo(x - r + 2, yy - 6); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + r, yy - 2); ctx.lineTo(x + r + 6, yy - 6); ctx.lineTo(x + r - 2, yy - 6); ctx.fill();
      circ(ctx, x - 3, yy - 2, 1.8, '#ff0'); circ(ctx, x + 3, yy - 2, 1.8, '#ff0');
      break;
    case 'orc':
      circ(ctx, x, yy, r, col);
      circ(ctx, x, yy - r * 0.55, r * 0.55, fl ? '#fff' : '#4e9a47');
      ctx.fillStyle = '#f5f0d0'; ctx.fillRect(x - 5, yy - 4, 2, 5); ctx.fillRect(x + 3, yy - 4, 2, 5);
      circ(ctx, x - 4, yy - 8, 1.8, '#f33'); circ(ctx, x + 4, yy - 8, 1.8, '#f33');
      ctx.fillStyle = fl ? '#fff' : '#5b4630'; ctx.fillRect(x - r, yy + 2, r * 2, 5);
      break;
    case 'archer':
      circ(ctx, x, yy, r, col);
      circ(ctx, x, yy - 4, 5, fl ? '#fff' : '#e3b88a');
      ctx.fillStyle = fl ? '#fff' : '#5b3a1a'; ctx.beginPath(); ctx.arc(x, yy - 5, 6, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = '#6b4423'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + 8, yy, 8, -1.2, 1.2); ctx.stroke();
      break;
    case 'shaman':
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - r, yy + r); ctx.lineTo(x, yy - r); ctx.lineTo(x + r, yy + r); ctx.fill();
      circ(ctx, x, yy - 3, 4, fl ? '#fff' : '#b5e0a0');
      ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 11, yy + 9); ctx.lineTo(x + 11, yy - 12); ctx.stroke();
      circ(ctx, x + 11, yy - 14, 3.5 + Math.sin(e.anim * 5) * 0.8, '#7dff9b');
      break;
    case 'boss': {
      circ(ctx, x, yy, r, col);
      circ(ctx, x, yy - 4, r * 0.6, fl ? '#fff' : '#d44a3f');
      ctx.fillStyle = fl ? '#fff' : '#eee';
      ctx.beginPath(); ctx.moveTo(x - r * 0.7, yy - r * 0.6); ctx.lineTo(x - r * 1.1, yy - r * 1.4); ctx.lineTo(x - r * 0.2, yy - r * 0.8); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + r * 0.7, yy - r * 0.6); ctx.lineTo(x + r * 1.1, yy - r * 1.4); ctx.lineTo(x + r * 0.2, yy - r * 0.8); ctx.fill();
      circ(ctx, x - 7, yy - 6, 3, '#ff0'); circ(ctx, x + 7, yy - 6, 3, '#ff0');
      ctx.fillStyle = '#fff'; ctx.fillRect(x - 8, yy + 4, 16, 3);
      if (e.wind > 0) {
        ctx.strokeStyle = `rgba(255,80,40,${0.5 + 0.5 * Math.sin(world.time * 25)})`; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, y, 85, 0, 7); ctx.stroke();
        ctx.fillStyle = 'rgba(255,80,40,0.12)'; ctx.fill();
      }
      break;
    }
    default: circ(ctx, x, yy, r, col);
  }
  if (e.slow < 1) { ctx.strokeStyle = 'rgba(160,220,255,0.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, yy, r + 2, 0, 7); ctx.stroke(); }
  if (e.hp < e.max || e.def.boss) bar(ctx, x, y - r - 9, Math.max(16, r * 2), e.hp / e.max, e.def.boss ? '#ff4d4d' : '#ffb347');
}

export function render(ctx) {
  drawBackground(ctx);
  for (const f of world.fields) {
    const a = Math.min(1, (f.life - f.t) * 1.5);
    ctx.fillStyle = `rgba(170,225,255,${0.22 * a})`; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.fill();
    ctx.strokeStyle = `rgba(210,240,255,${0.6 * a})`; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
    ctx.lineDashOffset = -world.time * 20; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = `rgba(255,255,255,${0.7 * a})`;
    for (let i = 0; i < 8; i++) {
      const a2 = i * 0.785 + world.time * 0.8, rr = f.r * (0.3 + 0.6 * ((i * 37) % 10) / 10);
      ctx.fillRect(f.x + Math.cos(a2) * rr, f.y + ((world.time * 40 + i * 20) % (f.r * 2)) - f.r, 2, 2);
    }
  }
  drawCastle(ctx);
  const list = [...world.enemies.filter((e) => !e.dead).map((o) => ({ y: o.y, d: () => drawEnemy(ctx, o) })),
    ...world.heroes.map((o) => ({ y: o.y, d: () => drawHero(ctx, o) }))];
  list.sort((a, b) => a.y - b.y);
  for (const o of list) o.d();
  for (const p of world.projs) {
    ctx.fillStyle = p.color;
    if (p.fire) { circ(ctx, p.x, p.y, p.size + 2, 'rgba(255,120,30,0.4)'); }
    circ(ctx, p.x, p.y, p.size, p.color);
  }
  for (const f of world.fx) {
    const k = 1 - f.t / f.life;
    if (f.kind === 'ring') {
      ctx.strokeStyle = f.color; ctx.globalAlpha = Math.max(0, k); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1 - k * 0.6), 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
    } else if (f.kind === 'line') {
      ctx.strokeStyle = f.color; ctx.globalAlpha = Math.max(0, k); ctx.lineWidth = f.w;
      ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x2, f.y2); ctx.stroke(); ctx.globalAlpha = 1;
    }
  }
  for (const p of world.parts) {
    ctx.globalAlpha = Math.max(0, 1 - p.t / p.life); ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  for (const t of world.texts) {
    ctx.globalAlpha = Math.max(0, 1 - (t.t / t.life) ** 2);
    ctx.font = `bold ${t.size}px system-ui, sans-serif`;
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.strokeText(t.txt, t.x, t.y);
    ctx.fillStyle = t.color; ctx.fillText(t.txt, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}
