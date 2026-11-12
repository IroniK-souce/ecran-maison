(function(){
'use strict';
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
var root = null, lists = {courses: [], taches: []}, budget = null, config = null, jour = null;

function $(id){ return document.getElementById(id); }
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
function status(t){ $('st').textContent = t; }
function pad(n){ return (n < 10 ? '0' : '') + n; }
function show(id, on){ var el = $(id); el.className = on ? el.className.replace(/\s*hide/g, '') : (el.className.indexOf('hide') >= 0 ? el.className : el.className + ' hide'); }
var JOURS = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
var MOIS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
function monthKey(d){ return d.getFullYear() + '-' + pad(d.getMonth() + 1); }
function euro(n){ return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' €'; }
function num(v){ var n = parseFloat(String(v).replace(',', '.').replace(/[^\d.\-]/g, '')); return isNaN(n) ? null : n; }
function store(k, v){ try { if(v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch(e){} }
function load(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }

/* ---------- horloge ---------- */
function tick(){
  var d = new Date();
  $('clk').textContent = pad(d.getHours()) + ':' + pad(d.getMinutes());
  $('date').textContent = JOURS[d.getDay()] + ' ' + d.getDate() + ' ' + MOIS[d.getMonth()];
  $('calday').textContent = JOURS[d.getDay()];
  $('calnum').textContent = d.getDate();
}

/* ---------- listes ---------- */
function renderList(name){
  var items = lists[name], el = $('l-' + name);
  $('n' + name).textContent = items.filter(function(x){ return !x.done; }).length;
  if(!items.length){ el.innerHTML = '<div class="empty">' + (name === 'courses' ? 'Rien à acheter' : 'Rien à faire') + '</div>'; return; }
  var h = '';
  for(var i = 0; i < items.length; i++){
    var it = items[i];
    h += '<div class="row' + (it.done ? ' done' : '') + '" data-col="' + name + '" data-id="' + esc(it.id) + '"><span class="box">' + (it.done ? '✓' : '') + '</span>' + esc(it.name) + '</div>';
  }
  el.innerHTML = h;
}
function watchList(name){
  root.child(name).on('value', function(snap){
    var arr = [], v = snap.val() || {};
    for(var id in v){ if(v.hasOwnProperty(id) && v[id]) arr.push({id: id, name: v[id].name || '', done: !!v[id].done, at: v[id].at || 0}); }
    arr.sort(function(a, b){ return a.at - b.at; });
    lists[name] = arr; renderList(name); status('Synchronisé');
  }, function(){ status('Accès refusé · vérifie le code'); });
}

/* ---------- budget ---------- */
function renderBudget(){
  var b = budget || {}, now = new Date(), mk = monthKey(now);
  var total = b.total || 0, dep = (b.mois === mk) ? (b.depense || 0) : 0;
  $('bt').textContent = 'Budget ' + MOIS[now.getMonth()];
  if(!total){ $('brest').textContent = '–'; $('bsub').textContent = 'Touche « Modifier » pour fixer le budget'; $('bbar').style.width = '0'; return; }
  var rest = total - dep;
  $('brest').textContent = euro(rest);
  $('bsub').textContent = 'restants sur ' + euro(total) + ' · ' + euro(dep) + ' dépensés';
  $('bbar').style.width = Math.min(100, Math.max(0, dep / total * 100)) + '%';
  $('bbar').className = rest < 0 ? 'over' : '';
}
function writeBudget(fields){
  var b = budget || {}, mk = monthKey(new Date());
  var data = {total: b.total || 0, mois: mk, depense: (b.mois === mk ? (b.depense || 0) : 0)};
  for(var k in fields) data[k] = fields[k];
  root.child('budget').set(data).catch(function(){ status('Budget non enregistré'); });
}

/* ---------- agenda + plat (data.json mis à jour chaque jour) ---------- */
function todayKey(d){ return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function renderJour(){
  var x = jour || {}, ag = x.agenda || [], h = '', now = new Date();
  var tk = todayKey(now), tm = new Date(now.getTime() + 86400000), tmk = todayKey(tm);
  var shown = 0;
  for(var i = 0; i < ag.length && shown < 6; i++){
    var a = ag[i], lab;
    if(a.date === tk) lab = a.heure || 'Journée';
    else if(a.date === tmk) lab = 'Demain ' + (a.heure || '');
    else continue;
    h += '<div class="row" style="cursor:default"><span class="when' + (a.date === tmk ? ' dem' : '') + '">' + esc(lab) + '</span>' + esc(a.titre) + '</div>';
    shown++;
  }
  if(!h) h = '<div class="empty">' + (x.agenda_relie ? 'Aucun rendez-vous' : 'Agenda pas encore relié') + '</div>';
  $('agenda').innerHTML = h;
  $('agup').textContent = x.maj ? ('maj ' + x.maj) : '';
  var p = x.plat;
  if(p && p.nom){
    $('pn').textContent = p.nom;
    var bits = []; if(p.temps) bits.push(p.temps); if(p.difficulte) bits.push(p.difficulte); if(p.source) bits.push('Trouvée sur ' + p.source);
    $('pd').textContent = bits.join(' · ');
    if(p.url && /^https:\/\//.test(p.url)){ $('purl').href = p.url; $('purl').style.display = ''; } else { $('purl').style.display = 'none'; }
    if(p.image){ $('pimg').innerHTML = '<img alt="" src="' + esc(p.image) + '">'; } else { $('pimg').innerHTML = '🍲'; }
  }
}
function loadJour(){
  fetch('data.json?t=' + Date.now()).then(function(r){ return r.json(); }).then(function(d){ jour = d; renderJour(); }).catch(function(){});
}

/* ---------- météo (Open-Meteo, sans clé) ---------- */
var WMO = {0:'Ciel dégagé',1:'Plutôt dégagé',2:'Quelques nuages',3:'Couvert',45:'Brouillard',48:'Brouillard',51:'Bruine',53:'Bruine',55:'Bruine',61:'Pluie faible',63:'Pluie',65:'Forte pluie',66:'Pluie verglaçante',67:'Pluie verglaçante',71:'Neige faible',73:'Neige',75:'Forte neige',80:'Averses',81:'Averses',82:'Fortes averses',95:'Orages',96:'Orages',99:'Orages'};
var geo = null;
function icon(c){
  if(c === 0) return new Date().getHours() >= 19 || new Date().getHours() < 7 ? '🌙' : '☀️';
  if(c <= 2) return '⛅'; if(c === 3) return '☁️'; if(c <= 48) return '🌫️';
  if(c >= 71 && c <= 77) return '❄️'; if(c >= 95) return '⛈️'; return '🌧️';
}
function loadMeteo(){
  var ville = config && config.ville;
  $('wcity').textContent = ville || 'Météo';
  if(!ville){ $('mt').textContent = '–'; $('ms').textContent = 'Ville à régler'; $('mc').textContent = ''; return; }
  var p = (geo && geo.ville === ville) ? Promise.resolve(geo) :
    fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&language=fr&name=' + encodeURIComponent(ville))
      .then(function(r){ return r.json(); })
      .then(function(d){ if(!d.results || !d.results.length) throw new Error('ville'); geo = {ville: ville, lat: d.results[0].latitude, lon: d.results[0].longitude}; return geo; });
  p.then(function(g){
    return fetch('https://api.open-meteo.com/v1/forecast?timezone=Europe%2FParis&forecast_days=1&latitude=' + g.lat + '&longitude=' + g.lon +
      '&current=temperature_2m,weather_code&hourly=precipitation_probability&daily=temperature_2m_max,precipitation_probability_max');
  }).then(function(r){ return r.json(); }).then(function(m){
    var t = Math.round(m.current.temperature_2m), code = m.current.weather_code;
    $('mt').textContent = t + '°';
    $('mi').textContent = icon(code);
    var resume = (WMO[code] || '') + ' · max ' + Math.round(m.daily.temperature_2m_max[0]) + '°';
    var h = new Date().getHours(), pluie = null, hp = m.hourly.precipitation_probability;
    for(var i = h; i < hp.length; i++){ if(hp[i] >= 50){ pluie = i; break; } }
    if(pluie !== null) resume = (pluie <= h ? 'Pluie en ce moment' : 'Pluie vers ' + pluie + 'h') + ' · max ' + Math.round(m.daily.temperature_2m_max[0]) + '°';
    $('ms').textContent = resume;
    $('mc').textContent = pluie !== null ? 'Prends un parapluie' : (t <= 5 ? 'Couvre-toi bien' : '');
  }).catch(function(e){ $('ms').textContent = e && e.message === 'ville' ? 'Ville introuvable' : 'Météo indisponible'; });
}

/* ---------- événements ---------- */
function bind(){
  document.addEventListener('click', function(e){
    var t = e.target, row = null;
    while(t && t !== document){ if(t.getAttribute && t.getAttribute('data-id')){ row = t; break; } t = t.parentNode; }
    if(!row) return;
    var name = row.getAttribute('data-col'), id = row.getAttribute('data-id'), it = null;
    for(var i = 0; i < lists[name].length; i++) if(lists[name][i].id === id) it = lists[name][i];
    if(it) root.child(name + '/' + id + '/done').set(!it.done).catch(function(){ status('Modification impossible'); });
  });
  var forms = document.querySelectorAll('form.add');
  for(var fi = 0; fi < forms.length; fi++){
    (function(f){
      f.addEventListener('submit', function(e){
        e.preventDefault();
        var inp = f.querySelector('input'), v = inp.value.trim(), name = f.getAttribute('data-col');
        if(!v) return;
        inp.value = '';
        root.child(name).push({name: v.slice(0, 80), done: false, at: Date.now()}).catch(function(){ status('Ajout impossible'); });
      });
    })(forms[fi]);
  }
  var clears = document.querySelectorAll('[data-clear]');
  for(var ci = 0; ci < clears.length; ci++){
    (function(b){
      b.addEventListener('click', function(){
        var name = b.getAttribute('data-clear'), up = {};
        lists[name].forEach(function(x){ if(x.done) up[x.id] = null; });
        root.child(name).update(up).catch(function(){ status('Suppression impossible'); });
      });
    })(clears[ci]);
  }
  $('bdep').addEventListener('submit', function(e){
    e.preventDefault();
    var n = num($('bdepv').value); if(n == null || n === 0) return;
    $('bdepv').value = '';
    var b = budget || {}, mk = monthKey(new Date());
    writeBudget({depense: Math.round(((b.mois === mk ? (b.depense || 0) : 0) + n) * 100) / 100});
  });
  $('bset').addEventListener('click', function(){
    show('btot', $('btot').className.indexOf('hide') >= 0);
    $('btotv').value = budget && budget.total ? budget.total : '';
  });
  $('btot').addEventListener('submit', function(e){
    e.preventDefault();
    var n = num($('btotv').value); if(n == null || n <= 0) return;
    show('btot', false);
    writeBudget({total: Math.round(n)});
  });
  $('sopen').addEventListener('click', function(){ show('settings', true); $('cv').value = config && config.ville ? config.ville : ''; $('cmsg').textContent = ''; });
  $('cclose').addEventListener('click', function(){ show('settings', false); });
  $('csave').addEventListener('click', function(){
    var v = $('cv').value.trim().slice(0, 60);
    $('cmsg').textContent = 'Enregistrement…';
    root.child('config').update({ville: v}).then(function(){ $('cmsg').textContent = 'Enregistré'; }, function(){ $('cmsg').textContent = 'Impossible d\'enregistrer'; });
  });
}

/* ---------- démarrage ---------- */
function start(code){
  root = firebase.database().ref('foyers/' + code);
  root.child('config').once('value').then(function(s){
    store(KEY, code);
    show('login', false); show('app', true);
    config = s.val();
    tick(); setInterval(tick, 15000);
    bind();
    watchList('courses'); watchList('taches');
    root.child('budget').on('value', function(s){ budget = s.val(); renderBudget(); });
    root.child('config').on('value', function(s){ config = s.val(); loadMeteo(); });
    renderBudget(); loadJour();
    setInterval(loadJour, 30 * 60000);
    setInterval(loadMeteo, 30 * 60000);
    var lastDay = new Date().getDate();
    setInterval(function(){ if(new Date().getDate() !== lastDay){ lastDay = new Date().getDate(); loadJour(); renderBudget(); } }, 60000);
  }, function(){
    store(KEY, null); root = null;
    show('app', false); show('login', true);
    $('lmsg').textContent = 'Code incorrect';
  });
}

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
