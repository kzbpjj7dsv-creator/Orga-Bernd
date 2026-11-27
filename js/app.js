import { h, render, useState, useEffect, useMemo, useRef, htm } from '../vendor/ui.js';
import { createClient } from '../vendor/supabase.js';
import { SUPABASE_URL, SUPABASE_KEY, VAPID_PUBLIC } from '../config.js';
import { MODULE_SEED, SHIFT_SEED, PRAESENZ_SEED, SCHRITTE, FORMAT_CHECK, PRUEFUNGSFORM, TODO_LISTEN, EVENT_TYPEN, BERND } from './data.js';
import { berndSVG } from './bernd.js';
import { makeMehr } from './mehr.js';
import { planeWoche } from './planer.js';

const html = htm.bind(h);
const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true } });

// ---------------- Hilfsfunktionen ----------------
const hasNotif = () => typeof Notification !== 'undefined';
const pad = n => String(n).padStart(2, '0');
const WT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MON = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const dayStart = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const sameDay = (a, b) => dayStart(a).getTime() === dayStart(b).getTime();
const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hm = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const fmtDate = d => d ? `${WT[new Date(d).getDay()]}, ${new Date(d).getDate()}. ${MON[new Date(d).getMonth()].slice(0, 3)}.` : '–';
const daysUntil = d => Math.ceil((dayStart(d) - dayStart(new Date())) / 864e5);
const mondayOf = d => { const x = dayStart(d); const wd = (x.getDay() + 6) % 7; return addDays(x, -wd); };
const combine = (dateStr, timeStr) => new Date(`${dateStr}T${timeStr}`);
const trunc2 = x => Math.floor(x * 100 + 1e-9) / 100;
const fmtNote = x => x == null ? '–' : x.toFixed(x * 10 % 1 === 0 ? 1 : 2).replace('.', ',');
const hashDay = () => { const d = new Date(); return d.getFullYear() * 400 + d.getMonth() * 31 + d.getDate(); };
const progress = t => {
  const s = t.schritte || []; if (!s.length) return 0;
  return Math.round(s.filter(x => x.erledigt).length / s.length * 100);
};

function useHash() {
  const [hash, setHash] = useState(location.hash || '#/home');
  useEffect(() => { const f = () => setHash(location.hash || '#/home'); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  return hash;
}
const go = p => { location.hash = p; window.scrollTo(0, 0); };

async function pushAktivieren() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !hasNotif())
    return toast('Auf dem iPhone geht das nur in der App vom Home-Bildschirm (iOS 16.4 oder neuer).');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return toast('Nicht erlaubt – in den iPhone-Einstellungen unter Mitteilungen änderbar.');
  const reg = await navigator.serviceWorker.ready;
  const key = Uint8Array.from(atob(VAPID_PUBLIC.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - VAPID_PUBLIC.length % 4) % 4)), c => c.charCodeAt(0));
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  const j = sub.toJSON();
  const r = await sb.from('push_subscriptions').upsert({ endpoint: j.endpoint, keys: j.keys, geraet: /iPhone|iPad/.test(navigator.userAgent) ? 'iPhone/iPad' : /Windows/.test(navigator.userAgent) ? 'Windows' : 'Browser' }, { onConflict: 'endpoint' });
  if (r.error) return toast('Fehler: ' + r.error.message);
  toast('Bernd darf dir jetzt schreiben. 🐧');
  try { reg.showNotification('Bernd', { body: 'Test: Benachrichtigungen funktionieren!', icon: 'icons/icon-192.png' }); } catch (e) { }
}

let toastTimer;
function toast(msg) {
  let el = document.querySelector('.toast');
  if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = msg; el.style.display = 'block';
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.style.display = 'none', 2600);
}

// Wiederholungen (vereinfachte RRULE: FREQ=DAILY|WEEKLY|MONTHLY|YEARLY;INTERVAL=n;UNTIL=YYYY-MM-DD)
function expand(events, from, to) {
  const out = [];
  for (const e of events) {
    const s = new Date(e.start_at), en = e.ende_at ? new Date(e.ende_at) : new Date(s.getTime() + 36e5);
    const dur = en - s;
    if (!e.wiederholung) { if (en >= from && s < to) out.push({ ...e, _s: s, _e: en }); continue; }
    const p = Object.fromEntries(e.wiederholung.split(';').map(x => x.split('=')));
    const iv = +(p.INTERVAL || 1); const until = p.UNTIL ? new Date(p.UNTIL + 'T23:59') : null;
    let cur = new Date(s), i = 0;
    while (cur < to && i < 2000) {
      if (until && cur > until) break;
      const ce = new Date(cur.getTime() + dur);
      if (ce >= from) out.push({ ...e, _s: new Date(cur), _e: ce, _rep: true });
      i++;
      if (p.FREQ === 'DAILY') cur.setDate(cur.getDate() + iv);
      else if (p.FREQ === 'WEEKLY') cur.setDate(cur.getDate() + 7 * iv);
      else if (p.FREQ === 'MONTHLY') cur.setMonth(cur.getMonth() + iv);
      else if (p.FREQ === 'YEARLY') cur.setFullYear(cur.getFullYear() + iv);
      else break;
    }
  }
  return out.sort((a, b) => a._s - b._s);
}

// Nachtmodus
function applyNight(settings) {
  const hr = new Date().getHours();
  const mode = settings?.nachtmodus || 'sonnenuntergang';
  const night = mode === 'immer' ? true : mode === 'nie' ? false : (hr >= 19 || hr < 7);
  document.documentElement.classList.toggle('nacht', night);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', night ? '#6E1A28' : '#F6C1CB');
}

// ---------------- Icons ----------------
const IC = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  kal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  stud: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>',
  auf: '<path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>',
  mehr: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
  euro: '<path d="M18 7a7 7 0 1 0 0 10"/><path d="M4 10h9M4 14h9"/>',
  wallet: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 15h2"/>',
  doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  person: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  book: '<path d="M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z"/><path d="M20 4h-4a2 2 0 0 0-2 2v12h6z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',
  gift: '<rect x="3" y="8" width="18" height="13" rx="1"/><path d="M3 12h18M12 8v13M12 8s-2-5-5-4 0 4 5 4zM12 8s2-5 5-4 0 4-5 4z"/>',
  shirt: '<path d="M8 4h8l3 4-3 2v10H8V10L5 8z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',
  back: '<path d="M15 5l-7 7 7 7"/>', plus: '<path d="M12 5v14M5 12h14"/>', play: '<path d="M7 4l13 8-13 8z"/>',
  pause: '<path d="M9 5v14M15 5v14"/>', minus: '<path d="M5 12h14"/>', stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
};
const Icon = ({ n, size = 20, color = 'currentColor', fill = 'none' }) =>
  html`<svg width=${size} height=${size} viewBox="0 0 24 24" fill=${fill} stroke=${color} stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" dangerouslySetInnerHTML=${{ __html: IC[n] }}></svg>`;
const Bernd = ({ mood, size = 96, outfit }) => html`<span style="display:flex" dangerouslySetInnerHTML=${{ __html: berndSVG(mood, size, outfit) }}></span>`;
const Back = ({ to, label }) => html`<button class=${"back" + (to === "#/mehr" ? " to-mehr" : "")} onClick=${() => to ? go(to) : history.back()}><${Icon} n="back" size=${18} />${label}</button>`;
const CTX = { html, useState, useEffect, useMemo, sb, Icon, Bernd, Back, toast, go, fmtDate, isoDate, addDays, dayStart, daysUntil, pad };
const M = makeMehr(CTX);

// Bernd plant: zukünftige Bernd-Arbeitsphasen löschen und neu verteilen
async function replan(st, setSt, quiet) {
  const now = new Date().toISOString();
  const alt = st.events.filter(e => e.von_bernd && e.start_at > now);
  if (alt.length) await sb.from('events').delete().in('id', alt.map(e => e.id));
  const rest = st.events.filter(e => !(e.von_bernd && e.start_at > now));
  const neu = planeWoche({ ...st, events: rest }, expand);
  let ins = [];
  if (neu.length) { const r = await sb.from('events').insert(neu).select(); if (r.error) { toast('Planen fehlgeschlagen: ' + r.error.message); return; } ins = r.data; }
  setSt(s => ({ ...s, events: [...rest, ...ins] }));
  localStorage.setItem('bernd_plan', isoDate(new Date()));
  if (!quiet) toast(neu.length ? `Bernd hat ${neu.length} Arbeitsphasen eingeplant.` : 'Keine offenen Abgaben mit Termin – nichts zu planen.');
}

