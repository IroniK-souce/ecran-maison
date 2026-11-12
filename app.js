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
var root = null, lists = {courses: [], taches: []}, config = null, jour = null;

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
  nightCheck(d);
  $('clk').textContent = pad(d.getHours()) + ':' + pad(d.getMinutes());
  $('date').textContent = JOURS[d.getDay()] + ' ' + d.getDate() + ' ' + MOIS[d.getMonth()];
  $('calday').textContent = JOURS[d.getDay()];
  $('calnum').textContent = d.getDate();
}

/* ---------- veille, mode nuit, retour à l'accueil, rechargement nocturne ---------- */
var lastTouch = Date.now(), wakeUntil = 0, loadedAt = Date.now(), forced = false, lastDrift = 0;
function veilleCfg(){
  var c = null; try { c = JSON.parse(localStorage.getItem('ecran-veille') || 'null'); } catch(e){}
  c = c || {};
  return {delay: typeof c.delay === 'number' ? c.delay : 10, nuit: c.nuit !== false, debut: typeof c.debut === 'number' ? c.debut : 22, fin: typeof c.fin === 'number' ? c.fin : 7};
}
function isSleeping(){ return document.body.className.indexOf('night') >= 0; }
function nightCheck(d){
  var cfg = veilleCfg(), h = d.getHours(), now = Date.now();
  var inNight = cfg.debut > cfg.fin ? (h >= cfg.debut || h < cfg.fin) : (h >= cfg.debut && h < cfg.fin);
  var sleep = forced || (cfg.delay > 0 && now - lastTouch > cfg.delay * 60000) || (cfg.nuit && inNight && now > wakeUntil);
  var cls = document.body.className.replace(/\s*night/g, '');
  document.body.className = sleep ? cls + ' night' : cls;
  if(sleep){
    $('vinfo').innerHTML = esc($('mt').textContent) + ' ' + esc($('mi').textContent) + (jour && jour.plat && jour.plat.nom ? '<br><span>Ce soir : ' + esc(jour.plat.nom) + '</span>' : '');
    if(now - lastDrift > 60000){
      lastDrift = now;
      var x = Math.round(Math.random() * 80 - 40), y = Math.round(Math.random() * 60 - 30);
      $('lockbox').style.webkitTransform = $('lockbox').style.transform = 'translate(' + x + 'px,' + y + 'px)';
    }
  } else { $('lockbox').style.webkitTransform = $('lockbox').style.transform = ''; }
  if(now - lastTouch > 60000){
    var a = document.activeElement, typing = a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT');
    if(!typing){
      if(sheetKind) closeSheet();
      if((window.pageYOffset || document.documentElement.scrollTop) > 0) window.scrollTo(0, 0);
    }
  }
  if(h === 3 && d.getMinutes() >= 30 && d.getMinutes() < 45 && now - loadedAt > 3600000 && !sheetKind){
    location.replace(location.pathname + '?r=' + now + location.hash);
  }
}
function touched(e){
  var wasAsleep = isSleeping();
  lastTouch = Date.now(); forced = false;
  if(wasAsleep){
    try { loadMeteo(); } catch(err){}
    wakeUntil = Date.now() + 120000;
    nightCheck(new Date());
    if(e && e.type !== 'keydown'){ e.preventDefault(); e.stopPropagation(); }
  }
}
document.addEventListener('touchstart', touched, {capture: true, passive: false});
document.addEventListener('mousedown', touched, true);
document.addEventListener('keydown', touched, true);
function goVeille(){ forced = true; if(sheetKind) closeSheet(); window.scrollTo(0, 0); nightCheck(new Date()); }

