// Etappe 2: Finanzen, Stipendium, Steuern, Nachschlagen, Urlaub, Dozierende, Bernd & Outfits, Brainstorming
import { TOC_SH } from './toc-sh.js';

export function makeMehr(C) {
  const { html, useState, useEffect, useMemo, sb, Icon, Bernd, Back, toast, go, fmtDate, isoDate, addDays, dayStart, daysUntil, pad } = C;
  const eur = v => (Math.round(Number(v || 0) * 100) / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
  const MON = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

  // generischer Tabellen-Hook
  function useTable(table, order = 'created_at') {
    const [rows, setRows] = useState(null);
    const load = async () => { const r = await sb.from(table).select('*').order(order, { ascending: true }); if (r.error) toast('Fehler: ' + r.error.message); setRows(r.data || []); };
    useEffect(() => { load(); }, []);
    const save = async row => {
      const r = row.id ? await sb.from(table).update(row).eq('id', row.id).select().single() : await sb.from(table).insert(row).select().single();
      if (r.error) { toast('Fehler: ' + r.error.message); return null; }
      setRows(x => row.id ? x.map(y => y.id === row.id ? r.data : y) : [...(x || []), r.data]); return r.data;
    };
    const del = async id => { const r = await sb.from(table).delete().eq('id', id); if (r.error) return toast('Fehler: ' + r.error.message); setRows(x => x.filter(y => y.id !== id)); };
    return [rows, save, del, load];
  }
  const uid = async () => (await sb.auth.getUser()).data.user?.id;
  async function upload(bucket, folder, file) {
    const id = await uid(); const safe = file.name.replace(/[^\w.\-]+/g, '_');
    const path = `${id}/${folder ? folder + '/' : ''}${Date.now()}_${safe}`;
    const r = await sb.storage.from(bucket).upload(path, file, { upsert: false });
    if (r.error) { toast('Upload fehlgeschlagen: ' + r.error.message); return null; }
    return path;
  }
  async function openFile(bucket, path, page) {
    const w = window.open('', '_blank');
    const r = await sb.storage.from(bucket).createSignedUrl(path, 3600);
    if (r.error) { w?.close(); return toast('Fehler: ' + r.error.message); }
    const url = r.data.signedUrl + (page ? `#page=${page}` : '');
    if (w) w.location.href = url; else location.href = url;
  }
  const Loading = () => html`<div class="content"><div class="card small">Lade …</div></div>`;
  const Hero = ({ title, sub, back = '#/mehr', backLabel = 'Mehr', children }) => html`<div class="hero"><${Back} to=${back} label=${backLabel} /><h1>${title}</h1>${sub && html`<span class="sub">${sub}</span>`}${children}</div>`;
  const Seg = ({ opts, val, set }) => html`<div class="seg">${opts.map(o => html`<button class=${val === o ? 'on' : ''} onClick=${() => set(o)}>${o}</button>`)}</div>`;

  // ======================= FINANZEN =======================
  const KAT = ['Wohnen', 'Lebensmittel', 'Mobilität', 'Versicherungen & Verträge', 'Freizeit', 'Studium', 'Geschenke', 'Sonstiges'];
  const PAL = ['#B8323F', '#D9731A', '#008BA8', '#8152B5', '#A88A12', '#E66A8A', '#3E8E41', '#8A7F82'];
  const QUELLEN = [['gehalt_rd', 'Gehalt Rettungsdienst'], ['schule', 'Schule'], ['erste_hilfe', 'Erste-Hilfe-Kurse'], ['ehrenamt', 'Ehrenamt'], ['sonstiges', 'Sonstiges']];
  const STEUER = [['fahrtkosten', 'Fahrtkosten'], ['gebuehren', 'Studiengebühren & Beiträge'], ['buecher', 'Bücher & Lernmaterial'], ['technik', 'Laptop & Technik'], ['sonstiges', 'Sonstiges']];

  const fixInMonth = (f, y, m) => {
    const ab = new Date(f.gueltig_ab || '2000-01-01'), bis = f.gueltig_bis ? new Date(f.gueltig_bis) : null;
    const first = new Date(y, m, 1), last = new Date(y, m + 1, 0);
    if (ab > last || (bis && bis < first)) return 0;
    return f.intervall === 'jaehrlich' ? Number(f.betrag) / 12 : Number(f.betrag);
  };
  function monthData(tx, fix, y, m) {
    const inM = tx.filter(t => { const d = new Date(t.datum); return d.getFullYear() === y && d.getMonth() === m; });
    const ein = inM.filter(t => t.art === 'einnahme');
    const aus = inM.filter(t => t.art === 'ausgabe');
    const byKat = Object.fromEntries(KAT.map(k => [k, 0]));
    aus.forEach(t => { byKat[KAT.includes(t.kategorie) ? t.kategorie : 'Sonstiges'] += Number(t.betrag); });
    fix.forEach(f => { byKat[KAT.includes(f.kategorie) ? f.kategorie : 'Sonstiges'] += fixInMonth(f, y, m); });
    const byQ = Object.fromEntries(QUELLEN.map(([k]) => [k, 0]));
    ein.forEach(t => { byQ[t.quelle in byQ ? t.quelle : 'sonstiges'] += Number(t.betrag); });
    const sumE = Object.values(byQ).reduce((a, b) => a + b, 0), sumA = Object.values(byKat).reduce((a, b) => a + b, 0);
    return { byKat, byQ, sumE, sumA, inM };
  }
  function Donut({ data, size = 150 }) {
    const tot = data.reduce((a, d) => a + d.v, 0);
    if (!tot) return html`<div style=${`width:${size}px;height:${size}px;border-radius:50%;border:26px solid var(--soft);box-sizing:border-box`}></div>`;
    const cx = size / 2, R = size / 2 - 2, r = R - 26; let a = -Math.PI / 2; const P = (rad, ang) => [cx + rad * Math.cos(ang), cx + rad * Math.sin(ang)];
    const segs = data.filter(d => d.v > 0).map(d => {
      const b = a + 2 * Math.PI * d.v / tot * (d.v === tot ? 0.9999 : 1); const la = b - a > Math.PI ? 1 : 0;
      const [x1, y1] = P(R, a), [x2, y2] = P(R, b), [x3, y3] = P(r, b), [x4, y4] = P(r, a); a = b;
      return html`<path d=${`M${x1} ${y1}A${R} ${R} 0 ${la} 1 ${x2} ${y2}L${x3} ${y3}A${r} ${r} 0 ${la} 0 ${x4} ${y4}Z`} fill=${d.c} stroke="var(--card)" stroke-width="2"><title>${d.n}: ${eur(d.v)} (${Math.round(d.v / tot * 100)} %)</title></path>`;
    });
    return html`<svg width=${size} height=${size} viewBox=${`0 0 ${size} ${size}`} role="img" aria-label="Ausgaben nach Bereich">${segs}
      <text x=${cx} y=${cx - 2} text-anchor="middle" font-size="16" font-weight="900" fill="var(--text)" font-family="Nunito">${eur(tot)}</text>
      <text x=${cx} y=${cx + 15} text-anchor="middle" font-size="11" font-weight="700" fill="var(--muted)" font-family="Nunito">Ausgaben</text></svg>`;
  }
  function Finanzen() {
    const [tab, setTab] = useState('Monat'); const [ref, setRef] = useState(new Date());
    const [tx, saveTx, delTx] = useTable('transactions', 'datum'); const [fix, saveFix, delFix] = useTable('fixed_costs', 'titel');
    if (!tx || !fix) return html`<${Hero} title="Finanzen" /><${Loading} />`;
    const y = ref.getFullYear(), m = ref.getMonth(); const md = monthData(tx, fix, y, m);
    return html`<${Hero} title="Finanzen"><${Seg} opts=${['Monat', 'Jahr', 'Fixkosten']} val=${tab} set=${setTab} />
      ${tab !== 'Fixkosten' && html`<div class="between"><button class="back" onClick=${() => setRef(tab === 'Monat' ? new Date(y, m - 1, 1) : new Date(y - 1, 0, 1))}>‹</button><span class="b">${tab === 'Monat' ? MON[m] + ' ' + y : y}</span><button class="back" onClick=${() => setRef(tab === 'Monat' ? new Date(y, m + 1, 1) : new Date(y + 1, 0, 1))}>›</button></div>`}</${Hero}>
    <div class="content">
      ${tab === 'Monat' && html`
        <div class="row"><div class="stat"><span class="tiny b">Einnahmen</span><b>${eur(md.sumE)}</b></div><div class="stat"><span class="tiny b">Ausgaben</span><b>${eur(md.sumA)}</b></div>
          <div class="stat"><span class="tiny b">Gespart</span><b style=${`color:${md.sumE - md.sumA >= 0 ? 'var(--ok)' : 'var(--accent)'}`}>${eur(md.sumE - md.sumA)}</b></div></div>
        <div class="card row" style="align-items:center"><${Donut} data=${KAT.map((k, i) => ({ n: k, v: md.byKat[k], c: PAL[i] }))} />
          <div class="col" style="flex:1;gap:2px">${KAT.map((k, i) => html`<div class="row" style="gap:6px;min-height:19px"><i style=${`width:10px;height:10px;border-radius:3px;background:${PAL[i]};flex-shrink:0`}></i><span class="small" style="flex:1;color:var(--text)">${k}</span><span class="small b" style="color:var(--text)">${eur(md.byKat[k])}</span></div>`)}</div></div>
        <div class="card col"><span class="tiny b">EINNAHMEN</span>${QUELLEN.map(([k, l]) => html`<div class="between small" style="color:var(--text)"><span>${l}</span><b>${eur(md.byQ[k])}</b></div>`)}</div>
        <a class="btn" href="#/buchung">+ Einnahme oder Ausgabe</a>
        <span class="h2">Buchungen im ${MON[m]}</span>
        ${md.inM.length ? md.inM.slice().reverse().map(t => html`<div class="card between" style="padding:9px 12px"><div class="col" style="gap:1px"><span class="b small" style="color:var(--text)">${t.titel || (t.art === 'einnahme' ? QUELLEN.find(q => q[0] === t.quelle)?.[1] : t.kategorie)}</span><span class="tiny">${fmtDate(t.datum)}${t.fuer_stipendium ? ' · Stipendium' : ''}${t.fuer_steuer ? ' · Steuer' : ''}</span></div>
          <div class="row"><b style=${`color:${t.art === 'einnahme' ? 'var(--ok)' : 'var(--text)'}`}>${t.art === 'einnahme' ? '+' : '−'}${eur(t.betrag)}</b><button class="back" aria-label="Löschen" onClick=${() => confirm('Buchung löschen?') && delTx(t.id)}>✕</button></div></div>`) : html`<div class="card small">Noch keine Buchungen in diesem Monat. Fixkosten werden automatisch eingerechnet.</div>`}`}
      ${tab === 'Jahr' && (() => {
        const months = [...Array(12)].map((_, i) => monthData(tx, fix, y, i)); const sav = months.map(x => x.sumE - x.sumA);
        const mx = Math.max(1, ...sav.map(Math.abs)); const tE = months.reduce((a, x) => a + x.sumE, 0), tA = months.reduce((a, x) => a + x.sumA, 0);
        const yk = KAT.map((k, i) => ({ k, c: PAL[i], v: months.reduce((a, x) => a + x.byKat[k], 0) })).sort((a, b) => b.v - a.v);
        return html`<div class="row"><div class="stat"><span class="tiny b">Einnahmen</span><b>${eur(tE)}</b></div><div class="stat"><span class="tiny b">Ausgaben</span><b>${eur(tA)}</b></div><div class="stat"><span class="tiny b">Gespart</span><b style="color:var(--ok)">${eur(tE - tA)}</b></div></div>
          <div class="card col"><span class="b small" style="color:var(--text)">Gespart pro Monat</span>
            <div class="row" style="gap:2px;align-items:flex-end;height:140px;border-bottom:1px solid var(--line)">${sav.map((s, i) => html`<div title=${`${MON[i]}: ${eur(s)}`} style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%">
              <div style=${`width:14px;height:${Math.max(2, Math.abs(s) / mx * 120)}px;border-radius:4px 4px 0 0;background:${s < 0 ? '#8A7F82' : i === new Date().getMonth() && y === new Date().getFullYear() ? '#B8323F' : '#E8A0AD'}`}></div></div>`)}</div>
            <div class="row" style="gap:2px">${MON.map(x => html`<span class="tiny" style="flex:1;text-align:center">${x[0]}</span>`)}</div>
            <span class="tiny">Grau = Monat mit mehr Ausgaben als Einnahmen.</span></div>
          <div class="card col"><span class="b small" style="color:var(--text)">Größte Ausgabenbereiche</span>${yk.slice(0, 5).map(x => html`<div class="row" style="gap:8px"><i style=${`width:10px;height:10px;border-radius:3px;background:${x.c}`}></i><span class="small" style="flex:1;color:var(--text)">${x.k}</span><b class="small" style="color:var(--text)">${eur(x.v)}</b></div>`)}</div>`;
      })()}
      ${tab === 'Fixkosten' && html`<${FixListe} fix=${fix} save=${saveFix} del=${delFix} />`}
    </div>`;
  }
  function FixListe({ fix, save, del }) {
    const [f, setF] = useState({ titel: '', kategorie: 'Wohnen', betrag: '', intervall: 'monatlich', tag: 1 });
    const sum = fix.reduce((a, x) => a + fixInMonth(x, new Date().getFullYear(), new Date().getMonth()), 0);
    const add = async e => { e.preventDefault(); if (!f.titel || !f.betrag) return; await save({ ...f, betrag: Number(String(f.betrag).replace(',', '.')), tag: +f.tag }); setF({ ...f, titel: '', betrag: '' }); };
    return html`<div class="stat"><span class="tiny b">Fixkosten pro Monat</span><b>${eur(sum)}</b></div>
      <div class="card" style="padding:2px 14px">${fix.length ? fix.map(x => html`<div class="between" style="min-height:48px;border-bottom:1px solid var(--line)"><div class="col" style="gap:0"><span class="b small" style="color:var(--text)">${x.titel}</span><span class="tiny">${x.kategorie} · ${x.intervall === 'jaehrlich' ? 'jährlich' : 'zum ' + x.tag + '.'}</span></div>
        <div class="row"><b class="small" style="color:var(--text)">${eur(x.betrag)}</b><button class="back" aria-label="Löschen" onClick=${() => confirm('Fixkosten löschen?') && del(x.id)}>✕</button></div></div>`) : html`<div class="small" style="padding:10px 0">Noch keine Fixkosten.</div>`}</div>
      <form class="card" style="padding:2px 14px" onSubmit=${add}><span class="tiny b" style="display:block;padding-top:10px">NEUE FIXKOSTEN</span>
        <label class="field">Was?<input value=${f.titel} placeholder="z. B. Miete" onInput=${e => setF({ ...f, titel: e.target.value })} /></label>
        <label class="field">Betrag (€)<input inputmode="decimal" value=${f.betrag} onInput=${e => setF({ ...f, betrag: e.target.value })} /></label>
        <label class="field">Kategorie<select value=${f.kategorie} onChange=${e => setF({ ...f, kategorie: e.target.value })}>${KAT.map(k => html`<option>${k}</option>`)}</select></label>
        <label class="field">Intervall<select value=${f.intervall} onChange=${e => setF({ ...f, intervall: e.target.value })}><option value="monatlich">monatlich</option><option value="jaehrlich">jährlich</option></select></label>
        <label class="field">Fällig am (Tag)<input type="number" min="1" max="31" value=${f.tag} onInput=${e => setF({ ...f, tag: e.target.value })} /></label>
        <div style="padding:10px 0"><button class="btn">Anlegen</button></div></form>`;
  }
  function Buchung() {
    const [art, setArt] = useState('ausgabe'); const [file, setFile] = useState(null); const [busy, setBusy] = useState(false);
    const [f, setF] = useState({ betrag: '', datum: isoDate(new Date()), kategorie: 'Lebensmittel', quelle: 'gehalt_rd', titel: '', notiz: '', fuer_stipendium: false, vom_stipendium_erstattet: false, fuer_steuer: false, steuer_kategorie: 'buecher', km: '' });
    const s = (k, v) => setF({ ...f, [k]: v });
    const submit = async e => {
      e.preventDefault(); if (!f.betrag) return toast('Bitte Betrag eingeben'); setBusy(true);
      let beleg_path = null; if (file) beleg_path = await upload('belege', String(new Date(f.datum).getFullYear()), file);
      const row = { art, betrag: Number(String(f.betrag).replace(',', '.')), datum: f.datum, titel: f.titel || null, notiz: f.notiz || null, beleg_path,
        ...(art === 'einnahme' ? { quelle: f.quelle } : { kategorie: f.kategorie, fuer_stipendium: f.fuer_stipendium, vom_stipendium_erstattet: f.vom_stipendium_erstattet, fuer_steuer: f.fuer_steuer, steuer_kategorie: f.fuer_steuer ? f.steuer_kategorie : null, km: f.km ? Number(f.km) : null }) };
      const r = await sb.from('transactions').insert(row); setBusy(false);
      if (r.error) return toast('Fehler: ' + r.error.message); toast('Gespeichert'); history.back();
    };
    return html`<${Hero} title="Neue Buchung" back="" backLabel="Zurück"><${Seg} opts=${['Ausgabe', 'Einnahme']} val=${art === 'ausgabe' ? 'Ausgabe' : 'Einnahme'} set=${v => setArt(v === 'Ausgabe' ? 'ausgabe' : 'einnahme')} /></${Hero}>
    <form class="content" onSubmit=${submit}>
      ${art === 'einnahme' ? html`<span class="b small">Woher?</span><div class="chips">${QUELLEN.map(([k, l]) => html`<button type="button" class=${'pill' + (f.quelle === k ? ' on' : '')} onClick=${() => s('quelle', k)}>${l}</button>`)}</div>`
      : html`<label class="card col" style="cursor:pointer;align-items:center;border:2px dashed var(--t-auf)"><span class="b small" style="color:var(--accent)">${file ? '📎 ' + file.name : 'Beleg fotografieren oder hochladen'}</span><input type="file" accept="image/*,application/pdf" capture="environment" style="display:none" onChange=${e => setFile(e.target.files[0])} /></label>`}
      <div class="card" style="padding:2px 14px">
        <label class="field">Betrag (€)<input inputmode="decimal" placeholder="0,00" value=${f.betrag} onInput=${e => s('betrag', e.target.value)} required /></label>
        <label class="field">Datum<input type="date" value=${f.datum} onInput=${e => s('datum', e.target.value)} /></label>
        <label class="field">${art === 'einnahme' ? 'Notiz' : 'Was?'}<input value=${art === 'einnahme' ? f.notiz : f.titel} placeholder=${art === 'einnahme' ? 'z. B. inkl. Nachtzuschläge' : 'z. B. Fachbuch'} onInput=${e => s(art === 'einnahme' ? 'notiz' : 'titel', e.target.value)} /></label>
        ${art === 'ausgabe' && html`<label class="field">Kategorie<select value=${f.kategorie} onChange=${e => s('kategorie', e.target.value)}>${KAT.map(k => html`<option>${k}</option>`)}</select></label>`}
      </div>
      ${art === 'ausgabe' && html`<div class="card" style="padding:2px 14px">
        <label class="field"><span class="col" style="gap:0">Fürs Stipendium<span class="tiny">erscheint unter Stipendium</span></span><input type="checkbox" checked=${f.fuer_stipendium} onChange=${e => s('fuer_stipendium', e.target.checked)} /></label>
        <label class="field"><span class="col" style="gap:0">Vom Stipendium erstattet<span class="tiny">zählt dann nicht für die Steuer</span></span><input type="checkbox" checked=${f.vom_stipendium_erstattet} onChange=${e => s('vom_stipendium_erstattet', e.target.checked)} /></label>
        <label class="field"><span class="col" style="gap:0">Für die Steuer<span class="tiny">landet in der Jahresübersicht</span></span><input type="checkbox" checked=${f.fuer_steuer} onChange=${e => s('fuer_steuer', e.target.checked)} /></label>
        ${f.fuer_steuer && html`<label class="field">Steuer-Kategorie<select value=${f.steuer_kategorie} onChange=${e => s('steuer_kategorie', e.target.value)}>${STEUER.map(([k, l]) => html`<option value=${k}>${l}</option>`)}</select></label>`}
        ${f.fuer_steuer && f.steuer_kategorie === 'fahrtkosten' && html`<label class="field">Kilometer<input inputmode="decimal" value=${f.km} onInput=${e => s('km', e.target.value)} /></label>`}
      </div>`}
      <button class="btn" disabled=${busy}>${busy ? 'Speichere …' : 'Speichern'}</button></form>`;
  }

  // ======================= STIPENDIUM =======================
  const semesterOf = d => { const x = new Date(d); const y = x.getFullYear(), m = x.getMonth(); return m >= 2 && m <= 8 ? `SoSe ${y}` : m >= 9 ? `WiSe ${y}/${String(y + 1).slice(2)}` : `WiSe ${y - 1}/${String(y).slice(2)}`; };
  function Stipendium() {
    const [tab, setTab] = useState('Ausgaben'); const [tx, saveTx] = useTable('transactions', 'datum'); const [docs, saveDoc, delDoc] = useTable('scholarship_docs', 'created_at');
    const [sem, setSem] = useState(semesterOf(new Date())); const [busy, setBusy] = useState(false);
    if (!tx || !docs) return html`<${Hero} title="Stipendium" /><${Loading} />`;
    const st = tx.filter(t => t.fuer_stipendium && semesterOf(t.datum) === sem);
    const sum = st.reduce((a, t) => a + Number(t.betrag), 0), erst = st.filter(t => t.vom_stipendium_erstattet).reduce((a, t) => a + Number(t.betrag), 0);
    const sems = [...new Set([semesterOf(new Date()), ...tx.filter(t => t.fuer_stipendium).map(t => semesterOf(t.datum)), ...docs.map(d => d.semester)])].sort();
    const up = async (ordner, file) => { if (!file) return; setBusy(true); const p = await upload('bescheide', `${sem.replace(/\W+/g, '_')}/${ordner}`, file); if (p) await saveDoc({ semester: sem, ordner, titel: file.name, storage_path: p }); setBusy(false); };
    const ORD = [['buchung', 'Buchungsbescheide'], ['zahlung', 'Zahlungsbescheide'], ['stunden', 'Stundenbescheide']];
    return html`<${Hero} title="Stipendium"><${Seg} opts=${['Ausgaben', 'Bescheide']} val=${tab} set=${setTab} />
      <label class="field" style="border:0">Semester<select value=${sem} onChange=${e => setSem(e.target.value)}>${sems.map(x => html`<option>${x}</option>`)}</select></label></${Hero}>
    <div class="content">${tab === 'Ausgaben' ? html`
      <div class="row"><div class="stat"><span class="tiny b">Ausgaben</span><b>${eur(sum)}</b></div><div class="stat"><span class="tiny b">Erstattet</span><b>${eur(erst)}</b><span class="tiny">offen: ${eur(sum - erst)}</span></div></div>
      ${st.length ? st.slice().reverse().map(t => html`<div class="card between" style="padding:10px 12px"><div class="col" style="gap:3px"><span class="b small" style="color:var(--text)">${t.titel || t.kategorie}</span><span class="tiny">${fmtDate(t.datum)}</span>
        <div class="chips">${t.vom_stipendium_erstattet ? html`<span class="chip ok">erstattet</span>` : html`<button class="chip dark" style="border:0;cursor:pointer" onClick=${() => saveTx({ id: t.id, vom_stipendium_erstattet: true })}>als erstattet markieren</button>`}${t.fuer_steuer && html`<span class="chip">Steuer</span>`}${t.beleg_path && html`<button class="chip" style="border:0;cursor:pointer" onClick=${() => openFile('belege', t.beleg_path)}>Beleg ansehen</button>`}</div></div><b style="color:var(--text)">${eur(t.betrag)}</b></div>`)
        : html`<div class="card small">Noch keine Stipendium-Ausgaben in diesem Semester. Leg eine Ausgabe an und setze den Haken „Fürs Stipendium“.</div>`}
      <a class="btn" href="#/buchung">Ausgabe mit Beleg erfassen</a>` : html`
      ${ORD.map(([k, l]) => { const ds = docs.filter(d => d.semester === sem && d.ordner === k); return html`<div class="card col">
        <div class="between"><span class="b" style="color:var(--text)">📁 ${l}</span><span class="tiny b">${ds.length} Datei${ds.length === 1 ? '' : 'en'}</span></div>
        ${ds.map(d => html`<div class="between" style="min-height:38px;border-top:1px solid var(--line)"><button class="back" style="font-weight:700;font-size:13px" onClick=${() => openFile('bescheide', d.storage_path)}>${d.titel}</button><button class="back" aria-label="Löschen" onClick=${async () => { if (confirm('Datei löschen?')) { await sb.storage.from('bescheide').remove([d.storage_path]); delDoc(d.id); } }}>✕</button></div>`)}
        <label class="btn small ghost" style="cursor:pointer">${busy ? 'Lädt hoch …' : '+ Hochladen (PDF oder Foto)'}<input type="file" accept="image/*,application/pdf" style="display:none" onChange=${e => up(k, e.target.files[0])} /></label></div>`; })}`}
    </div>`;
  }

  // ======================= STEUERN =======================
  function Steuern({ st }) {
    const [tx] = useTable('transactions', 'datum'); const [jahr, setJahr] = useState(new Date().getFullYear());
    const satz = st.profile?.settings?.km_satz ?? 0.30;
    if (!tx) return html`<${Hero} title="Steuern" /><${Loading} />`;
    const rel = tx.filter(t => t.fuer_steuer && !t.vom_stipendium_erstattet && new Date(t.datum).getFullYear() === jahr);
    const wert = t => t.steuer_kategorie === 'fahrtkosten' && t.km ? Number(t.km) * satz : Number(t.betrag);
    const sums = Object.fromEntries(STEUER.map(([k]) => [k, rel.filter(t => (t.steuer_kategorie || 'sonstiges') === k).reduce((a, t) => a + wert(t), 0)]));
    const total = Object.values(sums).reduce((a, b) => a + b, 0);
    const csv = () => {
      const rows = [['Datum', 'Kategorie', 'Beschreibung', 'Kilometer', 'Betrag (EUR)', 'Beleg']].concat(rel.map(t => [t.datum, STEUER.find(s => s[0] === t.steuer_kategorie)?.[1] || 'Sonstiges', t.titel || t.kategorie || '', t.km || '', wert(t).toFixed(2).replace('.', ','), t.beleg_path ? 'ja' : 'nein']));
      const blob = new Blob(['﻿' + rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(';')).join('\n')], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Steuer_Studium_${jahr}.csv`; a.click();
    };
    return html`<${Hero} title="Steuern"><div class="between"><button class="back" onClick=${() => setJahr(jahr - 1)}>‹</button><span class="b">Jahr ${jahr}</span><button class="back" onClick=${() => setJahr(jahr + 1)}>›</button></div>
      <div class="row"><div class="stat"><span class="tiny b">Gesammelt</span><b>${eur(total)}</b><span class="tiny">ohne Erstattungen</span></div><div class="stat"><span class="tiny b">Belege</span><b>${rel.length}</b><span class="tiny">${rel.filter(t => !t.beleg_path).length} ohne Foto</span></div></div></${Hero}>
    <div class="content"><div class="card" style="padding:2px 14px">${STEUER.map(([k, l]) => html`<div class="between" style="min-height:48px;border-bottom:1px solid var(--line)"><span class="b small" style="color:var(--text)">${l}</span><b class="small" style="color:var(--text)">${eur(sums[k])}</b></div>`)}</div>
      <div class="card small">Fahrtkosten werden mit ${String(satz).replace('.', ',')} €/km gerechnet (in den Einstellungen änderbar). Ob und wie etwas absetzbar ist, klärst du am besten mit Steuerberatung oder Lohnsteuerhilfe.</div>
      <a class="btn ghost" href="#/buchung">+ Ausgabe oder Fahrt erfassen</a>
      <button class="btn" onClick=${csv}>Jahresübersicht exportieren (Excel/CSV)</button></div>`;
  }

  // ======================= NACHSCHLAGEN =======================
  function Nachschlagen() {
    const [docs, save, del] = useTable('documents', 'titel'); const [q, setQ] = useState(''); const [neu, setNeu] = useState(false);
    if (!docs) return html`<${Hero} title="Nachschlagen" /><${Loading} />`;
    const hits = q.length >= 2 ? docs.flatMap(d => (d.inhalt || []).filter(x => x.titel.toLowerCase().includes(q.toLowerCase())).map(x => ({ d, x }))) : [];
    const bereiche = [...new Set(docs.map(d => d.bereich))];
    return html`<${Hero} title="Nachschlagen"><input class="input" placeholder="In allen Dokumenten suchen, z. B. Anaphylaxie" value=${q} onInput=${e => setQ(e.target.value)} aria-label="Suchen" /></${Hero}>
    <div class="content">
      ${q.length >= 2 ? html`<span class="h2">${hits.length} Treffer</span>${hits.map(({ d, x }) => html`<button class="card between" style="cursor:pointer;text-align:left" onClick=${() => openFile('nachschlagen', d.storage_path, x.seite)}><div class="col" style="gap:0"><span class="b small" style="color:var(--text)">${x.titel}</span><span class="tiny">${d.titel}</span></div><span class="tiny">S. ${x.seite}</span></button>`)}`
      : html`${bereiche.map(b => html`<span class="tiny b">${b.toUpperCase()}</span>${docs.filter(d => d.bereich === b).map(d => html`<a class="card row" style="text-decoration:none;color:var(--text)" href=${'#/dokument/' + d.id}>
          <span style="width:40px;height:48px;border-radius:8px;background:#8C1C2B;color:#fff;font-size:10px;font-weight:900;display:flex;align-items:flex-end;justify-content:center;padding-bottom:6px;flex-shrink:0">PDF</span>
          <div class="col" style="gap:2px"><span class="b" style="font-size:14px">${d.titel}</span><span class="tiny">${d.stand ? 'Stand ' + new Date(d.stand).toLocaleDateString('de-DE') : ''} · ${(d.inhalt || []).length} Kapitel</span></div></a>`)}`)}
      ${!docs.length && html`<div class="card small">Noch keine Dokumente. Lade die Handlungsempfehlungen RD SH als PDF hoch – das Inhaltsverzeichnis wird automatisch ergänzt.</div>`}
      ${docs.some(d => d.stand && (new Date() - new Date(d.stand)) / 864e5 > 365) && html`<div class="card small">Bernd: Ein Dokument ist älter als ein Jahr. Schau mal, ob es eine neue Version gibt.</div>`}
      <button class="btn dashed" onClick=${() => setNeu(!neu)}>${neu ? 'Abbrechen' : '+ Dokument hinzufügen'}</button>
      ${neu && html`<${DokForm} save=${save} done=${() => setNeu(false)} />`}`}
    </div>`;
  }
  function DokForm({ save, done }) {
    const [f, setF] = useState({ titel: 'Handlungsempfehlungen RD Schleswig-Holstein', bereich: 'Rettungsdienst', stand: '2025-07-15', preset: 'sh' }); const [file, setFile] = useState(null); const [busy, setBusy] = useState(false);
    const submit = async e => {
      e.preventDefault(); if (!file) return toast('Bitte eine PDF-Datei wählen'); setBusy(true);
      const p = await upload('nachschlagen', '', file);
      if (p) { await save({ titel: f.titel, bereich: f.bereich, stand: f.stand || null, storage_path: p, inhalt: f.preset === 'sh' ? TOC_SH : [] }); toast('Dokument gespeichert'); done(); }
      setBusy(false);
    };
    return html`<form class="card" style="padding:2px 14px" onSubmit=${submit}>
      <label class="field">Vorlage<select value=${f.preset} onChange=${e => setF(e.target.value === 'sh' ? { titel: 'Handlungsempfehlungen RD Schleswig-Holstein', bereich: 'Rettungsdienst', stand: '2025-07-15', preset: 'sh' } : { titel: '', bereich: 'Studium', stand: '', preset: '' })}><option value="sh">Handlungsempfehlungen RD SH (v10.0)</option><option value="">Eigenes Dokument</option></select></label>
      <label class="field">Titel<input value=${f.titel} onInput=${e => setF({ ...f, titel: e.target.value })} required /></label>
      <label class="field">Bereich<input value=${f.bereich} onInput=${e => setF({ ...f, bereich: e.target.value })} required /></label>
      <label class="field">Stand<input type="date" value=${f.stand} onInput=${e => setF({ ...f, stand: e.target.value })} /></label>
      <label class="field">PDF<input type="file" accept="application/pdf" onChange=${e => setFile(e.target.files[0])} /></label>
      <div style="padding:10px 0"><button class="btn" disabled=${busy}>${busy ? 'Lädt hoch …' : 'Speichern'}</button></div></form>`;
  }
  function Dokument({ id }) {
    const [docs, save, del] = useTable('documents', 'titel'); const [g, setG] = useState(null); const [neu, setNeu] = useState({ titel: '', seite: '', gruppe: '' });
    if (!docs) return html`<${Hero} title="Dokument" back="#/nachschlagen" backLabel="Nachschlagen" /><${Loading} />`;
    const d = docs.find(x => x.id === id); if (!d) return html`<div class="content"><${Back} to="#/nachschlagen" label="Nachschlagen" /><div class="card">Nicht gefunden.</div></div>`;
    const gruppen = [...new Set((d.inhalt || []).map(x => x.gruppe || 'Inhalt'))]; const akt = g || gruppen[0];
    const fav = d.favoriten || []; const toggleFav = s => save({ id: d.id, favoriten: fav.includes(s) ? fav.filter(x => x !== s) : [...fav, s] });
    const list = (d.inhalt || []).filter(x => (x.gruppe || 'Inhalt') === akt);
    return html`<${Hero} title=${d.titel} back="#/nachschlagen" backLabel="Nachschlagen" sub=${d.stand ? 'Stand ' + new Date(d.stand).toLocaleDateString('de-DE') : ''}>
      ${gruppen.length > 1 && html`<${Seg} opts=${gruppen} val=${akt} set=${setG} />`}</${Hero}>
    <div class="content"><button class="btn" onClick=${() => openFile('nachschlagen', d.storage_path)}>PDF öffnen</button>
      ${fav.length > 0 && html`<span class="tiny b">FAVORITEN</span><div class="chips">${(d.inhalt || []).filter(x => fav.includes(x.seite)).map(x => html`<button class="pill" onClick=${() => openFile('nachschlagen', d.storage_path, x.seite)}>★ ${x.titel.replace(/^Algorithmus \d+ – /, '')}</button>`)}</div>`}
      <div class="card" style="padding:4px 14px">${list.map(x => html`<div class="row" style="min-height:44px;border-bottom:1px solid var(--line)">
        <button class="back" style="flex:1;font-weight:700;font-size:14px;text-align:left" onClick=${() => openFile('nachschlagen', d.storage_path, x.seite)}>${x.titel}</button>
        <span class="tiny">S. ${x.seite}</span><button class="back" aria-label="Favorit" style=${`color:${fav.includes(x.seite) ? '#B4413F' : 'var(--muted)'}`} onClick=${() => toggleFav(x.seite)}>${fav.includes(x.seite) ? '★' : '☆'}</button></div>`)}
        ${!list.length && html`<div class="small" style="padding:10px 0">Noch kein Inhaltsverzeichnis. Füge unten Kapitel hinzu.</div>`}</div>
      <form class="card row" style="flex-wrap:wrap" onSubmit=${e => { e.preventDefault(); if (!neu.titel || !neu.seite) return; save({ id: d.id, inhalt: [...(d.inhalt || []), { titel: neu.titel, seite: +neu.seite, gruppe: neu.gruppe || akt || 'Inhalt' }] }); setNeu({ titel: '', seite: '', gruppe: '' }); }}>
        <input class="input" style="flex:2;min-width:150px" placeholder="Kapitel" value=${neu.titel} onInput=${e => setNeu({ ...neu, titel: e.target.value })} aria-label="Kapitel" />
        <input class="input" style="flex:1;min-width:70px" placeholder="Seite" inputmode="numeric" value=${neu.seite} onInput=${e => setNeu({ ...neu, seite: e.target.value })} aria-label="Seite" /><button class="btn small">+</button></form>
      <span class="tiny">Tippen öffnet das PDF auf der richtigen Seite (je nach Browser). Die Inhalte bleiben im Original-PDF.</span>
      <button class="btn ghost small" onClick=${async () => { if (confirm('Dokument löschen?')) { await sb.storage.from('nachschlagen').remove([d.storage_path]); await del(d.id); go('#/nachschlagen'); } }}>Dokument löschen</button></div>`;
  }

  // ======================= URLAUB =======================
  const PACK = { Dokumente: ['Ausweis', 'Tickets / Buchung', 'Krankenversicherungskarte'], Kleidung: ['Kleidung für [Tage] Tage', 'Schlafsachen', 'Jacke'], Technik: ['Handy-Ladekabel', 'Powerbank'], 'Kosmetik & Apotheke': ['Kulturbeutel', 'Reiseapotheke'] };
  const TODO_U = ['Dienstfrei beantragen', 'Unterkunft buchen', 'Anreise planen', 'Abgaben vorher erledigen'];
  function Urlaube() {
    const [v, save] = useTable('vacations', 'start_datum'); const [f, setF] = useState({ reiseziel: '', start_datum: '', ende_datum: '' });
    if (!v) return html`<${Hero} title="Urlaube" /><${Loading} />`;
    const add = async e => {
      e.preventDefault(); if (!f.reiseziel || !f.start_datum || !f.ende_datum) return toast('Bitte alles ausfüllen');
      const ev = await sb.from('events').insert({ typ: 'urlaub', titel: 'Urlaub: ' + f.reiseziel, ort: f.reiseziel, ganztags: true, start_at: new Date(f.start_datum + 'T00:00').toISOString(), ende_at: addDays(new Date(f.ende_datum + 'T00:00'), 1).toISOString() }).select().single();
      const r = await save({ ...f, event_id: ev.data?.id }); if (r) { await seedVacation(r); go('#/urlaub/' + r.id); C.reloadStore?.(); }
    };
    return html`<${Hero} title="Urlaube" sub="Bernd geht in den Urlaubsmodus, wenn du es tust." />
    <div class="content">${v.slice().reverse().map(x => html`<a class="card between" style="text-decoration:none;color:var(--text)" href=${'#/urlaub/' + x.id}><div class="col" style="gap:1px"><span class="b">${x.reiseziel}</span><span class="tiny">${fmtDate(x.start_datum)} – ${fmtDate(x.ende_datum)}</span></div><span class="chip">${daysUntil(x.start_datum) > 0 ? 'in ' + daysUntil(x.start_datum) + ' T.' : daysUntil(x.ende_datum) >= 0 ? 'jetzt' : 'vorbei'}</span></a>`)}
      <form class="card" style="padding:2px 14px" onSubmit=${add}><span class="tiny b" style="display:block;padding-top:10px">NEUER URLAUB</span>
        <label class="field">Reiseziel<input value=${f.reiseziel} placeholder="z. B. Kopenhagen" onInput=${e => setF({ ...f, reiseziel: e.target.value })} /></label>
        <label class="field">Von<input type="date" value=${f.start_datum} onInput=${e => setF({ ...f, start_datum: e.target.value })} /></label>
        <label class="field">Bis<input type="date" value=${f.ende_datum} onInput=${e => setF({ ...f, ende_datum: e.target.value })} /></label>
        <div style="padding:10px 0"><button class="btn">Urlaub anlegen</button></div></form></div>`;
  }
  async function seedVacation(v) {
    const tage = Math.round((new Date(v.ende_datum) - new Date(v.start_datum)) / 864e5) + 1;
    const rows = [...TODO_U.map(t => ({ vacation_id: v.id, typ: 'todo', text: t })), ...Object.entries(PACK).flatMap(([k, arr]) => arr.map(t => ({ vacation_id: v.id, typ: 'pack', kategorie: k, text: t.replace('[Tage]', tage) })))];
    await sb.from('vacation_items').insert(rows);
  }
  function Urlaub({ id }) {
    const [vs, saveV, delV] = useTable('vacations', 'start_datum'); const [items, saveI, delI] = useTable('vacation_items', 'created_at');
    const [tab, setTab] = useState('Übersicht'); const [wetter, setWetter] = useState(null); const [neu, setNeu] = useState('');
    const v = vs?.find(x => x.id === id);
    useEffect(() => { if (v) ladeWetter(v, saveV).then(setWetter); }, [v?.id]);
    if (!vs || !items) return html`<${Hero} title="Urlaub" back="#/urlaube" backLabel="Urlaube" /><${Loading} />`;
    if (!v) return html`<div class="content"><${Back} to="#/urlaube" label="Urlaube" /><div class="card">Nicht gefunden.</div></div>`;
    const my = items.filter(i => i.vacation_id === v.id); const todos = my.filter(i => i.typ === 'todo'), pack = my.filter(i => i.typ === 'pack');
    const Item = ({ i }) => html`<div class="between" style="min-height:40px"><label class=${'check' + (i.erledigt ? ' done' : '')} style="flex:1"><input type="checkbox" checked=${i.erledigt} onChange=${e => saveI({ id: i.id, erledigt: e.target.checked })} /><span class="small b" style="color:var(--text)">${i.text}</span></label><button class="back" aria-label="Löschen" onClick=${() => delI(i.id)}>✕</button></div>`;
    const add = typ => async e => { e.preventDefault(); if (!neu.trim()) return; await saveI({ vacation_id: v.id, typ, text: neu.trim(), kategorie: typ === 'pack' ? 'Eigenes' : null }); setNeu(''); };
    const d = daysUntil(v.start_datum);
    return html`<${Hero} title=${v.reiseziel} back="#/urlaube" backLabel="Urlaube">
      <div class="row"><${Bernd} mood="urlaub" size=${80} /><div class="col"><span class="b small">${fmtDate(v.start_datum)} – ${fmtDate(v.ende_datum)}</span><span class="b" style="color:var(--t-stud)">${d > 0 ? `noch ${d} Tag${d === 1 ? '' : 'e'}` : daysUntil(v.ende_datum) >= 0 ? 'Gute Erholung!' : 'Vorbei – schön war’s?'}</span></div></div>
      <${Seg} opts=${['Übersicht', 'To-dos', 'Packliste']} val=${tab} set=${setTab} /></${Hero}>
    <div class="content">
      ${tab === 'Übersicht' && html`<div class="card col"><span class="b" style="color:var(--text)">Wetter am Reiseziel</span>
          ${!wetter ? html`<span class="small">Lade Wetter …</span>` : wetter.fehler ? html`<span class="small">${wetter.fehler}</span>` : html`<span class="tiny">${wetter.art}</span>
          <div class="row" style="gap:6px;overflow-x:auto">${wetter.tage.map(t => html`<div style="min-width:58px;background:var(--bg);border-radius:10px;padding:6px 4px;display:flex;flex-direction:column;align-items:center;gap:2px"><span class="tiny b">${t.label}</span><span style="font-size:18px">${t.icon}</span><span class="small b" style="color:var(--text)">${t.max}°</span><span class="tiny">${t.min}°</span></div>`)}</div>`}</div>
        <div class="card col"><div class="between"><span class="b" style="color:var(--text)">To-dos</span><span class="tiny b">${todos.filter(i => i.erledigt).length} / ${todos.length}</span></div>${todos.slice(0, 4).map(i => html`<${Item} i=${i} />`)}</div>
        <div class="card between"><span class="b" style="color:var(--text)">Packliste</span><span class="b" style="color:var(--t-stud)">${pack.filter(i => i.erledigt).length} / ${pack.length}</span></div>
        <button class="btn ghost small" onClick=${async () => { if (confirm('Urlaub löschen?')) { if (v.event_id) await sb.from('events').delete().eq('id', v.event_id); await delV(v.id); C.reloadStore?.(); go('#/urlaube'); } }}>Urlaub löschen</button>`}
      ${tab === 'To-dos' && html`<div class="card" style="padding:4px 14px">${todos.map(i => html`<${Item} i=${i} />`)}</div>
        <form class="row" onSubmit=${add('todo')}><input class="input" placeholder="Neues To-do" value=${neu} onInput=${e => setNeu(e.target.value)} aria-label="Neues To-do" /><button class="btn small">+</button></form>`}
      ${tab === 'Packliste' && html`${[...new Set(pack.map(i => i.kategorie))].map(k => html`<div class="card" style="padding:6px 14px"><span class="tiny b">${(k || '').toUpperCase()}</span>${pack.filter(i => i.kategorie === k).map(i => html`<${Item} i=${i} />`)}</div>`)}
        ${wetter?.kalt && html`<div class="card small">Bernd: Es wird kalt am Reiseziel. Mütze und warme Jacke einpacken!</div>`}${wetter?.regen && html`<div class="card small">Bernd: Regen ist angesagt. Regenjacke oder Schirm mitnehmen.</div>`}
        <form class="row" onSubmit=${add('pack')}><input class="input" placeholder="Eigener Punkt" value=${neu} onInput=${e => setNeu(e.target.value)} aria-label="Eigener Punkt" /><button class="btn small">+</button></form>`}
    </div>`;
  }
  const WICON = c => c <= 1 ? '☀️' : c <= 3 ? '⛅' : c <= 48 ? '🌫️' : c <= 67 ? '🌧️' : c <= 77 ? '🌨️' : c <= 82 ? '🌦️' : '⛈️';
  async function ladeWetter(v, saveV) {
    try {
      let { lat, lon } = v;
      if (lat == null) {
        const g = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(v.reiseziel)}&count=1&language=de`)).json();
        if (!g.results?.length) return { fehler: 'Reiseziel nicht gefunden. Versuch es mit dem Stadtnamen.' };
        lat = g.results[0].latitude; lon = g.results[0].longitude; saveV({ id: v.id, lat, lon });
      }
      const start = new Date(v.start_datum), ende = new Date(v.ende_datum); const tageBis = daysUntil(v.start_datum);
      let url, art;
      if (tageBis <= 14 && daysUntil(v.ende_datum) >= 0) {
        url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&forecast_days=16`; art = 'Vorhersage';
      } else {
        const ys = new Date(start); ys.setFullYear(ys.getFullYear() - 1); const ye = new Date(ende); ye.setFullYear(ye.getFullYear() - 1);
        if (ye > new Date()) return { fehler: 'Zu weit in der Zukunft für eine Vorhersage.' };
        url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${isoDate(ys)}&end_date=${isoDate(ye)}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
        art = 'Typische Werte: so war das Wetter im selben Zeitraum letztes Jahr. Die echte Vorhersage erscheint ca. 2 Wochen vor Abreise.';
      }
      const w = (await (await fetch(url)).json()).daily; if (!w) return { fehler: 'Wetter gerade nicht verfügbar.' };
      let tage = w.time.map((t, i) => ({ t, max: Math.round(w.temperature_2m_max[i]), min: Math.round(w.temperature_2m_min[i]), icon: WICON(w.weathercode[i]), regen: w.precipitation_sum[i] }));
      if (art === 'Vorhersage') tage = tage.filter(x => x.t >= v.start_datum && x.t <= v.ende_datum);
      tage = tage.slice(0, 14).map(x => ({ ...x, label: new Date(x.t).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric' }) }));
      return { art, tage, kalt: tage.some(x => x.min < 5), regen: tage.filter(x => x.regen > 2).length >= 2 };
    } catch (e) { return { fehler: 'Wetter gerade nicht verfügbar (offline?).' }; }
  }

  // ======================= DOZIERENDE =======================
  function avatar(o = {}, size = 64) {
    const { g = 'w', skin = '#E9B99A', hair = 'long', hc = '#5A3A2A', top = 'blazer', tc = '#B8323F', glasses = false, beard = false, ear = false } = o;
    let s = `<circle cx="60" cy="60" r="58" fill="#FBE1DC"/>`;
    if (hair === 'long') s += `<path d="M34 50 q0 -30 26 -30 q26 0 26 30 v40 h-52z" fill="${hc}"/>`;
    s += `<path d="M22 118 q4 -32 38 -34 q34 2 38 34z" fill="${tc}"/>`;
    if (top === 'blazer') s += '<path d="M52 85 L60 104 L68 85" fill="#FFFFFF"/><path d="M48 86 L60 118 M72 86 L60 118" stroke="#000" stroke-opacity="0.2" stroke-width="2"/>';
    if (top === 'hoodie') s += '<path d="M44 86 q16 14 32 0" stroke="#000" stroke-opacity="0.25" stroke-width="3" fill="none"/><path d="M56 92 v12 M64 92 v12" stroke="#FFF" stroke-width="2"/>';
    if (top === 'kasack') s += '<path d="M50 85 L60 98 L70 85" fill="none" stroke="#000" stroke-opacity="0.25" stroke-width="2.5"/>';
    if (top === 'shirt') s += '<path d="M50 86 q10 6 20 0" stroke="#000" stroke-opacity="0.2" stroke-width="2" fill="none"/>';
    s += `<rect x="53" y="70" width="14" height="16" rx="6" fill="${skin}"/><ellipse cx="60" cy="54" rx="20" ry="23" fill="${skin}"/><ellipse cx="40" cy="56" rx="3.5" ry="5" fill="${skin}"/><ellipse cx="80" cy="56" rx="3.5" ry="5" fill="${skin}"/>`;
    if (ear) s += '<circle cx="40" cy="63" r="2.2" fill="#E0B44C"/><circle cx="80" cy="63" r="2.2" fill="#E0B44C"/>';
    if (hair === 'long' || hair === 'bun') s += `<path d="M39 52 q-2 -26 21 -27 q23 1 21 27 q-6 -14 -21 -15 q-15 1 -21 15z" fill="${hc}"/>`;
    if (hair === 'bun') s += `<circle cx="60" cy="25" r="9" fill="${hc}"/>`;
    if (hair === 'short') s += `<path d="M40 50 q0 -24 20 -24 q20 0 20 24 q-4 -10 -20 -11 q-16 1 -20 11z" fill="${hc}"/>`;
    if (hair === 'curly') s += [[42, 40], [50, 32], [60, 29], [70, 32], [78, 40], [40, 50], [80, 50]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="${hc}"/>`).join('');
    s += '<circle cx="52" cy="54" r="2.2" fill="#2A1A1A"/><circle cx="68" cy="54" r="2.2" fill="#2A1A1A"/><path d="M53 65 q7 5 14 0" stroke="#7A3A2A" stroke-width="2" fill="none" stroke-linecap="round"/>';
    if (g === 'w') s += '<ellipse cx="47" cy="61" rx="3.5" ry="2" fill="#F48FA3" opacity="0.6"/><ellipse cx="73" cy="61" rx="3.5" ry="2" fill="#F48FA3" opacity="0.6"/>';
    if (beard) s += `<path d="M41 58 q2 20 19 21 q17 -1 19 -21 q-4 10 -19 11 q-15 -1 -19 -11z" fill="${hc}"/>`;
    if (glasses) s += '<rect x="44" y="49" width="14" height="10" rx="4" fill="none" stroke="#3D1418" stroke-width="2.2"/><rect x="62" y="49" width="14" height="10" rx="4" fill="none" stroke="#3D1418" stroke-width="2.2"/><path d="M58 53 h4" stroke="#3D1418" stroke-width="2"/>';
    return `<svg width="${size}" height="${size}" viewBox="0 0 120 120" aria-hidden="true">${s}</svg>`;
  }
  const Avatar = ({ o, size }) => html`<span style="display:flex;flex-shrink:0" dangerouslySetInnerHTML=${{ __html: avatar(o, size) }}></span>`;
  C.avatar = avatar;
  function Dozierende({ st }) {
    const akt = st.profile?.settings?.semester || 1;
    const ms = st.modules.filter(m => m.semester <= akt + 1 && !m.code.startsWith('BMRD-14') && !m.code.startsWith('BMRD-11'));
    return html`<${Hero} title="Dozierende" sub="Eine Figur pro Modul, gestylt von dir" />
    <div class="content">${ms.map(m => html`<a class="card row" style="text-decoration:none;color:var(--text)" href=${'#/dozent/' + m.id}><${Avatar} o=${m.dozent?.figur} size=${60} />
      <div class="col" style="gap:2px;flex:1"><span class="b" style="font-size:14px">${m.dozent?.name || 'Noch ohne Namen'}</span><span class="tiny">${m.name} · ${m.code}</span>${m.dozent?.spruch && html`<span class="small" style="font-style:italic;color:var(--text)">„${m.dozent.spruch}“</span>`}</div></a>`)}</div>`;
  }
  function Kleiderschrank({ st, api, id }) {
    const m = st.modules.find(x => x.id === id); const [fach, setFach] = useState('Frisur');
    const [o, setO] = useState(() => ({ g: 'w', skin: '#E9B99A', hair: 'long', hc: '#5A3A2A', top: 'blazer', tc: '#B8323F', glasses: false, beard: false, ear: false, ...(m?.dozent?.figur || {}) }));
    const [name, setName] = useState(m?.dozent?.name || ''); const [spruch, setSpruch] = useState(m?.dozent?.spruch || '');
    if (!m) return html`<div class="content"><${Back} to="#/dozierende" label="Dozierende" /><div class="card">Nicht gefunden.</div></div>`;
    const Opt = ({ k, v, label, prev }) => html`<button class=${'card col'} style=${`align-items:center;gap:2px;padding:6px 2px;cursor:pointer;${o[k] === v ? 'border:2px solid var(--t-mehr)' : ''}`} onClick=${() => setO({ ...o, [k]: v })}><${Avatar} o=${{ ...o, ...prev, [k]: v }} size=${54} /><span class="tiny b">${label}</span></button>`;
    const Farben = ({ k, list }) => html`<div class="chips">${list.map(c => html`<button aria-label=${'Farbe ' + c} onClick=${() => setO({ ...o, [k]: c })} style=${`width:36px;height:36px;border-radius:18px;background:${c};border:${o[k] === c ? '3px solid var(--text)' : '2px solid #fff'};box-shadow:0 0 0 1px var(--line);cursor:pointer`}></button>`)}</div>`;
    const Tog = ({ k, label }) => html`<label class="field">${label}<input type="checkbox" checked=${o[k]} onChange=${e => setO({ ...o, [k]: e.target.checked })} /></label>`;
    const speichern = async () => { await api.upsert('modules', { id: m.id, dozent: { ...(m.dozent || {}), name, spruch, figur: o } }, 'modules'); toast('Gespeichert'); go('#/dozierende'); };
    return html`<div class="hero"><${Back} to="#/dozierende" label="Dozierende" /><div class="row"><${Avatar} o=${o} size=${120} />
      <div class="col" style="flex:1;gap:6px"><div class="seg">${[['w', 'Weiblich'], ['m', 'Männlich']].map(([k, l]) => html`<button class=${o.g === k ? 'on' : ''} onClick=${() => setO({ ...o, g: k })}>${l}</button>`)}</div><span class="small b">${m.name}</span></div></div></div>
    <div class="content"><${Seg} opts=${['Frisur', 'Kleidung', 'Körper', 'Extras']} val=${fach} set=${setFach} />
      ${fach === 'Frisur' && html`<div class="tiles" style="grid-template-columns:repeat(5,minmax(0,1fr));gap:6px">${[['bun', 'Dutt'], ['long', 'Lang'], ['short', 'Kurz'], ['curly', 'Locken'], ['none', 'Glatze']].map(([v, l]) => html`<${Opt} k="hair" v=${v} label=${l} />`)}</div><span class="b small">Haarfarbe</span><${Farben} k="hc" list=${['#2B1D18', '#5A3A2A', '#8A6A4A', '#C9A06A', '#C9C2B8', '#B8323F', '#E66A8A']} />`}
      ${fach === 'Kleidung' && html`<div class="tiles" style="grid-template-columns:repeat(4,minmax(0,1fr));gap:6px">${[['blazer', 'Sakko'], ['hoodie', 'Hoodie'], ['kasack', 'Kasack'], ['shirt', 'Shirt']].map(([v, l]) => html`<${Opt} k="top" v=${v} label=${l} />`)}</div><span class="b small">Farbe</span><${Farben} k="tc" list=${['#B8323F', '#5E3A4A', '#3D1418', '#008BA8', '#3E8E41', '#8152B5', '#E8590C', '#8A7F82']} />`}
      ${fach === 'Körper' && html`<span class="b small">Hautton</span><${Farben} k="skin" list=${['#F6D5BF', '#F1C7A8', '#E9B99A', '#C98E6A', '#A86B47', '#8D5A3B', '#5E3A26']} /><div class="card" style="padding:2px 14px"><${Tog} k="beard" label="Bart" /></div>`}
      ${fach === 'Extras' && html`<div class="card" style="padding:2px 14px"><${Tog} k="glasses" label="Brille" /><${Tog} k="ear" label="Ohrringe" /></div>`}
      <div class="card" style="padding:2px 14px"><label class="field">Name<input value=${name} placeholder="Name Dozent*in" onInput=${e => setName(e.target.value)} /></label><label class="field">Spruch<input value=${spruch} placeholder="z. B. Quellen, Quellen, Quellen!" onInput=${e => setSpruch(e.target.value)} /></label></div>
      <button class="btn" onClick=${speichern}>Speichern</button></div>`;
  }

  // ======================= BERND & OUTFITS =======================
  function stats(st) {
    const min = st.sessions.reduce((a, s) => a + (s.arbeit_min || 0), 0); const phasen = Math.floor(min / 45);
    const tage = new Set(st.sessions.filter(s => (s.arbeit_min || 0) > 0).map(s => isoDate(new Date(s.start_at))));
    let serie = 0; let d = dayStart(new Date()); if (!tage.has(isoDate(d))) d = addDays(d, -1);
    while (tage.has(isoDate(d))) { serie++; d = addDays(d, -1); }
    return { phasen, serie, note: st.modules.some(m => m.note != null) || st.tasks.some(t => t.note != null), urlaub: st.events.some(e => e.typ === 'urlaub') };
  }
  function Outfits({ st, api }) {
    const s = stats(st);
    const items = [['schal', 'Schal', true, 'Standard'], ['muetze', 'Mütze', s.phasen >= 5, `5 Arbeitsphasen · ${Math.min(s.phasen, 5)}/5`], ['kopfhoerer', 'Kopfhörer', s.serie >= 3, `3 Tage in Folge · ${Math.min(s.serie, 3)}/3`],
      ['sonne', 'Sonnenbrille', s.urlaub, 'Ersten Urlaub angelegt'], ['weste', 'Rettungsweste', s.phasen >= 20, `20 Arbeitsphasen · ${Math.min(s.phasen, 20)}/20`], ['hut', 'Doktorhut', s.note, 'Erste Note eingetragen']];
    const cur = st.profile?.bernd_outfit || 'schal';
    return html`<div class="hero"><${Back} to="#/mehr" label="Mehr" /><div class="row"><${Bernd} mood="zufrieden" size=${120} outfit=${cur} /><div class="col"><h1>Bernd</h1><span class="small b">${items.filter(i => i[2]).length} von ${items.length} freigeschaltet</span></div></div></div>
    <div class="content"><div class="row"><div class="stat"><span class="tiny b">Serie</span><b>${s.serie} Tage</b></div><div class="stat"><span class="tiny b">Arbeitsphasen</span><b>${s.phasen}</b></div></div>
      <div class="tiles" style="grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">${items.map(([k, l, ok, cond]) => html`<button class="card col" disabled=${!ok} style=${`align-items:center;gap:2px;padding:8px 4px;cursor:${ok ? 'pointer' : 'default'};${cur === k ? 'border:2px solid var(--t-mehr)' : ''}`} onClick=${() => ok && api.saveProfile({ bernd_outfit: k })}>
        <span style=${`opacity:${ok ? 1 : 0.35}`}><${Bernd} mood="zufrieden" size=${68} outfit=${k} /></span><span class="small b" style="color:var(--text)">${ok ? '' : '🔒 '}${l}</span><span class="tiny" style="text-align:center">${cond}</span></button>`)}</div>
      <span class="tiny">Neue Outfits verdienst du dir mit Arbeitsphasen, Serien und Meilensteinen im Studium. Zählt die letzten 60 Tage.</span></div>`;
  }

  // ======================= BRAINSTORMING =======================
  const PICO = [['P', 'Population', 'z. B. Auszubildende NotSan'], ['I', 'Intervention', 'z. B. VR-Reanimationstraining'], ['C', 'Vergleich', 'z. B. Phantomtraining'], ['O', 'Outcome', 'z. B. Qualität der Thoraxkompressionen']];
  const ECLIPSE = [['E', 'Expectation (Ziel)', 'z. B. bessere Ausbildung'], ['C', 'Client group', 'z. B. Auszubildende NotSan'], ['L', 'Location', 'z. B. Rettungsdienstschulen'], ['I', 'Impact', 'z. B. Ausbildungsqualität'], ['P', 'Professionals', 'z. B. Lehrkräfte, Praxisanleitende'], ['SE', 'Service', 'z. B. Reanimationsunterricht']];
  const frage = (schema, b) => schema === 'PICO'
    ? `Führt ${b.I || '[Intervention]'} bei ${b.P || '[Population]'} im Vergleich zu ${b.C || '[Vergleich]'} zu ${b.O || '[Outcome]'}?`
    : `Wie beurteilen ${b.P || '[Professionals]'} die Auswirkungen von ${b.SE || '[Service]'}${b.L ? ' an/in ' + b.L : ''} auf ${b.I || '[Impact]'} bei ${b.C || '[Zielgruppe]'}${b.E ? ' im Hinblick auf ' + b.E : ''}?`;
  function Brainstorming({ st }) {
    const [ideas, save, del] = useTable('ideas', 'created_at'); const [rq] = useTable('research_questions', 'created_at'); const [txt, setTxt] = useState('');
    if (!ideas || !rq) return html`<${Hero} title="Brainstorming" /><${Loading} />`;
    const add = async e => { e.preventDefault(); if (!txt.trim()) return; const r = await save({ text: txt.trim() }); setTxt(''); if (r) go('#/idee/' + r.id); };
    return html`<div class="hero"><${Back} to="#/mehr" label="Mehr" /><div class="row" style="align-items:flex-end"><${Bernd} mood="zufrieden" size=${80} /><div class="bubble">Wirf deine Gedanken hier rein. Wir machen Forschungsfragen draus. Genial oder Quatsch, sortieren wir später.</div></div></div>
    <div class="content"><h1 style="margin:0;font-size:24px">Brainstorming</h1>
      <form class="row" onSubmit=${add}><input class="input" placeholder="Random Idee eintippen …" value=${txt} onInput=${e => setTxt(e.target.value)} aria-label="Neue Idee" /><button class="btn small" aria-label="Speichern">→</button></form>
      <span class="h2">Deine Ideen</span>
      ${ideas.slice().reverse().map(i => { const n = rq.filter(q => q.idea_id === i.id); const m = st.modules.find(x => x.id === i.module_id); return html`<a class="card col" style="text-decoration:none;color:var(--text)" href=${'#/idee/' + i.id}><span class="b" style="font-size:14px">${i.text}</span>
        <div class="chips"><span class="chip">${m ? m.name : 'keinem Modul zugeordnet'}</span><span class=${'chip' + (n.length ? ' dark' : '')}>${n.length ? n.length + ' Frage' + (n.length > 1 ? 'n' : '') + (n.some(q => q.favorit) ? ' · Favorit' : '') : 'neu'}</span></div></a>`; })}
      ${!ideas.length && html`<div class="card small">Noch keine Ideen. Einfach drauflos tippen!</div>`}</div>`;
  }
  function Idee({ st, id }) {
    const [ideas, saveI, delI] = useTable('ideas', 'created_at'); const [rq, saveQ, delQ] = useTable('research_questions', 'created_at');
    const [schema, setSchema] = useState('PICO'); const [b, setB] = useState({});
    if (!ideas || !rq) return html`<${Hero} title="Idee" back="#/brainstorming" backLabel="Brainstorming" /><${Loading} />`;
    const i = ideas.find(x => x.id === id); if (!i) return html`<div class="content"><${Back} to="#/brainstorming" label="Brainstorming" /><div class="card">Nicht gefunden.</div></div>`;
    const qs = rq.filter(q => q.idea_id === id); const felder = schema === 'PICO' ? PICO : ECLIPSE;
    const speichern = async () => { await saveQ({ idea_id: id, schema, bausteine: b, frage: frage(schema, b) }); setB({}); toast('Forschungsfrage gespeichert'); };
    return html`<div class="hero"><${Back} to="#/brainstorming" label="Brainstorming" /><span class="tiny b">DEINE IDEE</span><span style="font-size:18px;font-weight:900;line-height:1.25">${i.text}</span>
      <label class="field" style="border:0">Modul<select value=${i.module_id || ''} onChange=${e => saveI({ id, module_id: e.target.value || null })}><option value="">keines</option>${st.modules.map(m => html`<option value=${m.id}>${m.code} ${m.name}</option>`)}</select></label></div>
    <div class="content">
      ${qs.map(q => html`<div class="card col" style=${q.favorit ? 'border:2px solid var(--t-mehr)' : ''}><div class="between"><span class="b small" style="color:var(--text)">${q.schema}</span>
        <div class="row"><button class="back" aria-label="Favorit" onClick=${() => saveQ({ id: q.id, favorit: !q.favorit })}>${q.favorit ? '★' : '☆'}</button><button class="back" aria-label="Kopieren" onClick=${() => { navigator.clipboard?.writeText(q.frage); toast('Kopiert'); }}>⧉</button><button class="back" aria-label="Löschen" onClick=${() => delQ(q.id)}>✕</button></div></div>
        <div class="chips">${Object.entries(q.bausteine || {}).filter(([, v]) => v).map(([k, v]) => html`<span class="chip">${k} ${v}</span>`)}</div>
        <span class="small b" style="color:var(--text);background:var(--bg);border-radius:10px;padding:8px 10px;line-height:1.4">„${q.frage}“</span></div>`)}
      <span class="h2">Neue Forschungsfrage</span>
      <${Seg} opts=${['PICO', 'ECLIPSE']} val=${schema} set=${v => { setSchema(v); setB({}); }} />
      <span class="tiny">${schema === 'PICO' ? 'PICO: für Fragen nach der Wirkung einer Intervention.' : 'ECLIPSE: für Fragen aus Versorgung, Organisation und Management.'}</span>
      <div class="card" style="padding:2px 14px">${felder.map(([k, l, ph]) => html`<label class="field"><span><b style="color:var(--accent)">${k}</b> ${l}</span><input value=${b[k] || ''} placeholder=${ph} onInput=${e => setB({ ...b, [k]: e.target.value })} /></label>`)}</div>
      <div class="card small" style="color:var(--text);line-height:1.4">„${frage(schema, b)}“</div>
      <button class="btn" onClick=${speichern}>Frage speichern</button>
      <span class="tiny">Die automatische Formulierung per KI kommt in einer späteren Etappe. Bis dahin baust du die Frage aus den Bausteinen – die Vorschau passt sich live an. Formulierung bitte immer fachlich prüfen.</span>
      <button class="btn ghost small" onClick=${async () => { if (confirm('Idee mit allen Fragen löschen?')) { await delI(id); go('#/brainstorming'); } }}>Idee löschen</button></div>`;
  }

  return { seedVacation, Finanzen, Buchung, Stipendium, Steuern, Nachschlagen, Dokument, Urlaube, Urlaub, Dozierende, Kleiderschrank, Outfits, Brainstorming, Idee, avatar };
}