// ---------------- Daten-Store ----------------
function useStore(user) {
  const [st, setSt] = useState({ loading: true });
  const load = async () => {
    const q = t => sb.from(t).select('*');
    const [p, m, t, td, e, s, ws] = await Promise.all([
      sb.from('profiles').select('*').eq('id', user.id).maybeSingle(), q('modules').order('semester').order('code'),
      q('tasks').order('abgabe', { nullsFirst: false }), q('todos').order('created_at'), q('events'),
      q('shift_templates').order('kuerzel'), sb.from('work_sessions').select('*').gte('start_at', addDays(new Date(), -60).toISOString()),
    ]);
    const err = [p, m, t, td, e, s, ws].find(r => r.error);
    if (err) { setSt({ loading: false, error: err.error.message }); return; }
    let profile = p.data;
    if (!profile) { const r = await sb.from('profiles').insert({ id: user.id }).select().single(); profile = r.data; }
    let modules = m.data, shifts = s.data;
    if (!modules.length) {
      const rows = MODULE_SEED.map(x => ({ zulassungsrelevant: false, pauschal_angerechnet: false, ...x, anwesenheit_erledigt: x.semester === 1 }));
      const r = await sb.from('modules').insert(rows).select(); modules = r.data || [];
    }
    if (!shifts.length) { const r = await sb.from('shift_templates').insert(SHIFT_SEED).select(); shifts = r.data || []; }
    let events = e.data;
    if (!events.some(x => x.quelle === 'kontaktstudium')) {
      const rows = PRAESENZ_SEED.map(([von, bis, titel]) => ({ typ: 'uni', titel, ganztags: true, quelle: 'kontaktstudium',
        start_at: new Date(von + 'T00:00').toISOString(), ende_at: addDays(new Date(bis + 'T00:00'), 1).toISOString() }));
      const r = await sb.from('events').insert(rows).select(); events = [...events, ...(r.data || [])];
    }
    const fresh = { loading: false, profile, modules, tasks: t.data, todos: td.data, events, shifts, sessions: ws.data };
    setSt(fresh);
    if (localStorage.getItem('bernd_plan') !== isoDate(new Date())) replan(fresh, setSt, true);
    applyNight(profile?.settings);
  };
  useEffect(() => { load(); }, [user.id]);
  const api = {
    reload: load,
    replan: quiet => setSt(s => { replan(s, setSt, quiet); return s; }),
    async upsert(table, row, key) {
      const r = row.id ? await sb.from(table).update(row).eq('id', row.id).select().single() : await sb.from(table).insert(row).select().single();
      if (r.error) { toast('Fehler: ' + r.error.message); return null; }
      setSt(s => ({ ...s, [key]: row.id ? s[key].map(x => x.id === row.id ? r.data : x) : [...s[key], r.data] }));
      return r.data;
    },
    async insertMany(table, rows, key) {
      const r = await sb.from(table).insert(rows).select();
      if (r.error) { toast('Fehler: ' + r.error.message); return []; }
      setSt(s => ({ ...s, [key]: [...s[key], ...r.data] })); return r.data;
    },
    async remove(table, id, key) {
      const r = await sb.from(table).delete().eq('id', id);
      if (r.error) { toast('Fehler: ' + r.error.message); return; }
      setSt(s => ({ ...s, [key]: s[key].filter(x => x.id !== id) }));
    },
    async saveProfile(patch) {
      const r = await sb.from('profiles').update(patch).eq('id', user.id).select().single();
      if (r.error) { toast('Fehler: ' + r.error.message); return; }
      setSt(s => ({ ...s, profile: r.data })); applyNight(r.data.settings);
    },
  };
  return [st, api];
}

// ---------------- Bernds Stimmung ----------------
function berndMood(st) {
  const now = new Date(), set = st.profile?.settings || {};
  if (set.schonmodus) return 'schonmodus';
  const today = expand(st.events, dayStart(now), addDays(dayStart(now), 1));
  if (today.some(e => e.typ === 'urlaub')) return 'urlaub';
  if (today.some(e => e.typ === 'dienst' && e._s <= now && e._e > now)) return 'dienst';
  if (today.some(e => e.typ === 'ruhezeit' && e._s <= now && e._e > now)) return 'ruhe';
  const offen = st.tasks.filter(t => t.status === 'offen' && t.abgabe);
  if (offen.some(t => { const d = daysUntil(t.abgabe); const p = progress(t); return (d <= 3 && d >= 0 && p < 60) || (d <= 7 && d >= 0 && p < 30); })) return 'wuetend';
  const missed = today.filter(e => e.typ === 'arbeitsphase' && e._e < now).some(e =>
    !st.sessions.some(s => new Date(s.start_at) < e._e && (s.ende_at ? new Date(s.ende_at) : now) > e._s));
  if (missed) return 'enttaeuscht';
  return 'zufrieden';
}
function berndLine(mood, frech = 3) {
  const key = mood === 'schonmodus' ? 'schonmodus' : mood;
  const set = BERND[key]; const lvl = set.length === 1 ? set[0] : set[Math.min(Math.max(frech, 1), 4) - 1];
  return lvl[hashDay() % lvl.length];
}

// ---------------- Login ----------------
function Login() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState('');
  const submit = async e => {
    e.preventDefault(); setBusy(true); setMsg('');
    const r = mode === 'login' ? await sb.auth.signInWithPassword({ email, password: pw })
      : await sb.auth.signUp({ email, password: pw, options: { emailRedirectTo: location.origin + location.pathname } });
    setBusy(false);
    if (r.error) setMsg(r.error.message === 'Invalid login credentials' ? 'E-Mail oder Passwort stimmt nicht.' : r.error.message);
    else if (mode === 'register' && !r.data.session) setMsg('Fast geschafft: Bitte bestätige den Link in der E-Mail, dann hier einloggen.');
  };
  return html`<div class="center">
    <${Bernd} mood="zufrieden" size=${140} />
    <h1 style="margin:0;font-size:28px;font-weight:900">Hallo, ich bin Bernd.</h1>
    <p class="small" style="margin:0">Melde dich an, dann geht’s los.</p>
    <form onSubmit=${submit} style="width:100%;max-width:360px;display:flex;flex-direction:column;gap:10px">
      <label class="sr" for="em">E-Mail</label><input id="em" class="input" type="email" placeholder="E-Mail" autocomplete="email" value=${email} onInput=${e => setEmail(e.target.value)} required />
      <label class="sr" for="pw">Passwort</label><input id="pw" class="input" type="password" placeholder="Passwort (mind. 8 Zeichen)" minlength="8" autocomplete=${mode === 'login' ? 'current-password' : 'new-password'} value=${pw} onInput=${e => setPw(e.target.value)} required />
      <button class="btn" disabled=${busy}>${busy ? '…' : mode === 'login' ? 'Anmelden' : 'Konto anlegen'}</button>
      ${msg && html`<div class="card small" style="text-align:left">${msg}</div>`}
      <span class="tiny">Private App – neue Registrierungen sind geschlossen.</span>
    </form>
  </div>`;
}

// ---------------- Navigation ----------------
const MEHR_LINKS = [['brainstorming', 'Brainstorming', 'bulb', ['idee']], ['finanzen', 'Finanzen', 'euro', ['buchung']], ['stipendium', 'Stipendium', 'wallet', []], ['steuern', 'Steuern', 'doc', []],
  ['dozierende', 'Dozierende', 'person', ['dozent']], ['nachschlagen', 'Nachschlagen', 'book', ['dokument']], ['urlaube', 'Urlaube', 'sun', ['urlaub']], ['geschenke', 'Geschenkideen', 'gift', ['geschenk']],
  ['outfits', 'Bernd & Outfits', 'shirt', []], ['einstellungen', 'Einstellungen', 'gear', []]];
function Tabs({ route }) {
  const t = [['home', 'Home', 'home', '--t-home'], ['kalender', 'Kalender', 'kal', '--t-kal'], ['studium', 'Studium', 'stud', '--t-stud'], ['aufgaben', 'Aufgaben', 'auf', '--t-auf']];
  const sub = MEHR_LINKS.find(([r, , , alt]) => r === route || alt.includes(route));
  const active = { modul: 'studium', semester: 'studium', todos: 'aufgaben', timer: 'aufgaben', nullbock: 'aufgaben', eintrag: 'kalender' }[route] || (sub ? 'mehr' : route);
  const link = (r, l, ic, c, on, cls = '') => html`<a href=${'#/' + r} class=${(on ? 'on ' : '') + cls} style=${on ? `color:var(${c})` : ''}>
      <span style=${on ? `background:var(${c})` : ''}><${Icon} n=${ic} color=${on ? '#fff' : `var(${c})`} /></span>${l}</a>`;
  return html`<nav class="tabs" aria-label="Hauptnavigation"><div class="brand"><${Bernd} mood="zufrieden" size=${40} />Bernd</div><div class="in">
    ${t.map(([r, l, ic, c]) => link(r, l, ic, c, active === r))}
    ${link('mehr', 'Mehr', 'mehr', '--t-mehr', active === 'mehr', 'mob-only')}
    <div class="side-only side-sep">Mehr</div>
    ${MEHR_LINKS.map(([r, l, ic]) => link(r, l, ic, '--t-mehr', sub?.[0] === r, 'side-only'))}
  </div></nav>`;
}

