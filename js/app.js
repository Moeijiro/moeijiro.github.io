(() => {
'use strict';
/* GitHub Pages не вміє X-Frame-Options — не даємо вбудувати сайт у чужу сторінку */
try { if (top !== self) top.location = self.location; } catch (_) { document.documentElement.style.display = 'none'; }
const $ = (s, r = document) => r.querySelector(s);
const el = (t, c) => { const n = document.createElement(t); if (c) n.className = c; return n; };

/* ---------- keep the artwork out of a right-click ---------- */
const guard = root => root.querySelectorAll('img').forEach(i => {
  i.draggable = false;
  i.oncontextmenu = e => e.preventDefault();
});
addEventListener('contextmenu', e => {
  if (e.target.closest('img, canvas, .stage, .cell, .viz, .reel-cell, .wvis')) e.preventDefault();
});
addEventListener('dragstart', e => { if (e.target.tagName === 'IMG') e.preventDefault(); });

/* ---------- discord: open the how-to dialog ---------- */
const dsm = () => document.getElementById('dsmodal');
const copyTag = async tag => { try { await navigator.clipboard.writeText(tag); } catch (_) {} };

function openDiscord() {
  const m = dsm();
  if (!m) return;
  m.classList.add('open');
  document.body.style.overflow = 'hidden';
  const b = m.querySelector('.dscopy');                  // nothing is copied until they press it
  if (b) { b.textContent = 'Copy'; b.classList.remove('done'); }
}
function closeDiscord() {
  const m = dsm();
  if (!m) return;
  m.classList.remove('open');
  document.body.style.overflow = '';
  const b = m.querySelector('.dscopy');
  if (b) { b.textContent = 'Copy'; b.classList.remove('done'); }
}
addEventListener('click', async e => {
  if (e.target.closest('[data-copy]')) { e.preventDefault(); return openDiscord(); }
  if (e.target.closest('[data-dsclose]')) return closeDiscord();
  const c = e.target.closest('[data-tagcopy]');
  if (c) {
    await copyTag(c.dataset.tagcopy);
    c.textContent = 'Copied'; c.classList.add('done');
    clearTimeout(c._h);
    c._h = setTimeout(() => { c.textContent = 'Copy'; c.classList.remove('done'); }, 2000);
  }
});
addEventListener('keydown', e => {
  if (e.key === 'Escape' && dsm() && dsm().classList.contains('open')) closeDiscord();
});
/* ---------- порядок плиток і блоків виводиться з імені, а не завантажується ----------
   ті самі кроки продубльовані в tools/perm.py — міняти обидва разом            */
const SALT = 'rojah.v1.2026';
const TILES = { cell: 32, grid: 4, size: 128 };
const BUILD = () => (window.__BUILD || 0);
const fnv1a = s => { let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ (s.charCodeAt(i) & 0xFF), 16777619);
  return h >>> 0; };
const mulberry32 = a => () => {
  a = a + 0x6D2B79F5 | 0;
  let t = a;
  t = Math.imul(t ^ t >>> 15, 1 | t);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
function orderFor(key, n) {
  const rnd = mulberry32(fnv1a(SALT + ':' + key));
  const a = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i--) { const jj = Math.floor(rnd() * (i + 1)); [a[i], a[jj]] = [a[jj], a[i]]; }
  return a;
}
const artCache = new Map();
const loadArt = (id, v) => {
  const s = SETS[SET], k = `${s.dir}/${id}_${v}`;
  if (!artCache.has(k)) artCache.set(k, new Promise(res => {
    const im = new Image();
    im.onload = () => res(im);
    im.src = `${k}.png?v=${BUILD()}`;
  }));
  return artCache.get(k);
};
/* the file on disk is that icon's own tiles, shuffled — put them back */
function paint(cv, id, v) {
  const T = TILES, order = orderFor(SETS[SET].pre + id, T.grid * T.grid);
  cv.width = cv.height = T.size;
  return loadArt(id, v).then(im => {
    const g = cv.getContext('2d');
    g.clearRect(0, 0, T.size, T.size);
    if (!order) { g.drawImage(im, 0, 0); return; }
    order.forEach((dst, src) => {
      g.drawImage(im, (dst % T.grid) * T.cell, Math.floor(dst / T.grid) * T.cell, T.cell, T.cell,
                      (src % T.grid) * T.cell, Math.floor(src / T.grid) * T.cell, T.cell, T.cell);
    });
    cv.classList.add('lit');
  });
}
/* the enlarged view carries a baked grid of marks — part of the pixels, not a removable node */
function paintStage(cv, id, v) {
  const T = TILES, PAD = 44, SIDE = T.size + PAD * 2;
  const order = orderFor(SETS[SET].pre + id, T.grid * T.grid);
  cv.width = cv.height = SIDE;
  const g = cv.getContext('2d');
  return loadArt(id, v).then(im => {
    g.clearRect(0, 0, SIDE, SIDE);
    if (order) {
      order.forEach((dst, src) => {
        g.drawImage(im, (dst % T.grid) * T.cell, Math.floor(dst / T.grid) * T.cell, T.cell, T.cell,
                        PAD + (src % T.grid) * T.cell, PAD + Math.floor(src / T.grid) * T.cell,
                        T.cell, T.cell);
      });
    } else g.drawImage(im, PAD, PAD);

    g.save();
    g.translate(SIDE / 2, SIDE / 2);
    g.rotate(-28 * Math.PI / 180);
    g.font = '700 13px Inter, Helvetica, Arial, sans-serif';
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    const stepX = g.measureText('ROJAH').width + 26, stepY = 30, reach = SIDE;
    for (let y = -reach, row = 0; y < reach; y += stepY, row++) {
      for (let x = -reach + (row % 2 ? stepX / 2 : 0); x < reach; x += stepX) {
        g.fillStyle = 'rgba(0,0,0,.30)';
        g.fillText('ROJAH', x + 1, y + 1);
        g.fillStyle = 'rgba(255,255,255,.26)';
        g.fillText('ROJAH', x, y);
      }
    }
    g.restore();
    cv.classList.add('lit');
  });
}

const paintIO = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  const cv = e.target;
  paintIO.unobserve(cv);
  paint(cv, cv.dataset.id, cv.dataset.v);
}), { rootMargin: '260px' });
let netCast = false;
function safetyNet() {
  if (netCast) return;
  netCast = true;
  setTimeout(() => {
    document.querySelectorAll('canvas.art:not(.lit)').forEach(cv => {
      const r = cv.getBoundingClientRect();
      if (r.top < innerHeight * 2 || innerHeight === 0) {
        paintIO.unobserve(cv);
        paint(cv, cv.dataset.id, cv.dataset.v);
      }
    });
  }, 1200);
}
function artCanvas(id, v, lazy = true) {
  const cv = el('canvas', 'art');
  cv.dataset.id = id; cv.dataset.v = v;
  cv.width = cv.height = TILES.size;
  if (lazy) { paintIO.observe(cv); safetyNet(); } else paint(cv, id, v);
  return cv;
}

