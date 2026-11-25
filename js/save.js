const KEY = 'bastiao-final.save.v1';

export const data = {
  gold: 0,
  best: 0,
  games: 0,
  totalKills: 0,
  mute: false,
  upg: { castle: 0, dmg: 0, level: 0 },
};

export const UPGRADES = [
  { id: 'castle', nome: 'Muralha Reforçada', desc: '+60 PV máx. do castelo por nível', max: 20, cost: (l) => 40 + l * 35 },
  { id: 'dmg', nome: 'Armas Afiadas', desc: '+8% de dano base dos heróis por nível', max: 20, cost: (l) => 60 + l * 45 },
  { id: 'level', nome: 'Veteranos', desc: 'Começa a partida com +1 nível (+4% de atributos)', max: 10, cost: (l) => 120 + l * 110 },
];

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    Object.assign(data, s);
    data.upg = Object.assign({ castle: 0, dmg: 0, level: 0 }, s.upg || {});
  } catch (e) { /* ignora save corrompido */ }
}

export function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* sem storage */ }
}

export function buy(id) {
  const u = UPGRADES.find((x) => x.id === id);
  const lvl = data.upg[id];
  if (!u || lvl >= u.max) return false;
  const c = u.cost(lvl);
  if (data.gold < c) return false;
  data.gold -= c;
  data.upg[id]++;
  persist();
  return true;
}