// ---------------- Home ----------------
function Home({ st }) {
  const now = new Date(); const mood = berndMood(st); const set = st.profile?.settings || {};
  const gruss = now.getHours() < 11 ? 'Guten Morgen' : now.getHours() < 18 ? 'Hallo' : 'Guten Abend';
  const heute = expand(st.events, dayStart(now), addDays(dayStart(now), 1));
  const abgaben = st.tasks.filter(t => t.status === 'offen' && t.abgabe && daysUntil(t.abgabe) >= 0).slice(0, 3);
  const cpSem = st.modules.filter(m => m.semester === aktSemester(st)).reduce((a, m) => a + Number(m.cp || 0), 0);
  const cpDone = cpErreicht(st.modules);
  const minHeute = st.sessions.filter(s => sameDay(s.start_at, now)).reduce((a, s) => a + (s.arbeit_min || 0), 0);
  const name = st.profile?.vorname || 'Arlene';
  return html`
  <div class="hero">
    <div class="col"><span class="sub">${fmtDate(now)}</span><h1>${gruss}, ${name}</h1></div>
    <div class="row" style="align-items:flex-end"><${Bernd} mood=${mood} size=${96} outfit=${st.profile?.bernd_outfit} /><div class="bubble">${berndLine(mood, set.bernd_frechheit)}</div></div>
  </div>
  <div class="content"><div class="split"><div class="col">
    <a class="btn" href=${'#/timer' + (heute.find(e => e.typ === 'arbeitsphase' && e.task_id && e._e > now)?.task_id ? '/' + heute.find(e => e.typ === 'arbeitsphase' && e.task_id && e._e > now).task_id : '')}><${Icon} n="play" fill="currentColor" color="none" />Arbeitsphase starten</a>
    <div class="row"><div class="stat"><span class="small b">Heute gearbeitet</span><b>${Math.floor(minHeute / 60)}:${pad(minHeute % 60)} Std.</b></div>
      <div class="stat"><span class="small b">Studium</span><b>${cpDone} / 180 CP</b></div></div>
    <div class="between"><span class="h2">Heute</span><a class="small b" href="#/kalender">Kalender</a></div>
    ${heute.length ? heute.map(e => html`<${EventRow} e=${e} />`) : html`<div class="card small">Nichts eingetragen. Freie Bahn für Arbeitsphasen.</div>`}
    </div><div class="col">
    <div class="between"><span class="h2">Nächste Abgaben</span><a class="small b" href="#/aufgaben">Alle</a></div>
    ${abgaben.length ? abgaben.map(t => html`<${TaskCard} t=${t} st=${st} />`) : html`<div class="card small">Keine offenen Abgaben mit Termin. Trag sie im Studium-Reiter beim Modul ein.</div>`}
    <span class="tiny">Semester ${aktSemester(st)}: ${cpSem} CP geplant</span>
  </div></div></div>`;
}
const aktSemester = st => st.profile?.settings?.semester || 1;
const cpErreicht = mods => mods.filter(m => m.bestanden || (m.note != null && m.note <= 4)).reduce((a, m) => a + Number(m.cp || 0), 0);

function EventRow({ e, onClick }) {
  const t = EVENT_TYPEN[e.typ] || EVENT_TYPEN.privat;
  return html`<div class="card row" style="padding:9px 12px;cursor:${onClick ? 'pointer' : 'default'}" onClick=${onClick}>
    <span style="width:6px;align-self:stretch;border-radius:3px;background:${t.farbe}"></span>
    <div class="col" style="flex:1;gap:1px"><span class="b" style="font-size:14px">${e.titel || t.label}</span><span class="tiny">${t.label}${e.ort ? ' · ' + e.ort : ''}${e._rep ? ' · wiederholt' : ''}</span></div>
    <span class="small b">${e.ganztags ? 'ganztags' : `${hm(e._s)}–${hm(e._e)}`}</span></div>`;
}

function TaskCard({ t, st }) {
  const m = st.modules.find(x => x.id === t.module_id); const d = t.abgabe ? daysUntil(t.abgabe) : null; const p = progress(t);
  const urgent = d != null && d <= 7;
  return html`<a class="card col" style="text-decoration:none;color:var(--text);${urgent ? 'border:2px solid #A3202E' : ''}" href=${'#/modul/' + t.module_id}>
    <div class="between"><div class="col" style="gap:1px"><span class="b" style="font-size:15px">${t.titel}</span><span class="tiny">${m ? m.name + ' · ' + m.code : ''}</span></div>
      <span class=${'chip' + (urgent ? ' dark' : '')}>${d == null ? 'ohne Termin' : d === 0 ? 'heute' : d < 0 ? 'überfällig' : `in ${d} Tag${d === 1 ? '' : 'en'}`}</span></div>
    <div class="row"><div class="bar"><i style=${`width:${Math.max(p, 2)}%;background:var(--t-auf)`}></i></div><span class="tiny b">${p} %</span></div></a>`;
}

// ---------------- Studium ----------------
function gesamtnote(mods) {
  const g = mods.filter(m => m.benotet && m.gewicht > 0 && m.note != null);
  const sw = g.reduce((a, m) => a + Number(m.gewicht), 0);
  if (!sw) return null;
  return trunc2(g.reduce((a, m) => a + Math.floor(Number(m.note) * 10 + 1e-9) / 10 * Number(m.gewicht), 0) / sw);
}
function Studium({ st }) {
  const cp = cpErreicht(st.modules); const note = gesamtnote(st.modules); const akt = aktSemester(st);
  const sems = [1, 2, 3, 4, 5, 6].map(s => { const ms = st.modules.filter(m => m.semester === s); return { s, ms, cp: ms.reduce((a, m) => a + Number(m.cp), 0), done: cpErreicht(ms) }; });
  return html`<div class="hero"><h1>Studium</h1><span class="sub">B.Sc. Berufspädagogik & Management im RD · Pädagogik</span>
    <div class="row"><div class="stat"><span class="small b">Studium gesamt</span><b>${cp} / 180 CP</b><div class="bar" style="flex:none;height:6px"><i style=${`width:${Math.max(cp / 1.8, 2)}%`}></i></div></div>
      <div class="stat"><span class="small b">Notenschnitt</span><b>${note == null ? '–' : note.toFixed(2).replace('.', ',')}</b><span class="tiny">gewichtet nach BPO</span></div></div></div>
  <div class="content"><span class="h2">Deine Semester</span>
    ${sems.map(x => html`<a class="card between" style=${`text-decoration:none;color:var(--text);${x.s === akt ? 'border:2px solid var(--accent)' : ''}`} href=${'#/semester/' + x.s}>
      <div class="col" style="gap:1px"><span class="b">${x.s}. Semester</span><span class="tiny">${x.ms.length} Module</span></div>
      <div class="col" style="align-items:flex-end"><span class="b small">${x.done} / ${x.cp} CP</span><span class=${'chip' + (x.s === akt ? ' dark' : '')}>${x.s === akt ? 'läuft' : x.s < akt ? 'vorbei' : 'geplant'}</span></div></a>`)}
    <div class="card small">BMRD-02 und BMRD-03 musst du bestanden haben, um zu den Prüfungen im 5. und 6. Semester zugelassen zu werden (§ 12 BPO).</div>
  </div>`;
}
function Semester({ st, s }) {
  const ms = st.modules.filter(m => m.semester === +s);
  return html`<div class="hero"><${Back} to="#/studium" label="Studium" /><h1>${s}. Semester</h1><span class="sub">${cpErreicht(ms)} / ${ms.reduce((a, m) => a + Number(m.cp), 0)} CP</span></div>
  <div class="content">${ms.map(m => {
    const ts = st.tasks.filter(t => t.module_id === m.id); const p = ts.length ? Math.round(ts.reduce((a, t) => a + progress(t), 0) / ts.length) : (m.bestanden || m.note ? 100 : 0);
    return html`<a class="card col" style="text-decoration:none;color:var(--text)" href=${'#/modul/' + m.id}>
      <div class="between"><span class="b" style="font-size:14px">${m.name}</span><span class="b small" style="white-space:nowrap">${m.cp} CP</span></div>
      <div class="chips"><span class="chip">${m.code}</span>${m.pruefungsform && html`<span class="chip">${PRUEFUNGSFORM[m.pruefungsform] || m.pruefungsform}</span>`}
        ${m.anwesenheit_erledigt && html`<span class="chip ok">Anwesenheit ✓</span>`}
        <span class="chip">${m.pauschal_angerechnet ? 'pauschal' : m.benotet ? 'Gewicht ' + m.gewicht : 'unbenotet'}</span>
        ${m.note != null && html`<span class="chip dark">Note ${fmtNote(Number(m.note))}</span>`}${m.bestanden && !m.benotet && html`<span class="chip ok">bestanden</span>`}</div>
      <div class="row"><div class="bar" style="height:6px"><i style=${`width:${Math.max(p, 2)}%`}></i></div><span class="tiny b">${p} %</span></div></a>`;
  })}</div>`;
}

