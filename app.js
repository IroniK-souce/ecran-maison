(function(){
'use strict';
/* Écran Maison · tableau de bord du foyer
   Données : Firebase Realtime Database, sous foyers/<code>/ :
     courses, taches, mot, dates, config {ville, wifi, membres}, freq, favoris, menuOverride
   data.json (dépôt) : agenda, plat, menu de la semaine, vigilance (mis à jour chaque matin).
   Compatible Safari 12 (iPad Air 1) : ES5 uniquement. */
var FIREBASE = {
  apiKey: "AIzaSyB4Wkhy-5_AsqyqVJZsBRKX8wPVUNAXwrg",
  authDomain: "ecran-maison-901d5.firebaseapp.com",
  databaseURL: "https://ecran-maison-901d5-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "ecran-maison-901d5",
  storageBucket: "ecran-maison-901d5.firebasestorage.app",
  messagingSenderId: "389932373217",
  appId: "1:389932373217:web:3e85d16139ed4d16f193a0"
};
var KEY = 'ecran-maison-code';
var DATA_KEYS = ['courses', 'taches', 'mot', 'dates', 'config', 'freq', 'favoris', 'menuOverride'];
var root = null, lists = {courses: [], taches: []}, raw = {courses: {}, taches: {}, dates: {}}, config = null, jour = null;

function $(id){ return document.getElementById(id); }
function $$(sel, el){ return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
function pad(n){ return (n < 10 ? '0' : '') + n; }
function show(id, on){ var el = typeof id === 'string' ? $(id) : id; if(!el) return; var c = el.className.replace(/\s*\bhide\b/g, ''); el.className = on ? c : c + ' hide'; }
function cls(el, c, on){ if(!el) return; var x = (' ' + el.className + ' ').replace(' ' + c + ' ', ' ').replace(/^\s+|\s+$/g, ''); el.className = on ? (x ? x + ' ' : '') + c : x; }
function store(k, v){ try { if(v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); return true; } catch(e){ return false; } }
function load(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }
function loadJSON(k, def){ try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? def : v; } catch(e){ return def; } }
function safe(fn){ try { fn(); } catch(e){ if(window.console) console.error(e); } }
function status(t){ var el = $('st'); if(el) el.textContent = t; }
var JOURS = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
var MOIS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
function todayKey(d){ return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function addDays(d, n){ var x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12); return x; }
function hm(ts){ var d = new Date(ts); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }

/* ---------- icônes (traits fins, même style partout) ---------- */
var IC = {
  home: '<path d="M3.5 11.5L12 4.5l8.5 7"/><path d="M6 10v9.5h12V10"/>',
  pot: '<path d="M4 10h16v4.5A5.5 5.5 0 0 1 14.5 20h-5A5.5 5.5 0 0 1 4 14.5z"/><path d="M2.5 10h19M9.5 6.5c0-1 1-1.5 1-2.5M13.5 6.5c0-1 1-1.5 1-2.5"/>',
  list: '<path d="M4 6.5l1.5 1.5L8 5.5M4 12.5l1.5 1.5L8 11.5M4 18.5l1.5 1.5L8 17.5M11.5 7h8.5M11.5 13h8.5M11.5 19h8.5"/>',
  cloud: '<path d="M7.5 18.5h9.5a4 4 0 0 0 .4-7.98A6 6 0 0 0 6 11.2a3.7 3.7 0 0 0 1.5 7.3z"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M5.5 18.5l1.8-1.8M16.7 7.3l1.8-1.8"/>',
  cart: '<path d="M3 4.5h2.2l2.3 10.5h10.2L20 8H6.3"/><circle cx="9.5" cy="19.3" r="1.3"/><circle cx="16.5" cy="19.3" r="1.3"/>',
  check: '<rect x="4" y="4" width="16" height="16" rx="4.5"/><path d="M8.5 12.2l2.5 2.5 4.6-5"/>',
  tick: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="3.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 2M9.5 3h5"/>',
  fuel: '<path d="M5 20V5.5A1.5 1.5 0 0 1 6.5 4h6A1.5 1.5 0 0 1 14 5.5V20M3.5 20h12M5 10h9"/><path d="M14 8l3 2.5V16a1.5 1.5 0 0 0 3 0V9l-2.5-3"/>',
  wifi: '<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.7 15.8a5 5 0 0 1 6.6 0"/><path d="M12 19.2v.1"/>',
  moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>',
  note: '<path d="M5 4h14v11l-5 5H5z"/><path d="M14 20v-5h5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M4.5 19.5h4l10.5-10.5-4-4L4.5 15.5z"/><path d="M13 7l4 4"/>',
  trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
  swap: '<path d="M4 8h13.5l-3.5-3.5M20 16H6.5l3.5 3.5"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
  gift: '<rect x="4" y="9" width="16" height="11" rx="2"/><path d="M12 9v11M3 9h18M12 9c-2-4-6-4-6-1.5S10 9 12 9zM12 9c2-4 6-4 6-1.5S14 9 12 9z"/>',
  save: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14"/>',
  x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  chev: '<path d="M9.5 5.5l6.5 6.5-6.5 6.5"/>',
  work: '<rect x="3.5" y="7.5" width="17" height="12" rx="2.5"/><path d="M9 7.5V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5v2M3.5 12.5h17"/>',
  book: '<path d="M5 4.5h11a3 3 0 0 1 3 3v12H8a3 3 0 0 1-3-3z"/><path d="M5 16.5a3 3 0 0 1 3-3h11"/>'
};
function ico(n){ return '<svg class="svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (IC[n] || '') + '</svg>'; }
function fillIcons(scope){ $$('i[data-ic]', scope).forEach(function(i){ var s = document.createElement('span'); s.innerHTML = ico(i.getAttribute('data-ic')); i.parentNode.replaceChild(s.firstChild, i); }); }

/* ---------- message en bas d'écran, avec « Annuler » ---------- */
var undoFn = null, toastT = null;
function toast(msg, undo){
  $('toastm').textContent = msg;
  $('toastu').style.display = undo ? '' : 'none';
  undoFn = undo || null;
  $('toast').className = 'on';
  clearTimeout(toastT);
  toastT = setTimeout(function(){ $('toast').className = ''; undoFn = null; }, undo ? 7000 : 2600);
}

/* ---------- membres du foyer ---------- */
function membres(){
  var m = config && config.membres;
  if(typeof m === 'string') m = m.split(',');
  m = (m || ['Anthony', 'Lisa']).map(function(x){ return String(x).trim(); }).filter(Boolean);
  return m.slice(0, 6);
}

/* ---------- horloge et moment de la journée ---------- */
/* thème : clair entre le lever et le coucher du soleil (8 h à 18 h à défaut de météo) */
function themeMode(){ var t = load('ecran-theme'); return t === 'sombre' || t === 'clair' ? t : 'auto'; }
function isDay(d){
  var mins = d.getHours() * 60 + d.getMinutes(), lev = 8 * 60, cou = 18 * 60;
  if(lastMeteo && lastMeteo.daily && lastMeteo.daily.sunrise){
    var tk = todayKey(d), i = lastMeteo.daily.time.indexOf(tk);
    if(i >= 0){ var a = String(lastMeteo.daily.sunrise[i]).slice(11, 16).split(':'), b = String(lastMeteo.daily.sunset[i]).slice(11, 16).split(':'); lev = a[0] * 60 + +a[1] + 15; cou = b[0] * 60 + +b[1] - 15; }
  }
  return mins >= lev && mins < cou;
}
function applyTheme(d){
  var m = themeMode(), clair = m === 'clair' || (m === 'auto' && isDay(d || new Date()));
  if((document.body.className.indexOf('clair') >= 0) === clair) return;
  cls(document.body, 'clair', clair); cls(document.documentElement, 'clair', clair);
  var tc = document.querySelector('meta[name=theme-color]'); if(tc) tc.setAttribute('content', clair ? '#eceef2' : '#16171a');
}
function grand(){ return load('ecran-grand') === '1'; }
function applyGrand(){ cls(document.body, 'grand', grand()); }
function tod(h){ return h >= 5 && h < 11 ? 'matin' : h >= 11 && h < 18 ? 'jour' : h >= 18 && h < 23 ? 'soir' : 'nuit'; }
var lastMin = -1;
function tick(){
  var d = new Date(), t = pad(d.getHours()) + ':' + pad(d.getMinutes());
  if(d.getMinutes() !== lastMin && lastMin !== -1){ safe(renderInfos); if(curPage === 'planning') safe(renderPlanningPage); }
  lastMin = d.getMinutes();
  nightCheck(d);
  $$('.clk').forEach(function(el){ el.textContent = t; });
  $('nclk').textContent = t;
  var ds = JOURS[d.getDay()] + ' ' + d.getDate() + ' ' + MOIS[d.getMonth()];
  $('ndate').textContent = ds;
  var mm = membres(), m = tod(d.getHours());
  $('hello').textContent = (m === 'matin' ? 'Bonjour' : m === 'jour' ? 'Bon après-midi' : 'Bonsoir') + (mm.length ? ' ' + mm.join(' & ') : '');
  $('date').textContent = ds;
  var b = document.body.className.replace(/\s*tod-\w+/g, '');
  document.body.className = b + ' tod-' + m;
  applyTheme(d);
}
function weekNum(d){ var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); var day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); var y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return Math.ceil(((t - y) / 86400000 + 1) / 7); }

/* ---------- veille, mode nuit, retour à l'accueil, rechargement nocturne ---------- */
var lastTouch = Date.now(), wakeUntil = 0, loadedAt = Date.now(), forced = false, lastDrift = 0;
function veilleCfg(){
  var c = loadJSON('ecran-veille', {});
  return {delay: typeof c.delay === 'number' ? c.delay : 10, nuit: c.nuit !== false, debut: typeof c.debut === 'number' ? c.debut : 22, fin: typeof c.fin === 'number' ? c.fin : 7};
}
function isSleeping(){ return document.body.className.indexOf('night') >= 0; }
function typing(){ var a = document.activeElement; return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT'); }
function nightCheck(d){
  var cfg = veilleCfg(), h = d.getHours(), now = Date.now();
  var inNight = cfg.debut > cfg.fin ? (h >= cfg.debut || h < cfg.fin) : (h >= cfg.debut && h < cfg.fin);
  var sleep = forced || (cfg.delay > 0 && now - lastTouch > cfg.delay * 60000) || (cfg.nuit && inNight && now > wakeUntil);
  if(sleep && typing() && now - lastTouch < 600000) sleep = forced;
  cls(document.body, 'night', sleep);
  if(sleep){
    var p = platDuJour();
    $('ninfo').innerHTML = esc($('mt').textContent) + ' ' + esc($('mi').textContent) + (p && p.nom ? '<br><span>Ce soir : ' + esc(p.nom) + '</span>' : '');
    if(now - lastDrift > 60000){
      lastDrift = now;
      var x = Math.round(Math.random() * 80 - 40), y = Math.round(Math.random() * 60 - 30);
      $('nbox').style.webkitTransform = $('nbox').style.transform = 'translate(' + x + 'px,' + y + 'px)';
    }
  }
  /* 1 minute sans toucher : on revient à l'accueil */
  if(now - lastTouch > 60000 && !typing()){
    if(sheetKind) closeSheet();
    if(curPage !== 'accueil') goPage('accueil');
    if((window.pageYOffset || document.documentElement.scrollTop) > 0) window.scrollTo(0, 0);
  }
  /* rechargement complet chaque nuit vers 3 h 30, pour rester à jour */
  if(h === 3 && d.getMinutes() >= 30 && d.getMinutes() < 45 && now - loadedAt > 3600000 && !sheetKind && !typing()){
    location.replace(location.pathname + '?r=' + now + location.hash);
  }
}
function touched(e){
  var wasAsleep = isSleeping();
  lastTouch = Date.now(); forced = false;
  if(wasAsleep){
    safe(loadMeteo);
    wakeUntil = Date.now() + 120000;
    nightCheck(new Date());
    if(e && e.type !== 'keydown'){ e.preventDefault(); e.stopPropagation(); }
  }
}
document.addEventListener('touchstart', touched, {capture: true, passive: false});
document.addEventListener('mousedown', touched, true);
document.addEventListener('keydown', touched, true);
function goVeille(){ forced = true; if(sheetKind) closeSheet(); goPage('accueil'); nightCheck(new Date()); }

/* ---------- pages ---------- */
var PAGES = ['accueil', 'cuisine', 'maison', 'planning', 'infos', 'reglages'], curPage = 'accueil';
function goPage(p){
  if(PAGES.indexOf(p) < 0) p = 'accueil';
  curPage = p;
  PAGES.forEach(function(x){ cls($('p-' + x), 'on', x === p); });
  $$('.rbtn').forEach(function(b){ cls(b, 'on', b.getAttribute('data-p') === p); });
  if(p === 'reglages') fillSettings();
  if(p === 'infos') safe(renderMeteoDetail);
  if(p === 'planning') safe(renderPlanningPage);
  if(window.innerWidth < 900) window.scrollTo(0, 0);
}
/* balayage gauche / droite entre les pages */
(function(){
  var sx = 0, sy = 0, st = 0, ok = false;
  document.addEventListener('touchstart', function(e){
    var t = e.target; ok = true;
    while(t && t !== document){ if(t.className && typeof t.className === 'string' && (t.className.indexOf('hscroll') >= 0 || t.className.indexOf('infos') >= 0) || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.id === 'sheet'){ ok = false; break; } t = t.parentNode; }
    sx = e.touches[0].clientX; sy = e.touches[0].clientY; st = Date.now();
  }, {passive: true});
  document.addEventListener('touchend', function(e){
    if(!ok || sheetKind || isSleeping()) return;
    var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
    if(Math.abs(dx) > 90 && Math.abs(dy) < 60 && Date.now() - st < 600){
      var i = PAGES.indexOf(curPage) + (dx < 0 ? 1 : -1);
      if(i >= 0 && i < PAGES.length - 1) goPage(PAGES[i]);
    }
  }, {passive: true});
})();

/* ---------- rayons, articles fréquents, favoris ---------- */
function normTxt(t){ t = String(t || '').toLowerCase(); if(t.normalize) t = t.normalize('NFD').replace(/[̀-ͯ]/g, ''); return t.replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
var RAYONS = ['Fruits et légumes', 'Boucherie et poisson', 'Crèmerie et œufs', 'Boulangerie', 'Épicerie', 'Boissons', 'Surgelés', 'Hygiène et maison', 'Autres'];
var RAYON_KW = {
  'Fruits et légumes': ['pomme','poire','banane','orange','citron','clementine','mandarine','raisin','kiwi','fraise','framboise','ananas','mangue','peche','abricot','prune','melon','pasteque','tomate','salade','laitue','mache','roquette','carotte','oignon','ail','echalote','poireau','courgette','aubergine','poivron','potimarron','potiron','courge','butternut','champignon','epinard','brocoli','chou','pomme de terre','pommes de terre','patate','celeri','navet','radis','concombre','avocat','persil','coriandre','basilic','ciboulette','menthe','thym','romarin','fenouil','haricots verts','legume','fruit','chataigne','betterave','endive','artichaut','asperge','gingembre','herbes fraiches'],
  'Boucherie et poisson': ['poulet','boeuf','steak','hache','porc','jambon','lardon','saucisse','merguez','dinde','veau','agneau','canard','saumon','cabillaud','colin','lieu','crevette','moule','poisson','viande','chorizo','escalope','roti','cote','filet de','bacon','knack','pave'],
  'Crèmerie et œufs': ['lait','beurre','creme','yaourt','yogourt','fromage','emmental','gruyere','parmesan','mozzarella','comte','chevre','raclette','camembert','feta','ricotta','mascarpone','oeuf','pate brisee','pate feuilletee','pate a pizza','rape','skyr','petit suisse'],
  'Boulangerie': ['pain','baguette','brioche','croissant','pain de mie','biscotte','tortilla','wrap'],
  'Épicerie': ['pates','pate de curry','spaghetti','coquillette','penne','riz','semoule','quinoa','farine','sucre','sel','poivre','huile','vinaigre','conserve','boite','haricots rouges','pois chiches','lentille','lait de coco','curry','epice','cumin','paprika','bouillon','sauce','moutarde','ketchup','mayonnaise','cafe','the','tisane','chocolat','biscuit','cereale','confiture','miel','tomates concassees','concentre','levure','maizena','herbes de provence','olive','noix','amande','compote','chips','gateau','puree','mais'],
  'Boissons': ['eau','jus','soda','biere','vin','coca','sirop','limonade'],
  'Surgelés': ['surgele','glace','frites','poisson pane','pizza surgelee'],
  'Hygiène et maison': ['papier toilette','essuie tout','sopalin','lessive','adoucissant','liquide vaisselle','pastille','eponge','savon','shampoing','shampooing','gel douche','dentifrice','brosse a dents','deodorant','sac poubelle','sacs poubelle','mouchoir','coton','javel','nettoyant','film','aluminium','papier cuisson','piles','ampoule']
};
var RAYON_LIST = [];
for(var rk in RAYON_KW){ RAYON_KW[rk].forEach(function(k){ RAYON_LIST.push([k, rk]); }); }
RAYON_LIST.sort(function(a, b){ return b[0].length - a[0].length; });
function rayonOf(name){ var n = ' ' + normTxt(name) + ' '; for(var i = 0; i < RAYON_LIST.length; i++) if(n.indexOf(' ' + RAYON_LIST[i][0]) >= 0) return RAYON_LIST[i][1]; return 'Autres'; }
/* regroupe les articles identiques (×2) et trie par rayon */
function groupCourses(items){
  var groups = {}, order = [];
  items.forEach(function(x){
    if(x.done) return;
    var k = normTxt(x.name);
    if(!groups[k]){ groups[k] = {name: x.name, ids: [], rayon: rayonOf(x.name)}; order.push(k); }
    groups[k].ids.push(x.id);
  });
  var gl = order.map(function(k){ return groups[k]; });
  gl.sort(function(a, b){ var d = RAYONS.indexOf(a.rayon) - RAYONS.indexOf(b.rayon); return d || normTxt(a.name).localeCompare(normTxt(b.name)); });
  return gl;
}
function boxHtml(done){ return '<span class="box">' + (done ? ico('tick') : '') + '</span>'; }
function coursesHtml(items){
  var gl = groupCourses(items), h = '', last = '';
  gl.forEach(function(g){
    if(g.rayon !== last){ last = g.rayon; h += '<div class="gh">' + esc(g.rayon) + '</div>'; }
    h += '<div class="row" data-col="courses" data-id="' + esc(g.ids[0]) + '" data-ids="' + esc(g.ids.join(',')) + '">' + boxHtml(false) + '<span class="nm">' + esc(g.name) + (g.ids.length > 1 ? ' <span class="mult">×' + g.ids.length + '</span>' : '') + '</span>' +
      '<button type="button" class="ib" data-act="edit" data-col="courses" data-id="' + esc(g.ids[0]) + '" aria-label="Modifier">' + ico('edit') + '</button>' +
      '<button type="button" class="ib" data-act="del" data-col="courses" data-ids="' + esc(g.ids.join(',')) + '" aria-label="Supprimer">' + ico('trash') + '</button></div>';
  });
  var done = items.filter(function(x){ return x.done; });
  if(done.length){
    h += '<div class="gh">Dans le panier</div>';
    done.forEach(function(x){ h += '<div class="row done" data-col="courses" data-id="' + esc(x.id) + '">' + boxHtml(true) + '<span class="nm">' + esc(x.name) + '</span></div>'; });
    h += '<div style="padding:12px 0 4px"><button type="button" class="b sm ghost" data-act="clear" data-col="courses">' + ico('trash') + 'Retirer les articles cochés</button></div>';
  }
  return h || '<div class="empty">Rien à acheter pour l\'instant</div>';
}
var freq = {};
function freqKey(name){ return normTxt(name).replace(/ /g, '-').slice(0, 60); }
function bumpFreq(name){
  var k = freqKey(name); if(!k || !root) return;
  root.child('freq/' + k).transaction(function(c){ c = c || {n: 0}; c.n = (c.n || 0) + 1; c.name = String(name).slice(0, 80); c.last = Date.now(); return c; });
}
function chipsHtml(max){
  var cur = {}, arr = [];
  lists.courses.forEach(function(x){ if(!x.done) cur[normTxt(x.name)] = 1; });
  for(var k in freq){ var f = freq[k]; if(f && f.name && (f.n || 0) >= 2 && !cur[normTxt(f.name)]) arr.push(f); }
  arr.sort(function(a, b){ return (b.n - a.n) || ((b.last || 0) - (a.last || 0)); });
  return arr.slice(0, max).map(function(f){ return '<button type="button" class="chip" data-chip="' + esc(f.name) + '">+ ' + esc(f.name) + '</button>'; }).join('');
}
function renderChips(){ var el = $('chips-courses'); if(el) el.innerHTML = chipsHtml(8); }
var lastAdd = {k: '', t: 0};
function addCourse(name){
  name = String(name || '').trim().slice(0, 80); if(!name || !root) return;
  var k = normTxt(name);
  if(lastAdd.k === k && Date.now() - lastAdd.t < 2500) return;   /* double appui */
  lastAdd = {k: k, t: Date.now()};
  var deja = lists.courses.filter(function(x){ return !x.done && normTxt(x.name) === k; }).length;
  root.child('courses').push({name: name, done: false, at: Date.now()}).then(function(){
    toast(deja ? name + ' : déjà dans la liste, quantité ×' + (deja + 1) : name + ' ajouté aux courses');
  }, function(){ toast('Ajout impossible pour le moment'); });
  bumpFreq(name);
}
var favs = {}, overrides = {};
function favKey(nom){ return normTxt(nom).replace(/ /g, '-').slice(0, 60) || 'plat'; }
function isFav(p){ return !!(p && p.nom && favs[favKey(p.nom)]); }
function toggleFav(p){
  if(!p || !p.nom) return;
  var k = favKey(p.nom);
  if(favs[k]) root.child('favoris/' + k).remove().then(function(){ toast('Retiré des favoris'); });
  else root.child('favoris/' + k).set({nom: p.nom, url: p.url || '', source: p.source || '', temps: p.temps || '', difficulte: p.difficulte || '', portions: p.portions || 0, ingredients: p.ingredients || [], at: Date.now()}).then(function(){ toast('Ajouté aux favoris'); });
}
/* menu : 7 jours à partir d'aujourd'hui, avec les plats changés à la main */
function menuEff(){
  var m = (jour && jour.menu) || [], by = {}, out = [], now = new Date();
  m.forEach(function(x){ by[x.date] = x; });
  for(var i = 0; i < 7; i++){
    var dk = todayKey(addDays(now, i)), o = overrides[dk], x = by[dk];
    if(o && o.nom){ var y = {}; for(var k in o) y[k] = o[k]; y.date = dk; y.swapped = true; y.prevu = x ? x.nom : ''; out.push(y); }
    else if(x) out.push(x);
    else out.push({date: dk, nom: ''});
  }
  return out;
}
function platDuJour(){
  var m = menuEff();
  if(m[0] && m[0].nom) return m[0];
  return (jour && jour.plat && jour.plat.nom) ? jour.plat : {};
}
var EMO = [['quiche', '🥧'], ['tarte', '🥧'], ['velout', '🥣'], ['soupe', '🥣'], ['potage', '🥣'], ['gratin', '🧀'], ['pates', '🍝'], ['spaghetti', '🍝'], ['lasagne', '🍝'], ['curry', '🍛'], ['saumon', '🐟'], ['poisson', '🐟'], ['cabillaud', '🐟'], ['risotto', '🍚'], ['riz', '🍚'], ['chili', '🌶️'], ['pizza', '🍕'], ['salade', '🥗'], ['burger', '🍔'], ['crepe', '🥞'], ['galette', '🥞'], ['omelette', '🍳'], ['oeuf', '🍳'], ['poulet', '🍗'], ['boeuf', '🥩'], ['steak', '🥩'], ['tacos', '🌮'], ['wrap', '🌯'], ['raclette', '🧀'], ['hachis', '🥔'], ['puree', '🥔']];
function platEmoji(nom){ var n = normTxt(nom); for(var i = 0; i < EMO.length; i++) if(n.indexOf(EMO[i][0]) >= 0) return EMO[i][1]; return '🍽️'; }

/* ---------- listes synchronisées ---------- */
function todayItems(name){ var today = new Date().getDay(); return lists[name].filter(function(x){ return x.rep == null || x.rep === today; }); }
function renderList(name){
  if(name === 'courses'){
    var ng = groupCourses(lists.courses).length; $('ncourses').textContent = ng; $('ncourses2').textContent = ng;
    $('l-courses').innerHTML = coursesHtml(lists.courses);
    renderChips(); renderHomeCourses();
  } else {
    renderTaches(); renderHomeTaches();
  }
  safe(renderInfos); safe(renderShortcuts);
}
function watchList(name){
  root.child(name).on('value', function(snap){
    var arr = [], v = snap.val() || {};
    raw[name] = v;
    for(var id in v){ if(v.hasOwnProperty(id) && v[id]) arr.push({id: id, name: v[id].name || '', done: !!v[id].done, at: v[id].at || 0, rep: (typeof v[id].rep === 'number' ? v[id].rep : null), doneAt: v[id].doneAt || 0, qui: v[id].qui || '', prio: !!v[id].prio}); }
    arr.sort(function(a, b){ return a.at - b.at; });
    lists[name] = arr; resetRecurring(name); safe(function(){ renderList(name); }); status('Synchronisé');
  }, function(){ status('Accès refusé · vérifie le code'); });
}
/* tâches qui reviennent chaque semaine : décochées automatiquement le jour venu */
function resetRecurring(name){
  var now = new Date(), up = {}, any = false;
  lists[name].forEach(function(x){
    if(x.rep == null || !x.done) return;
    var occ = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    occ.setDate(occ.getDate() - ((now.getDay() - x.rep + 7) % 7));
    if((x.doneAt || 0) < occ.getTime()){ up[x.id + '/done'] = false; any = true; }
  });
  if(any) root.child(name).update(up);
}
function tacheHtml(it, compact){
  var tags = (it.prio && !it.done && !compact ? '<span class="tag p">⚑ important</span>' : '') +
    (it.qui && !compact ? '<span class="tag q">' + esc(it.qui) + '</span>' : '') +
    (!compact && it.rep != null ? '<span class="tag r">↻ chaque ' + JOURS[it.rep].toLowerCase() + '</span>' : '') +
    (!compact && it.done && it.doneAt ? '<span class="tag">faite ' + (new Date(it.doneAt).toDateString() === new Date().toDateString() ? 'à ' + hm(it.doneAt) : 'le ' + new Date(it.doneAt).getDate() + '/' + (new Date(it.doneAt).getMonth() + 1)) + '</span>' : '');
  return '<div class="row' + (it.done ? ' done' : '') + (it.prio && !it.done ? ' prio' : '') + (compact ? ' cp' : '') + '" data-col="taches" data-id="' + esc(it.id) + '">' + boxHtml(it.done) +
    (compact ? '<span class="nm2"><span class="nm">' + esc(it.name) + '</span>' + (it.qui || it.prio ? '<span class="qn"' + (it.prio && !it.qui ? ' style="color:var(--ye)"' : '') + '>' + (it.prio ? '⚑ ' : '') + esc(it.qui || 'Important') + '</span>' : '') + '</span>' : '<span class="nm2"><span class="nm">' + esc(it.name) + '</span>' + (tags ? '<span class="tg">' + tags + '</span>' : '') + '</span>') +
    (compact ? '' : '<button type="button" class="ib" data-act="edit" data-col="taches" data-id="' + esc(it.id) + '" aria-label="Modifier">' + ico('edit') + '</button><button type="button" class="ib" data-act="del" data-col="taches" data-ids="' + esc(it.id) + '" aria-label="Supprimer">' + ico('trash') + '</button>') + '</div>';
}
function sortTaches(a, b){ return (b.prio - a.prio) || (a.at - b.at); }
function renderTaches(){
  var today = new Date().getDay(), all = lists.taches;
  var auj = all.filter(function(x){ return !x.done && (x.rep == null || x.rep === today); }).sort(sortTaches);
  var plus = all.filter(function(x){ return x.rep != null && x.rep !== today && !x.done; }).sort(function(a, b){ return ((a.rep - today + 7) % 7) - ((b.rep - today + 7) % 7); });
  var faites = all.filter(function(x){ return x.done; }).sort(function(a, b){ return b.doneAt - a.doneAt; });
  var h = '';
  if(auj.length){ h += '<div class="gh">À faire</div>'; auj.forEach(function(x){ h += tacheHtml(x); }); }
  if(plus.length){ h += '<div class="gh">Plus tard dans la semaine</div>'; plus.forEach(function(x){ h += tacheHtml(x); }); }
  if(faites.length){ h += '<div class="gh">Faites</div>'; faites.forEach(function(x){ h += tacheHtml(x); }); if(faites.some(function(x){ return x.rep == null; })) h += '<div style="padding:12px 0 4px"><button type="button" class="b sm ghost" data-act="clear" data-col="taches">' + ico('trash') + 'Retirer les tâches faites</button></div>'; }
  $('l-taches').innerHTML = h || '<div class="empty">Aucune tâche. Ajoutez-en une au-dessus.</div>';
  $('ntaches2').textContent = auj.length;
}
/* remplit une carte avec autant de lignes que la place le permet, sans rien couper */
function fitList(el, rows, more, narrowMax){
  var wide = window.innerWidth >= 900;
  if(!wide) rows.length > narrowMax ? (el.innerHTML = rows.slice(0, narrowMax).join('') + more(rows.length - narrowMax)) : (el.innerHTML = rows.join(''));
  else {
    el.innerHTML = rows.join('');
    if(el.scrollHeight <= el.clientHeight + 2) return;
    var n = rows.length;
    while(n > 1){
      n--;
      el.innerHTML = rows.slice(0, n).join('') + more(rows.length - n);
      if(el.scrollHeight <= el.clientHeight + 2) break;
    }
    if(el.scrollHeight > el.clientHeight + 2) el.innerHTML = rows[0];
  }
}
function renderHomeCourses(){
  var el = $('h-courses'), gl = groupCourses(lists.courses);
  if(!gl.length){
    var c = chipsHtml(4);
    el.innerHTML = '<div class="empty" style="width:100%;padding:4px 8px">Rien à acheter.' + (c ? ' Souvent achetés :' : '') + '</div>' + (c ? '<div class="chips" style="padding:0 8px">' + c + '</div>' : '');
    return;
  }
  fitList(el, gl.map(function(g){ return '<div class="row" data-col="courses" data-id="' + esc(g.ids[0]) + '" data-ids="' + esc(g.ids.join(',')) + '">' + boxHtml(false) + '<span class="nm">' + esc(g.name) + (g.ids.length > 1 ? ' <span class="mult">×' + g.ids.length + '</span>' : '') + '</span></div>'; }),
    function(k){ return '<div class="more tap" data-act="page" data-p="maison">+ ' + k + ' autre' + (k > 1 ? 's' : '') + ' ›</div>'; }, 8);
}
function renderHomeTaches(){
  var items = todayItems('taches'), todo = items.filter(function(x){ return !x.done; }).sort(sortTaches), done = items.length - todo.length;
  $('ntaches').textContent = todo.length;
  $('tdone').textContent = done ? done + ' faite' + (done > 1 ? 's' : '') : '';
  if(!todo.length){ $('h-taches').innerHTML = '<div class="empty">Tout est fait ✓</div>'; return; }
  fitList($('h-taches'), todo.map(function(x){ return tacheHtml(x, true); }), function(k){ return '<div class="more" style="padding-left:0">+ ' + k + ' autre' + (k > 1 ? 's' : '') + ' ›</div>'; }, 5);
}

/* ---------- plat, menu, agenda (data.json mis à jour chaque matin) ---------- */
function platCardHtml(){
  var p = platDuJour(), bits = [];
  if(p.temps) bits.push(p.temps); if(p.difficulte) bits.push(p.difficulte); if(p.portions) bits.push(p.portions + ' pers.');
  var img = p.image && /^https:\/\//.test(p.image) ? '<img alt="" src="' + esc(p.image) + '">' : platEmoji(p.nom);
  return '<div class="ptx"><div class="pk">Ce soir' + (bits.length ? '<span> · ' + esc(bits.join(' · ')) + '</span>' : '') + '</div>' +
    '<div class="pn">' + esc(p.nom || 'Pas encore de plat prévu') + '</div>' +
    (p.nom ? '' : '<div class="pmeta">Choisissez un plat avec « Changer »</div>') +
    '<div class="pbtns">' + ((p.ingredients || []).length ? '<button type="button" class="b sm" data-act="sheet" data-k="plat">' + ico('cart') + 'Ingrédients</button>' : '') +
    '<button type="button" class="b sm" data-act="swap" data-date="' + todayKey(new Date()) + '">' + ico('swap') + 'Changer</button></div></div>' +
    '<div class="pemo">' + img + '</div>';
}
function renderPlat(){ $('home-plat').innerHTML = platCardHtml(); $('cui-plat').innerHTML = platCardHtml(); }
function dayLabel(dk, long){
  var tk = todayKey(new Date()), tm = todayKey(addDays(new Date(), 1)), d = new Date(dk + 'T12:00:00');
  if(dk === tk) return long ? "Aujourd'hui" : 'Ce soir';
  if(dk === tm) return 'Demain';
  return long ? JOURS[d.getDay()] + ' ' + d.getDate() : JOURS[d.getDay()].slice(0, 3) + '. ' + d.getDate();
}
function renderMenu(){
  var menu = menuEff(), h = '', tk = todayKey(new Date());
  menu.slice(1, 3).forEach(function(mm){
    h += '<div class="mday' + (mm.date === tk ? ' on' : '') + '"><div class="md">' + dayLabel(mm.date) + '</div><div class="mn' + (mm.nom ? '' : ' v') + '">' + esc(mm.nom || 'À choisir') + '</div></div>';
  });
  $('h-menu').innerHTML = h;
  var c = '';
  menu.forEach(function(mm, i){
    var meta = [mm.temps, mm.source].filter(Boolean).join(' · ');
    c += '<div class="mrow' + (mm.date === tk ? ' today' : '') + '"><div class="md">' + dayLabel(mm.date, true) + '</div>' +
      '<div style="flex:1;min-width:0"><div class="mn' + (mm.nom ? '' : ' v') + '">' + esc(mm.nom || 'Rien de prévu') + '</div>' +
      (meta || mm.swapped ? '<div class="sub">' + esc(meta) + (mm.swapped ? (meta ? ' · ' : '') + 'changé à la main' : '') + '</div>' : '') + '</div>' +
      (mm.nom ? '<button type="button" class="ib" data-act="fav" data-i="' + i + '" aria-label="Favori" style="color:' + (isFav(mm) ? 'var(--rd)' : 'var(--tx3)') + '">' + ico('heart') + '</button>' : '') +
      (mm.url && /^https:\/\//.test(mm.url) ? '<a class="ib" href="' + esc(mm.url) + '" target="_blank" rel="noopener" aria-label="Recette">' + ico('book') + '</a>' : '') +
      '<button type="button" class="b sm ghost" data-act="swap" data-date="' + mm.date + '">' + (mm.nom ? 'Changer' : 'Choisir') + '</button></div>';
  });
  $('c-menu').innerHTML = c;
}
function agendaItems(){
  var x = jour || {}, ag = x.agenda || [], now = new Date(), tk = todayKey(now), tmk = todayKey(addDays(now, 1)), out = [];
  ag.forEach(function(a){ if(a.date === tk || a.date === tmk) out.push(a); });
  return out;
}
function datesList(){
  var today = new Date(); today.setHours(0, 0, 0, 0);
  return dates.map(function(x){ var d = new Date(x.date + 'T00:00:00'); return {id: x.id, titre: x.titre, date: x.date, n: Math.round((d - today) / 86400000)}; })
    .filter(function(x){ return !isNaN(x.n) && x.n >= 0; }).sort(function(a, b){ return a.n - b.n; });
}
var MABR = ['janv','févr','mars','avr','mai','juin','juil','août','sept','oct','nov','déc'];
function evDate(dk){ var d = new Date(dk + 'T12:00:00'); return JOURS[d.getDay()].slice(0, 3) + '<b>' + d.getDate() + '</b>' + MABR[d.getMonth()]; }
function renderEvents(){
  var rows = [];
  agendaItems().forEach(function(a){ rows.push('<div class="ev"><div class="d">' + evDate(a.date) + '</div><div class="x">' + esc(a.titre) + '<span>' + esc(a.heure || 'Toute la journée') + '</span></div></div>'); });
  datesList().forEach(function(x){ rows.push('<div class="ev"><div class="d">' + evDate(x.date) + '</div><div class="x c">' + esc(x.titre) + '<span>' + (x.n === 0 ? "C'est aujourd'hui 🎉" : x.n === 1 ? 'Demain' : 'Dans ' + x.n + ' jours') + '</span></div></div>'); });
  if(!rows.length){ $('h-events').innerHTML = '<div class="empty">' + (jour && jour.agenda_relie ? 'Rien aujourd\'hui ni demain' : 'Agenda pas encore relié') + '</div>'; return; }
  fitList($('h-events'), rows, function(k){ return '<div class="more" style="padding-left:0">+ ' + k + ' autre' + (k > 1 ? 's' : '') + ' ›</div>'; }, 4);
}
/* plannings de travail (calendriers iCloud, data.json) */
function fmtH(h){ if(!h) return ''; var p = h.split(':'); return parseInt(p[0], 10) + ' h' + (p[1] && p[1] !== '00' ? ' ' + p[1] : ''); }
function plage(x){ return fmtH(x.debut) + (x.fin ? '–' + fmtH(x.fin) : ''); }
function hc(h){ if(!h) return ''; var p = h.split(':'); return parseInt(p[0], 10) + 'h' + (p[1] && p[1] !== '00' ? p[1] : ''); }
function planningPill(){
  var pl = (jour && jour.planning) || [], now = new Date(), tk = todayKey(now), tmk = todayKey(addDays(now, 1)), hm0 = pad(now.getHours()) + ':' + pad(now.getMinutes()), byNom = {}, out = [];
  pl.forEach(function(x){ var k = (x.qui ? x.qui + ' · ' : '') + x.nom; (byNom[k] = byNom[k] || []).push(x); });
  for(var k in byNom){
    var l = byNom[k], cur = null, reste = l.filter(function(x){ return x.date === tk && (x.fin || '24:00') > hm0; });
    reste.forEach(function(x){ if(x.debut <= hm0) cur = x; });
    if(cur) out.push('<div class="info work" data-act="sheet" data-k="agenda"><b>💼 ' + esc(k) + '</b>en ce moment, jusqu\'à ' + fmtH(cur.fin) + (reste.length > 1 ? ' · puis ' + reste.slice(1).map(plage).join(', ') : '') + '</div>');
    else if(reste.length) out.push('<div class="info work" data-act="sheet" data-k="agenda"><b>💼 ' + esc(k) + ' aujourd\'hui</b>' + reste.map(plage).join(', ') + '</div>');
    else { var dem = l.filter(function(x){ return x.date === tmk; }); out.push('<div class="info work" data-act="sheet" data-k="agenda"><b>💼 ' + esc(k) + ' demain</b>' + (dem.length ? dem.map(plage).join(', ') : 'repos') + '</div>'); }
  }
  return out;
}
/* vue calendrier : 7 jours, un bloc par service ou rendez-vous */
function hmin(h){ var p = String(h || '').split(':'); return parseInt(p[0], 10) * 60 + (parseInt(p[1], 10) || 0); }
function calendarHtml(opt){
  opt = opt || {};
  var now = new Date(), days = [], blocks = {}, allday = {}, lo = 24 * 60, hi = 0, any = false;
  for(var i = 0; i < 7; i++){ var dk = todayKey(addDays(now, i)); days.push(dk); blocks[dk] = []; allday[dk] = []; }
  ((jour && jour.planning) || []).forEach(function(x){
    if(!blocks[x.date] || !x.debut) return;
    var a = hmin(x.debut), b = x.fin ? hmin(x.fin) : a + 60; if(b <= a) b = 24 * 60;
    blocks[x.date].push({a: a, b: b, k: 'work', t: (x.qui ? x.qui + ' · ' : '') + x.nom, h: hc(x.debut) + (x.fin ? '–' + hc(x.fin) : '')}); any = true;
  });
  if(!opt.travail) ((jour && jour.agenda) || []).forEach(function(x){
    if(!blocks[x.date]) return;
    if(!x.heure){ allday[x.date].push(x.titre); any = true; return; }
    var a = hmin(x.heure), b = x.fin ? hmin(x.fin) : a + 60; if(b <= a) b = Math.min(24 * 60, a + 60);
    blocks[x.date].push({a: a, b: b, k: 'rdv', t: x.titre, h: hc(x.heure) + (x.fin ? '–' + hc(x.fin) : '')}); any = true;
  });
  if(!any) return '<div class="empty">' + (opt.travail ? 'Aucun service ces 7 prochains jours.' : 'Rien de prévu ces 7 prochains jours.') + '</div>';
  days.forEach(function(d){ blocks[d].forEach(function(x){ lo = Math.min(lo, x.a); hi = Math.max(hi, x.b); }); });
  if(hi === 0){ lo = 9 * 60; hi = 18 * 60; }
  lo = Math.floor(lo / 60) * 60; hi = Math.ceil(hi / 60) * 60;
  if(hi - lo < 6 * 60) hi = Math.min(24 * 60, lo + 6 * 60);
  var H = opt.h || Math.max(300, Math.min(window.innerHeight - 300, 520)), px = H / (hi - lo), hasAll = days.some(function(d){ return allday[d].length; });
  var h = '<div class="calw"><div class="cal"><div class="cal-t"><div class="cal-h"></div>' + (hasAll ? '<div class="cal-a"></div>' : '') + '<div class="cal-g" style="height:' + H + 'px">';
  for(var m = lo; m <= hi; m += 60) h += '<div style="top:' + Math.round((m - lo) * px - 9) + 'px">' + (m / 60 % 24) + ' h</div>';
  h += '</div></div>';
  var tk = days[0], nowM = now.getHours() * 60 + now.getMinutes();
  days.forEach(function(d){
    var dt = new Date(d + 'T12:00:00');
    h += '<div class="cal-d' + (d === tk ? ' today' : '') + '"><div class="cal-h">' + JOURS[dt.getDay()].slice(0, 3) + '<b>' + dt.getDate() + '</b></div>';
    if(hasAll) h += '<div class="cal-a">' + allday[d].map(function(t){ return '<div>' + esc(t) + '</div>'; }).join('') + '</div>';
    h += '<div class="cal-g" style="height:' + H + 'px;background-size:100% ' + (60 * px).toFixed(2) + 'px">';
    blocks[d].forEach(function(x){
      var top = (x.a - lo) * px, ht = Math.max(22, (x.b - x.a) * px - 2), big = ht >= 58;
      h += '<div class="cal-b ' + x.k + '" style="top:' + top.toFixed(1) + 'px;height:' + ht.toFixed(1) + 'px">' + (big || x.k === 'rdv' ? '<b>' + esc(x.t) + '</b>' : '') + (x.k === 'rdv' && !big && ht < 44 ? '' : '<span>' + esc(x.h) + '</span>') + '</div>';
    });
    if(d === tk && nowM >= lo && nowM <= hi) h += '<div class="cal-now" style="top:' + ((nowM - lo) * px).toFixed(1) + 'px"></div>';
    h += '</div></div>';
  });
  return h + '</div></div>' + (opt.travail ? '' : '<div class="sub" style="margin-top:10px"><span class="lg work"></span>Planning de travail &nbsp; <span class="lg rdv"></span>Rendez-vous Antho&amp;Lisa</div>');
}
function renderPlanningPage(){
  var el = $('pl-cal'), pl = (jour && jour.planning) || [], tot = 0, n = 0, now = new Date(), tk = todayKey(now);
  pl.forEach(function(x){ if(x.debut && x.fin){ var d = hmin(x.fin) - hmin(x.debut); if(d > 0){ tot += d; n++; } } });
  $('pl-sum').textContent = pl.length ? n + ' service' + (n > 1 ? 's' : '') + ' sur 7 jours · ' + Math.floor(tot / 60) + ' h' + (tot % 60 ? ' ' + pad(tot % 60) : '') + ' de travail' : 'Services de travail des 7 prochains jours';
  var nxt = null, hm0 = pad(now.getHours()) + ':' + pad(now.getMinutes());
  pl.forEach(function(x){ if(!nxt && (x.date > tk || (x.date === tk && (x.fin || '24:00') > hm0))) nxt = x; });
  $('pl-next').innerHTML = nxt ? (nxt.date === tk && nxt.debut <= hm0 ? 'En ce moment · jusqu\'à ' + fmtH(nxt.fin) : 'Prochain service : <b>' + (nxt.date === tk ? "aujourd'hui" : dayLabel(nxt.date, true).toLowerCase()) + ' ' + plage(nxt) + '</b>') : '';
  var h = Math.max(260, el.clientHeight - 70);
  el.innerHTML = calendarHtml({travail: true, h: window.innerWidth >= 900 ? h : 460});
}
var infoState = {gel: '', alertes: [], vigi: null, offline: false};
function renderVigi(){
  var v = (jour && jour.vigilance) || {}, n = v.niveau;
  infoState.vigi = (n === 'jaune' || n === 'orange' || n === 'rouge') ? {n: n, txt: (v.phenomenes || []).join(', '), fin: v.fin || '', url: v.url && /^https:\/\//.test(v.url) ? v.url : 'https://vigilance.meteofrance.fr/'} : null;
  safe(renderInfos);
}
function loadJour(){
  fetch('data.json?t=' + Date.now()).then(function(r){ return r.json(); }).then(function(d){
    jour = d; if(curPage === 'planning') safe(renderPlanningPage); safe(renderPlat); safe(renderMenu); safe(renderEvents); safe(renderVigi);
    if(sheetKind === 'plat' || sheetKind === 'agenda') openSheet(sheetKind);
  }).catch(function(){ status('Données du jour indisponibles'); });
}

/* ---------- infos importantes (bandeau de l'accueil) ---------- */
function renderInfos(){
  var p = [], h = new Date().getHours();
  if(infoState.offline) p.push('<div class="info alert"><b>Hors ligne</b> vos modifications partiront au retour du réseau</div>');
  var v = infoState.vigi;
  if(v) p.push('<a class="info ' + (v.n === 'jaune' ? 'warn' : 'alert') + '" href="' + esc(v.url) + '" target="_blank" rel="noopener"><b>⚠︎ Vigilance ' + v.n + '</b>' + esc(v.txt) + (v.fin ? ' · jusqu\'à ' + esc(v.fin) : '') + '</a>');
  planningPill().forEach(function(x){ p.push(x); });
  if(infoState.gel) p.push('<div class="info cold" data-act="page" data-p="infos">' + infoState.gel + '</div>');
  infoState.alertes.forEach(function(a){ p.push('<div class="info warn" data-act="page" data-p="infos">' + a + '</div>'); });
  if(tmEnd || tmRing) p.push('<div class="info warn" data-act="sheet" data-k="minuteur"><b>⏱ Minuteur</b>' + (tmRing ? 'terminé, touchez pour arrêter' : '<span class="tmv0">' + tmLeft() + '</span>') + '</div>');
  var prio = todayItems('taches').filter(function(x){ return x.prio && !x.done; });
  if(prio.length) p.push('<div class="info prio" data-act="page" data-p="maison"><b>⚑ ' + (prio.length > 1 ? prio.length + ' tâches importantes' : 'Important') + '</b>' + esc(prio.length > 1 ? prio.map(function(x){ return x.name; }).slice(0, 2).join(', ') : prio[0].name) + '</div>');
  var ag = agendaItems(), tk = todayKey(new Date());
  ag.forEach(function(a){ if(a.date === tk && p.length < 6) p.push('<div class="info" data-act="sheet" data-k="agenda"><b>📅 ' + esc(a.heure || "Aujourd'hui") + '</b>' + esc(a.titre) + '</div>'); });
  datesList().forEach(function(x){ if(x.n <= 2 && p.length < 6) p.push('<div class="info" data-act="page" data-p="maison"><b>' + (x.n === 0 ? '🎉 Aujourd\'hui' : x.n === 1 ? '⏳ Demain' : '⏳ Après-demain') + '</b>' + esc(x.titre) + '</div>'); });
  if(h >= 16 && h < 21){ var pl = platDuJour(); if(pl.nom && (pl.ingredients || []).length && p.length < 6) p.push('<div class="info" data-act="sheet" data-k="plat"><b>🍽 Ce soir</b>' + esc(pl.nom) + '</div>'); }
  if(!p.length) p.push('<div class="info ok">✓ Rien de particulier à signaler' + ($('ms').textContent ? ' · ' + esc($('ms').textContent) : '') + '</div>');
  $('infos').innerHTML = p.join('');
}

/* ---------- raccourcis personnalisables (prévu pour accueillir plus tard d'autres modules, ex. domotique) ---------- */
var SHORTCUTS = {
  minuteur: {nom: 'Minuteur', ic: 'timer', k: 'k-or', sub: function(){ return tmRing ? 'Terminé !' : tmEnd ? tmLeft() : 'Lancer'; }, go: function(){ openSheet('minuteur'); }},
  carbu: {nom: 'Gazole', ic: 'fuel', k: 'k-gr', sub: function(){ var b = bestPrix('gazole_prix'); return b ? prix(b.gazole_prix) : 'Prix du jour'; }, go: function(){ goPage('infos'); }},
  meteo: {nom: 'Météo', ic: 'cloud', k: 'k-bl', sub: function(){ return $('mt').textContent !== '–' ? $('mt').textContent + ' ' + $('mi').textContent : 'Détails'; }, go: function(){ goPage('infos'); }},
  avenir: {nom: 'Dates', ic: 'gift', k: 'k-pu', sub: function(){ var l = datesList(); return l.length ? (l[0].n === 0 ? "Aujourd'hui" : 'J-' + l[0].n) : 'Ajouter'; }, go: function(){ goPage('maison'); }},
  wifi: {nom: 'Wi-Fi invités', ic: 'wifi', k: 'k-bl', sub: function(){ return config && config.wifi && config.wifi.ssid ? 'QR code' : 'À régler'; }, go: function(){ openSheet('wifi'); }},
  veille: {nom: 'Veille', ic: 'moon', k: 'k-pu', sub: function(){ return 'Écran noir'; }, go: function(){ setTimeout(goVeille, 50); }},
  menu: {nom: 'Ingrédients', ic: 'cart', k: 'k-or', sub: function(){ return 'Semaine'; }, go: function(){ openSheet('menu'); }},
  mot: {nom: 'Petit mot', ic: 'note', k: 'k-ye', sub: function(){ return 'Écrire'; }, go: function(){ openSheet('mot'); }},
  reglages: {nom: 'Réglages', ic: 'gear', k: '', sub: function(){ return 'Ouvrir'; }, go: function(){ goPage('reglages'); }}
};
var SC_DEFAUT = ['minuteur', 'carbu', 'meteo', 'avenir'];
function scList(){ var l = loadJSON('ecran-raccourcis', null); if(!l || l.length !== 4) l = SC_DEFAUT.slice(); return l.map(function(k){ return SHORTCUTS[k] ? k : 'reglages'; }); }
function renderShortcuts(){
  var h = '';
  scList().forEach(function(k){
    var s = SHORTCUTS[k], sub = '';
    try { sub = s.sub(); } catch(e){}
    h += '<div class="sc ' + s.k + (k === 'minuteur' && tmRing ? ' ring' : '') + '" data-act="sc" data-sc="' + k + '"><div class="ic">' + ico(s.ic) + '</div><div><b>' + esc(s.nom) + '</b><span' + (k === 'minuteur' ? ' class="tmsc"' : '') + '>' + esc(sub) + '</span></div></div>';
  });
  $('shortcuts').innerHTML = h;
}
window.EcranMaison = { /* point d'entrée pour de futurs modules (domotique…) : rien n'est simulé ici */
  addShortcut: function(key, def){ if(key && def && def.nom && typeof def.go === 'function'){ SHORTCUTS[key] = {nom: def.nom, ic: def.ic || 'home', k: def.k || '', sub: def.sub || function(){ return ''; }, go: def.go}; safe(renderShortcuts); } }
};

/* ---------- météo (Open-Meteo, sans clé) ---------- */
var WMO = {0:'Ciel dégagé',1:'Plutôt dégagé',2:'Quelques nuages',3:'Couvert',45:'Brouillard',48:'Brouillard',51:'Bruine',53:'Bruine',55:'Bruine',61:'Pluie faible',63:'Pluie',65:'Forte pluie',66:'Pluie verglaçante',67:'Pluie verglaçante',71:'Neige faible',73:'Neige',75:'Forte neige',80:'Averses',81:'Averses',82:'Fortes averses',95:'Orages',96:'Orages',99:'Orages'};
var geo = null, lastMeteo = null;
function icon(c, day){
  if(c === 0) return (day === false || (day === undefined && (new Date().getHours() >= 19 || new Date().getHours() < 7))) ? '🌙' : '☀️';
  if(c <= 2) return '⛅'; if(c === 3) return '☁️'; if(c <= 48) return '🌫️';
  if(c >= 71 && c <= 77) return '❄️'; if(c >= 95) return '⛈️'; return '🌧️';
}
function forecastHtml(m, n){
  var fh = '', dd = m.daily, wmin = 99, wmax = -99; n = Math.min(n, dd.time.length);
  for(var q = 0; q < n; q++){ wmin = Math.min(wmin, dd.temperature_2m_min[q]); wmax = Math.max(wmax, dd.temperature_2m_max[q]); }
  var span = Math.max(1, wmax - wmin);
  for(var k = 0; k < n; k++){
    var dt = new Date(dd.time[k] + 'T12:00:00'), lo = dd.temperature_2m_min[k], hi = dd.temperature_2m_max[k];
    var left = (lo - wmin) / span * 100, width = Math.max(6, (hi - lo) / span * 100);
    fh += '<div class="fd"><span class="dn">' + (k === 0 ? 'Auj.' : JOURS[dt.getDay()].slice(0, 3) + '.') + '</span><span class="i">' + icon(dd.weather_code[k], true) + '</span>' +
      '<span class="pp">' + (dd.precipitation_probability_max[k] >= 30 ? Math.round(dd.precipitation_probability_max[k]) + ' %' : '') + '</span>' +
      '<span class="lo">' + Math.round(lo) + '°</span><span class="rb"><i style="left:' + left.toFixed(1) + '%;width:' + width.toFixed(1) + '%"></i></span><span class="hi">' + Math.round(hi) + '°</span></div>';
  }
  return fh;
}
function loadMeteo(){
  var ville = config && config.ville;
  $('wcity').textContent = ville || 'Météo';
  if(!ville){ $('mt').textContent = '–'; $('ms').textContent = 'Ville à régler dans Réglages'; $('mc').textContent = ''; return; }
  var p = (geo && geo.ville === ville) ? Promise.resolve(geo) :
    fetch('https://geocoding-api.open-meteo.com/v1/search?count=10&language=fr&countryCode=FR&name=' + encodeURIComponent(ville))
      .then(function(r){ return r.json(); })
      .then(function(d){
        var res = (d.results || []).filter(function(x){ return x.country_code === 'FR'; });
        if(!res.length) throw new Error('ville');
        var nv = normTxt(ville), best = null;
        res.forEach(function(x){ if(!best && normTxt(x.name) === nv) best = x; });
        best = best || res[0];
        geo = {ville: ville, lat: best.latitude, lon: best.longitude, cp: (best.postcodes || [])[0] || '', dep: best.admin2 || ''};
        return geo;
      });
  p.then(function(g){
    $('wcity').textContent = ville + (g.cp ? ' (' + g.cp.slice(0, 2) + ')' : '');
    if(!carbu || Date.now() - carbu.at.getTime() > 1800000) setTimeout(function(){ safe(loadCarbu); }, 10);
    return fetch('https://api.open-meteo.com/v1/forecast?timezone=Europe%2FParis&forecast_days=7&latitude=' + g.lat + '&longitude=' + g.lon +
      '&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,weather_code&hourly=precipitation_probability,temperature_2m,weather_code,wind_gusts_10m,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max,precipitation_sum&wind_speed_unit=kmh');
  }).then(function(r){ return r.json(); }).then(function(m){
    lastMeteo = m;
    safe(function(){ renderGel(m); });
    safe(function(){ renderAlertes(m); });
    var t = Math.round(m.current.temperature_2m), code = m.current.weather_code;
    $('mt').textContent = t + '°';
    $('mi').textContent = icon(code);
    var resume = (WMO[code] || '') + ' · max ' + Math.round(m.daily.temperature_2m_max[0]) + '°';
    var h = new Date().getHours(), pluie = null, hp = m.hourly.precipitation_probability;
    for(var i = h; i < 24 && i < hp.length; i++){ if(hp[i] >= 50){ pluie = i; break; } }
    if(pluie !== null) resume = (pluie <= h ? 'Pluie en ce moment' : 'Pluie vers ' + pluie + ' h') + ' · max ' + Math.round(m.daily.temperature_2m_max[0]) + '°';
    $('ms').textContent = resume;
    $('mc').textContent = pluie !== null ? 'Prenez un parapluie' : (t <= 5 ? 'Couvrez-vous bien' : '');
    var c = m.current, d0 = m.daily;
    $('wst').innerHTML =
      '<div><b>' + Math.round(c.apparent_temperature) + '°</b>Ressenti</div>' +
      '<div><b>' + Math.round(d0.temperature_2m_min[0]) + '° / ' + Math.round(d0.temperature_2m_max[0]) + '°</b>Min / max</div>' +
      '<div><b>' + Math.round(c.wind_speed_10m) + ' km/h</b>Vent' + (c.wind_gusts_10m >= 40 ? ', rafales ' + Math.round(c.wind_gusts_10m) : '') + '</div>' +
      '<div><b>' + Math.round(d0.precipitation_probability_max[0] || 0) + ' %</b>Pluie' + (d0.precipitation_sum[0] >= 1 ? ' ' + Math.round(d0.precipitation_sum[0]) + ' mm' : '') + '</div>';
    $('fc').innerHTML = forecastHtml(m, 7);
    safe(renderInfos); safe(renderShortcuts); safe(function(){ applyTheme(); });
    if(curPage === 'infos') safe(renderMeteoDetail);
  }).catch(function(e){ $('ms').textContent = e && e.message === 'ville' ? 'Ville introuvable' : 'Météo indisponible pour le moment'; });
}
function meteoDetailHtml(){
  var m = lastMeteo; if(!m) return '<div class="empty">Chargement de la météo…</div>';
  var now = new Date().getHours(), d = m.daily, c = m.current, uv = Math.round(d.uv_index_max[0] || 0), h = '';
  h += '<div class="ch"><div class="ic">' + ico('cloud') + '</div><h3>' + esc($('wcity').textContent) + '</h3><span class="meta">mise à jour ' + pad(new Date().getHours()) + ':' + pad(new Date().getMinutes()) + '</span></div>';
  h += '<div class="wnow"><div><div class="wt" style="font-size:72px">' + Math.round(c.temperature_2m) + '°</div><div class="ws">' + esc($('ms').textContent) + '</div><div class="wc">' + esc($('mc').textContent) + '</div></div><div class="wi" style="font-size:70px">' + icon(c.weather_code) + '</div></div>';
  h += '<div class="stats big3">' + $('wst').innerHTML + '<div><b>' + Math.round(c.relative_humidity_2m) + ' %</b>Humidité</div><div><b>' + uv + '</b>UV ' + (uv <= 2 ? 'faible' : uv <= 5 ? 'modéré' : uv <= 7 ? 'élevé' : 'très élevé') + '</div><div><b>' + String(d.sunrise[0]).slice(11, 16) + ' · ' + String(d.sunset[0]).slice(11, 16) + '</b>Lever · coucher</div></div>';
  h += '<div class="shead" style="color:#9fb0cf">Heure par heure</div><div class="hscroll">';
  for(var j = now; j < now + 24 && j < m.hourly.temperature_2m.length; j++){
    var hr = j % 24;
    h += '<div><div>' + (j === now ? 'Maint.' : hr + ' h') + '</div><div class="hi">' + icon(m.hourly.weather_code[j], hr >= 7 && hr < 19) + '</div><div><b>' + Math.round(m.hourly.temperature_2m[j]) + '°</b></div><div class="pp">' + (m.hourly.precipitation_probability[j] >= 20 ? m.hourly.precipitation_probability[j] + ' %' : '') + '</div></div>';
  }
  h += '</div><div class="shead" style="color:#9fb0cf">7 jours</div>' + forecastHtml(m, 7);
  return h;
}
var meteoDone = null;
function renderMeteoDetail(){ if(lastMeteo && meteoDone === lastMeteo) return; meteoDone = lastMeteo; $('i-meteo').innerHTML = meteoDetailHtml(); }

/* ---------- carburant (prix-carburants.gouv.fr, données ouvertes) ---------- */
var carbu = null, CARBUS = [['gazole_prix', 'Gazole'], ['e10_prix', 'SP95-E10'], ['sp95_prix', 'SP95'], ['sp98_prix', 'SP98']];
function distKm(a, b, c, d){ var R = 6371, x = (c - a) * Math.PI / 180, y = (d - b) * Math.PI / 180, q = Math.sin(x / 2) * Math.sin(x / 2) + Math.cos(a * Math.PI / 180) * Math.cos(c * Math.PI / 180) * Math.sin(y / 2) * Math.sin(y / 2); return R * 2 * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q)); }
function prix(n){ return n.toFixed(3).replace('.', ',') + ' €'; }
function cap(s){ s = String(s || '').toLowerCase(); return s.replace(/(^|[\s-])\S/g, function(m){ return m.toUpperCase(); }); }
function bestPrix(f){ if(!carbu) return null; return carbu.stations.filter(function(x){ return x[f]; }).sort(function(a, b){ return a[f] - b[f]; })[0] || null; }
function carbuQuery(where, ds, offset){
  ds = ds || 'prix-des-carburants-en-france-flux-instantane-v2';
  return fetch('https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/' + ds + '/records?limit=100' + (offset ? '&offset=' + offset : '') + (where ? '&where=' + encodeURIComponent(where) : ''))
    .then(function(r){ return r.json(); })
    .then(function(d){ if(!d || !d.results) throw new Error((d && (d.message || d.error_code)) || 'réponse vide'); d.results.total = d.total_count; return d.results; });
}
var FUELMAP = {'gazole': 'gazole_prix', 'e10': 'e10_prix', 'sp95': 'sp95_prix', 'sp98': 'sp98_prix'};
function groupLong(r){
  if(!r.length || r[0].prix_nom == null) return r;
  var by = {}, out = [];
  r.forEach(function(x){
    var k = x.id || (x.adresse + x.ville);
    if(!by[k]){ by[k] = {id: x.id, adresse: x.adresse, ville: x.ville, geom: x.geom, latitude: x.latitude, longitude: x.longitude}; out.push(by[k]); }
    var f = FUELMAP[String(x.prix_nom).toLowerCase()];
    if(f) by[k][f] = x.prix_valeur;
  });
  return out;
}
var carbuDiag = '';
function numv(v){ if(v == null || v === '') return null; var n = parseFloat(String(v).replace(',', '.')); if(isNaN(n)) return null; if(n > 100) n = n / 1000; return n; }
function normStation(x){
  var cands = [], g = x.geom || x.geo_point || x.geo_point_2d || null;
  var add = function(la, lo){ la = parseFloat(la); lo = parseFloat(lo); if(isNaN(la) || isNaN(lo)) return; cands.push([la, lo]); cands.push([lo, la]); };
  if(g){ if(g.coordinates) add(g.coordinates[1], g.coordinates[0]); else add(g.lat, g.lon); }
  if(x.latitude != null){
    var la = parseFloat(x.latitude), lo = parseFloat(x.longitude);
    [1, 100000, 10000, 1000000].forEach(function(f){ add(la / f, lo / f); });
  }
  var best = null;
  cands.forEach(function(c){ if(Math.abs(c[0]) > 90 || Math.abs(c[1]) > 180) return; var d = distKm(geo.lat, geo.lon, c[0], c[1]); if(!best || d < best.d) best = {d: d, la: c[0], lo: c[1]}; });
  if(best && best.d < 80){ x.km = best.d; x.geom = {lat: best.la, lon: best.lo}; } else { x.km = null; x.geom = {}; }
  CARBUS.forEach(function(c){ x[c[0]] = numv(x[c[0]]); });
  return x;
}
function loadCarbu(){
  if(!geo){ $('carbul').innerHTML = '<div class="empty">Réglez votre ville dans Réglages</div>'; return; }
  if(!carbu) $('carbul').innerHTML = '<div class="empty">Recherche des stations…</div>';
  var pt = "geom'POINT(" + geo.lon + ' ' + geo.lat + ")'", diag = [];
  var norm = function(t){ return normTxt(t).replace(/[^a-z]/g, ''); };
  var keep = function(r){ return r.filter(function(x){ return x.km != null ? x.km <= 15 : norm(x.ville) === norm(geo.ville); }); };
  var dep = geo.cp ? geo.cp.slice(0, geo.cp.indexOf('97') === 0 ? 3 : 2) : '';
  var steps = [
    function(){ return carbuQuery('within_distance(geom, ' + pt + ', 10km)'); },
    function(){
      if(!dep) return Promise.resolve([]);
      var w = 'startswith(cp, "' + dep + '")';
      return carbuQuery(w).then(function(r1){
        var n = r1.total || 0, more = [];
        for(var off = 100; off < Math.min(n, 600); off += 100) more.push(carbuQuery(w, null, off));
        return Promise.all(more).then(function(rs){ var all = r1.slice(); rs.forEach(function(r){ all = all.concat(r); }); all.total = n; return all; });
      });
    },
    function(){ return carbuQuery('search(ville, "' + geo.ville + '")'); }
  ];
  var attempt = function(i){
    if(i >= steps.length) return Promise.resolve([]);
    return steps[i]().then(function(r){
      var total = r.total, rawN = r.length;
      r = keep(groupLong(r).map(normStation));
      diag.push('essai ' + (i + 1) + ' : ' + rawN + '/' + total + ' → ' + r.length);
      return r.length ? r : attempt(i + 1);
    }, function(e){ diag.push('essai ' + (i + 1) + ' : erreur ' + e.message); return attempt(i + 1); });
  };
  attempt(0).then(function(st){
    carbuDiag = diag.join(' · ');
    carbu = {stations: st, at: new Date()};
    $('carbuat').textContent = 'à ' + pad(carbu.at.getHours()) + ':' + pad(carbu.at.getMinutes());
    $('carbul').innerHTML = carbuHtml();
    safe(renderShortcuts);
  }).catch(function(e){ if(!carbu) $('carbul').innerHTML = '<div class="empty">Prix indisponibles pour le moment</div><div class="sub" style="font-size:13px;margin-top:6px">' + esc(String(e && e.message || e)) + '</div>'; });
}
function carbuHtml(){
  if(!carbu) return '<div class="empty">Chargement des prix…</div>';
  if(!carbu.stations.length) return '<div class="empty">Aucune station trouvée autour de ' + esc(geo.ville) + '</div><div class="sub" style="font-size:13px;margin-top:10px">Détail : ' + esc(carbuDiag) + '</div>';
  var h = '';
  CARBUS.forEach(function(c){
    var l = carbu.stations.filter(function(x){ return x[c[0]]; }).sort(function(a, b){ return a[c[0]] - b[c[0]]; }).slice(0, c[0] === 'gazole_prix' ? 4 : 3);
    if(!l.length) return;
    h += '<div class="shead">' + c[1] + '</div>';
    l.forEach(function(x){
      var g = x.geom || {};
      h += '<a class="crow" href="https://maps.apple.com/?q=' + encodeURIComponent(cap(x.adresse) + ', ' + cap(x.ville)) + (g.lat != null ? '&ll=' + g.lat + ',' + g.lon : '') + '" target="_blank" rel="noopener"><span class="cp">' + prix(x[c[0]]) + '</span><span style="flex:1;min-width:0">' + esc(cap(x.adresse)) + '<br><span class="sub">' + esc(cap(x.ville)) + (x.km != null ? ' · ' + x.km.toFixed(1).replace('.', ',') + ' km' : '') + '</span></span><span class="ib">' + ico('chev') + '</span></a>';
    });
  });
  return h + '<div class="sub" style="font-size:13px;margin-top:12px">Stations à moins de 15 km · prix-carburants.gouv.fr · touchez une station pour l\'itinéraire</div>';
}

/* ---------- Wi-Fi invités ---------- */
function wifiEsc(t){ return String(t || '').replace(/([\;,:"])/g, '\\$1'); }
function wifiQr(w, cell){
  if(!window.qrcode) return '';
  var q = qrcode(0, 'M');
  q.addData('WIFI:T:' + (w.type || 'WPA') + ';S:' + wifiEsc(w.ssid) + ';' + (w.type === 'nopass' ? '' : 'P:' + wifiEsc(w.pass) + ';') + ';');
  q.make();
  return q.createSvgTag(cell || 4, 0);
}

/* ---------- alertes gel, vent et pluie ---------- */
function renderGel(m){
  var now = new Date(), h = now.getHours(), ht = m.hourly.temperature_2m, msg = '';
  var minRange = function(a, b){ var mn = 99, at = -1; for(var i = a; i <= b && i < ht.length; i++){ if(ht[i] < mn){ mn = ht[i]; at = i; } } return {t: mn, h: at % 24}; };
  if(h >= 15){
    var n = minRange(h + 1, 24 + 9);
    if(n.t <= 0) msg = '<b>❄︎ Gel cette nuit</b>' + Math.round(n.t) + '° vers ' + n.h + ' h · couvrez le pare-brise';
    else if(n.t <= 3) msg = '<b>❄︎ Givre possible cette nuit</b>' + Math.round(n.t) + '° au plus bas';
  } else if(h >= 4 && h < 11){
    var mo = minRange(Math.max(0, h - 6), h);
    if(mo.t <= 0 || m.current.temperature_2m <= 1) msg = '<b>❄︎ Gel ce matin</b>' + Math.round(Math.min(mo.t, m.current.temperature_2m)) + '° · 5 min pour dégivrer';
    else if(mo.t <= 3) msg = '<b>❄︎ Givre possible ce matin</b>' + Math.round(mo.t) + '° au plus bas';
  }
  infoState.gel = msg;
}
function renderAlertes(m){
  var h = new Date().getHours(), H = m.hourly, g = H.wind_gusts_10m || [], p = H.precipitation || [];
  var mg = 0, mgh = -1, mp = 0, mph = -1;
  for(var i = h; i <= h + 6 && i < g.length; i++){ if(g[i] > mg){ mg = g[i]; mgh = i; } if(p[i] > mp){ mp = p[i]; mph = i; } }
  var msgs = [];
  if(mg >= 60) msgs.push('<b>💨 Rafales ' + Math.round(mg) + ' km/h</b>' + (mgh <= h ? 'en ce moment' : 'vers ' + (mgh % 24) + ' h'));
  if(mp >= 3) msgs.push('<b>🌧 Grosse averse</b>' + (mph <= h ? 'en ce moment' : 'vers ' + (mph % 24) + ' h') + ' · ' + Math.round(mp) + ' mm/h');
  infoState.alertes = msgs;
}

/* ---------- petit mot ---------- */
var mot = {};
function watchMot(){
  root.child('mot').on('value', function(s){
    mot = s.val() || {};
    var t = (mot.texte || '').trim(), el = $('mottx');
    el.textContent = t || 'Touchez pour laisser un mot';
    cls(el, 'vide', !t);
    if(mot.at && t){ var d = new Date(mot.at); $('motup').textContent = (mot.de ? mot.de + ' · ' : '') + (d.toDateString() === new Date().toDateString() ? '' : d.getDate() + '/' + (d.getMonth() + 1) + ' ') + hm(mot.at); } else $('motup').textContent = '';
  });
}
function saveMot(texte, de){
  var prev = {texte: mot.texte || '', at: mot.at || 0, de: mot.de || ''};
  var v = {texte: String(texte || '').slice(0, 500), at: Date.now(), de: de || ''};
  return root.child('mot').set(v).then(function(){
    if(!v.texte && prev.texte) toast('Mot effacé', function(){ root.child('mot').set(prev); });
    else toast('Mot enregistré');
  }, function(){ toast('Mot non enregistré, réessayez'); });
}

/* ---------- dates à venir ---------- */
var dates = [];
function renderDates(){
  var list = datesList(), h = '';
  list.forEach(function(x){
    h += '<div class="ev"><div class="d">' + evDate(x.date) + '</div><div class="x c">' + esc(x.titre) + '<span>' + (x.n === 0 ? "C'est aujourd'hui 🎉" : x.n === 1 ? 'Demain' : 'Dans ' + x.n + ' jours') + '</span></div>' +
      '<button type="button" class="ib" data-act="edit" data-col="dates" data-id="' + esc(x.id) + '" aria-label="Modifier">' + ico('edit') + '</button><button type="button" class="ib" data-act="del" data-col="dates" data-ids="' + esc(x.id) + '" aria-label="Supprimer">' + ico('trash') + '</button></div>';
  });
  $('dates').innerHTML = h || '<div class="empty">Ajoutez une date à attendre : vacances, anniversaire…</div>';
  safe(renderEvents); safe(renderInfos); safe(renderShortcuts);
}
function watchDates(){
  root.child('dates').on('value', function(s){
    var v = s.val() || {}; dates = []; raw.dates = v;
    for(var id in v){ if(v.hasOwnProperty(id) && v[id]) dates.push({id: id, titre: v[id].titre || '', date: v[id].date || ''}); }
    renderDates();
  });
}

/* ---------- minuteur ---------- */
var tmEnd = 0, tmInt = null, actx = null, tmRing = false;
function beep(){
  if(!actx) return;
  for(var i = 0; i < 3; i++){
    var o = actx.createOscillator(), g = actx.createGain(), t0 = actx.currentTime + i * 0.5;
    o.frequency.value = 880; o.connect(g); g.connect(actx.destination);
    g.gain.setValueAtTime(0.25, t0); g.gain.setValueAtTime(0, t0 + 0.3);
    o.start(t0); o.stop(t0 + 0.35);
  }
}
function tmLeft(){ var left = Math.max(0, Math.round((tmEnd - Date.now()) / 1000)); return pad(Math.floor(left / 60)) + ':' + pad(left % 60); }
function tmShow(){
  var txt = tmEnd ? tmLeft() : '00:00';
  $$('.tmv').forEach(function(el){ el.textContent = txt; });
  $$('.tmv0').forEach(function(el){ el.textContent = txt; });
  $$('.tmsc').forEach(function(el){ el.textContent = tmRing ? 'Terminé !' : tmEnd ? txt : 'Lancer'; });
  $$('.tmw').forEach(function(el){ cls(el, 'ring', tmRing); });
  if(tmEnd && Date.now() >= tmEnd){
    clearInterval(tmInt); tmInt = null; tmEnd = 0; tmRing = true;
    lastTouch = Date.now(); forced = false; wakeUntil = Date.now() + 300000;
    beep(); setTimeout(beep, 2000); setTimeout(beep, 4000);
    toast('⏱ Minuteur terminé');
    safe(renderInfos); safe(renderShortcuts); tmShow();
  }
}
function tmStart(min){
  try { if(!actx){ var AC = window.AudioContext || window.webkitAudioContext; if(AC) actx = new AC(); } if(actx && actx.resume) actx.resume(); } catch(err){}
  tmRing = false;
  tmEnd = (tmEnd && min === 1 ? tmEnd : Date.now()) + min * 60000;
  clearInterval(tmInt); tmInt = setInterval(tmShow, 1000); tmShow();
  safe(renderInfos); safe(renderShortcuts);
}
function tmStop(){ clearInterval(tmInt); tmInt = null; tmEnd = 0; tmRing = false; tmShow(); safe(renderInfos); safe(renderShortcuts); }
function tmButtons(){ return [5, 10, 15, 20, 30, 45, 60].map(function(m){ return '<button type="button" class="b sm" data-act="tm" data-min="' + m + '">' + (m === 60 ? '1 h' : m + ' min') + '</button>'; }).join('') + '<button type="button" class="b sm" data-act="tm" data-min="1">+1 min</button><button type="button" class="b sm danger" data-act="tmstop">Arrêter</button>'; }

/* ---------- vues détaillées (feuilles) ---------- */
var menuSel = {}, curIng = [], sheetKind = null;
function menuIngHtml(menu){
  var list = [], heads = {};
  menu.forEach(function(mm){ if(menuSel[mm.date] && (mm.ingredients || []).length){ heads[list.length] = mm.nom; list = list.concat(mm.ingredients); } });
  if(!list.length) return '<div class="empty" style="margin-top:14px">Cochez une ou plusieurs recettes pour voir leurs ingrédients.</div>';
  var h = ingHtml(list).replace('<div class="shead">Ingrédients</div>', '<div class="shead">Ingrédients des recettes cochées</div>');
  var idx = 0;
  h = h.replace(/<div class="row ing/g, function(m){ return (heads.hasOwnProperty(idx) ? '<div class="ihead">' + esc(heads[idx]) + '</div>' : '') + (idx++, m); });
  return h;
}
function ingHtml(ing){
  curIng = ing || [];
  if(!curIng.length) return '';
  var have = {}; lists.courses.forEach(function(x){ if(!x.done) have[normTxt(x.name)] = 1; });
  var h = '<div class="shead">Ingrédients</div><div id="ingl">';
  curIng.forEach(function(x, i){
    var staple = /^(sel|poivre|sel, poivre|huile|huile d'olive|eau)\b/i.test(x), deja = have[normTxt(x)], on = !staple && !deja;
    h += '<div class="row ing' + (on ? ' sel' : '') + '" data-ing="' + i + '">' + boxHtml(on) + '<span class="nm">' + esc(x) + '</span>' + (deja ? '<span class="tag r">déjà dans la liste</span>' : '') + '</div>';
  });
  return h + '</div><button class="b pri full" type="button" id="ingadd" style="margin-top:14px;height:52px">Ajouter</button><div class="sub" id="ingmsg" style="text-align:center;margin-top:8px">Décochez ce que vous avez déjà à la maison.</div>';
}
function closeSheet(){ sheetKind = null; show('sheet', false); document.body.style.overflow = ''; }
function openSheet(kind, opt){
  var t = '', h = '';
  if(kind === 'agenda'){
    t = 'À venir';
    h += (jour && jour.agenda_relie === false ? '<div class="empty">Agenda pas encore relié</div>' : '') + calendarHtml();
    var dl = datesList();
    h += '<div class="shead">Dates à attendre</div>' + (dl.length ? dl.map(function(x){ return '<div class="arow"><span class="ah" style="color:var(--or)">' + (x.n === 0 ? '🎉' : 'J-' + x.n) + '</span>' + esc(x.titre) + '</div>'; }).join('') : '<div class="empty">Aucune</div>');
    h += '<div style="margin-top:16px"><button type="button" class="b" data-act="page" data-p="maison">Gérer les dates</button></div>';
  } else if(kind === 'plat'){
    var p = platDuJour(), ing = p.ingredients || [];
    t = 'Ce soir';
    h = '<div class="splat">' + (p.image && /^https:\/\//.test(p.image) ? '<img alt="" src="' + esc(p.image) + '">' : platEmoji(p.nom)) + '</div><div class="pn" style="font-size:28px;margin-top:16px;-webkit-line-clamp:4">' + esc(p.nom || 'Pas encore de plat prévu') + '</div>';
    var bits = [p.temps, p.difficulte, p.portions ? p.portions + ' pers.' : '', p.source ? 'Trouvée sur ' + p.source : ''].filter(Boolean);
    if(bits.length) h += '<div class="sub" style="margin-top:6px">' + esc(bits.join(' · ')) + '</div>';
    h += '<div style="margin-top:16px">';
    if(p.url && /^https:\/\//.test(p.url)) h += '<a class="b pri" href="' + esc(p.url) + '" target="_blank" rel="noopener">' + ico('book') + 'Voir la recette</a>';
    if(p.nom) h += '<button class="b" type="button" data-act="favplat" style="color:' + (isFav(p) ? 'var(--rd)' : 'var(--tx)') + '">' + ico('heart') + (isFav(p) ? 'Dans vos favoris' : 'Favori') + '</button>';
    h += '<button class="b" type="button" data-act="swap" data-date="' + todayKey(new Date()) + '">' + ico('swap') + 'Changer</button></div>';
    h += ingHtml(ing);
  } else if(kind === 'menu'){
    var menu = menuEff();
    t = 'Ingrédients de la semaine';
    h = '<div class="sub" style="margin-bottom:6px">Cochez les recettes que vous allez cuisiner, puis ajoutez leurs ingrédients aux courses.</div>';
    menu.forEach(function(mm, i){
      if(!mm.nom) return;
      var on = !!menuSel[mm.date], has = (mm.ingredients || []).length;
      h += '<div class="mrow' + (on ? ' msel' : '') + '" data-mi="' + i + '"' + (has ? '' : ' style="opacity:.5"') + '>' + boxHtml(on) + '<div class="md">' + dayLabel(mm.date, true) + '</div><div style="flex:1;min-width:0"><div class="mn">' + esc(mm.nom) + '</div>' + (has ? '' : '<div class="sub">pas de liste d\'ingrédients</div>') + '</div></div>';
    });
    h += '<div id="mingr">' + menuIngHtml(menu) + '</div>';
  } else if(kind === 'wifi'){
    var w = (config && config.wifi) || {};
    t = 'Wi-Fi invités';
    h = w.ssid ? '<div class="qr">' + wifiQr(w, 8) + '</div><div style="font-size:22px;font-weight:700;text-align:center">' + esc(w.ssid) + '</div>' + (w.type !== 'nopass' ? '<div style="font-size:18px;text-align:center;margin-top:8px">Mot de passe : <b>' + esc(w.pass) + '</b></div>' : '') + '<div class="sub" style="text-align:center;margin-top:12px">Ouvrez l\'appareil photo du téléphone et visez le code pour vous connecter.</div>' : '<div class="empty">Ajoutez votre Wi-Fi dans Réglages.</div><div style="margin-top:14px"><button type="button" class="b pri" data-act="page" data-p="reglages">Ouvrir les réglages</button></div>';
  } else if(kind === 'mot'){
    t = 'Petit mot';
    var mm2 = membres();
    h = '<textarea id="mot2" class="smot" placeholder="Laissez un mot…">' + esc(mot.texte || '') + '</textarea>' +
      '<div class="frow" style="margin-top:12px"><select class="fld" id="motde" style="width:auto;flex:1"><option value="">Sans signature</option>' + mm2.map(function(x){ return '<option' + (mot.de === x ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('') + '</select>' +
      (mot.texte ? '<button class="b danger" type="button" data-act="motdel">' + ico('trash') + 'Effacer</button>' : '') + '<button class="b pri" type="button" data-act="motok">Enregistrer</button></div>';
  } else if(kind === 'minuteur'){
    t = 'Minuteur';
    h = '<div class="card tmw" style="box-shadow:none"><div class="tmv">' + (tmEnd ? tmLeft() : '00:00') + '</div><div class="tpr">' + tmButtons() + '</div></div>';
  } else if(kind === 'edit'){
    t = 'Modifier'; h = editHtml(opt);
  } else if(kind === 'swap'){
    t = 'Changer le plat'; h = swapHtml(opt);
  } else return;
  var first = sheetKind !== kind;
  sheetKind = kind;
  cls($('sheetpanel'), 'wide', kind === 'agenda');
  $('sheettitle').textContent = t;
  $('sheetbody').innerHTML = h;
  if(first){ show('sheet', true); $('sheet').scrollTop = 0; }
  if(kind === 'plat' || kind === 'menu') bindIng();
  if(kind === 'menu') bindMenuSel();
  if(kind === 'minuteur') tmShow();
  if(kind === 'mot'){ var ta = $('mot2'); if(ta) setTimeout(function(){ try { ta.focus(); } catch(e){} }, 300); }
}
function bindIng(){
  if(!$('ingadd')) return;
  var ingl = $('ingl'), ingRefresh = function(){
    var n = ingl.querySelectorAll('.row.sel').length;
    $('ingadd').textContent = n ? 'Ajouter ' + n + ' ingrédient' + (n > 1 ? 's' : '') + ' aux courses' : 'Rien à ajouter';
  };
  ingRefresh();
  ingl.addEventListener('click', function(e){
    var r = e.target; while(r && r !== ingl && !(r.getAttribute && r.getAttribute('data-ing'))) r = r.parentNode;
    if(!r || r === ingl) return;
    var on = r.className.indexOf(' sel') < 0;
    cls(r, 'sel', on);
    r.querySelector('.box').innerHTML = on ? ico('tick') : '';
    ingRefresh();
  });
  $('ingadd').addEventListener('click', function(){
    var ing = curIng, rows = ingl.querySelectorAll('.row.sel'), up = {}, n = 0, now = Date.now(), have = {};
    lists.courses.forEach(function(x){ if(!x.done) have[normTxt(x.name)] = 1; });
    for(var i = 0; i < rows.length; i++){
      var name = ing[parseInt(rows[i].getAttribute('data-ing'), 10)];
      if(name && !have[normTxt(name)]){ have[normTxt(name)] = 1; up[root.child('courses').push().key] = {name: String(name).slice(0, 80), done: false, at: now + i}; n++; }
    }
    if(!n){ $('ingmsg').textContent = 'Tout est déjà dans la liste'; return; }
    root.child('courses').update(up).then(function(){
      $('ingmsg').textContent = n + ' ingrédient' + (n > 1 ? 's ajoutés' : ' ajouté') + ' à la liste de courses ✓';
      toast(n + ' ingrédient' + (n > 1 ? 's ajoutés' : ' ajouté') + ' aux courses', function(){ var del = {}; for(var k in up) del[k] = null; root.child('courses').update(del); });
      for(var j = 0; j < rows.length; j++){ cls(rows[j], 'sel', false); rows[j].querySelector('.box').innerHTML = ''; }
      ingRefresh();
    }, function(){ $('ingmsg').textContent = 'Ajout impossible pour le moment'; });
  });
}
function bindMenuSel(){
  var menu = menuEff();
  $$('#sheetbody .mrow[data-mi]').forEach(function(row){
    row.addEventListener('click', function(){
      var mm = menu[parseInt(this.getAttribute('data-mi'), 10)]; if(!mm || !(mm.ingredients || []).length) return;
      menuSel[mm.date] = !menuSel[mm.date];
      cls(this, 'msel', menuSel[mm.date]);
      this.querySelector('.box').innerHTML = menuSel[mm.date] ? ico('tick') : '';
      $('mingr').innerHTML = menuIngHtml(menu);
      bindIng();
    });
  });
}
/* changer un plat : favori, plat écrit à la main, ou retour au plat prévu */
function swapHtml(dk){
  var mm = null; menuEff().forEach(function(x){ if(x.date === dk) mm = x; });
  mm = mm || {date: dk, nom: ''};
  var fl = []; for(var fk in favs) if(favs[fk] && favs[fk].nom) fl.push(favs[fk]);
  fl.sort(function(a, b){ return normTxt(a.nom).localeCompare(normTxt(b.nom)); });
  var h = '<div class="sub">' + dayLabel(dk, true) + (mm.nom ? ' · prévu : ' + esc(mm.nom) : ' · rien de prévu') + '</div>';
  h += '<form class="frow" data-form="platlibre" data-date="' + dk + '" style="margin-top:14px"><input class="fld" placeholder="Écrire un plat (ex. crêpes)" autocomplete="off"><button class="b pri" type="submit">Valider</button></form>';
  h += '<div class="shead">Vos favoris ❤️</div>';
  if(!fl.length) h += '<div class="empty">Pas encore de favoris : touchez le cœur à côté d\'un plat que vous avez aimé.</div>';
  fl.forEach(function(f){ h += '<div class="arow pick" data-act="pick" data-date="' + dk + '" data-k="' + esc(favKey(f.nom)) + '">' + esc(f.nom) + '<div class="sub">' + esc([f.temps, f.source].filter(Boolean).join(' · ')) + '</div></div>'; });
  if(mm.swapped) h += '<div class="arow pick" data-act="pick" data-date="' + dk + '" data-k="__reset" style="color:var(--bl)">↺ Remettre le plat prévu' + (mm.prevu ? ' (' + esc(mm.prevu) + ')' : '') + '</div>';
  return h;
}
/* modifier un article, une tâche ou une date */
function editHtml(o){
  var v = (raw[o.col] || {})[o.id]; if(!v) return '<div class="empty">Élément introuvable (déjà supprimé ?)</div>';
  var h = '<form data-form="edit" data-col="' + o.col + '" data-id="' + esc(o.id) + '">';
  if(o.col === 'dates'){
    h += '<label class="lb">Titre</label><input class="fld" name="t" value="' + esc(v.titre) + '"><label class="lb">Date</label><input class="fld" name="d" type="date" value="' + esc(v.date) + '">';
  } else {
    h += '<label class="lb">' + (o.col === 'courses' ? 'Article' : 'Tâche') + '</label><input class="fld" name="t" value="' + esc(v.name) + '" autocomplete="off">';
    if(o.col === 'taches'){
      h += '<label class="lb">Qui s\'en occupe ?</label><select class="fld" name="qui">' + quiOptions(v.qui || '') + '</select>';
      h += '<label class="lb">Répétition</label><select class="fld" name="rep">' + repOptions(typeof v.rep === 'number' ? v.rep : '') + '</select>';
      h += '<label class="lb">Priorité</label><select class="fld" name="prio"><option value="0">Normale</option><option value="1"' + (v.prio ? ' selected' : '') + '>⚑ Importante (rappelée sur l\'accueil)</option></select>';
    }
  }
  h += '<div class="frow" style="margin-top:18px"><button type="button" class="b danger" data-act="del" data-col="' + o.col + '" data-ids="' + esc(o.id) + '">' + ico('trash') + 'Supprimer</button><span style="flex:1"></span><button type="submit" class="b pri">Enregistrer</button></div></form>';
  return h;
}
function quiOptions(sel, court){ return '<option value="">' + (court ? 'Tous' : 'Tout le monde') + '</option>' + membres().map(function(m){ return '<option' + (m === sel ? ' selected' : '') + '>' + esc(m) + '</option>'; }).join(''); }
function repOptions(sel){ return '<option value="">Une fois</option>' + [1, 2, 3, 4, 5, 6, 0].map(function(d){ return '<option value="' + d + '"' + (sel === d ? ' selected' : '') + '>Chaque ' + JOURS[d].toLowerCase() + '</option>'; }).join(''); }

/* ---------- suppression avec possibilité d'annuler ---------- */
function removeItems(col, ids, label){
  var back = {}, up = {}, n = 0;
  ids.forEach(function(id){ var v = (raw[col] || {})[id]; if(v){ back[id] = v; up[id] = null; n++; } });
  if(!n) return;
  root.child(col).update(up).then(function(){
    toast(label || (n > 1 ? n + ' éléments supprimés' : 'Supprimé'), function(){ root.child(col).update(back).then(function(){ toast('Restauré'); }); });
  }, function(){ toast('Suppression impossible pour le moment'); });
}

/* ---------- interactions (un seul gestionnaire pour toute l'app) ---------- */
function onClick(e){
  var t = e.target, el = null;
  while(t && t !== document){
    var tag = t.tagName;
    if(tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'LABEL') return;
    if(tag === 'A' && t.href && t.getAttribute('href') !== '#') return;
    if(t.getAttribute && (t.getAttribute('data-act') || t.getAttribute('data-chip') || (t.getAttribute('data-id') && t.getAttribute('data-col') && !t.getAttribute('data-act')))){ el = t; break; }
    if(tag === 'FORM') return;
    t = t.parentNode;
  }
  if(!el) return;
  var a = el.getAttribute('data-act');
  if(el.getAttribute('data-chip')){ addCourse(el.getAttribute('data-chip')); return; }
  if(!a){ /* cocher / décocher */
    var name = el.getAttribute('data-col'), id = el.getAttribute('data-id'), it = null;
    if(!lists[name]) return;
    lists[name].forEach(function(x){ if(x.id === id) it = x; });
    if(!it) return;
    var ids = (el.getAttribute('data-ids') || id).split(','), up = {}, nd = !it.done, now = Date.now();
    ids.forEach(function(x){ up[x + '/done'] = nd; up[x + '/doneAt'] = now; });
    root.child(name).update(up).catch(function(){ toast('Modification impossible pour le moment'); });
    return;
  }
  e.preventDefault();
  if(a === 'page'){ closeSheet(); goPage(el.getAttribute('data-p')); }
  else if(a === 'sheet') openSheet(el.getAttribute('data-k'));
  else if(a === 'veille') setTimeout(goVeille, 50);
  else if(a === 'sc'){ var s = SHORTCUTS[el.getAttribute('data-sc')]; if(s) s.go(); }
  else if(a === 'tm') tmStart(parseInt(el.getAttribute('data-min'), 10));
  else if(a === 'tmstop') tmStop();
  else if(a === 'edit') openSheet('edit', {col: el.getAttribute('data-col'), id: el.getAttribute('data-id')});
  else if(a === 'del'){ var c = el.getAttribute('data-col'); removeItems(c, el.getAttribute('data-ids').split(','), c === 'courses' ? 'Article supprimé' : c === 'taches' ? 'Tâche supprimée' : 'Date supprimée'); if(sheetKind === 'edit') closeSheet(); }
  else if(a === 'clear'){
    var col = el.getAttribute('data-col'), ids2 = lists[col].filter(function(x){ return x.done && x.rep == null; }).map(function(x){ return x.id; });
    if(!ids2.length){ toast(col === 'courses' ? 'Aucun article coché' : 'Aucune tâche faite à retirer'); return; }
    var nn = ids2.length, pl = nn > 1 ? 's' : '';
    removeItems(col, ids2, col === 'courses' ? nn + ' article' + pl + ' retiré' + pl : nn + ' tâche' + pl + ' retirée' + pl);
  }
  else if(a === 'swap') openSheet('swap', el.getAttribute('data-date'));
  else if(a === 'pick'){
    var dk = el.getAttribute('data-date'), k = el.getAttribute('data-k');
    var p = k === '__reset' ? root.child('menuOverride/' + dk).remove() : favs[k] ? root.child('menuOverride/' + dk).set(favs[k]) : null;
    if(p) p.then(function(){ closeSheet(); toast(k === '__reset' ? 'Plat prévu remis' : 'Plat changé'); }, function(){ toast('Changement impossible pour le moment'); });
  }
  else if(a === 'fav'){ var mm = menuEff()[parseInt(el.getAttribute('data-i'), 10)]; toggleFav(mm); }
  else if(a === 'favplat'){ toggleFav(platDuJour()); setTimeout(function(){ if(sheetKind === 'plat') openSheet('plat'); }, 400); }
  else if(a === 'motok'){ saveMot($('mot2').value, $('motde').value).then(closeSheet); }
  else if(a === 'motdel'){ saveMot('', '').then(closeSheet); }
  else if(a === 'tglprio'){ cls(el, 'on', el.className.indexOf(' on') < 0); }
}
function onSubmit(e){
  var f = e.target, kind = f.getAttribute && f.getAttribute('data-form');
  if(!kind) return;
  e.preventDefault();
  var inp = f.querySelector('input'), v = inp ? inp.value.trim() : '';
  if(kind === 'courses'){ if(!v) return; inp.value = ''; addCourse(v); if(f.className.indexOf('qadd') >= 0) inp.blur(); return; }
  if(kind === 'taches'){
    if(!v) return;
    var dup = lists.taches.filter(function(x){ return !x.done && normTxt(x.name) === normTxt(v); });
    if(dup.length){ toast('Cette tâche est déjà dans la liste'); return; }
    var data = {name: v.slice(0, 80), done: false, at: Date.now()}, q = f.querySelector('[name=qui]').value, r = f.querySelector('[name=rep]').value, pb = f.querySelector('.tgl');
    if(q) data.qui = q; if(r !== '') data.rep = parseInt(r, 10); if(pb.className.indexOf(' on') >= 0) data.prio = true;
    inp.value = ''; cls(pb, 'on', false);
    root.child('taches').push(data).then(function(){ toast('Tâche ajoutée' + (data.rep != null && data.rep !== new Date().getDay() ? ' · apparaîtra le ' + JOURS[data.rep].toLowerCase() : '')); }, function(){ toast('Ajout impossible pour le moment'); });
    return;
  }
  if(kind === 'dates'){
    var d = f.querySelector('[name=d]').value;
    if(!v || !/^\d{4}-\d{2}-\d{2}$/.test(d)){ toast('Indiquez un titre et une date'); return; }
    inp.value = ''; f.querySelector('[name=d]').value = '';
    root.child('dates').push({titre: v.slice(0, 60), date: d}).then(function(){ toast('Date ajoutée'); }, function(){ toast('Date non enregistrée'); });
    return;
  }
  if(kind === 'platlibre'){
    if(!v) return;
    root.child('menuOverride/' + f.getAttribute('data-date')).set({nom: v.slice(0, 80), libre: true, at: Date.now()}).then(function(){ closeSheet(); toast('Plat enregistré'); }, function(){ toast('Enregistrement impossible'); });
    return;
  }
  if(kind === 'edit'){
    var col = f.getAttribute('data-col'), id = f.getAttribute('data-id'), up = {};
    if(!v){ toast('Le nom ne peut pas être vide'); return; }
    if(col === 'dates'){ var dd = f.querySelector('[name=d]').value; if(!/^\d{4}-\d{2}-\d{2}$/.test(dd)){ toast('Date invalide'); return; } up = {titre: v.slice(0, 60), date: dd}; }
    else {
      up.name = v.slice(0, 80);
      if(col === 'taches'){ var rv = f.querySelector('[name=rep]').value; up.qui = f.querySelector('[name=qui]').value || null; up.rep = rv === '' ? null : parseInt(rv, 10); up.prio = f.querySelector('[name=prio]').value === '1' ? true : null; }
    }
    root.child(col + '/' + id).update(up).then(function(){ closeSheet(); toast('Modifié'); }, function(){ toast('Modification impossible'); });
  }
}

/* ---------- réglages ---------- */
var HOURS = ''; for(var hh = 0; hh < 24; hh++) HOURS += '<option value="' + hh + '">' + hh + ' h</option>';
function fillSettings(){
  $('cv').value = config && config.ville ? config.ville : '';
  $('cmem').value = membres().join(', ');
  var wf = (config && config.wifi) || {}; $('wssid').value = wf.ssid || ''; $('wpass').value = wf.pass || ''; $('wtype').value = wf.type || 'WPA';
  var c = veilleCfg(); $('vdelay').value = String(c.delay); $('vnuit').value = c.nuit ? '1' : '0'; $('vdeb').value = String(c.debut); $('vfin').value = String(c.fin);
  var l = scList(), opts = function(sel){ var o = ''; for(var k in SHORTCUTS) o += '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + esc(SHORTCUTS[k].nom) + '</option>'; return o; };
  $('scsel').innerHTML = l.map(function(k, i){ return '<label class="lb">Tuile ' + (i + 1) + '</label><select class="fld" data-sci="' + i + '">' + opts(k) + '</select>'; }).join('');
  $$('#scsel select').forEach(function(s){ s.addEventListener('change', function(){ var cur = scList(); cur[parseInt(s.getAttribute('data-sci'), 10)] = s.value; store('ecran-raccourcis', JSON.stringify(cur)); renderShortcuts(); toast('Raccourcis enregistrés sur cet appareil'); }); });
  $('vgrand').value = grand() ? '1' : '0';
  $('vtheme').value = themeMode();
  var bk = loadJSON('ecran-sauvegarde', null);
  $('bkinfo').textContent = bk && bk.at ? 'Dernière copie automatique sur cet appareil : ' + new Date(bk.at).toLocaleDateString('fr-FR') + ' à ' + hm(bk.at) + '.' : 'Pas encore de copie automatique sur cet appareil.';
}
function bindSettings(){
  $('vdeb').innerHTML = HOURS; $('vfin').innerHTML = HOURS;
  var saveV = function(){
    var c = {delay: parseInt($('vdelay').value, 10), nuit: $('vnuit').value === '1', debut: parseInt($('vdeb').value, 10), fin: parseInt($('vfin').value, 10)};
    toast(store('ecran-veille', JSON.stringify(c)) ? 'Veille enregistrée sur cet appareil' : 'Impossible d\'enregistrer sur cet appareil');
  };
  ['vdelay', 'vnuit', 'vdeb', 'vfin'].forEach(function(id){ $(id).addEventListener('change', saveV); });
  $('wsave').addEventListener('click', function(){
    var w = {ssid: $('wssid').value.trim().slice(0, 64), pass: $('wpass').value.slice(0, 64), type: $('wtype').value};
    root.child('config/wifi').set(w).then(function(){ $('wmsg').textContent = 'Enregistré ✓'; }, function(){ $('wmsg').textContent = 'Impossible d\'enregistrer'; });
  });
  $('csave').addEventListener('click', function(){
    var v = $('cv').value.trim().slice(0, 60), m = $('cmem').value.split(',').map(function(x){ return x.trim().slice(0, 24); }).filter(Boolean).slice(0, 6);
    var up = {membres: m.length ? m : null}; if(v) up.ville = v;
    root.child('config').update(up).then(function(){ $('cmsg').textContent = 'Enregistré ✓'; }, function(){ $('cmsg').textContent = 'Impossible d\'enregistrer'; });
  });
  $('vgrand').addEventListener('change', function(){ store('ecran-grand', this.value === '1' ? '1' : null); applyGrand(); setTimeout(function(){ safe(renderHomeCourses); safe(renderHomeTaches); safe(renderEvents); }, 50); toast('Taille du texte enregistrée sur cet appareil'); });
  $('vtheme').addEventListener('change', function(){ store('ecran-theme', this.value === 'auto' ? null : this.value); applyTheme(); toast('Couleur du fond enregistrée sur cet appareil'); });
  $('bkdl').addEventListener('click', exportData);
  $('bkrest').addEventListener('click', function(){
    var bk = loadJSON('ecran-sauvegarde', null);
    if(!bk || !bk.data){ $('bkmsg').textContent = 'Aucune copie automatique sur cet appareil.'; return; }
    restoreData(bk.data, 'la copie automatique du ' + new Date(bk.at).toLocaleDateString('fr-FR') + ' à ' + hm(bk.at));
  });
  $('bkfile').addEventListener('click', function(){ $('bkin').click(); });
  $('bkin').addEventListener('change', function(){
    var f = this.files && this.files[0]; if(!f) return;
    var r = new FileReader();
    r.onload = function(){ try { var d = JSON.parse(r.result); restoreData(d.data || d, 'le fichier « ' + f.name + ' »'); } catch(e){ $('bkmsg').textContent = 'Ce fichier n\'est pas une sauvegarde valide.'; } };
    r.readAsText(f); this.value = '';
  });
}

/* ---------- sauvegarde et restauration ---------- */
function pickData(v){ var o = {}; DATA_KEYS.forEach(function(k){ if(v && v[k] != null) o[k] = v[k]; }); return o; }
function autoBackup(){
  if(!root) return;
  var bk = loadJSON('ecran-sauvegarde', null);
  if(bk && bk.at && Date.now() - bk.at < 6 * 3600000) return;
  root.once('value').then(function(s){
    var d = pickData(s.val());
    if(!d.courses && !d.taches && !d.config) return;   /* ne jamais écraser une copie avec des données vides */
    if(bk && bk.at && new Date(bk.at).toDateString() !== new Date().toDateString()) store('ecran-sauvegarde-veille', JSON.stringify(bk));
    store('ecran-sauvegarde', JSON.stringify({at: Date.now(), data: d}));
  }).catch(function(){});
}
function exportData(){
  root.once('value').then(function(s){
    var d = {app: 'ecran-maison', at: Date.now(), data: pickData(s.val())}, txt = JSON.stringify(d, null, 2);
    var name = 'maison-sauvegarde-' + todayKey(new Date()) + '.json';
    var a0 = document.createElement('a');
    if(!('download' in a0)){
      /* iPad sous iOS 12 : pas de téléchargement possible depuis une app web, on affiche le texte à copier */
      $('sheettitle').textContent = 'Sauvegarde'; sheetKind = 'backup';
      $('sheetbody').innerHTML = '<div class="sub">Touchez le texte, « Tout sélectionner », « Copier », puis collez-le dans une note ou un e-mail. Pour restaurer plus tard : enregistrez-le dans Fichiers sous le nom ' + esc(name) + '.</div><textarea class="fld" readonly style="height:300px;margin-top:12px;font-size:13px;font-family:Menlo,monospace;padding:12px">' + esc(txt) + '</textarea>';
      show('sheet', true);
      return;
    }
    try {
      var blob = new Blob([txt], {type: 'application/json'}), url = URL.createObjectURL(blob), a = a0;
      a.href = url; a.download = name; document.body.appendChild(a); a.click();
      setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(url); }, 2000);
      $('bkmsg').textContent = 'Sauvegarde créée : ' + name + ' (sur iPad, utilisez « Partager » puis « Enregistrer dans Fichiers »).';
    } catch(e){ $('bkmsg').textContent = 'Téléchargement impossible sur cet appareil.'; }
  }, function(){ $('bkmsg').textContent = 'Lecture des données impossible (hors ligne ?)'; });
}
function restoreData(d, label){
  d = pickData(d);
  if(!d.courses && !d.taches && !d.config && !d.mot && !d.dates){ $('bkmsg').textContent = 'Cette sauvegarde ne contient pas de données.'; return; }
  if(!window.confirm('Remplacer les données actuelles par ' + label + ' ?\nLes données actuelles seront gardées en copie sur cet appareil.')) return;
  root.once('value').then(function(s){
    store('ecran-avant-restauration', JSON.stringify({at: Date.now(), data: pickData(s.val())}));
    var up = {}; DATA_KEYS.forEach(function(k){ if(d[k] != null) up[k] = d[k]; });
    return root.update(up);
  }).then(function(){ $('bkmsg').textContent = 'Données restaurées ✓'; toast('Données restaurées'); }, function(){ $('bkmsg').textContent = 'Restauration impossible pour le moment'; });
}

/* ---------- démarrage ---------- */
var started = false, offT = null;
function start(code){
  root = firebase.database().ref('foyers/' + code);
  root.child('config').once('value').then(function(s){
    store(KEY, code);
    show('login', false); show('app', true);
    config = s.val();
    if(started) return; started = true;
    applyGrand();
    fillIcons(document);
    $('tpr1').innerHTML = tmButtons();
    $$('select[name=rep]').forEach(function(x){ x.innerHTML = repOptions(''); });
    $$('select[name=qui]').forEach(function(x){ x.innerHTML = quiOptions('', true); });
    tick(); setInterval(tick, 5000);
    document.addEventListener('click', onClick);
    document.addEventListener('submit', onSubmit, true);
    $('sheetclose').addEventListener('click', closeSheet);
    $('sheet').addEventListener('click', function(e){ if(e.target === $('sheet')) closeSheet(); });
    $('toastu').addEventListener('click', function(){ var f = undoFn; undoFn = null; $('toast').className = ''; if(f) f(); });
    bindSettings();
    safe(renderShortcuts); safe(renderPlat); safe(renderMenu);
    watchList('courses'); watchList('taches'); watchMot(); watchDates();
    root.child('freq').on('value', function(s){ freq = s.val() || {}; safe(renderChips); safe(renderHomeCourses); });
    var refreshMenu = function(){ safe(renderPlat); safe(renderMenu); safe(renderInfos); if(sheetKind === 'plat') openSheet('plat'); };
    root.child('favoris').on('value', function(s){ favs = s.val() || {}; refreshMenu(); });
    root.child('menuOverride').on('value', function(s){ overrides = s.val() || {}; refreshMenu(); });
    root.child('config').on('value', function(s){
      var old = config && config.ville; config = s.val();
      if(!lastMeteo || (config && config.ville) !== old) safe(loadMeteo);
      tick(); safe(renderShortcuts);
      $$('select[name=qui]').forEach(function(x){ x.innerHTML = quiOptions('', true); });
    });
    firebase.database().ref('.info/connected').on('value', function(s){
      clearTimeout(offT);
      if(s.val() === true){ if(infoState.offline){ infoState.offline = false; safe(renderInfos); toast('Connexion rétablie, tout est synchronisé'); } status('Synchronisé'); }
      else offT = setTimeout(function(){ infoState.offline = true; status('Hors ligne'); safe(renderInfos); }, 8000);
    });
    loadJour(); safe(loadMeteo);
    var rz = null; window.addEventListener('resize', function(){ clearTimeout(rz); rz = setTimeout(function(){ safe(renderHomeCourses); safe(renderHomeTaches); safe(renderEvents); }, 200); });
    setInterval(loadJour, 30 * 60000);
    setInterval(function(){ safe(loadMeteo); }, 10 * 60000);
    setTimeout(autoBackup, 15000); setInterval(autoBackup, 3600000);
    var lastDay = new Date().getDate();
    setInterval(function(){ if(new Date().getDate() !== lastDay){ lastDay = new Date().getDate(); loadJour(); renderDates(); safe(loadMeteo); resetRecurring('taches'); renderList('taches'); } }, 60000);
  }, function(){
    root = null;
    if(started) return;
    if(load(KEY) === code){
      /* code déjà connu de cet appareil : on le garde et on réessaie (coupure réseau passagère) */
      show('app', false); show('login', true);
      $('lc').value = code;
      $('lmsg').textContent = 'Connexion impossible pour le moment, nouvel essai dans 15 secondes…';
      clearTimeout(retryT); retryT = setTimeout(function(){ start(code); }, 15000);
    } else {
      show('app', false); show('login', true);
      $('lmsg').textContent = 'Code incorrect ou pas de connexion';
    }
  });
}
var retryT = null;

firebase.initializeApp(FIREBASE);
var fromHash = (location.hash || '').replace(/^#/, '');
if(/^maison-[a-z0-9]+$/.test(fromHash)) store(KEY, fromHash);
var saved = load(KEY);
$('lf').addEventListener('submit', function(e){
  e.preventDefault();
  var c = $('lc').value.trim().toLowerCase();
  if(!c) return;
  $('lmsg').textContent = 'Vérification…';
  start(c);
});
if(saved) start(saved); else show('login', true);
})();