/* ---------- listes ---------- */
function renderList(name){
  var today = new Date().getDay();
  var items = lists[name].filter(function(x){ return x.rep == null || x.rep === today; }), el = $('l-' + name);
  $('n' + name).textContent = items.filter(function(x){ return !x.done; }).length;
  if(!items.length){ el.innerHTML = '<div class="empty">' + (name === 'courses' ? 'Rien à acheter' : 'Rien à faire') + '</div>'; return; }
  var h = '';
  for(var i = 0; i < items.length; i++){
    var it = items[i];
    h += '<div class="row' + (it.done ? ' done' : '') + '" data-col="' + name + '" data-id="' + esc(it.id) + '"><span class="box">' + (it.done ? '✓' : '') + '</span>' + esc(it.name) + '</div>';
  }
  el.innerHTML = h;
  if(sheetKind === name) openSheet(name);
}
function watchList(name){
  root.child(name).on('value', function(snap){
    var arr = [], v = snap.val() || {};
    for(var id in v){ if(v.hasOwnProperty(id) && v[id]) arr.push({id: id, name: v[id].name || '', done: !!v[id].done, at: v[id].at || 0, rep: (typeof v[id].rep === 'number' ? v[id].rep : null), doneAt: v[id].doneAt || 0}); }
    arr.sort(function(a, b){ return a.at - b.at; });
    lists[name] = arr; resetRecurring(name); renderList(name); status('Synchronisé');
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
/* plat du soir : l'entrée du menu du jour si elle existe, sinon le champ plat */
function platDuJour(){
  var tk = todayKey(new Date()), m = (jour && jour.menu) || [];
  for(var i = 0; i < m.length; i++) if(m[i].date === tk) return m[i];
  return (jour && jour.plat) || {};
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
  var p = platDuJour();
  if(p && p.nom){
    $('pn').textContent = p.nom;
    var bits = []; if(p.temps) bits.push(p.temps); if(p.difficulte) bits.push(p.difficulte); if(p.source) bits.push('Trouvée sur ' + p.source);
    $('pd').textContent = bits.join(' · ');
    $('pingb').style.display = (p.ingredients && p.ingredients.length) ? '' : 'none';
    if(p.url && /^https:\/\//.test(p.url)){ $('purl').href = p.url; $('purl').style.display = ''; } else { $('purl').style.display = 'none'; }
    if(p.image){ $('pimg').innerHTML = '<img alt="" src="' + esc(p.image) + '">'; } else { $('pimg').innerHTML = '🍲'; }
  }
}
function renderMenu(){
  var menu = (jour && jour.menu) || [], tk = todayKey(new Date()), h = '';
  menu.forEach(function(mm){
    if(mm.date < tk) return;
    var d = new Date(mm.date + 'T12:00:00');
    h += '<div class="mt' + (mm.date === tk ? ' on' : '') + '"><div class="md">' + (mm.date === tk ? "Ce soir" : JOURS[d.getDay()].slice(0, 3) + '. ' + d.getDate()) + '</div><div class="mn">' + esc(mm.nom) + '</div></div>';
  });
  $('menul').innerHTML = h || '<div class="empty">Le menu de la semaine arrive à la prochaine mise à jour du matin.</div>';
}
function renderVigi(){
  var v = (jour && jour.vigilance) || {}, n = v.niveau, el = $('vigi');
  if(n === 'orange' || n === 'rouge'){
    el.className = 'vigi ' + n;
    el.innerHTML = '<b>⚠︎ Vigilance ' + n + '</b> ' + esc((v.phenomenes || []).join(', ')) + (v.dep ? ' · ' + esc(v.dep) : '') + (v.fin ? '<span> jusqu\'à ' + esc(v.fin) + '</span>' : '');
    el.href = v.url && /^https:\/\//.test(v.url) ? v.url : 'https://vigilance.meteofrance.fr/';
  } else el.className = 'vigi hide';
  var j = $('vigij');
  if(n === 'jaune'){ j.textContent = '⚠︎ Vigilance jaune : ' + (v.phenomenes || []).join(', '); j.className = 'vigij'; } else j.className = 'vigij hide';
}
function loadJour(){
  fetch('data.json?t=' + Date.now()).then(function(r){ return r.json(); }).then(function(d){ jour = d; renderJour(); renderMenu(); renderVigi(); }).catch(function(){});
}

/* ---------- météo (Open-Meteo, sans clé) ---------- */
var WMO = {0:'Ciel dégagé',1:'Plutôt dégagé',2:'Quelques nuages',3:'Couvert',45:'Brouillard',48:'Brouillard',51:'Bruine',53:'Bruine',55:'Bruine',61:'Pluie faible',63:'Pluie',65:'Forte pluie',66:'Pluie verglaçante',67:'Pluie verglaçante',71:'Neige faible',73:'Neige',75:'Forte neige',80:'Averses',81:'Averses',82:'Fortes averses',95:'Orages',96:'Orages',99:'Orages'};
var geo = null, lastMeteo = null;
function icon(c, day){
  if(c === 0) return (day === false || (day === undefined && (new Date().getHours() >= 19 || new Date().getHours() < 7))) ? '🌙' : '☀️';
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
      .then(function(d){ if(!d.results || !d.results.length) throw new Error('ville'); geo = {ville: ville, lat: d.results[0].latitude, lon: d.results[0].longitude, cp: (d.results[0].postcodes || [])[0] || ''}; return geo; });
  p.then(function(g){
    if(!carbu || Date.now() - carbu.at.getTime() > 1800000) setTimeout(function(){ try { loadCarbu(); } catch(e){ $('carbul').innerHTML = '<div class="empty">Erreur : ' + esc(e.message) + '</div>'; } }, 10);
    return fetch('https://api.open-meteo.com/v1/forecast?timezone=Europe%2FParis&forecast_days=7&latitude=' + g.lat + '&longitude=' + g.lon +
      '&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,weather_code&hourly=precipitation_probability,temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max,precipitation_sum&wind_speed_unit=kmh');
  }).then(function(r){ return r.json(); }).then(function(m){
    lastMeteo = m;
    try { renderGel(m); } catch(e){}
    var t = Math.round(m.current.temperature_2m), code = m.current.weather_code;
    $('mt').textContent = t + '°';
    $('mi').textContent = icon(code);
    var resume = (WMO[code] || '') + ' · max ' + Math.round(m.daily.temperature_2m_max[0]) + '°';
    var h = new Date().getHours(), pluie = null, hp = m.hourly.precipitation_probability;
    for(var i = h; i < 24 && i < hp.length; i++){ if(hp[i] >= 50){ pluie = i; break; } }
    if(pluie !== null) resume = (pluie <= h ? 'Pluie en ce moment' : 'Pluie vers ' + pluie + 'h') + ' · max ' + Math.round(m.daily.temperature_2m_max[0]) + '°';
    $('ms').textContent = resume;
    $('mc').textContent = pluie !== null ? 'Prends un parapluie' : (t <= 5 ? 'Couvre-toi bien' : '');
    var c = m.current, d0 = m.daily, uv = Math.round(d0.uv_index_max[0] || 0);
    $('wst').innerHTML =
      '<div><b>' + Math.round(c.apparent_temperature) + '°</b>Ressenti</div>' +
      '<div><b>' + Math.round(d0.temperature_2m_min[0]) + '° / ' + Math.round(d0.temperature_2m_max[0]) + '°</b>Min / max</div>' +
      '<div><b>' + Math.round(c.wind_speed_10m) + ' km/h</b>Vent' + (c.wind_gusts_10m >= 40 ? ', rafales ' + Math.round(c.wind_gusts_10m) : '') + '</div>' +
      '<div><b>' + Math.round(d0.precipitation_probability_max[0] || 0) + ' %</b>Pluie' + (d0.precipitation_sum[0] >= 1 ? ' · ' + Math.round(d0.precipitation_sum[0]) + ' mm' : '') + '</div>' +
      '<div><b>' + Math.round(c.relative_humidity_2m) + ' %</b>Humidité</div>' +
      '<div><b>' + uv + '</b>UV ' + (uv <= 2 ? 'faible' : uv <= 5 ? 'modéré' : uv <= 7 ? 'élevé' : 'très élevé') + '</div>';
    var hh = '', ht = m.hourly.temperature_2m, hc = m.hourly.weather_code;
    for(var j = h + 1; j <= h + 5 && j < ht.length; j++){
      hh += '<div>' + (j % 24) + 'h<div class="hi">' + icon(hc[j], (j % 24) >= 7 && (j % 24) < 19) + '</div>' + Math.round(ht[j]) + '°</div>';
    }
    $('whr').innerHTML = hh;
    var fh = '', dd = m.daily, n = Math.min(7, dd.time.length), wmin = 99, wmax = -99;
    for(var q = 0; q < n; q++){ wmin = Math.min(wmin, dd.temperature_2m_min[q]); wmax = Math.max(wmax, dd.temperature_2m_max[q]); }
    var span = Math.max(1, wmax - wmin);
    for(var k = 0; k < n; k++){
      var dt = new Date(dd.time[k] + 'T12:00:00'), lo = dd.temperature_2m_min[k], hi = dd.temperature_2m_max[k];
      var left = (lo - wmin) / span * 100, width = Math.max(6, (hi - lo) / span * 100);
      fh += '<div class="fd"><span class="dn">' + (k === 0 ? 'Auj.' : JOURS[dt.getDay()].slice(0, 3) + '.') + '</span><span class="i">' + icon(dd.weather_code[k], true) + '</span>' +
        '<span class="pp">' + (dd.precipitation_probability_max[k] >= 30 ? Math.round(dd.precipitation_probability_max[k]) + ' %' : '') + '</span>' +
        '<span class="lo">' + Math.round(lo) + '°</span><span class="rb"><i style="left:' + left.toFixed(1) + '%;width:' + width.toFixed(1) + '%"></i></span><span class="hi">' + Math.round(hi) + '°</span></div>';
    }
    $('fc').innerHTML = fh;
    $('sun').textContent = '☀︎ Lever ' + String(dd.sunrise[0]).slice(11, 16) + ' · Coucher ' + String(dd.sunset[0]).slice(11, 16);
  }).catch(function(e){ $('ms').textContent = e && e.message === 'ville' ? 'Ville introuvable' : 'Météo indisponible'; });
}


/* ---------- carburant (prix-carburants.gouv.fr, données ouvertes) ---------- */
var carbu = null, CARBUS = [['gazole_prix', 'Gazole'], ['e10_prix', 'SP95-E10'], ['sp95_prix', 'SP95'], ['sp98_prix', 'SP98']];
function distKm(a, b, c, d){ var R = 6371, x = (c - a) * Math.PI / 180, y = (d - b) * Math.PI / 180, q = Math.sin(x / 2) * Math.sin(x / 2) + Math.cos(a * Math.PI / 180) * Math.cos(c * Math.PI / 180) * Math.sin(y / 2) * Math.sin(y / 2); return R * 2 * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q)); }
function prix(n){ return n.toFixed(3).replace('.', ',') + ' €'; }
function cap(s){ s = String(s || '').toLowerCase(); return s.replace(/(^|[\s-])\S/g, function(m){ return m.toUpperCase(); }); }
function carbuQuery(where, ds, offset){
  ds = ds || 'prix-des-carburants-en-france-flux-instantane-v2';
  return fetch('https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/' + ds + '/records?limit=100' + (offset ? '&offset=' + offset : '') + (where ? '&where=' + encodeURIComponent(where) : ''))
    .then(function(r){ return r.json(); })
    .then(function(d){ if(!d || !d.results) throw new Error((d && (d.message || d.error_code)) || 'réponse vide'); d.results.total = d.total_count; return d.results; });
}
/* le flux quotidien a une ligne par carburant : on regroupe par station */
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
  try { $('carbul').innerHTML = '<div class="empty">Recherche des stations…</div>'; } catch(e){}
  if(!geo){ $('carbul').innerHTML = '<div class="empty">Règle ta ville dans Réglages</div>'; return; }
  var pt = "geom'POINT(" + geo.lon + ' ' + geo.lat + ")'", diag = [];
  var norm = function(t){ return String(t || '').toLowerCase().normalize ? String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '') : String(t || '').toLowerCase().replace(/[^a-z]/g, ''); };
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
      var total = r.total, raw = r.length, rawFirst = r[0] ? {geom: r[0].geom, latitude: r[0].latitude, longitude: r[0].longitude, ville: r[0].ville} : {};
      r = keep(groupLong(r).map(normStation));
      diag.push('essai ' + (i + 1) + ' : ' + raw + '/' + total + ' → ' + r.length);
      if(raw && !r.length) diag.push('ex. : ' + JSON.stringify(rawFirst).slice(0, 220));
      return r.length ? r : attempt(i + 1);
    }, function(e){ diag.push('essai ' + (i + 1) + ' : erreur ' + e.message); return attempt(i + 1); });
  };
  attempt(0).then(function(st){
    carbuDiag = diag.join(' · ');
    if(st[0]) carbuDiag += ' · champs : ' + Object.keys(st[0]).slice(0, 40).join(', ');
    carbu = {stations: st, at: new Date()};
    var h = '';
    CARBUS.forEach(function(c){
      var best = st.filter(function(x){ return x[c[0]]; }).sort(function(a, b){ return a[c[0]] - b[c[0]]; })[0];
      if(best) h += '<div class="cr"><span class="cn">' + c[1] + '</span><span class="cp">' + prix(best[c[0]]) + '</span><span class="cw">' + esc(cap(best.ville)) + (best.km != null ? ' · ' + best.km.toFixed(1).replace('.', ',') + ' km' : '') + '</span></div>';
    });
    $('carbul').innerHTML = h || '<div class="empty">Aucune station trouvée autour de ' + esc(geo.ville) + '</div><div class="sub" style="font-size:11px;margin-top:6px">Détail : ' + esc(carbuDiag.slice(0, 300)) + '</div>';
    if(sheetKind === 'carbu') $('sheetbody').innerHTML = carbuSheet();
  }).catch(function(e){ $('carbul').innerHTML = '<div class="empty">Prix indisponibles</div><div class="sub" style="font-size:11px;margin-top:6px">Détail : ' + esc(String(e && e.message || e)) + '</div>'; });
}
function carbuSheet(){
  if(!carbu) return '<div class="empty">Chargement des prix…</div>';
  var h = '<div class="sub">Les moins chers à moins de 10 km · données prix-carburants.gouv.fr · ' + pad(carbu.at.getHours()) + ':' + pad(carbu.at.getMinutes()) + '</div>';
  if(!carbu.stations.length) h += '<div class="sub" style="font-size:12px;margin-top:10px">Diagnostic : ' + esc(carbuDiag) + '</div>';
  CARBUS.forEach(function(c){
    var l = carbu.stations.filter(function(x){ return x[c[0]]; }).sort(function(a, b){ return a[c[0]] - b[c[0]]; }).slice(0, 5);
    if(!l.length) return;
    h += '<div class="shead">' + c[1] + '</div>';
    l.forEach(function(x){
      var g = x.geom || {};
      h += '<a class="crow" href="https://maps.apple.com/?q=' + encodeURIComponent(cap(x.adresse) + ', ' + cap(x.ville)) + (g.lat != null ? '&ll=' + g.lat + ',' + g.lon : '') + '" target="_blank" rel="noopener"><span class="cp">' + prix(x[c[0]]) + '</span><span style="flex:1;min-width:0">' + esc(cap(x.adresse)) + '<br><span class="sub">' + esc(cap(x.ville)) + (x.km != null ? ' · ' + x.km.toFixed(1).replace('.', ',') + ' km' : '') + '</span></span><span class="sub">Itinéraire ›</span></a>';
    });
  });
  return h;
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
function renderWifi(){
  if(!$('wifiw')) return;
  var w = config && config.wifi;
  if(!w || !w.ssid){ $('wifiw').innerHTML = '<div class="empty">Ajoute ton Wi-Fi dans Réglages, en bas de la page</div>'; return; }
  var svg = wifiQr(w, 4);
  $('wifiw').innerHTML = (svg ? '<div class="qr">' + svg + '</div>' : '') + '<div class="wn">' + esc(w.ssid) + '</div><div class="wp">' + (w.type === 'nopass' ? 'Sans mot de passe' : 'Scanne avec l\'appareil photo') + '</div>';
}

/* ---------- alerte gel et pare-brise ---------- */
function renderGel(m){
  var el = $('gel'), now = new Date(), h = now.getHours(), ht = m.hourly.temperature_2m, msg = '';
  var minRange = function(a, b){ var mn = 99, at = -1; for(var i = a; i <= b && i < ht.length; i++){ if(ht[i] < mn){ mn = ht[i]; at = i; } } return {t: mn, h: at % 24}; };
  if(h >= 15){
    var n = minRange(h + 1, 24 + 9);
    if(n.t <= 0) msg = '<b>❄︎ Gel cette nuit</b> ' + Math.round(n.t) + '° vers ' + n.h + ' h · pense à couvrir le pare-brise';
    else if(n.t <= 3) msg = '<b>❄︎ Risque de givre cette nuit</b> ' + Math.round(n.t) + '° au plus bas · pare-brise à prévoir demain matin';
  } else if(h >= 4 && h < 11){
    var mo = minRange(Math.max(0, h - 6), h);
    if(mo.t <= 0 || m.current.temperature_2m <= 1) msg = '<b>❄︎ Gel ce matin</b> ' + Math.round(Math.min(mo.t, m.current.temperature_2m)) + '° · prévois 5 minutes pour dégivrer la voiture';
    else if(mo.t <= 3) msg = '<b>❄︎ Givre possible ce matin</b> ' + Math.round(mo.t) + '° au plus bas · jette un œil au pare-brise';
  }
  if(msg){ el.innerHTML = msg; el.className = 'gel'; } else el.className = 'gel hide';
}

/* ---------- petit mot ---------- */
var motTimer = null, motFocus = false;
function watchMot(){
  root.child('mot').on('value', function(s){
    var v = s.val() || {};
    if(!motFocus) $('mot').value = v.texte || '';
    if(v.at){ var d = new Date(v.at); $('motup').textContent = (d.toDateString() === new Date().toDateString() ? '' : d.getDate() + '/' + (d.getMonth() + 1) + ' ') + pad(d.getHours()) + ':' + pad(d.getMinutes()); } else $('motup').textContent = '';
  });
  $('mot').addEventListener('focus', function(){ motFocus = true; });
  $('mot').addEventListener('blur', function(){ motFocus = false; saveMot(); });
  $('mot').addEventListener('input', function(){ clearTimeout(motTimer); motTimer = setTimeout(saveMot, 900); });
}
function saveMot(){ clearTimeout(motTimer); root.child('mot').set({texte: $('mot').value.slice(0, 500), at: Date.now()}).catch(function(){ status('Mot non enregistré'); }); }

/* ---------- à venir ---------- */
var dates = [];
function renderDates(){
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var list = dates.map(function(x){ var d = new Date(x.date + 'T00:00:00'); return {id: x.id, titre: x.titre, n: Math.round((d - today) / 86400000)}; })
    .filter(function(x){ return !isNaN(x.n) && x.n >= 0; }).sort(function(a, b){ return a.n - b.n; });
  if(!list.length){ $('dates').innerHTML = '<div class="empty">Ajoute une date à attendre : vacances, anniversaire…</div>'; return; }
  var h = '';
  list.slice(0, 5).forEach(function(x){
    h += '<div class="row"><div class="n">' + (x.n === 0 ? '🎉' : x.n) + '<small>' + (x.n === 0 ? "aujourd'hui" : (x.n === 1 ? 'jour' : 'jours')) + '</small></div><div class="tx">' + esc(x.titre) + '</div><button class="x" type="button" data-del="' + esc(x.id) + '" aria-label="Supprimer">×</button></div>';
  });
  $('dates').innerHTML = h;
}
function watchDates(){
  root.child('dates').on('value', function(s){
    var v = s.val() || {}; dates = [];
    for(var id in v){ if(v.hasOwnProperty(id) && v[id]) dates.push({id: id, titre: v[id].titre || '', date: v[id].date || ''}); }
    renderDates();
  });
  $('dates').addEventListener('click', function(e){
    var id = e.target.getAttribute && e.target.getAttribute('data-del');
    if(id) root.child('dates/' + id).remove();
  });
  $('df').addEventListener('submit', function(e){
    e.preventDefault();
    var t = $('dt').value.trim(), d = $('dd').value;
    if(!t || !/^\d{4}-\d{2}-\d{2}$/.test(d)){ $('dt').placeholder = 'Titre et date, s’il te plaît'; return; }
    $('dt').value = ''; $('dd').value = '';
    root.child('dates').push({titre: t.slice(0, 60), date: d}).catch(function(){ status('Date non enregistrée'); });
  });
}

/* ---------- minuteur ---------- */
var tmEnd = 0, tmInt = null, actx = null;
function beep(){
  if(!actx) return;
  for(var i = 0; i < 3; i++){
    var o = actx.createOscillator(), g = actx.createGain(), t0 = actx.currentTime + i * 0.5;
    o.frequency.value = 880; o.connect(g); g.connect(actx.destination);
    g.gain.setValueAtTime(0.25, t0); g.gain.setValueAtTime(0, t0 + 0.3);
    o.start(t0); o.stop(t0 + 0.35);
  }
}
function tmShow(){
  var left = Math.max(0, Math.round((tmEnd - Date.now()) / 1000));
  $('tmv').textContent = pad(Math.floor(left / 60)) + ':' + pad(left % 60);
  if(tmEnd && left === 0){ clearInterval(tmInt); tmInt = null; tmEnd = 0; $('tmw').className = 'w tm ring'; beep(); setTimeout(beep, 2000); }
}
function bindTimer(){
  var bs = document.querySelectorAll('[data-min]');
  for(var i = 0; i < bs.length; i++){
    bs[i].addEventListener('click', function(e){
      try { if(!actx){ var AC = window.AudioContext || window.webkitAudioContext; if(AC) actx = new AC(); } if(actx && actx.resume) actx.resume(); } catch(err){}
      tmEnd = Date.now() + parseInt(e.target.getAttribute('data-min'), 10) * 60000;
      $('tmw').className = 'w tm';
      clearInterval(tmInt); tmInt = setInterval(tmShow, 1000); tmShow();
    });
  }
  $('tmstop').addEventListener('click', function(){ clearInterval(tmInt); tmInt = null; tmEnd = 0; $('tmw').className = 'w tm'; $('tmv').textContent = '00:00'; });
}


/* ---------- widgets cliquables : vue détaillée ---------- */
var menuSel = {};
function menuIngHtml(menu){
  var list = [], heads = {};
  menu.forEach(function(mm){ if(menuSel[mm.date] && (mm.ingredients || []).length){ heads[list.length] = mm.nom; list = list.concat(mm.ingredients); } });
  if(!list.length) return '<div class="empty" style="margin-top:14px">Aucune recette cochée pour l\'instant.</div>';
  var h = ingHtml(list).replace('<div class="shead">Ingrédients</div>', '<div class="shead">Ingrédients des recettes cochées</div>');
  var idx = 0;
  h = h.replace(/<div class="row ing/g, function(m){ return (heads.hasOwnProperty(idx) ? '<div class="ihead">' + esc(heads[idx]) + '</div>' : '') + (idx++, m); });
  return h;
}
var curIng = [];
function ingHtml(ing){
  curIng = ing || [];
  if(!curIng.length) return '';
  var have = {}; lists.courses.forEach(function(x){ if(!x.done) have[x.name.toLowerCase()] = 1; });
  var h = '<div class="shead">Ingrédients</div><div class="list big-list" id="ingl">';
  curIng.forEach(function(x, i){
    var staple = /^(sel|poivre|sel, poivre|huile|huile d'olive|eau)\b/i.test(x), on = !staple && !have[x.toLowerCase()];
    h += '<div class="row ing' + (on ? ' sel' : '') + '" data-ing="' + i + '"><span class="box">' + (on ? '✓' : '') + '</span>' + esc(x) + (have[x.toLowerCase()] ? '<span class="reptag">déjà dans la liste</span>' : '') + '</div>';
  });
  return h + '</div><button class="main" type="button" id="ingadd" style="width:100%;margin-top:14px;padding:13px">Ajouter à la liste de courses</button><div class="sub" id="ingmsg" style="text-align:center;margin-top:8px">Décoche ce que tu as déjà à la maison.</div>';
}
var sheetKind = null;
function closeSheet(){ sheetKind = null; show('sheet', false); document.body.style.overflow = ''; }
function rowsHtml(name){
  var items = lists[name], h = '';
  if(!items.length) return '<div class="empty">' + (name === 'courses' ? 'Rien à acheter' : 'Rien à faire') + '</div>';
  for(var i = 0; i < items.length; i++){
    var it = items[i];
    h += '<div class="row' + (it.done ? ' done' : '') + '" data-col="' + name + '" data-id="' + esc(it.id) + '"><span class="box">' + (it.done ? '✓' : '') + '</span><span style="flex:1">' + esc(it.name) + '</span>' +
      (it.rep != null ? '<span class="reptag">↻ ' + JOURS[it.rep].toLowerCase() + '</span><button class="x" type="button" data-delt="' + esc(it.id) + '" aria-label="Supprimer">×</button>' : '') + '</div>';
  }
  return h;
}
function openSheet(kind){
  var t = '', h = '', cls = '';
  if(kind === 'meteo' && lastMeteo){
    var m = lastMeteo, now = new Date().getHours(), d = m.daily;
    t = (config && config.ville) || 'Météo'; cls = 'wx';
    h += '<div class="sbig">' + Math.round(m.current.temperature_2m) + '° <span>' + icon(m.current.weather_code) + '</span></div>';
    h += '<div class="ssub">' + esc($('ms').textContent) + '</div>';
    h += '<div class="stats sheetstats">' + $('wst').innerHTML + '<div><b>' + String(d.sunrise[0]).slice(11, 16) + '</b>Lever</div><div><b>' + String(d.sunset[0]).slice(11, 16) + '</b>Coucher</div></div>';
    h += '<div class="shead">Heure par heure</div><div class="hscroll">';
    for(var j = now; j < now + 24 && j < m.hourly.temperature_2m.length; j++){
      var hr = j % 24;
      h += '<div><div>' + (j === now ? 'Maint.' : hr + 'h') + '</div><div class="hi">' + icon(m.hourly.weather_code[j], hr >= 7 && hr < 19) + '</div><div><b>' + Math.round(m.hourly.temperature_2m[j]) + '°</b></div><div class="pp">' + (m.hourly.precipitation_probability[j] >= 20 ? m.hourly.precipitation_probability[j] + ' %' : '') + '</div></div>';
    }
    h += '</div><div class="shead">Cette semaine</div><div class="fc">' + $('fc').innerHTML + '</div>';
  } else if(kind === 'agenda'){
    t = 'Agenda'; var ag = (jour && jour.agenda) || [];
    if(!ag.length) h = '<div class="empty">' + (jour && jour.agenda_relie ? 'Aucun rendez-vous aujourd\'hui ni demain' : 'Agenda pas encore relié') + '</div>';
    var tk = todayKey(new Date()), last = '';
    ag.forEach(function(a){
      if(a.date !== last){ last = a.date; h += '<div class="shead">' + (a.date === tk ? "Aujourd'hui" : 'Demain') + '</div>'; }
      h += '<div class="arow"><span class="ah">' + esc(a.heure || 'Journée') + '</span>' + esc(a.titre) + '</div>';
    });
  } else if(kind === 'courses' || kind === 'taches'){
    t = kind === 'courses' ? 'Courses' : 'Maison'; cls = 'rem ' + (kind === 'courses' ? 'or' : 'bl');
    h = '<div class="list big-list">' + rowsHtml(kind) + '</div><form class="sadd" data-col="' + kind + '"><input placeholder="Ajouter…" autocomplete="off">' +
        (kind === 'taches' ? '<select id="srep"><option value="">Une fois</option>' + [1,2,3,4,5,6,0].map(function(d){ return '<option value="' + d + '">Chaque ' + JOURS[d].toLowerCase() + '</option>'; }).join('') + '</select>' : '') +
        '<button class="main" type="submit">Ajouter</button></form>' +
        (kind === 'taches' ? '<div class="sub" style="margin-top:8px">Une tâche « chaque mardi » n’apparaît sur l’écran que le mardi, et revient toute seule la semaine suivante.</div>' : '') +
        '<div style="text-align:right;margin-top:12px"><button class="link" type="button" data-clear2="' + kind + '">Retirer ' + (kind === 'courses' ? 'les cochés' : 'les faites') + '</button></div>';
  } else if(kind === 'plat'){
    var p = platDuJour(), ing = p.ingredients || [];
    t = 'Ce soir';
    h = '<div class="splat">' + ($('pimg').innerHTML) + '</div><div class="pn" style="font-size:28px;margin-top:14px">' + esc(p.nom || 'En attente de la suggestion du jour') + '</div><div class="ssub">' + esc($('pd').textContent) + (p.portions ? ' · ' + p.portions + ' pers.' : '') + '</div>';
    if(p.url) h += '<a class="btn" href="' + esc(p.url) + '" target="_blank" rel="noopener" style="margin-top:16px">Voir la recette</a>';
    h += ingHtml(ing);
    var rec = ((jour && jour.plats_recents) || []).slice(1, 8);
    if(rec.length) h += '<div class="shead">Déjà proposés</div>' + rec.map(function(x){ return '<div class="arow">' + esc(x) + '</div>'; }).join('');
  } else if(kind === 'menu'){
    var menu = (jour && jour.menu) || [];
    t = 'Menu de la semaine';
    if(!menu.length) h = '<div class="empty">Le menu de la semaine arrive à la prochaine mise à jour du matin.</div>';
    else h = '<div class="sub" style="margin-bottom:4px">Coche les recettes que tu vas cuisiner, puis ajoute leurs ingrédients aux courses.</div>';
    menu.forEach(function(mm, i){
      var d = new Date(mm.date + 'T12:00:00'), on = !!menuSel[mm.date];
      h += '<div class="mrow' + (on ? ' msel' : '') + '" data-mi="' + i + '"><span class="box mbox">' + (on ? '✓' : '') + '</span><div class="md">' + (mm.date === todayKey(new Date()) ? "Ce soir" : JOURS[d.getDay()] + ' ' + d.getDate()) + '</div><div style="flex:1;min-width:0"><div class="mn">' + esc(mm.nom) + '</div><div class="sub">' + esc([mm.temps, mm.source].filter(Boolean).join(' · ')) + '</div></div>' +
        (mm.url ? '<a class="mlink" href="' + esc(mm.url) + '" target="_blank" rel="noopener">Recette</a>' : '') + '</div>';
    });
    h += '<div id="mingr">' + menuIngHtml(menu) + '</div>';
  } else if(kind === 'wifi'){
    var w = (config && config.wifi) || {};
    t = 'Wi-Fi invités';
    h = w.ssid ? '<div class="qr qrbig">' + wifiQr(w, 8) + '</div><div class="wn" style="font-size:22px">' + esc(w.ssid) + '</div>' + (w.type !== 'nopass' ? '<div class="wp" style="font-size:16px;color:#1c1c1e;margin-top:8px">Mot de passe : <b>' + esc(w.pass) + '</b></div>' : '') + '<div class="sub" style="text-align:center;margin-top:12px">Ouvre l\'appareil photo du téléphone et vise le code pour se connecter.</div>' : '<div class="empty">Ajoute ton Wi-Fi dans Réglages, en bas de la page.</div>';
  } else if(kind === 'carbu'){
    t = 'Carburant'; h = carbuSheet();
  } else if(kind === 'mot'){
    t = 'Petit mot'; cls = 'note';
    h = '<textarea id="mot2" class="smot" placeholder="Laisse un mot à l\'autre…">' + esc($('mot').value) + '</textarea><div style="text-align:right;margin-top:12px"><button class="main" type="button" id="mot2ok">Enregistrer</button></div>';
  } else return;
  var first = sheetKind !== kind;
  sheetKind = kind;
  $('sheettitle').textContent = t;
  $('sheetpanel').className = 'panel ' + cls;
  if(kind === 'mot' && !first) return;
  $('sheetbody').innerHTML = h;
  if(first){ show('sheet', true); document.body.style.overflow = 'hidden'; $('sheetbody').scrollTop = 0; }
  var f = document.querySelector('#sheetbody form.sadd');
  if(f) f.addEventListener('submit', function(e){
    e.preventDefault(); var inp = f.querySelector('input'), v = inp.value.trim(); if(!v) return; inp.value = '';
    var data = {name: v.slice(0, 80), done: false, at: Date.now()}, sel = $('srep');
    if(sel && sel.value !== '') data.rep = parseInt(sel.value, 10);
    root.child(kind).push(data).catch(function(){ status('Ajout impossible'); });
  });
  var c2 = document.querySelector('[data-clear2]');
  if(c2) c2.addEventListener('click', function(){
    var up = {}; lists[kind].forEach(function(x){ if(x.done && x.rep == null) up[x.id] = null; }); root.child(kind).update(up);
  });
  if(kind === 'plat' || kind === 'menu') bindIng();
  if(kind === 'menu') bindMenuSel();
  if(kind === 'mot') $('mot2ok').addEventListener('click', function(){ $('mot').value = $('mot2').value; saveMot(); closeSheet(); });
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
      r.className = on ? r.className + ' sel' : r.className.replace(' sel', '');
      r.querySelector('.box').textContent = on ? '✓' : '';
      ingRefresh();
    });
    $('ingadd').addEventListener('click', function(){
      var ing = curIng, rows = ingl.querySelectorAll('.row.sel'), up = {}, n = 0, now = Date.now();
      for(var i = 0; i < rows.length; i++){
        var name = ing[parseInt(rows[i].getAttribute('data-ing'), 10)];
        if(name){ up[root.child('courses').push().key] = {name: String(name).slice(0, 80), done: false, at: now + i}; n++; }
      }
      if(!n) return;
      root.child('courses').update(up).then(function(){
        $('ingmsg').textContent = n + ' ingrédient' + (n > 1 ? 's ajoutés' : ' ajouté') + ' à la liste de courses ✓';
        for(var j = 0; j < rows.length; j++){ rows[j].className = rows[j].className.replace(' sel', ''); rows[j].querySelector('.box').textContent = ''; }
        ingRefresh();
      }, function(){ $('ingmsg').textContent = 'Ajout impossible pour le moment'; });
    });
  }
function bindMenuSel(){
  var menu = (jour && jour.menu) || [];
  var rows = document.querySelectorAll('#sheetbody .mrow[data-mi]');
  for(var i = 0; i < rows.length; i++){
    rows[i].addEventListener('click', function(e){
      if(e.target.tagName === 'A') return;
      var mm = menu[parseInt(this.getAttribute('data-mi'), 10)]; if(!mm) return;
      menuSel[mm.date] = !menuSel[mm.date];
      this.className = 'mrow' + (menuSel[mm.date] ? ' msel' : '');
      this.querySelector('.mbox').textContent = menuSel[mm.date] ? '✓' : '';
      $('mingr').innerHTML = menuIngHtml(menu);
      bindIng();
    });
  }
}
function bindSheets(){
  var map = [['.w.wifi', 'wifi'], ['.w.menu', 'menu'], ['.w.carbu', 'carbu'], ['.w.wx', 'meteo'], ['.w.wx2', 'meteo'], ['.w.cal', 'agenda'], ['.rem.or', 'courses'], ['.rem.bl', 'taches'], ['.w.plat', 'plat'], ['.w.note', 'mot']];
  map.forEach(function(x){
    var el = document.querySelector(x[0]); if(!el) return;
    el.className += ' tap';
    el.addEventListener('click', function(e){
      var t = e.target;
      while(t && t !== el){ var tag = t.tagName; if(tag === 'INPUT' || tag === 'BUTTON' || tag === 'A' || tag === 'TEXTAREA' || tag === 'FORM' || (t.getAttribute && t.getAttribute('data-id'))) return; t = t.parentNode; }
      openSheet(x[1]);
    });
  });
  $('pingb').addEventListener('click', function(){ openSheet('plat'); });
  $('sheetclose').addEventListener('click', closeSheet);
  $('sheetbody').addEventListener('click', function(e){
    var id = e.target.getAttribute && e.target.getAttribute('data-delt');
    if(id){ e.stopPropagation(); root.child('taches/' + id).remove(); }
  });
  $('sheet').addEventListener('click', function(e){ if(e.target === $('sheet')) closeSheet(); });
}

/* ---------- événements ---------- */
function bind(){
  document.addEventListener('click', function(e){
    var t = e.target, row = null;
    if(t.getAttribute && t.getAttribute('data-delt')) return;
    while(t && t !== document){ if(t.getAttribute && t.getAttribute('data-id')){ row = t; break; } t = t.parentNode; }
    if(!row) return;
    var name = row.getAttribute('data-col'), id = row.getAttribute('data-id'), it = null;
    for(var i = 0; i < lists[name].length; i++) if(lists[name][i].id === id) it = lists[name][i];
    if(it) root.child(name + '/' + id).update({done: !it.done, doneAt: Date.now()}).catch(function(){ status('Modification impossible'); });
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
        lists[name].forEach(function(x){ if(x.done && x.rep == null) up[x.id] = null; });
        root.child(name).update(up).catch(function(){ status('Suppression impossible'); });
      });
    })(clears[ci]);
  }
  $('sopen').addEventListener('click', function(){
    show('settings', true); $('cv').value = config && config.ville ? config.ville : ''; $('cmsg').textContent = '';
    var wf = (config && config.wifi) || {}; $('wssid').value = wf.ssid || ''; $('wpass').value = wf.pass || ''; $('wtype').value = wf.type || 'WPA';
    var c = veilleCfg(); $('vdelay').value = String(c.delay); $('vnuit').value = c.nuit ? '1' : '0'; $('vdeb').value = String(c.debut); $('vfin').value = String(c.fin);
  });
  $('wopen').addEventListener('click', function(e){ e.stopPropagation(); openSheet('wifi'); });
  $('vopen').addEventListener('click', function(e){ e.stopPropagation(); setTimeout(goVeille, 50); });
  var saveV = function(){
    var c = {delay: parseInt($('vdelay').value, 10), nuit: $('vnuit').value === '1', debut: parseInt($('vdeb').value, 10), fin: parseInt($('vfin').value, 10)};
    try { localStorage.setItem('ecran-veille', JSON.stringify(c)); $('vmsg').textContent = 'Enregistré sur cet appareil'; } catch(e){ $('vmsg').textContent = 'Impossible d\'enregistrer sur cet appareil'; }
  };
  ['vdelay', 'vnuit', 'vdeb', 'vfin'].forEach(function(id){ $(id).addEventListener('change', saveV); });
  $('cclose').addEventListener('click', function(){ show('settings', false); });
  $('wsave').addEventListener('click', function(){
    var w = {ssid: $('wssid').value.trim().slice(0, 64), pass: $('wpass').value.slice(0, 64), type: $('wtype').value};
    $('wmsg').textContent = 'Enregistrement…';
    root.child('config/wifi').set(w).then(function(){ $('wmsg').textContent = 'Enregistré'; }, function(){ $('wmsg').textContent = 'Impossible d\'enregistrer'; });
  });
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
    tick(); setInterval(tick, 5000);
    bind();
    watchList('courses'); watchList('taches');
    watchMot(); watchDates(); bindTimer(); bindSheets();
    root.child('config').on('value', function(s){ config = s.val(); loadMeteo(); renderWifi(); });
    loadJour();
    setInterval(loadJour, 30 * 60000);
    setInterval(loadMeteo, 10 * 60000);
    var lastDay = new Date().getDate();
    setInterval(function(){ if(new Date().getDate() !== lastDay){ lastDay = new Date().getDate(); loadJour(); renderDates(); loadMeteo(); resetRecurring('taches'); renderList('taches'); } }, 60000);
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