function Modul({ st, api, id }) {
  const m = st.modules.find(x => x.id === id);
  const [neu, setNeu] = useState(false);
  if (!m) return html`<div class="content"><${Back} label="Zurück" /><div class="card">Modul nicht gefunden.</div></div>`;
  const ts = st.tasks.filter(t => t.module_id === m.id);
  const save = patch => api.upsert('modules', { id: m.id, ...patch }, 'modules');
  const doz = m.dozent || {};
  return html`<div class="hero"><${Back} to=${'#/semester/' + m.semester} label=${m.semester + '. Semester'} />
    <div class="col" style="gap:2px"><span style="font-size:22px;font-weight:900;line-height:1.15">${m.name}</span><span class="sub">${m.code} · ${m.cp} CP · ${PRUEFUNGSFORM[m.pruefungsform] || m.pruefungsform || '–'}</span></div>
    <div class="card col" style="gap:6px;background:#fff;color:#3D1418">
      <input class="input" style="min-height:38px" placeholder="Name Dozent*in" value=${doz.name || ''} onChange=${e => save({ dozent: { ...doz, name: e.target.value } })} aria-label="Name Dozent*in" />
      <input class="input" style="min-height:38px;font-style:italic" placeholder="Dein Spruch für diese Person" value=${doz.spruch || ''} onChange=${e => save({ dozent: { ...doz, spruch: e.target.value } })} aria-label="Spruch" />
      <a class="row small b" style="color:#8C1C2B;text-decoration:none" href=${'#/dozent/' + m.id}><span dangerouslySetInnerHTML=${{ __html: M.avatar(doz.figur, 44) }} style="display:flex"></span>Figur im Kleiderschrank stylen ›</a></div></div>
  <div class="content">
    <div class="card" style="padding:2px 14px">
      <label class="field">Anwesenheit erledigt<input type="checkbox" checked=${m.anwesenheit_erledigt} onChange=${e => save({ anwesenheit_erledigt: e.target.checked })} /></label>
      ${m.benotet ? html`<label class="field">Note<input type="number" step="0.1" min="1" max="5" placeholder="z. B. 1,7" value=${m.note ?? ''} onChange=${e => save({ note: e.target.value === '' ? null : Number(e.target.value.replace(',', '.')) })} /></label>`
      : html`<label class="field">Bestanden<input type="checkbox" checked=${!!m.bestanden} onChange=${e => save({ bestanden: e.target.checked })} /></label>`}
      ${m.zulassungsrelevant && html`<div class="tiny" style="padding:8px 0">Pflicht für die Zulassung zu den Prüfungen im 5./6. Semester.</div>`}
    </div>
    <div class="between"><span class="h2">Aufgaben</span><button class="btn small" onClick=${() => setNeu(!neu)}>${neu ? 'Abbrechen' : '+ Aufgabe'}</button></div>
    ${neu && html`<${TaskForm} m=${m} api=${api} done=${() => setNeu(false)} />`}
    ${ts.length ? ts.map(t => html`<${TaskDetail} t=${t} api=${api} />`) : !neu && html`<div class="card small">Noch keine Aufgabe. Leg die Abgabe an, dann plant Bernd mit.</div>`}
    <div class="card col"><span class="b small">Notizen</span><textarea class="input" placeholder="Links, Bewertungskriterien, Literatur …" value=${m.notizen || ''} onChange=${e => save({ notizen: e.target.value })}></textarea></div>
  </div>`;
}
function TaskForm({ m, api, done }) {
  const [f, setF] = useState({ titel: PRUEFUNGSFORM[m.pruefungsform] || 'Aufgabe', art: m.pruefungsform || '', abgabe: '', zeit: '23:59', umfang_seiten: '' });
  const submit = async e => {
    e.preventDefault();
    const schritte = (SCHRITTE[f.art] || SCHRITTE._).map(text => ({ text, erledigt: false }));
    const r = await api.upsert('tasks', { module_id: m.id, titel: f.titel, art: f.art, abgabe: f.abgabe ? combine(f.abgabe, f.zeit).toISOString() : null, umfang_seiten: f.umfang_seiten ? +f.umfang_seiten : null, schritte, status: 'offen' }, 'tasks');
    if (r && f.abgabe) await api.upsert('events', { typ: 'abgabe', titel: `Abgabe: ${f.titel}`, start_at: combine(f.abgabe, f.zeit).toISOString(), ganztags: true, task_id: r.id }, 'events');
    if (r) { toast('Aufgabe angelegt'); api.replan(true); done(); }
  };
  return html`<form class="card" style="padding:2px 14px" onSubmit=${submit}>
    <label class="field">Titel<input value=${f.titel} onInput=${e => setF({ ...f, titel: e.target.value })} required /></label>
    <label class="field">Art<select value=${f.art} onChange=${e => setF({ ...f, art: e.target.value })}>${Object.entries(PRUEFUNGSFORM).map(([k, v]) => html`<option value=${k}>${v}</option>`)}<option value="">Sonstiges</option></select></label>
    <label class="field">Abgabe am<input type="date" value=${f.abgabe} onInput=${e => setF({ ...f, abgabe: e.target.value })} /></label>
    <label class="field">Uhrzeit<input type="time" value=${f.zeit} onInput=${e => setF({ ...f, zeit: e.target.value })} /></label>
    <label class="field">Umfang (Seiten)<input type="number" min="0" value=${f.umfang_seiten} onInput=${e => setF({ ...f, umfang_seiten: e.target.value })} /></label>
    <div style="padding:10px 0"><button class="btn">Speichern</button></div></form>`;
}
function TaskDetail({ t, api }) {
  const [open, setOpen] = useState(false); const p = progress(t); const d = t.abgabe ? daysUntil(t.abgabe) : null;
  const save = patch => api.upsert('tasks', { id: t.id, ...patch }, 'tasks');
  const toggle = i => save({ schritte: t.schritte.map((s, j) => j === i ? { ...s, erledigt: !s.erledigt } : s) });
  return html`<div class="card col" style="gap:8px">
    <button class="between" style="background:none;border:0;padding:0;text-align:left;cursor:pointer" onClick=${() => setOpen(!open)}>
      <div class="col" style="gap:1px"><span class="b" style="font-size:15px">${t.titel}</span><span class="tiny">${t.abgabe ? 'Abgabe ' + fmtDate(t.abgabe) + ' · ' + hm(new Date(t.abgabe)) : 'ohne Termin'}${t.umfang_seiten ? ' · ' + t.umfang_seiten + ' Seiten' : ''}</span></div>
      <span class=${'chip' + (d != null && d <= 7 && t.status === 'offen' ? ' dark' : '')}>${t.status === 'offen' ? (d == null ? 'offen' : d < 0 ? 'überfällig' : `in ${d} T.`) : t.status}</span></button>
    <div class="row"><div class="bar"><i style=${`width:${Math.max(p, 2)}%`}></i></div><span class="tiny b">${t.schritte?.filter(s => s.erledigt).length || 0} / ${t.schritte?.length || 0}</span></div>
    ${open && html`<div class="col" style="gap:0">
      ${(t.schritte || []).map((s, i) => html`<label class=${'check' + (s.erledigt ? ' done' : '')}><input type="checkbox" checked=${s.erledigt} onChange=${() => toggle(i)} /><span style="font-size:14px;font-weight:700">${s.text}</span></label>`)}
      ${t.schritte?.some(s => s.text.startsWith('Format-Check')) && html`<details style="margin:6px 0"><summary class="small b" style="cursor:pointer">Format-Check laut Leitfaden</summary><ul class="small" style="margin:6px 0;padding-left:18px">${FORMAT_CHECK.map(x => html`<li>${x}</li>`)}</ul></details>`}
      ${t.umfang_seiten && html`<label class="field">Seiten geschrieben<input type="number" min="0" max=${t.umfang_seiten} value=${t.seiten_geschrieben || 0} onChange=${e => save({ seiten_geschrieben: +e.target.value })} /></label>`}
      <label class="field">Status<select value=${t.status} onChange=${e => save({ status: e.target.value })}><option value="offen">offen</option><option value="abgegeben">abgegeben</option><option value="bewertet">bewertet</option></select></label>
      <label class="field">Note dieser Leistung<input type="number" step="0.1" min="1" max="5" value=${t.note ?? ''} onChange=${e => save({ note: e.target.value === '' ? null : +e.target.value })} /></label>
      <div class="row" style="padding-top:8px"><a class="btn small" style="flex:1" href=${'#/timer/' + t.id}>Arbeitsphase starten</a>
        <button class="btn small ghost" onClick=${() => confirm('Aufgabe wirklich löschen?') && api.remove('tasks', t.id, 'tasks')}>Löschen</button></div>
    </div>`}
  </div>`;
}

