const GAS_URL = 'https://script.google.com/macros/s/AKfycbxU-aa9OVo2A2tbOriaVVYIRY68IhdHWuq_gdjAxWL-TSaLj2ct2paAdjzm3Wn38sWI/exec';
const $ = id => document.getElementById(id);
const CACHE_KEY = 'kkq-bank-info';

// ---------- Status rangkaian ----------
function updateNet() {
  $('net').textContent = navigator.onLine ? 'Dalam talian' : 'Luar talian';
  $('net').classList.toggle('off', !navigator.onLine);
}
addEventListener('online', updateNet);
addEventListener('offline', updateNet);
updateNet();

// ---------- API (Apps Script Web App) ----------
async function api(action, payload) {
  let res;
  if (payload) {
    res = await fetch(GAS_URL, {
      method: 'POST',
      headers: {'Content-Type': 'text/plain;charset=utf-8'},   // elak preflight CORS
      body: JSON.stringify({action, ...payload})
    });
  } else {
    res = await fetch(GAS_URL + '?action=' + encodeURIComponent(action));
  }
  const j = await res.json();
  if (!j.ok) throw new Error(j.error || 'Ralat pelayan');
  return j.data;
}

// ---------- Paparan ----------
const LV = [1, 2, 3];
const sel = new Set([1, 2, 3]);
let TABS = [], INFO = {}, PER = 12, cached = false;

const lvAvail = l => TABS.reduce((s, t) => s + ((INFO[t] || {})[l] || 0), 0);
const tabAvail = t => [...sel].reduce((s, l) => s + ((INFO[t] || {})[l] || 0), 0);

function renderLevels() {
  $('levels').innerHTML = LV.map(l => `
    <div class="lv ${sel.has(l) ? 'on' : ''}" data-l="${l}">
      <div class="tick">✓</div>
      <div class="n">${l}</div><div class="t">Tingkatan</div>
      <div class="c">${TABS.length ? lvAvail(l) + ' soalan' : '...'}</div>
    </div>`).join('');
  const n = sel.size;
  $('splitNote').textContent = n === 1
    ? 'Semua 60 soalan daripada satu tingkatan.'
    : `Setiap bidang: ${PER / n} soalan daripada setiap tingkatan dipilih.`;
}

function renderBidang() {
  if (!TABS.length) return;
  $('bidang').innerHTML = TABS.map(t => {
    const a = tabAvail(t), low = a < PER, pct = Math.min(100, Math.round(a / PER * 100));
    return `<div class="row"><span class="nm">${t}</span>
      <div class="bar"><i class="${low ? 'low' : ''}" style="width:${pct}%"></i></div>
      <span class="nv ${low ? 'low' : ''}">${PER}/${a}</span></div>`;
  }).join('') + `<div class="note">Kiri: soalan dijana. Kanan: soalan berjawapan tersedia.` +
    (cached ? ' <b>(data tersimpan, luar talian)</b>' : '') + `</div>`;
}

$('levels').addEventListener('click', e => {
  const el = e.target.closest('.lv');
  if (!el) return;
  const l = +el.dataset.l;
  if (sel.has(l)) { if (sel.size === 1) return; sel.delete(l); } else sel.add(l);
  renderLevels(); renderBidang();
});

async function loadBank() {
  $('bidang').textContent = 'Memuatkan...';
  try {
    const d = await api('info');
    localStorage.setItem(CACHE_KEY, JSON.stringify(d));
    ({tabs: TABS, info: INFO, perTab: PER} = d);
    cached = false;
  } catch (e) {
    const c = localStorage.getItem(CACHE_KEY);
    if (c) {
      ({tabs: TABS, info: INFO, perTab: PER} = JSON.parse(c));
      cached = true;
    } else { $('bidang').textContent = 'Gagal memuatkan: ' + e.message; return; }
  }
  renderLevels(); renderBidang();
}
$('reload').onclick = loadBank;
renderLevels();
loadBank();

// ---------- Jana ----------
function showErr(t) { const e = $('err'); e.textContent = t; e.style.display = 'block'; }
function busy(on) {
  $('go').disabled = on;
  $('spin').style.display = on ? 'block' : 'none';
  $('goTxt').textContent = on ? 'Menjana dokumen...' : 'Jana Google Doc';
}

$('go').onclick = async () => {
  $('err').style.display = 'none';
  $('result').style.display = 'none';
  if (!navigator.onLine) { showErr('Perlu sambungan internet untuk menjana dokumen.'); return; }
  busy(true);
  try {
    const r = await api('generate', {
      levels: [...sel].sort(),
      shuffleOptions: $('shufOpt').checked,
      shuffleOrder: $('shufOrd').checked,
      makeKey: $('makeKey').checked,
      makePdf: $('makePdf').checked
    });
    const lv = Object.keys(r.perLevel).sort().map(k => `T${k}: ${r.perLevel[k]}`).join(' &bull; ');
    const tb = Object.keys(r.perTab).map(k => `${k}: ${r.perTab[k]}`).join(' &bull; ');
    $('meta').innerHTML = `${r.made} soalan &mdash; ${r.label}<br>${lv}<br>${tb}`;
    let h = `<a class="lnk" href="${r.docUrl}" target="_blank" rel="noopener">Buka kertas soalan <span>↗</span></a>`;
    if (r.keyUrl) h += `<a class="lnk" href="${r.keyUrl}" target="_blank" rel="noopener">Buka skema jawapan <span>↗</span></a>`;
    if (r.pdfUrl) h += `<a class="lnk" href="${r.pdfUrl}" target="_blank" rel="noopener">Buka PDF <span>↗</span></a>`;
    $('links').innerHTML = h;
    $('result').style.display = 'block';
  } catch (e) {
    showErr(e.message);
  } finally {
    busy(false);
  }
};

// ---------- Tetapan ----------
$('gear').onclick = () => {
  const s = $('settings');
  s.hidden = !s.hidden;
  $('gear').setAttribute('aria-expanded', String(!s.hidden));
};

// ---------- PWA ----------
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');

let deferred;
addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferred = e;
  $('install').hidden = false;
});
$('install').onclick = () => {
  $('install').hidden = true;
  if (deferred) { deferred.prompt(); deferred = null; }
};