/* ---------- shared: nav + reveal ---------- */
const nav = $('#nav');
addEventListener('scroll', () => nav.classList.toggle('stuck', scrollY > 12), { passive: true });

const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { rootMargin: '0px 0px -6% 0px', threshold: .05 });
const watch = n => io.observe(n);
document.querySelectorAll('.reveal').forEach(watch);

/* ---------- home: hero reel + card visuals ---------- */
function home(icons) {
  const reel = $('#reel');
  if (reel && window.__reel) {
    const R = window.__reel, S = R.cell, G = R.grid, side = S * G;
    const T = G * G, slots = orderFor('reel-atlas', R.ids.length * T);
    const tint = Object.fromEntries(icons.map(i => [i.id, i.color]));
    const atlas = new Image();
    atlas.onload = () => {
      for (let c = 0; c < 3; c++) {
        const col = el('div', 'reel-col');
        const six = R.ids.map((id, i) => ({ id, i })).slice(c * 6, c * 6 + 6);
        [...six, ...six].forEach(({ id, i }) => {
          const cell = el('div', 'reel-cell');
          cell.style.setProperty('--c', (tint[id] || '#8899AA') + '55');
          const cv = el('canvas');
          cv.width = cv.height = side;
          const g = cv.getContext('2d');
          for (let t = 0; t < T; t++) {                    // rebuild from scattered tiles
            const slot = slots[i * T + t];
            g.drawImage(atlas, (slot % R.cols) * S, Math.floor(slot / R.cols) * S, S, S,
                               (t % G) * S, Math.floor(t / G) * S, S, S);
          }
          cell.appendChild(cv);
          col.appendChild(cell);
        });
        reel.appendChild(col);
      }
    };
    atlas.src = `assets/reel/atlas.png?v=${BUILD()}`;
  }

  const vi = $('#wvis-icons');
  if (vi) {
    const box = el('div', 'wminis');
    ['Forge', 'ElementFire', 'PerkVitality', 'RuneVolt', 'Coins', 'TraitConqueror', 'SlotHelmet', 'Dungeons']
      .forEach(id => box.appendChild(artCanvas(id, 'Outlined', false)));
    vi.appendChild(box);
    guard(vi);
  }

  const wave = $('#wvis-wave');
  if (wave) {
    const H = [30, 58, 92, 66, 40, 74, 100, 82, 52, 34, 62, 88, 70, 44, 26, 54, 78, 46, 30, 60];
    H.forEach((h, i) => {
      const b = el('i');
      b.style.height = h + '%';
      b.style.animationDelay = (i * .07).toFixed(2) + 's';
      wave.appendChild(b);
    });
  }

}