// ---------------- Kalender ----------------
function Kalender({ st, api }) {
  const [view, setView] = useState('Woche'); const [ref, setRef] = useState(new Date()); const [sel, setSel] = useState(null);
  const H = window.innerWidth >= 768 ? 26 : 17;
  const mon = mondayOf(ref); const days = [...Array(7)].map((_, i) => addDays(mon, i));
  const evs = useMemo(() => expand(st.events, addDays(mon, -31), addDays(mon, 45)), [st.events, ref]);
  const del = async e => { if (e._rep ? confirm('Ganze Serie löschen?') : confirm('Eintrag löschen?')) { await api.remove('events', e.id, 'events'); setSel(null); } };
  const month = useMemo(() => {
    const first = new Date(ref.getFullYear(), ref.getMonth(), 1); const start = mondayOf(first);
    return [...Array(42)].map((_, i) => addDays(start, i));
  }, [ref]);
  const shift = n => setRef(view === 'Woche' ? addDays(ref, 7 * n) : new Date(ref.getFullYear(), ref.getMonth() + n, 1));
  const selDay = sel?.day || new Date();
  return html`<div class="hero"><div class="between"><h1>Kalender</h1><a href="#/eintrag" aria-label="Eintrag hinzufügen" style="width:44px;height:44px;border-radius:22px;background:var(--t-stud);display:flex;align-items:center;justify-content:center"><${Icon} n="plus" color="#fff" /></a></div>
    <div class="seg">${['Monat', 'Woche'].map(v => html`<button class=${view === v ? 'on' : ''} onClick=${() => setView(v)}>${v}</button>`)}</div>
    <div class="between"><button class="back" onClick=${() => shift(-1)}>‹ zurück</button><span class="b small">${view === 'Woche' ? `${days[0].getDate()}. – ${days[6].getDate()}. ${MON[days[6].getMonth()]} ${days[6].getFullYear()}` : `${MON[ref.getMonth()]} ${ref.getFullYear()}`}</span><button class="back" onClick=${() => shift(1)}>weiter ›</button></div></div>
  <div class="content">
  ${view === 'Woche' ? html`<div class="week"><div class="hours">${[0, 6, 12, 18].map(x => html`<div style=${`height:${6 * H}px`}>${pad(x)}</div>`)}</div>
    ${days.map(d => {
      const ds = dayStart(d), de = addDays(ds, 1); const list = evs.filter(e => e._e > ds && e._s < de);
      const flag = list.find(e => e.typ === 'abgabe') || list.find(e => e.ganztags);
      return html`<div class="day"><div class=${'dh' + (sameDay(d, new Date()) ? ' today' : '')} onClick=${() => { setSel({ day: d }); setView('Monat'); setRef(d); }}><small>${WT[d.getDay()]}</small><b>${d.getDate()}</b></div>
        ${flag ? html`<div class="flag" style=${`background:${EVENT_TYPEN[flag.typ]?.farbe};color:${EVENT_TYPEN[flag.typ]?.text}`}>${flag.typ === 'abgabe' ? 'ABGABE' : ({ uni: 'UNI', urlaub: 'URLAUB', geburtstag: 'GEB.', schule: 'SCHULE' }[flag.typ] || (EVENT_TYPEN[flag.typ]?.label || '').toUpperCase().slice(0, 6))}</div>` : html`<div style="height:16px;margin:3px 0"></div>`}
        <div class="lane" style=${`height:${24 * H}px`}>${list.filter(e => !e.ganztags).map(e => {
          const s = Math.max(0, (e._s - ds) / 36e5), en = Math.min(24, (e._e - ds) / 36e5); const t = EVENT_TYPEN[e.typ] || EVENT_TYPEN.privat;
          return html`<div class="ev" title=${`${e.titel || t.label} ${hm(e._s)}–${hm(e._e)}`} onClick=${() => setSel({ day: d, ev: e })} style=${`top:${s * H}px;height:${Math.max((en - s) * H - 2, 8)}px;background:${t.farbe};color:${t.text}`}>${(e.titel || t.label).slice(0, 8)}</div>`;
        })}</div></div>`;
    })}</div>` : html`<div class="card" style="padding:10px"><div class="month">${['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(x => html`<span class="wd">${x}</span>`)}
    ${month.map(d => {
      const ds = dayStart(d), de = addDays(ds, 1); const list = evs.filter(e => e._e > ds && e._s < de); const types = [...new Set(list.map(e => e.typ))].slice(0, 4);
      const inMonth = d.getMonth() === ref.getMonth();
      return html`<button class=${sameDay(d, selDay) ? 'sel' : ''} style=${inMonth ? '' : 'opacity:.35'} onClick=${() => setSel({ day: d })}>${d.getDate()}<span class="dots">${types.map(t => html`<i style=${`background:${EVENT_TYPEN[t]?.farbe};outline:1px solid #fff`}></i>`)}</span></button>`;
    })}</div></div>`}
  ${view === 'Woche' ? html`<div class="legend">${['dienst', 'ruhezeit', 'arbeitsphase', 'uni', 'schule', 'online', 'erste_hilfe', 'privat'].map(k => html`<span><i style=${`background:${EVENT_TYPEN[k].farbe}`}></i>${EVENT_TYPEN[k].label}</span>`)}</div>` : ''}
  <button class="btn ghost small" onClick=${() => api.replan(false)}>Bernd neu planen lassen</button>
  <span class="h2">${fmtDate(sel?.day || new Date())}</span>
  ${(() => { const ds = dayStart(selDay), de = addDays(ds, 1); const list = evs.filter(e => e._e > ds && e._s < de); return list.length ? list.map(e => html`<${EventRow} e=${e} onClick=${() => setSel({ day: selDay, ev: e })} />`) : html`<div class="card small">Keine Einträge.</div>`; })()}
  ${sel?.ev && html`<div class="card col"><span class="b">${sel.ev.titel || EVENT_TYPEN[sel.ev.typ]?.label}</span><span class="small">${hm(sel.ev._s)}–${hm(sel.ev._e)}${sel.ev.ort ? ' · ' + sel.ev.ort : ''}</span><button class="btn small ghost" onClick=${() => del(sel.ev)}>Löschen</button></div>`}
  </div>`;
}

function Eintrag({ st, api }) {
  const today = isoDate(new Date());
  const [typ, setTyp] = useState('dienst'); const [tpl, setTpl] = useState(null);
  const [f, setF] = useState({ titel: '', datum: today, von: '10:00', bis: '11:00', ganztags: false, ort: '', wdh: '', bis_datum: today, ruhe: true });
  const typen = ['dienst', 'arbeitsphase', 'schule', 'uni', 'online', 'erste_hilfe', 'urlaub', 'sport', 'geburtstag', 'privat', 'dlrg'];
  const set = (k, v) => setF({ ...f, [k]: v });
  const pickTyp = t => { setTyp(t); if (t === 'schule') setF({ ...f, titel: 'Schule Schleswig', von: '09:00', bis: '16:15', ort: 'Schleswig' }); if (t === 'geburtstag') setF({ ...f, ganztags: true, wdh: 'FREQ=YEARLY' }); if (t === 'urlaub') setF({ ...f, ganztags: true }); };
  const submit = async e => {
    e.preventDefault();
    let start, end, titel = f.titel;
    if (typ === 'dienst') {
      if (!tpl) { toast('Bitte eine Dienstvorlage wählen'); return; }
      start = combine(f.datum, tpl.start_zeit.slice(0, 5)); end = combine(f.datum, tpl.ende_zeit.slice(0, 5)); if (end <= start) end = addDays(end, 1); titel = titel || tpl.kuerzel;
    } else if (f.ganztags) { start = combine(f.datum, '00:00'); end = addDays(combine(typ === 'urlaub' ? f.bis_datum : f.datum, '00:00'), 1); }
    else { start = combine(f.datum, f.von); end = combine(f.datum, f.bis); if (end <= start) end = addDays(end, 1); }
    const row = { typ, titel: titel || EVENT_TYPEN[typ].label, start_at: start.toISOString(), ende_at: end.toISOString(), ganztags: f.ganztags && typ !== 'dienst', ort: f.ort || null, wiederholung: f.wdh || null, shift_template_id: tpl?.id || null };
    const r = await api.upsert('events', row, 'events');
    if (r && typ === 'dienst' && tpl?.ruhezeit_danach && f.ruhe) {
      const [rh, rm] = (st.profile?.settings?.ruhezeit_bis || '13:00').split(':');
      const rEnd = new Date(end); rEnd.setHours(+rh, +rm, 0, 0);
      if (rEnd > end) await api.upsert('events', { typ: 'ruhezeit', titel: 'Ruhezeit', start_at: end.toISOString(), ende_at: rEnd.toISOString() }, 'events');
    }
    if (r && typ === 'urlaub') {
      const v = await sb.from('vacations').insert({ reiseziel: f.ort || titel || 'Urlaub', start_datum: f.datum, ende_datum: f.bis_datum || f.datum, event_id: r.id }).select().single();
      if (v.data) { await M.seedVacation(v.data); toast('Urlaub angelegt – die Planung wartet unter Mehr → Urlaube'); go('#/urlaub/' + v.data.id); return; }
    }
    if (r && typ === 'geburtstag') { toast('Geburtstag eingetragen – jetzt Geschenkideen sammeln!'); go('#/geschenk/' + r.id); return; }
    if (r) { toast('Eingetragen'); api.replan(true); go('#/kalender'); }
  };
  return html`<div class="hero"><${Back} to="#/kalender" label="Kalender" /><h1>Neuer Eintrag</h1></div>
  <form class="content" onSubmit=${submit}>
    <div class="chips">${typen.map(t => html`<button type="button" class=${'pill' + (typ === t ? ' on' : '')} onClick=${() => pickTyp(t)}>${EVENT_TYPEN[t].label}</button>`)}</div>
    ${typ === 'dienst' && html`<span class="b small">Dienstvorlage</span><div class="tgrid">${st.shifts.map(s => html`<button type="button" class=${tpl?.id === s.id ? 'on' : ''} onClick=${() => setTpl(s)}><b>${s.kuerzel}</b><small>${s.start_zeit.slice(0, 5)}–${s.ende_zeit.slice(0, 5)}</small></button>`)}</div>`}
    <div class="card" style="padding:2px 14px">
      ${typ !== 'dienst' && html`<label class="field">${typ === 'geburtstag' ? 'Wessen Geburtstag?' : 'Titel'}<input value=${f.titel} placeholder=${typ === 'geburtstag' ? 'z. B. Mama' : EVENT_TYPEN[typ].label} onInput=${e => set('titel', e.target.value)} /></label>`}
      <label class="field">${typ === 'urlaub' ? 'Von' : 'Datum'}<input type="date" value=${f.datum} onInput=${e => set('datum', e.target.value)} required /></label>
      ${typ === 'urlaub' && html`<label class="field">Bis<input type="date" value=${f.bis_datum} onInput=${e => set('bis_datum', e.target.value)} /></label>`}
      ${typ !== 'dienst' && typ !== 'urlaub' && html`<label class="field">Ganztägig<input type="checkbox" checked=${f.ganztags} onChange=${e => set('ganztags', e.target.checked)} /></label>`}
      ${typ !== 'dienst' && !f.ganztags && html`<label class="field">Von<input type="time" value=${f.von} onInput=${e => set('von', e.target.value)} /></label><label class="field">Bis<input type="time" value=${f.bis} onInput=${e => set('bis', e.target.value)} /></label>`}
      ${['erste_hilfe', 'schule', 'uni', 'privat', 'dlrg', 'sport', 'urlaub', 'online'].includes(typ) && html`<label class="field">${typ === 'urlaub' ? 'Reiseziel' : 'Ort'}<input value=${f.ort} placeholder=${typ === 'online' ? 'Link' : ''} onInput=${e => set('ort', e.target.value)} /></label>`}
      ${typ === 'dienst' && tpl?.ruhezeit_danach && html`<label class="field"><span class="col" style="gap:0">Ruhezeit danach<span class="tiny">bis ${st.profile?.settings?.ruhezeit_bis || '13:00'} blocken, Bernd schweigt</span></span><input type="checkbox" checked=${f.ruhe} onChange=${e => set('ruhe', e.target.checked)} /></label>`}
      <label class="field">Wiederholen<select value=${f.wdh} onChange=${e => set('wdh', e.target.value)}>
        <option value="">nie</option><option value="FREQ=DAILY">täglich</option><option value="FREQ=WEEKLY">wöchentlich</option><option value="FREQ=WEEKLY;INTERVAL=2">alle 2 Wochen</option><option value="FREQ=MONTHLY">monatlich</option><option value="FREQ=YEARLY">jährlich</option></select></label>
    </div>
    <button class="btn">Eintragen</button>
  </form>`;
}

// ---------------- Aufgaben & To-dos ----------------
function Aufgaben({ st }) {
  const offen = st.tasks.filter(t => t.status === 'offen').sort((a, b) => (a.abgabe ? new Date(a.abgabe) : 9e15) - (b.abgabe ? new Date(b.abgabe) : 9e15));
  return html`<div class="hero"><h1>Aufgaben</h1><div class="seg"><a class="on" href="#/aufgaben">Abgaben</a><a href="#/todos">To-dos</a></div></div>
  <div class="content"><span class="h2">Nach Abgabetermin sortiert</span>
    ${offen.length ? offen.map(t => html`<${TaskCard} t=${t} st=${st} />`) : html`<div class="card small">Keine offenen Abgaben. Neue Aufgaben legst du im Studium-Reiter beim jeweiligen Modul an.</div>`}
    <a class="btn ghost" href="#/nullbock" style="border:2px solid var(--t-auf);color:var(--accent)">Null Bock heute? Bernd hat Alternativen</a></div>`;
}
function NullBock({ st }) {
  const t = st.tasks.filter(x => x.status === 'offen' && x.abgabe).sort((a, b) => new Date(a.abgabe) - new Date(b.abgabe))[0];
  const naechster = t?.schritte?.find(s => !s.erledigt)?.text;
  const anderes = st.tasks.find(x => x.status === 'offen' && x.id !== t?.id);
  const todo = st.todos.find(x => !x.erledigt && x.liste === 'studium');
  const alts = [
    ['Mini-Version', t ? `15 Minuten an „${naechster || t.titel}“ – nur Material sortieren` : '15 Minuten Unterlagen sortieren', 15],
    ['Anderer Einstieg', t ? `Gliederung oder Notizen statt Fließtext für „${t.titel}“` : 'Ideen sammeln statt schreiben', 45],
    ...(anderes ? [['Anderes Modul', `Weiter an „${anderes.titel}“`, 45]] : []),
    ...(todo ? [['Kleines To-do', todo.titel, 15]] : []),
    ['Kopf frei kriegen', '20 Minuten raus, danach eine Arbeitsphase', 45],
  ];
  return html`<div class="hero"><${Back} to="#/aufgaben" label="Aufgaben" />
    <div class="row" style="align-items:flex-end"><${Bernd} mood="enttaeuscht" size=${96} /><div class="bubble">${t ? `Keine Lust auf „${t.titel}“? Verständlich. Kürzer wird sie davon nicht. Nimm wenigstens was Kleines.` : 'Nichts Dringendes offen. Gönn dir was. Ausnahmsweise.'}</div></div></div>
  <div class="content"><span class="h2">Bernds Alternativen für heute</span>
    ${alts.map(([k, txt, min]) => html`<a class="card between" style="text-decoration:none;color:var(--text)" href=${'#/timer' + (t ? '/' + t.id : '')}><div class="col" style="gap:1px"><span class="tiny b" style="color:var(--accent)">${k}</span><span class="b" style="font-size:14px">${txt}</span></div><span class="chip">${min} Min.</span></a>`)}
    ${t && html`<a class="btn" href=${'#/timer/' + t.id}>Ach, dann doch „${t.titel}“</a>`}</div>`;
}
function Todos({ st, api }) {
  const [liste, setListe] = useState('studium'); const [txt, setTxt] = useState(''); const [due, setDue] = useState(''); const [wichtig, setWichtig] = useState(false);
  const items = st.todos.filter(t => t.liste === liste).sort((a, b) => a.erledigt - b.erledigt || (b.wichtig - a.wichtig));
  const add = async e => { e.preventDefault(); if (!txt.trim()) return; await api.upsert('todos', { liste, titel: txt.trim(), faellig: due || null, wichtig }, 'todos'); setTxt(''); setDue(''); setWichtig(false); };
  return html`<div class="hero"><h1>Aufgaben</h1><div class="seg"><a href="#/aufgaben">Abgaben</a><a class="on" href="#/todos">To-dos</a></div></div>
  <div class="content">
    <div class="chips">${TODO_LISTEN.map(([k, l]) => html`<button class=${'pill' + (liste === k ? ' on' : '')} style=${liste === k ? 'background:var(--t-auf);border-color:var(--t-auf)' : ''} onClick=${() => setListe(k)}>${l} <span class="tiny" style="color:inherit;opacity:.8">${st.todos.filter(t => t.liste === k && !t.erledigt).length}</span></button>`)}</div>
    <form class="card col" onSubmit=${add} style="gap:8px">
      <input class="input" placeholder="Neues To-do …" value=${txt} onInput=${e => setTxt(e.target.value)} aria-label="Neues To-do" />
      <div class="row"><input class="input" type="date" style="flex:1" value=${due} onInput=${e => setDue(e.target.value)} aria-label="Fällig am" />
        <label class="row small b" style="gap:6px"><input type="checkbox" checked=${wichtig} onChange=${e => setWichtig(e.target.checked)} style="width:20px;height:20px;accent-color:#A3202E" />wichtig</label>
        <button class="btn small">+</button></div></form>
    <div class="card" style="padding:4px 14px">${items.length ? items.map(t => html`<div class="between" style="min-height:44px;border-bottom:1px solid var(--line)">
      <label class=${'check' + (t.erledigt ? ' done' : '')} style="flex:1"><input type="checkbox" checked=${t.erledigt} onChange=${e => api.upsert('todos', { id: t.id, erledigt: e.target.checked }, 'todos')} />
        <span class="col" style="gap:0"><span class="b" style="font-size:14px">${t.titel}</span>${t.faellig && html`<span class="tiny">bis ${fmtDate(t.faellig)}</span>`}</span></label>
      ${t.wichtig && html`<span style="width:8px;height:8px;border-radius:4px;background:#A3202E" aria-label="wichtig"></span>`}
      <button class="back" aria-label="To-do löschen" onClick=${() => api.remove('todos', t.id, 'todos')} style="padding:0 4px">✕</button></div>`) : html`<div class="small" style="padding:10px 0">Liste ist leer.</div>`}</div>
  </div>`;
}

// ---------------- Arbeitsphase-Timer ----------------
const TKEY = 'bernd_timer';
function Timer({ st, api, taskId }) {
  const rhythm = st.profile?.settings?.rhythmus || [45, 5, 45, 20, 45, 5];
  const [t, setT] = useState(() => JSON.parse(localStorage.getItem(TKEY) || 'null'));
  const [pick, setPick] = useState(taskId || '');
  const [, tick] = useState(0);
  useEffect(() => { const i = setInterval(() => tick(x => x + 1), 1000); return () => clearInterval(i); }, []);
  const save = v => { setT(v); v ? localStorage.setItem(TKEY, JSON.stringify(v)) : localStorage.removeItem(TKEY); };
  const offen = st.tasks.filter(x => x.status === 'offen');
  const start = async () => {
    const task = st.tasks.find(x => x.id === pick);
    const r = await api.upsert('work_sessions', { task_id: task?.id || null, module_id: task?.module_id || null, start_at: new Date().toISOString() }, 'sessions');
    if (hasNotif() && Notification.permission === 'default') Notification.requestPermission();
    save({ sid: r?.id, taskId: task?.id || null, phases: [...rhythm], idx: 0, phaseStart: Date.now(), pausedAt: null, workMin: 0 });
  };
  const finish = async (abgebrochen = false) => {
    if (!t) return; let work = t.workMin;
    if (t.idx % 2 === 0) work += Math.floor(((t.pausedAt || Date.now()) - t.phaseStart) / 6e4);
    if (t.sid) await api.upsert('work_sessions', { id: t.sid, ende_at: new Date().toISOString(), arbeit_min: work, abgebrochen }, 'sessions');
    save(null); toast(`${work} Minuten gearbeitet. Bernd ist ${work >= 45 ? 'stolz' : 'zufrieden'}.`);
  };
  if (t && !t.pausedAt) {
    const len = t.phases[t.idx] * 6e4; const el = Date.now() - t.phaseStart;
    if (el >= len) {
      const wasWork = t.idx % 2 === 0; const next = { ...t, workMin: t.workMin + (wasWork ? t.phases[t.idx] : 0), idx: (t.idx + 1) % t.phases.length, phaseStart: t.phaseStart + len };
      const msg = wasWork ? `Pause! ${t.phases[next.idx]} Minuten.` : 'Weiter geht’s: Arbeitsphase.';
      try { navigator.vibrate?.([200, 100, 200]); if (hasNotif() && Notification.permission === 'granted') new Notification('Bernd', { body: msg, icon: 'icons/icon-192.png' }); } catch (e) { }
      toast(msg); setTimeout(() => save(next), 0);
    }
  }
  if (!t) return html`<div class="hero"><${Back} label="Zurück" /><h1>Arbeitsphase</h1><span class="sub">Rhythmus: ${rhythm.join(' · ')} Min.</span></div>
    <div class="content"><div class="row" style="justify-content:center"><${Bernd} mood="zufrieden" size=${140} outfit=${st.profile?.bernd_outfit} /></div>
      <label class="card col"><span class="b small">Woran arbeitest du?</span><select class="input" value=${pick} onChange=${e => setPick(e.target.value)}><option value="">Ohne bestimmte Aufgabe</option>
        ${offen.map(x => html`<option value=${x.id}>${x.titel} · ${st.modules.find(m => m.id === x.module_id)?.code || ''}</option>`)}</select></label>
      <button class="btn" onClick=${start}><${Icon} n="play" fill="currentColor" color="none" />Los geht’s</button>
      <div class="card small">Tipp: Stell dein iPhone auf „Nicht stören“, solange die Arbeitsphase läuft. Automatisch geht das erst mit der echten iPhone-App.</div></div>`;
  const len = t.phases[t.idx] * 6e4; const el = (t.pausedAt || Date.now()) - t.phaseStart; const rest = Math.max(0, len - el);
  const isWork = t.idx % 2 === 0; const C = 2 * Math.PI * 96; const task = st.tasks.find(x => x.id === t.taskId);
  const workDone = t.workMin + (isWork ? Math.floor(el / 6e4) : 0);
  const adj = d => { const ph = [...t.phases]; ph[t.idx] = Math.max(1, ph[t.idx] + d); save({ ...t, phases: ph }); };
  const pause = () => t.pausedAt ? save({ ...t, phaseStart: t.phaseStart + (Date.now() - t.pausedAt), pausedAt: null }) : save({ ...t, pausedAt: Date.now() });
  return html`<div class="hero"><${Back} to="#/home" label="Home" /><span style="font-size:20px;font-weight:900">${task ? task.titel : 'Freie Arbeitsphase'}</span>
    <div class="row"><span class="chip dark">${isWork ? 'Arbeitsphase' : 'Pause'}</span><span class="small b">Phase ${t.idx + 1} von ${t.phases.length}</span></div></div>
  <div class="content timer">
    <svg width="230" height="230" viewBox="0 0 220 220" role="img" aria-label=${`Noch ${Math.ceil(rest / 6e4)} Minuten`}>
      <circle cx="110" cy="110" r="96" fill="none" stroke="var(--soft)" stroke-width="14" />
      <circle cx="110" cy="110" r="96" fill="none" stroke=${isWork ? '#A3202E' : '#2E7D5B'} stroke-width="14" stroke-linecap="round" stroke-dasharray=${C} stroke-dashoffset=${C * (1 - el / len)} transform="rotate(-90 110 110)" />
      <text x="110" y="112" text-anchor="middle" font-size="46" font-weight="900" fill="var(--text)" font-family="Nunito">${pad(Math.floor(rest / 6e4))}:${pad(Math.floor(rest / 1000) % 60)}</text>
      <text x="110" y="142" text-anchor="middle" font-size="14" font-weight="800" fill="var(--muted)" font-family="Nunito">${t.pausedAt ? 'pausiert' : isWork ? 'konzentrieren' : 'durchatmen'}</text></svg>
    <div class="phases">${t.phases.map((p, i) => html`<i style=${`flex:${p};background:${i < t.idx ? (i % 2 ? '#F6C1CB' : '#A3202E') : i === t.idx ? (i % 2 ? '#2E7D5B' : '#D9536A') : 'var(--card)'}`}></i>`)}</div>
    <div class="between" style="width:100%"><span class="tiny">${t.phases.join(' · ')} Min.</span><span class="tiny">gearbeitet: ${workDone} Min.</span></div>
    <div class="row" style="gap:14px"><button class="ctrl" aria-label="5 Minuten kürzer" onClick=${() => adj(-5)}><${Icon} n="minus" /></button>
      <button class="ctrl" aria-label=${t.pausedAt ? 'Weiter' : 'Pausieren'} onClick=${pause}><${Icon} n=${t.pausedAt ? 'play' : 'pause'} /></button>
      <button class="ctrl" aria-label="5 Minuten länger" onClick=${() => adj(5)}><${Icon} n="plus" /></button></div>
    <div class="card row" style="width:100%"><${Bernd} mood="zufrieden" size=${56} outfit=${st.profile?.bernd_outfit} /><span class="small b" style="color:var(--text)">${isWork ? 'Läuft. Ich sag nichts, sonst bring ich dich raus.' : 'Pause. Wasser trinken, aufstehen, nicht aufs Handy starren. Okay, ein bisschen.'}</span></div>
    <button class="btn ghost" onClick=${() => finish(false)}><${Icon} n="stop" />Arbeitsphase beenden</button>
  </div>`;
}

// ---------------- Mehr & Einstellungen ----------------
function Mehr() {
  const tiles = [['Brainstorming', 'Ideen → PICO & ECLIPSE', '#/brainstorming', 'auf'], ['Finanzen', 'Einnahmen, Ausgaben, Sparen', '#/finanzen', 'kal'], ['Stipendium', 'Ausgaben & Bescheide', '#/stipendium', 'stud'],
    ['Steuern', 'Werbungskosten sammeln', '#/steuern', 'auf'], ['Dozierende', 'Kleiderschrank & Sprüche', '#/dozierende', 'stud'], ['Nachschlagen', 'Handlungsempfehlungen RD SH', '#/nachschlagen', 'auf'],
    ['Urlaube', 'Reisen planen', '#/urlaube', 'kal'], ['Geschenkideen', 'Zu jedem Geburtstag', '#/geschenke', 'home'], ['Bernd & Outfits', 'Freigeschaltete Looks', '#/outfits', 'home'], ['Einstellungen', 'Zeiten, Bernd, Aussehen', '#/einstellungen', 'mehr']];
  return html`<div class="hero"><h1>Mehr</h1><span class="sub">Alles, was nicht in die anderen Reiter passt</span></div>
  <div class="content"><div class="tiles">${tiles.map(([n, s, href, ic]) => html`<a class="card tile" href=${href}><span class="ic"><${Icon} n=${ic} /></span><span class="b" style="font-size:14px">${n}</span><span class="tiny">${s}</span></a>`)}</div>
    <button class="btn ghost" onClick=${() => sb.auth.signOut()}>Abmelden</button></div>`;
}
function KalAbo({ st, api }) {
  const tok = st.profile?.ical_token;
  const url = tok ? `${SUPABASE_URL}/functions/v1/bernd-ical?t=${tok}` : '';
  const neu = async () => { if (tok && !confirm('Neuen Link erzeugen? Der alte Link funktioniert danach nicht mehr.')) return;
    const t = [...crypto.getRandomValues(new Uint8Array(24))].map(b => b.toString(16).padStart(2, '0')).join(''); await api.saveProfile({ ical_token: t }); };
  return html`<div class="card col">
    <span class="small" style="color:var(--text)">Deine Termine aus Bernd als Abo im Kalender deines iPhones. Von dort kann TimeTree sie anzeigen. Nur zum Anschauen, Änderungen machst du in Bernd.</span>
    ${tok ? html`<a class="btn small" href=${url.replace(/^https:/, 'webcal:')}>Im iPhone-Kalender abonnieren</a>
      <button class="btn small ghost" onClick=${() => { navigator.clipboard?.writeText(url); toast('Link kopiert'); }}>Link kopieren (für Google Kalender)</button>
      <button class="back" style="justify-content:center;font-size:12px" onClick=${neu}>Neuen Link erzeugen (alter wird ungültig)</button>`
    : html`<button class="btn small" onClick=${neu}>Privaten Kalender-Link erstellen</button>`}
    <span class="tiny">Der Link ist geheim wie ein Passwort: Wer ihn hat, sieht deine Termine. Ruhezeiten werden nicht übertragen.</span></div>`;
}
function Einstellungen({ st, api }) {
  const s = st.profile?.settings || {};
  const set = patch => api.saveProfile({ settings: { ...s, ...patch } });
  const [z1, z2] = s.zeitfenster || [['10:00', '16:00'], ['19:00', '21:00']];
  const frech = ['lieb', 'frech', 'schwarzer Humor', 'gnadenlos'];
  return html`<div class="hero"><${Back} to="#/mehr" label="Mehr" /><h1>Einstellungen</h1></div>
  <div class="content">
    <span class="tiny b">PROFIL</span>
    <div class="card" style="padding:2px 14px"><label class="field">Vorname<input value=${st.profile?.vorname || ''} placeholder="Arlene" onChange=${e => api.saveProfile({ vorname: e.target.value })} /></label>
      <label class="field">Aktuelles Semester<select value=${s.semester || 1} onChange=${e => set({ semester: +e.target.value })}>${[1, 2, 3, 4, 5, 6].map(x => html`<option value=${x}>${x}.</option>`)}</select></label></div>
    <span class="tiny b">ARBEITSPHASEN</span>
    <div class="card" style="padding:2px 14px">
      <label class="field">Zeitfenster 1<span><input type="time" value=${z1[0]} onChange=${e => set({ zeitfenster: [[e.target.value, z1[1]], z2] })} style="max-width:90px" /> – <input type="time" value=${z1[1]} onChange=${e => set({ zeitfenster: [[z1[0], e.target.value], z2] })} style="max-width:90px" /></span></label>
      <label class="field">Zeitfenster 2<span><input type="time" value=${z2[0]} onChange=${e => set({ zeitfenster: [z1, [e.target.value, z2[1]]] })} style="max-width:90px" /> – <input type="time" value=${z2[1]} onChange=${e => set({ zeitfenster: [z1, [z2[0], e.target.value]] })} style="max-width:90px" /></span></label>
      <label class="field">Rhythmus (Min.)<input value=${(s.rhythmus || [45, 5, 45, 20, 45, 5]).join(' ')} onChange=${e => { const r = e.target.value.split(/[\s,·]+/).map(Number).filter(x => x > 0); if (r.length >= 2) set({ rhythmus: r }); }} /></label>
      <label class="field">Tagesmaximum (Std.)<input type="number" min="1" max="10" step="0.5" value=${(s.tagesmaximum_min || 360) / 60} onChange=${e => set({ tagesmaximum_min: Math.round(+e.target.value * 60) })} /></label>
      <label class="field">Wochenende erlaubt<input type="checkbox" checked=${s.wochenende !== false} onChange=${e => set({ wochenende: e.target.checked })} /></label></div>
    <span class="tiny b">BERND</span>
    <div class="card col"><span class="b small">Wie frech ist Bernd? <span style="color:var(--accent)">${frech[(s.bernd_frechheit || 3) - 1]}</span></span>
      <input type="range" min="1" max="4" value=${s.bernd_frechheit || 3} onChange=${e => set({ bernd_frechheit: +e.target.value })} aria-label="Frechheit" />
      <label class="field">Schonmodus (heute lieb sein)<input type="checkbox" checked=${!!s.schonmodus} onChange=${e => set({ schonmodus: e.target.checked })} /></label>
      <label class="field"><span class="col" style="gap:0">Benachrichtigungen<span class="tiny">auf jedem Gerät einmal aktivieren</span></span><button class="btn small" onClick=${pushAktivieren}>Aktivieren</button></label></div>
    <span class="tiny b">DIENSTE & KALENDER</span>
    <div class="card" style="padding:2px 14px">
      <label class="field">Ruhezeit nach Nacht/24h bis<input type="time" value=${s.ruhezeit_bis || '13:00'} onChange=${e => set({ ruhezeit_bis: e.target.value })} /></label>
      <label class="field">Fahrtkosten-Satz (€/km)<input inputmode="decimal" value=${String(s.km_satz ?? 0.30).replace('.', ',')} onChange=${e => set({ km_satz: Number(e.target.value.replace(',', '.')) || 0.30 })} /></label>
      <label class="field">Moodle-Kalender-Link<input placeholder="https://…" value=${st.profile?.moodle_ical_url || ''} onChange=${e => api.saveProfile({ moodle_ical_url: e.target.value })} /></label>
      <div class="tiny" style="padding:6px 0 10px">Der Abgleich mit Moodle wird in Etappe 2 aktiviert.</div></div>
    <span class="tiny b">KALENDER-ABO (iPhone, Google, TimeTree)</span>
    <${KalAbo} st=${st} api=${api} />
    <span class="tiny b">AUSSEHEN</span>
    <div class="card" style="padding:2px 14px"><label class="field">Nachtmodus<select value=${s.nachtmodus || 'sonnenuntergang'} onChange=${e => set({ nachtmodus: e.target.value })}><option value="sonnenuntergang">automatisch abends</option><option value="immer">immer</option><option value="nie">nie</option></select></label></div>
  </div>`;
}

// ---------------- App ----------------
function Main({ user }) {
  const [st, api] = useStore(user); const hash = useHash(); CTX.reloadStore = api.reload;
  const [route, a1] = hash.replace(/^#\//, '').split('/');
  useEffect(() => { const i = setInterval(() => applyNight(st.profile?.settings), 6e4); return () => clearInterval(i); }, [st.profile]);
  if (st.loading) return html`<div class="center"><${Bernd} mood="ruhe" size=${120} /><b>Bernd sortiert deine Daten …</b></div>`;
  if (st.error) return html`<div class="center"><${Bernd} mood="enttaeuscht" size=${120} /><b>Da ging was schief.</b><div class="card small">${st.error}</div><button class="btn small" onClick=${api.reload}>Nochmal versuchen</button></div>`;
  const P = { st, api };
  const view = {
    home: () => html`<${Home} ...${P} />`, studium: () => html`<${Studium} ...${P} />`, semester: () => html`<${Semester} ...${P} s=${a1} />`,
    modul: () => html`<${Modul} ...${P} id=${a1} />`, kalender: () => html`<${Kalender} ...${P} />`, eintrag: () => html`<${Eintrag} ...${P} />`,
    aufgaben: () => html`<${Aufgaben} ...${P} />`, todos: () => html`<${Todos} ...${P} />`, nullbock: () => html`<${NullBock} ...${P} />`,
    timer: () => html`<${Timer} ...${P} taskId=${a1} />`, mehr: () => html`<${Mehr} />`, einstellungen: () => html`<${Einstellungen} ...${P} />`,
    finanzen: () => html`<${M.Finanzen} />`, buchung: () => html`<${M.Buchung} />`, stipendium: () => html`<${M.Stipendium} />`, steuern: () => html`<${M.Steuern} ...${P} />`,
    nachschlagen: () => html`<${M.Nachschlagen} />`, dokument: () => html`<${M.Dokument} id=${a1} />`, urlaube: () => html`<${M.Urlaube} />`, urlaub: () => html`<${M.Urlaub} id=${a1} />`,
    dozierende: () => html`<${M.Dozierende} ...${P} />`, dozent: () => html`<${M.Kleiderschrank} ...${P} id=${a1} />`, outfits: () => html`<${M.Outfits} ...${P} />`,
    brainstorming: () => html`<${M.Brainstorming} ...${P} />`, idee: () => html`<${M.Idee} ...${P} id=${a1} />`,
    geschenke: () => html`<${M.Geschenke} ...${P} />`, geschenk: () => html`<${M.Geschenk} ...${P} id=${a1} />`,
  }[route] || (() => html`<${Home} ...${P} />`);
  return html`<div class="app">${view()}</div><${Tabs} route=${route} />`;
}
function App() {
  const [session, setSession] = useState(undefined);
  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    applyNight({});
    return () => data.subscription.unsubscribe();
  }, []);
  if (session === undefined) return html`<div class="center"><b>Bernd wacht auf …</b></div>`;
  return session ? html`<${Main} user=${session.user} />` : html`<${Login} />`;
}
render(html`<${App} />`, document.getElementById('root'));