/* ---------- icons page ---------- */
const SETS = {
  a: { dir: 'assets/icons',  data: 'data/icons.json',  pre: '',    variants: ['Outlined', 'Flat'],
       label: 'Game UI',   note: 'Chunky banded set built for game HUDs' },
  b: { dir: 'assets/icons2', data: 'data/icons2.json', pre: 's2:', variants: ['Line', 'Plate'],
       label: 'Interface', note: 'Monoline system set for product UI' }
};
let SET = 'a', DATA = null, variant = 'Outlined', cat = 'all', query = '', shown = [], cursor = 0;
const CACHE = {};

function buildSetSwitch() {
  const box = $('#sets');
  if (!box) return;
  box.textContent = '';
  Object.entries(SETS).forEach(([id, s]) => {
    const b = el('button', 'setbtn' + (id === SET ? ' on' : ''));
    b.innerHTML = `<b>${s.label}</b><i>${s.note}</i>`;
    b.onclick = () => { if (id !== SET) loadSet(id); };
    box.appendChild(b);
  });
}

function buildVariants() {
  const seg = $('.seg');
  seg.textContent = '';
  SETS[SET].variants.forEach((v, i) => {
    const b = el('button', i === 0 ? 'on' : '');
    b.textContent = v; b.dataset.v = v;
    b.onclick = () => {
      [...seg.children].forEach(x => x.classList.remove('on'));
      b.classList.add('on'); variant = v; renderGrid();
    };
    seg.appendChild(b);
  });
  variant = SETS[SET].variants[0];
}

function loadSet(id) {
  SET = id; cat = 'all'; query = '';
  const q = $('#q'); if (q) q.value = '';
  const done = d => {
    DATA = d;
    buildSetSwitch(); buildVariants(); buildChips(); renderGrid();
    const c = $('#setcount'); if (c) c.textContent = d.total;
  };
  if (CACHE[id]) return done(CACHE[id]);
  fetch(SETS[id].data, { cache: 'no-cache' }).then(r => r.json()).then(d => { CACHE[id] = d; done(d); });
}

function buildChips() {
  const box = $('#chips');
  box.textContent = '';                      // інакше чипи попереднього набору лишаються
  const mk = (id, label, n) => {
    const b = el('button', 'chip' + (id === cat ? ' on' : ''));
    b.innerHTML = `${label}<i>${n}</i>`;
    b.onclick = () => {
      cat = id;
      [...box.children].forEach(c => c.classList.remove('on'));
      b.classList.add('on'); renderGrid();
    };
    box.appendChild(b);
  };
  mk('all', 'All', DATA.total);
  DATA.categories.forEach(c => mk(c.id, c.title, c.count));
}

function renderGrid() {
  const grid = $('#grid');
  paintIO.disconnect();                     // старі canvas більше не тримаються в памʼяті
  netCast = false;
  shown = DATA.icons.filter(i =>
    (cat === 'all' || i.cat === cat) &&
    (!query || i.name.toLowerCase().includes(query)));
  grid.textContent = '';
  $('#empty').hidden = shown.length > 0;
  shown.forEach((ic, i) => {
    const cell = el('div', 'cell');
    cell.style.setProperty('--c', ic.color);
    cell.style.transitionDelay = Math.min(i, 26) * 13 + 'ms';
    const cap = el('span'); cap.textContent = ic.name;
    cell.append(artCanvas(ic.id, variant, i >= 24), cap);
    cell.tabIndex = 0;
    cell.onclick = () => openModal(i);
    cell.onkeydown = e => { if (e.key === 'Enter') openModal(i); };
    grid.appendChild(cell);
    guard(cell);
    requestAnimationFrame(() => requestAnimationFrame(() => cell.classList.add('in')));
  });
}

function openModal(i) {
  const modal = $('#modal'), card = $('#card');
  cursor = (i + shown.length) % shown.length;
  const ic = shown[cursor];
  const catTitle = DATA.categories.find(c => c.id === ic.cat).title;
  card.style.setProperty('--c', ic.color);
  card.innerHTML = `
    <button class="x" data-close aria-label="Close">
      <svg width="13" height="13" viewBox="0 0 14 14"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
    </button>
    <div class="top">
      <div class="stage" id="stage"></div>
      <div>
        <div class="cat">${esc(catTitle)}</div>
        <h3>${esc(ic.name)}</h3>
        <div class="meta">
          <em><span class="swatch"></span>${esc(ic.color)}</em>
          <em>${variant}</em><em>256 · 512 px</em><em>Transparent</em>
        </div>
        <p class="note">Masters and production exports are not published here —
          ask on Discord if you need the files.</p>
      </div>
    </div>
    <div class="bar">
      <span>${cursor + 1} / ${shown.length}</span>
      <span class="sp">
        <button class="nb" data-nav="-1" aria-label="Previous">‹</button>
        <button class="nb" data-nav="1" aria-label="Next">›</button>
      </span>
    </div>`;
  const sc = el('canvas', 'art stagecv');
  $('#stage').appendChild(sc);
  paintStage(sc, ic.id, variant);
  guard(card);
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function iconsPage() {
  CACHE.a = DATA;
  buildSetSwitch(); buildVariants(); buildChips(); renderGrid();
  $('#q').addEventListener('input', e => { query = e.target.value.trim().toLowerCase(); renderGrid(); });
  const modal = $('#modal');
  const close = () => { modal.classList.remove('open'); document.body.style.overflow = ''; };
  modal.addEventListener('click', e => {
    if (e.target.closest('[data-close]')) return close();
    const n = e.target.closest('[data-nav]');
    if (n) openModal(cursor + (+n.dataset.nav));
  });
  addEventListener('keydown', e => {
    if (!modal.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') openModal(cursor + 1);
    if (e.key === 'ArrowLeft') openModal(cursor - 1);
  });
}

/* ---------- sounds page ---------- */
const SOUNDS = [
  { f: 'forgesound', n: 'Forge strike', d: '0.68 s', t: 'Hammer on the anvil at the crafting station — the shortest cue in the set, so it can fire on every hit without turning into mush.' },
  { f: 'ChestOpen', n: 'Chest open', d: '2.0 s', t: 'Lid, latch and a bright metallic tail, cut so the sparkle lands exactly when the reward panel opens.' },
  { f: 'levelup', n: 'Level up', d: '1.0 s', t: 'Rising three-note figure. Kept dry — the world already has reverb, and a wet cue smears the moment.' },
  { f: 'Reward', n: 'Reward', d: '4.0 s', t: 'The long one: a full resolve for chest and quest payouts, the only cue allowed to breathe.' },
  { f: 'backgroundmusic', n: 'Surface theme', d: '2:24 · 45 s excerpt', t: 'Looping ambient bed for the hub island, owned by the client so it never fights the dungeon track. Shortened here — the full track is not published.', wide: true }
];
let AC = null, current = null;

/* the file on the server is shuffled 1 KB blocks — put them back in memory, never on disk */
const ABS = 1024;                                   // блок аудіо
async function audioURL(name) {
  const raw = new Uint8Array(
    await fetch(`assets/audio/${name}.bin?v=${BUILD()}`).then(r => r.arrayBuffer()));
  const n = Math.floor(raw.length / ABS);           // довжина відома з самого файлу
  const out = new Uint8Array(raw.length);
  orderFor(name, n).forEach((dst, i) => out.set(raw.subarray(dst * ABS, dst * ABS + ABS), i * ABS));
  if (raw.length > n * ABS) out.set(raw.subarray(n * ABS), n * ABS);   // хвіст лишався на місці
  return URL.createObjectURL(new Blob([out], { type: 'audio/mp4' }));
}
const ICON_PLAY  = '<svg width="15" height="15" viewBox="0 0 14 14"><path d="M3 1.6v10.8L12 7z" fill="currentColor"/></svg>';
const ICON_PAUSE = '<svg width="15" height="15" viewBox="0 0 14 14"><rect x="2.6" y="1.7" width="3.4" height="10.6" rx="1.3" fill="currentColor"/><rect x="8" y="1.7" width="3.4" height="10.6" rx="1.3" fill="currentColor"/></svg>';
const setBtn = (btn, name, playing) => {
  btn.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
  btn.setAttribute('aria-label', (playing ? 'Pause ' : 'Play ') + name);
  btn.classList.toggle('is-playing', playing);
};

function soundsPage() {
  const box = $('#sounds');
  SOUNDS.forEach(s => {
    const c = el('div', 'snd reveal');
    if (s.wide) c.style.gridColumn = 'span 2';
    c.innerHTML = `
      <div class="hd">
        <button class="play" aria-label="Play ${s.n}">${ICON_PLAY}</button>
        <div><h4>${s.n}</h4><div class="sub">${s.d}</div></div>
      </div>
      <div class="viz">${'<i></i>'.repeat(40)}</div>
      <p>${s.t}</p>
      <div class="fine"><span>WAV master</span><span>AAC on the web</span></div>`;
    const audio = new Audio();
    audio.preload = 'none';
    const bars = [...c.querySelectorAll('.viz i')];
    const btn = c.querySelector('.play');
    let raf = null, analyser = null, buf = null;
    const idle = bars.map((_, i) =>
      14 + Math.round(34 * Math.abs(Math.sin(i * .78))) + Math.round(16 * Math.abs(Math.cos(i * .31))));
    bars.forEach((b, i) => b.style.height = idle[i] + '%');
    const stopViz = () => { cancelAnimationFrame(raf); bars.forEach((b, i) => b.style.height = idle[i] + '%'); };
    const tick = () => {
      analyser.getByteFrequencyData(buf);
      const step = Math.max(1, Math.floor(buf.length / bars.length / 2.2));
      bars.forEach((b, i) => {
        const v = buf[i * step] / 255;
        b.style.height = Math.max(6, Math.pow(v, .75) * 100) + '%';
      });
      raf = requestAnimationFrame(tick);
    };
    btn.onclick = async () => {
      if (current && current.a !== audio) {
        current.a.pause(); current.stop();
        current.card.classList.remove('playing');
        setBtn(current.btn, current.name, false);
      }
      if (!audio.paused) {
        audio.pause(); stopViz();
        c.classList.remove('playing'); setBtn(btn, s.n, false);
        current = null; return;
      }
      if (!audio.src && !btn.dataset.busy) {
        btn.dataset.busy = '1';
        btn.classList.add('loading');
        try {
          const url = await audioURL(s.f);
          if (audio.src) URL.revokeObjectURL(url);        // хтось встиг раніше — не тримати другий
          else audio.src = url;
        } finally { btn.classList.remove('loading'); delete btn.dataset.busy; }
      } else if (!audio.src) { return; }
      if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
      if (AC.state === 'suspended') await AC.resume();
      if (!analyser) {
        const src = AC.createMediaElementSource(audio);
        analyser = AC.createAnalyser();
        analyser.fftSize = 256; analyser.smoothingTimeConstant = .72;
        buf = new Uint8Array(analyser.frequencyBinCount);
        src.connect(analyser); analyser.connect(AC.destination);
      }
      try { audio.currentTime = 0; } catch (_) {}
      try {
        await audio.play();
      } catch (_) {
        setBtn(btn, s.n, false);              // браузер відмовив — кнопка лишається «play»
        c.classList.remove('playing');
        return;
      }
      c.classList.add('playing'); setBtn(btn, s.n, true); tick();
      current = { a: audio, stop: stopViz, card: c, btn, name: s.n };
    };
    audio.onended = () => {
      stopViz(); c.classList.remove('playing'); setBtn(btn, s.n, false); current = null;
    };
    box.appendChild(c); watch(c);
  });
}

/* ---------- work pages: vfx / models / scripting ---------- */
const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeFile = s => encodeURIComponent(String(s)).replace(/%2F/gi, '/');   // імена файлів у src

function lua(code) {                                   // tiny Luau highlighter
  return esc(code)
    .replace(/(--[^\n]*)/g, '<i class="c">$1</i>')
    .replace(/("[^"\n]*")/g, '<i class="s">$1</i>')
    .replace(/\b(local|function|end|return|if|then|else|elseif|for|in|while|do|and|or|not|nil|true|false|self)\b/g,
             '<i class="k">$1</i>')
    .replace(/\b(\d+(?:\.\d+)?)\b/g, '<i class="n">$1</i>');
}

function workPage(section) {
  const box = $('#workgrid'), blank = $('#workempty');
  fetch('data/work.json', { cache: 'no-cache' }).then(r => r.json()).then(d => {
    const items = (d[section] || []).filter(Boolean);
    if (!items.length) { blank.hidden = false; return; }
    items.forEach(it => {
      const c = el('article', 'wk reveal');
      let media = '';
      if (it.type === 'video') {
        media = `<div class="wkmedia"><video src="assets/work/${section}/${safeFile(it.src)}"
          ${it.poster ? `poster="assets/work/${section}/${safeFile(it.poster)}"` : ''}
          muted loop playsinline preload="metadata"></video>
          <button class="wkplay" aria-label="Play"><svg width="16" height="16" viewBox="0 0 14 14"><path d="M3 1.6v10.8L12 7z" fill="currentColor"/></svg></button></div>`;
      } else if (it.type === 'image') {
        media = `<div class="wkmedia"><img src="assets/work/${section}/${safeFile(it.src)}" alt="${esc(it.title || '')}" loading="lazy"></div>`;
      } else if (it.type === 'code') {
        media = `<div class="wkcode"><pre>${lua(it.code || '')}</pre></div>`;
      }
      c.innerHTML = `${media}<div class="wkbody">
        ${it.tag ? `<div class="eyebrow">${esc(it.tag)}</div>` : ''}
        <h3>${esc(it.title || '')}</h3>
        ${it.text ? `<p>${esc(it.text)}</p>` : ''}
        ${(it.meta || []).length ? `<div class="wkmeta">${it.meta.map(m => `<span>${esc(m)}</span>`).join('')}</div>` : ''}
      </div>`;
      box.appendChild(c); guard(c); watch(c);
      const v = c.querySelector('video');
      if (v) {
        const btn = c.querySelector('.wkplay');
        const sync = () => c.classList.toggle('is-playing', !v.paused);
        btn.onclick = () => { v.paused ? v.play() : v.pause(); };
        c.querySelector('.wkmedia').onclick = e => { if (e.target !== btn) btn.onclick(); };
        v.onplay = sync; v.onpause = sync;
      }
    });
  });
}

/* ---------- reviews ---------- */
function reviewsPage() {
  const box = $('#vgrid'), blank = $('#vempty'), count = $('#vcount');
  fetch('data/reviews.json', { cache: 'no-cache' }).then(r => r.json()).then(d => {
    const items = (d.items || []).filter(i => i && i.src);
    if (count) count.textContent = items.length;
    if (!items.length) { blank.hidden = false; return; }
    items.forEach(it => {
      const c = el('figure', 'vouch reveal');
      c.innerHTML = `
        <div class="vshot"><img src="assets/work/reviews/${safeFile(it.src)}" alt="Review screenshot" loading="lazy"></div>
        ${(it.name || it.work || it.date || it.quote) ? `<figcaption>
          ${it.quote ? `<p class="vq">“${esc(it.quote)}”</p>` : ''}
          <div class="vmeta">
            ${it.name ? `<b>${esc(it.name)}</b>` : '<b>Verified buyer</b>'}
            ${it.work ? `<span>${esc(it.work)}</span>` : ''}
            ${it.date ? `<time>${esc(it.date)}</time>` : ''}
          </div></figcaption>` : ''}`;
      box.appendChild(c); watch(c);
      c.querySelector('.vshot').onclick = () => {
        $('#shotimg').src = `assets/work/reviews/${safeFile(it.src)}`;
        $('#shot').classList.add('open');
        document.body.style.overflow = 'hidden';
      };
    });
  });
  const sh = $('#shot');
  const close = () => { sh.classList.remove('open'); document.body.style.overflow = ''; $('#shotimg').src = ''; };
  sh.addEventListener('click', e => { if (e.target.closest('[data-shotclose]')) close(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && sh.classList.contains('open')) close(); });
}

/* ---------- boot ---------- */
if ($('#sounds')) soundsPage();
if ($('#vgrid')) reviewsPage();
const wg = $('#workgrid');
if (wg) workPage(wg.dataset.section);
if ($('#grid') || $('#reel')) {
  fetch('data/icons.json', { cache: 'no-cache' }).then(r => r.json()).then(d => {
    DATA = d;
    if ($('#reel')) home(d.icons);
    if ($('#grid')) iconsPage();
  });
}
})();
