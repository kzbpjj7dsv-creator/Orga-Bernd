// Etappe 3: Einkaufsliste, Dienst-Packliste, Zertifikate, Praxisanleiter, Erste-Hilfe-Kurse, Karteikarten, Wochenrückblick
export function makeMehr2(C, M) {
  const { html, useState, useEffect, useMemo, sb, Icon, Bernd, Back, toast, go, fmtDate, isoDate, addDays, dayStart, daysUntil, pad } = C;
  const { useTable, upload, openFile, Hero, Seg, Loading, eur } = M;
  const Check = ({ on, label, sub, onChange, onDel }) => html`<div class="between" style="min-height:42px;border-bottom:1px solid var(--line)">
    <label class=${'check' + (on ? ' done' : '')} style="flex:1"><input type="checkbox" checked=${on} onChange=${e => onChange(e.target.checked)} />
      <span class="col" style="gap:0"><span class="b small" style="color:var(--text)">${label}</span>${sub && html`<span class="tiny">${sub}</span>`}</span></label>
    ${onDel && html`<button class="back" aria-label="Löschen" onClick=${onDel}>✕</button>`}</div>`;

  // ======================= EINKAUFSLISTE =======================
  const LAEDEN = ['Lidl', 'Aldi', 'Rewe', 'Drogeriemarkt', 'Egal wo'];
  const KATS = ['Obst & Gemüse', 'Brot & Backwaren', 'Kühlregal', 'Fleisch & Fisch', 'Tiefkühl', 'Vorrat', 'Süßes & Snacks', 'Getränke', 'Drogerie & Haushalt', 'Sonstiges'];
  const raten = t => { const x = t.toLowerCase();
    if (/apfel|banane|tomat|gurke|salat|zwiebel|kartoffel|paprika|obst|gemüse|möhre|karotte|zitrone|beere|avocado/.test(x)) return 'Obst & Gemüse';
    if (/brot|brötchen|toast|croissant|baguette/.test(x)) return 'Brot & Backwaren';
    if (/milch|joghurt|käse|butter|quark|sahne|ei(er)?\b|aufschnitt|skyr/.test(x)) return 'Kühlregal';
    if (/fleisch|hähnchen|hack|wurst|lachs|fisch|thunfisch/.test(x)) return 'Fleisch & Fisch';
    if (/tk|pizza|tiefkühl|eis\b/.test(x)) return 'Tiefkühl';
    if (/nudel|reis|mehl|zucker|öl|konserve|dose|müsli|haferflocken|kaffee|tee|gewürz|soße|sauce/.test(x)) return 'Vorrat';
    if (/schoko|chips|keks|gummi|süß/.test(x)) return 'Süßes & Snacks';
    if (/wasser|saft|cola|bier|wein|getränk|limo/.test(x)) return 'Getränke';
    if (/shampoo|duschgel|zahnpasta|deo|klopapier|toilettenpapier|spülmittel|waschmittel|creme|tampon|binde|seife|müllbeutel|küchenrolle/.test(x)) return 'Drogerie & Haushalt';
    return 'Sonstiges'; };
  function Einkauf() {
    const [items, save, del, reload] = useTable('shopping_items', 'created_at'); const [favs, saveFav] = useTable('shopping_favorites', 'anzahl');
    const [laden, setLaden] = useState('Lidl'); const [txt, setTxt] = useState(''); const [menge, setMenge] = useState('');
    if (!items || !favs) return html`<${Hero} title="Einkaufsliste" /><${Loading} />`;
    const offen = items.filter(i => i.laden === laden);
    const add = async (text, kat, m) => {
      text = text.trim(); if (!text) return; kat = kat || (laden === 'Drogeriemarkt' ? 'Drogerie & Haushalt' : raten(text));
      if (items.some(i => i.laden === laden && !i.erledigt && i.text.toLowerCase() === text.toLowerCase())) return toast('Steht schon drauf');
      await save({ laden, text, kategorie: kat, menge: m || null, erledigt: false });
      const f = favs.find(x => x.laden === laden && x.text.toLowerCase() === text.toLowerCase());
      f ? saveFav({ id: f.id, anzahl: f.anzahl + 1 }) : saveFav({ laden, text, kategorie: kat, anzahl: 1 });
    };
    const fertig = async () => {
      const erl = offen.filter(i => i.erledigt); if (!erl.length) return toast('Noch nichts abgehakt');
      const betrag = prompt(`Einkauf bei ${laden} fertig! Was hast du bezahlt? (€, leer lassen zum Überspringen)`);
      if (betrag) { const r = await sb.from('transactions').insert({ art: 'ausgabe', betrag: Number(betrag.replace(',', '.')), datum: isoDate(new Date()), kategorie: laden === 'Drogeriemarkt' ? 'Sonstiges' : 'Lebensmittel', titel: 'Einkauf ' + laden });
        if (r.error) toast('Fehler: ' + r.error.message); else toast('In Finanzen gebucht'); }
      await sb.from('shopping_items').delete().in('id', erl.map(i => i.id)); reload();
    };
    const topFavs = favs.filter(f => f.laden === laden && !offen.some(i => !i.erledigt && i.text.toLowerCase() === f.text.toLowerCase())).sort((a, b) => b.anzahl - a.anzahl).slice(0, 12);
    const kats = KATS.filter(k => offen.some(i => (i.kategorie || 'Sonstiges') === k));
    return html`<${Hero} title="Einkaufsliste"><div class="chips">${LAEDEN.map(l => { const n = items.filter(i => i.laden === l && !i.erledigt).length;
      return html`<button class=${'pill' + (laden === l ? ' on' : '')} onClick=${() => setLaden(l)}>${l}${n ? ` · ${n}` : ''}</button>`; })}</div></${Hero}>
    <div class="content">
      <form class="row" onSubmit=${e => { e.preventDefault(); add(txt, null, menge); setTxt(''); setMenge(''); }}>
        <input class="input" style="flex:3" placeholder=${'Für ' + laden + ' …'} value=${txt} onInput=${e => setTxt(e.target.value)} aria-label="Artikel" />
        <input class="input" style="flex:1;min-width:60px" placeholder="Menge" value=${menge} onInput=${e => setMenge(e.target.value)} aria-label="Menge" /><button class="btn small">+</button></form>
      ${topFavs.length > 0 && html`<span class="tiny b">FAVORITEN – ANTIPPEN ZUM HINZUFÜGEN</span><div class="chips">${topFavs.map(f => html`<button class="pill" onClick=${() => add(f.text, f.kategorie)}>+ ${f.text}</button>`)}</div>`}
      ${kats.map(k => html`<div class="card" style="padding:4px 14px"><span class="tiny b" style="display:block;padding-top:6px">${k.toUpperCase()}</span>
        ${offen.filter(i => (i.kategorie || 'Sonstiges') === k).sort((a, b) => a.erledigt - b.erledigt).map(i => html`<${Check} on=${i.erledigt} label=${i.text} sub=${i.menge} onChange=${v => save({ id: i.id, erledigt: v })} onDel=${() => del(i.id)} />`)}</div>`)}
      ${!offen.length && html`<div class="card small">Die Liste für ${laden} ist leer.</div>`}
      ${offen.some(i => i.erledigt) && html`<button class="btn" onClick=${fertig}>Einkauf fertig – abgehakte entfernen</button>`}
    </div>`;
  }

  // ======================= DIENST-PACKLISTE =======================
  const PACK_START = ['Dienstkleidung', 'Essen & Trinken', 'Ladekabel / Powerbank', 'Dienstausweis', 'Lernmaterial für ruhige Phasen'];
  const PACK_24 = ['Wechselkleidung', 'Kulturbeutel', 'Schlafsachen'];
  function Packliste({ st }) {
    const [rows, save, del] = useTable('packlisten', 'sort'); const [tpl, setTpl] = useState(st.shifts[0]?.kuerzel || 'R24'); const [txt, setTxt] = useState('');
    const key = 'pack_' + tpl + '_' + isoDate(new Date()); const [done, setDone] = useState(() => JSON.parse(localStorage.getItem(key) || '[]'));
    useEffect(() => setDone(JSON.parse(localStorage.getItem('pack_' + tpl + '_' + isoDate(new Date())) || '[]')), [tpl]);
    if (!rows) return html`<${Hero} title="Dienst-Packliste" /><${Loading} />`;
    const liste = rows.filter(r => r.kuerzel === tpl);
    const toggle = (id, v) => { const n = v ? [...done, id] : done.filter(x => x !== id); setDone(n); localStorage.setItem(key, JSON.stringify(n)); };
    const vorlage = async () => { const items = [...PACK_START, ...(/24|Nacht/.test(tpl) ? PACK_24 : [])]; for (const [i, t] of items.entries()) await save({ kuerzel: tpl, text: t, sort: i }); };
    const naechster = expandNext(st);
    return html`<${Hero} title="Dienst-Packliste" sub=${naechster ? `Nächster Dienst: ${naechster.titel} am ${fmtDate(naechster.start_at)}` : 'Kein Dienst eingetragen'}>
      <div class="chips">${st.shifts.map(s => html`<button class=${'pill' + (tpl === s.kuerzel ? ' on' : '')} onClick=${() => setTpl(s.kuerzel)}>${s.kuerzel}</button>`)}</div></${Hero}>
    <div class="content">
      <div class="card" style="padding:4px 14px">${liste.map(r => html`<${Check} on=${done.includes(r.id)} label=${r.text} onChange=${v => toggle(r.id, v)} onDel=${() => del(r.id)} />`)}
        ${!liste.length && html`<div class="col" style="padding:10px 0"><span class="small">Noch keine Packliste für ${tpl}.</span><button class="btn small" onClick=${vorlage}>Vorschlag übernehmen</button></div>`}</div>
      <form class="row" onSubmit=${async e => { e.preventDefault(); if (!txt.trim()) return; await save({ kuerzel: tpl, text: txt.trim(), sort: liste.length }); setTxt(''); }}>
        <input class="input" placeholder="Eigener Punkt" value=${txt} onInput=${e => setTxt(e.target.value)} aria-label="Eigener Punkt" /><button class="btn small">+</button></form>
      <span class="tiny">Häkchen gelten nur für heute und sind morgen wieder leer. Bernd erinnert dich am Vorabend eines Dienstes um 20 Uhr per Benachrichtigung.</span></div>`;
  }
  const expandNext = st => st.events.filter(e => e.typ === 'dienst' && new Date(e.start_at) > new Date()).sort((a, b) => new Date(a.start_at) - new Date(b.start_at))[0];

  // ======================= ZERTIFIKATE =======================
  function Zertifikate() {
    const [rows, save, del] = useTable('certificates', 'gueltig_bis'); const [neu, setNeu] = useState(false); const [f, setF] = useState({ titel: '', aussteller: '', erworben: '', gueltig_bis: '' }); const [file, setFile] = useState(null); const [busy, setBusy] = useState(false);
    if (!rows) return html`<${Hero} title="Zertifikate" /><${Loading} />`;
    const sorted = [...rows].sort((a, b) => (a.gueltig_bis || '9999') < (b.gueltig_bis || '9999') ? -1 : 1);
    const status = r => { if (!r.gueltig_bis) return ['unbefristet', 'chip']; const d = daysUntil(r.gueltig_bis); return d < 0 ? ['abgelaufen', 'chip dark'] : d <= 90 ? [`läuft in ${d} T. ab`, 'chip dark'] : [`gültig bis ${new Date(r.gueltig_bis).toLocaleDateString('de-DE')}`, 'chip ok']; };
    const submit = async e => { e.preventDefault(); if (!f.titel) return; setBusy(true); let datei_path = null; if (file) datei_path = await upload('nachweise', 'zertifikate', file);
      await save({ ...f, erworben: f.erworben || null, gueltig_bis: f.gueltig_bis || null, datei_path }); setBusy(false); setNeu(false); setF({ titel: '', aussteller: '', erworben: '', gueltig_bis: '' }); setFile(null); };
    return html`<${Hero} title="Zertifikate" sub="Bernd erinnert dich 90, 30 und 7 Tage vor Ablauf." />
    <div class="content">${sorted.map(r => { const [t, cls] = status(r); return html`<div class="card col"><div class="between"><span class="b" style="color:var(--text)">${r.titel}</span><button class="back" aria-label="Löschen" onClick=${() => confirm('Zertifikat löschen?') && del(r.id)}>✕</button></div>
      <span class="tiny">${[r.aussteller, r.erworben && 'erworben ' + new Date(r.erworben).toLocaleDateString('de-DE')].filter(Boolean).join(' · ')}</span>
      <div class="chips"><span class=${cls}>${t}</span>${r.datei_path && html`<button class="chip" style="border:0;cursor:pointer" onClick=${() => openFile('nachweise', r.datei_path)}>Nachweis ansehen</button>`}</div></div>`; })}
      ${!rows.length && html`<div class="card small">Noch keine Zertifikate. Zum Beispiel ACLS, PALS, EPHTC oder deine Erste-Hilfe-Ausbilderlizenz.</div>`}
      <button class="btn dashed" onClick=${() => setNeu(!neu)}>${neu ? 'Abbrechen' : '+ Zertifikat hinzufügen'}</button>
      ${neu && html`<form class="card" style="padding:2px 14px" onSubmit=${submit}>
        <label class="field">Titel<input value=${f.titel} placeholder="z. B. ACLS Provider" onInput=${e => setF({ ...f, titel: e.target.value })} required /></label>
        <label class="field">Aussteller<input value=${f.aussteller} placeholder="z. B. AHA" onInput=${e => setF({ ...f, aussteller: e.target.value })} /></label>
        <label class="field">Erworben am<input type="date" value=${f.erworben} onInput=${e => setF({ ...f, erworben: e.target.value })} /></label>
        <label class="field">Gültig bis<input type="date" value=${f.gueltig_bis} onInput=${e => setF({ ...f, gueltig_bis: e.target.value })} /></label>
        <label class="field">Nachweis<input type="file" accept="image/*,application/pdf" onChange=${e => setFile(e.target.files[0])} /></label>
        <div style="padding:10px 0"><button class="btn" disabled=${busy}>${busy ? 'Speichere …' : 'Speichern'}</button></div></form>`}</div>`;
  }

  // ======================= PRAXISANLEITER =======================
  function Praxisanleiter({ st, api }) {
    const [tab, setTab] = useState('Azubis'); const [az, saveAz, delAz] = useTable('pa_azubis', 'name'); const [an, saveAn, delAn] = useTable('pa_anleitungen', 'datum'); const [fb, saveFb, delFb] = useTable('pa_fortbildungen', 'datum');
    const [f, setF] = useState({}); const ziel = st.profile?.settings?.pa_stunden_ziel ?? 24; const jahr = new Date().getFullYear();
    if (!az || !an || !fb) return html`<${Hero} title="Praxisanleiter" /><${Loading} />`;
    const fbJahr = fb.filter(x => new Date(x.datum).getFullYear() === jahr); const std = fbJahr.reduce((a, x) => a + Number(x.stunden), 0);
    return html`<${Hero} title="Praxisanleiter"><${Seg} opts=${['Azubis', 'Anleitungen', 'Fortbildung']} val=${tab} set=${t => { setTab(t); setF({}); }} /></${Hero}>
    <div class="content">
      ${tab === 'Azubis' && html`${az.map(a => { const n = an.filter(x => x.azubi_id === a.id); const min = n.reduce((s, x) => s + (x.dauer_min || 0), 0);
          return html`<div class="card col"><div class="between"><span class="b" style="color:var(--text)">${a.name}${a.jahr ? ` · ${a.jahr}. Ausbildungsjahr` : ''}</span><button class="back" aria-label="Löschen" onClick=${() => confirm('Azubi löschen?') && delAz(a.id)}>✕</button></div>
            <span class="tiny">${n.length} Anleitung${n.length === 1 ? '' : 'en'} · ${Math.floor(min / 60)}:${pad(min % 60)} Std.${n[0] ? ' · zuletzt ' + fmtDate(n.sort((x, y) => y.datum.localeCompare(x.datum))[0].datum) : ''}</span>
            ${a.notiz && html`<span class="small" style="color:var(--text)">${a.notiz}</span>`}</div>`; })}
        <form class="card" style="padding:2px 14px" onSubmit=${async e => { e.preventDefault(); if (!f.name) return; await saveAz({ name: f.name, jahr: f.jahr ? +f.jahr : null, notiz: f.notiz || null, aktiv: true }); setF({}); }}>
          <span class="tiny b" style="display:block;padding-top:10px">NEUE*R AZUBI</span>
          <label class="field">Name<input value=${f.name || ''} onInput=${e => setF({ ...f, name: e.target.value })} /></label>
          <label class="field">Ausbildungsjahr<select value=${f.jahr || ''} onChange=${e => setF({ ...f, jahr: e.target.value })}><option value="">–</option><option>1</option><option>2</option><option>3</option></select></label>
          <label class="field">Notiz<input value=${f.notiz || ''} placeholder="z. B. Lernziele" onInput=${e => setF({ ...f, notiz: e.target.value })} /></label>
          <div style="padding:10px 0"><button class="btn">Anlegen</button></div></form>`}
      ${tab === 'Anleitungen' && html`<form class="card" style="padding:2px 14px" onSubmit=${async e => { e.preventDefault(); if (!f.azubi_id) return toast('Bitte Azubi wählen'); await saveAn({ azubi_id: f.azubi_id, datum: f.datum || isoDate(new Date()), dauer_min: f.dauer ? Math.round(Number(String(f.dauer).replace(',', '.')) * 60) : null, thema: f.thema || null, notiz: f.notiz || null }); setF({}); toast('Anleitung gespeichert'); }}>
          <span class="tiny b" style="display:block;padding-top:10px">ANLEITUNG DOKUMENTIEREN</span>
          <label class="field">Azubi<select value=${f.azubi_id || ''} onChange=${e => setF({ ...f, azubi_id: e.target.value })}><option value="">wählen …</option>${az.map(a => html`<option value=${a.id}>${a.name}</option>`)}</select></label>
          <label class="field">Datum<input type="date" value=${f.datum || isoDate(new Date())} onInput=${e => setF({ ...f, datum: e.target.value })} /></label>
          <label class="field">Dauer (Std.)<input inputmode="decimal" value=${f.dauer || ''} placeholder="z. B. 1,5" onInput=${e => setF({ ...f, dauer: e.target.value })} /></label>
          <label class="field">Thema<input value=${f.thema || ''} placeholder="z. B. i.o. Zugang" onInput=${e => setF({ ...f, thema: e.target.value })} /></label>
          <label class="field">Notiz<input value=${f.notiz || ''} onInput=${e => setF({ ...f, notiz: e.target.value })} /></label>
          <div style="padding:10px 0"><button class="btn">Speichern</button></div></form>
        ${[...an].sort((a, b) => b.datum.localeCompare(a.datum)).map(x => html`<div class="card between" style="padding:9px 12px"><div class="col" style="gap:1px"><span class="b small" style="color:var(--text)">${x.thema || 'Anleitung'} · ${az.find(a => a.id === x.azubi_id)?.name || ''}</span><span class="tiny">${fmtDate(x.datum)}${x.dauer_min ? ' · ' + (x.dauer_min / 60).toString().replace('.', ',') + ' Std.' : ''}${x.notiz ? ' · ' + x.notiz : ''}</span></div><button class="back" aria-label="Löschen" onClick=${() => delAn(x.id)}>✕</button></div>`)}`}
      ${tab === 'Fortbildung' && html`<div class="card col"><div class="between"><span class="b" style="color:var(--text)">Fortbildung ${jahr}</span><span class="b" style=${`color:${std >= ziel ? 'var(--ok)' : 'var(--accent)'}`}>${String(std).replace('.', ',')} / ${ziel} Std.</span></div>
          <div class="bar"><i style=${`width:${Math.min(100, std / ziel * 100)}%;background:${std >= ziel ? 'var(--ok)' : 'var(--t-stud)'}`}></i></div>
          <label class="field" style="border:0">Jahresziel (Std.)<input type="number" min="0" value=${ziel} onChange=${e => api.saveProfile({ settings: { ...st.profile.settings, pa_stunden_ziel: +e.target.value } })} /></label>
          <span class="tiny">Die genaue Pflicht-Stundenzahl für Praxisanleitende kann je nach Land und Arbeitgeber abweichen – bitte dort prüfen.</span></div>
        <form class="card" style="padding:2px 14px" onSubmit=${async e => { e.preventDefault(); if (!f.titel || !f.stunden) return; let datei_path = null; if (f.file) datei_path = await upload('nachweise', 'fortbildung', f.file);
            await saveFb({ titel: f.titel, stunden: Number(String(f.stunden).replace(',', '.')), datum: f.datum || isoDate(new Date()), datei_path }); setF({}); }}>
          <span class="tiny b" style="display:block;padding-top:10px">FORTBILDUNG EINTRAGEN</span>
          <label class="field">Titel<input value=${f.titel || ''} placeholder="z. B. Feedback geben" onInput=${e => setF({ ...f, titel: e.target.value })} /></label>
          <label class="field">Stunden<input inputmode="decimal" value=${f.stunden || ''} onInput=${e => setF({ ...f, stunden: e.target.value })} /></label>
          <label class="field">Datum<input type="date" value=${f.datum || isoDate(new Date())} onInput=${e => setF({ ...f, datum: e.target.value })} /></label>
          <label class="field">Nachweis<input type="file" accept="image/*,application/pdf" onChange=${e => setF({ ...f, file: e.target.files[0] })} /></label>
          <div style="padding:10px 0"><button class="btn">Speichern</button></div></form>
        ${[...fb].sort((a, b) => b.datum.localeCompare(a.datum)).map(x => html`<div class="card between" style="padding:9px 12px"><div class="col" style="gap:1px"><span class="b small" style="color:var(--text)">${x.titel}</span><span class="tiny">${fmtDate(x.datum)} · ${String(x.stunden).replace('.', ',')} Std.</span></div>
          <div class="row">${x.datei_path && html`<button class="back" style="font-size:12px" onClick=${() => openFile('nachweise', x.datei_path)}>Nachweis</button>`}<button class="back" aria-label="Löschen" onClick=${() => delFb(x.id)}>✕</button></div></div>`)}`}
    </div>`;
  }

  // ======================= ERSTE-HILFE-KURSE =======================
  const MATERIAL = ['Übungspuppen', 'Beatmungsmasken / Gesichtsfolien', 'AED-Trainer', 'Verbandmaterial', 'Desinfektion', 'Teilnehmerliste', 'Bescheinigungen', 'Präsentation / Laptop'];
  function EHKurse({ st }) {
    const [k] = useTable('eh_kurse', 'id');
    const evs = st.events.filter(e => e.typ === 'erste_hilfe').sort((a, b) => new Date(b.start_at) - new Date(a.start_at));
    const kommend = evs.filter(e => new Date(e.start_at) >= dayStart(new Date())).reverse(), vorbei = evs.filter(e => new Date(e.start_at) < dayStart(new Date()));
    const offen = vorbei.filter(e => { const x = (k || []).find(y => y.event_id === e.id); return !x?.honorar_gebucht; });
    const Row = ({ e }) => { const x = (k || []).find(y => y.event_id === e.id); return html`<a class="card between" style="text-decoration:none;color:var(--text)" href=${'#/ehkurs/' + e.id}><div class="col" style="gap:1px"><span class="b">${e.titel || 'Erste-Hilfe-Kurs'}</span><span class="tiny">${fmtDate(e.start_at)}${e.ort ? ' · ' + e.ort : ''}${x?.teilnehmer ? ' · ' + x.teilnehmer + ' TN' : ''}</span></div>
      <span class=${'chip' + (x?.honorar_gebucht ? ' ok' : '')}>${x?.honorar_gebucht ? 'Honorar gebucht' : x?.honorar ? eur(x.honorar) : 'Details'}</span></a>`; };
    return html`<${Hero} title="Erste-Hilfe-Kurse" sub=${offen.length ? `${offen.length} Kurs${offen.length > 1 ? 'e' : ''} ohne gebuchtes Honorar` : 'Alle Honorare erfasst'} />
    <div class="content"><span class="h2">Kommende Kurse</span>${kommend.length ? kommend.map(e => html`<${Row} e=${e} />`) : html`<div class="card small">Keine kommenden Kurse.</div>`}
      <a class="btn ghost" href="#/eintrag">+ Kurs im Kalender eintragen</a>
      ${vorbei.length > 0 && html`<span class="h2">Vergangene Kurse</span>${vorbei.slice(0, 20).map(e => html`<${Row} e=${e} />`)}`}</div>`;
  }
  function EHKurs({ st, id }) {
    const [k, save] = useTable('eh_kurse', 'id'); const e = st.events.find(x => x.id === id); const [neu, setNeu] = useState('');
    if (!k) return html`<${Hero} title="Kurs" back="#/ehkurse" backLabel="Erste-Hilfe-Kurse" /><${Loading} />`;
    if (!e) return html`<div class="content"><${Back} to="#/ehkurse" label="Erste-Hilfe-Kurse" /><div class="card">Kurs nicht gefunden.</div></div>`;
    const x = k.find(y => y.event_id === id) || { event_id: id, material: MATERIAL.map(t => ({ text: t, ok: false })) };
    const upd = patch => save({ ...(x.id ? { id: x.id } : { event_id: id, material: x.material }), ...patch });
    const mat = x.material || [];
    const buchen = async () => { if (!x.honorar) return toast('Bitte erst das Honorar eintragen');
      const r = await sb.from('transactions').insert({ art: 'einnahme', betrag: Number(x.honorar), datum: isoDate(new Date(e.start_at)), quelle: 'erste_hilfe', titel: 'Erste-Hilfe-Kurs ' + fmtDate(e.start_at), event_id: id });
      if (r.error) return toast('Fehler: ' + r.error.message); await upd({ honorar_gebucht: true }); toast('Honorar als Einnahme gebucht'); };
    return html`<${Hero} title=${e.titel || 'Erste-Hilfe-Kurs'} back="#/ehkurse" backLabel="Erste-Hilfe-Kurse" sub=${`${fmtDate(e.start_at)}${e.ort ? ' · ' + e.ort : ''}`} />
    <div class="content"><div class="card" style="padding:2px 14px">
        <label class="field">Teilnehmende<input type="number" min="0" value=${x.teilnehmer ?? ''} onChange=${ev => upd({ teilnehmer: ev.target.value ? +ev.target.value : null })} /></label>
        <label class="field">Honorar (€)<input inputmode="decimal" value=${x.honorar ?? ''} onChange=${ev => upd({ honorar: ev.target.value ? Number(ev.target.value.replace(',', '.')) : null })} /></label>
        <label class="field">Notiz<input value=${x.notiz || ''} onChange=${ev => upd({ notiz: ev.target.value })} /></label></div>
      ${x.honorar_gebucht ? html`<div class="card small">✓ Honorar ist in deinen Finanzen als Einnahme gebucht.</div>` : html`<button class="btn" onClick=${buchen}>Honorar als Einnahme buchen</button>`}
      <span class="h2">Material-Checkliste</span>
      <div class="card" style="padding:4px 14px">${mat.map((m, i) => html`<${Check} on=${m.ok} label=${m.text} onChange=${v => upd({ material: mat.map((y, j) => j === i ? { ...y, ok: v } : y) })} onDel=${() => upd({ material: mat.filter((_, j) => j !== i) })} />`)}</div>
      <form class="row" onSubmit=${ev => { ev.preventDefault(); if (!neu.trim()) return; upd({ material: [...mat, { text: neu.trim(), ok: false }] }); setNeu(''); }}>
        <input class="input" placeholder="Material ergänzen" value=${neu} onInput=${ev => setNeu(ev.target.value)} aria-label="Material ergänzen" /><button class="btn small">+</button></form></div>`;
  }

  // ======================= KARTEIKARTEN =======================
  const INTERVALL = [0, 1, 2, 4, 8, 16];
  function Karteikarten({ st }) {
    const [cards, save, del] = useTable('flashcards', 'created_at'); const [mod, setMod] = useState(''); const [f, setF] = useState({ vorne: '', hinten: '' });
    const [lernen, setLernen] = useState(null); const [zeig, setZeig] = useState(false);
    if (!cards) return html`<${Hero} title="Karteikarten" /><${Loading} />`;
    const heute = isoDate(new Date()); const sel = cards.filter(c => !mod || c.module_id === mod); const faellig = sel.filter(c => c.faellig <= heute);
    const mods = st.modules.filter(m => cards.some(c => c.module_id === m.id) || m.semester === (st.profile?.settings?.semester || 1));
    if (lernen) {
      const c = lernen[0];
      if (!c) return html`<${Hero} title="Geschafft!" back="" backLabel="Zurück"><div class="row"><${Bernd} mood="zufrieden" size=${80} /><div class="bubble">Alle fälligen Karten durch. Ich bin beeindruckt. Ein bisschen.</div></div></${Hero}><div class="content"><button class="btn" onClick=${() => setLernen(null)}>Zurück zur Übersicht</button></div>`;
      const antwort = async ok => { const box = ok ? Math.min(5, c.box + 1) : 1; await save({ id: c.id, box, faellig: isoDate(addDays(new Date(), ok ? INTERVALL[box] : 0)) }); setZeig(false); setLernen(ok ? lernen.slice(1) : [...lernen.slice(1), { ...c, box: 1 }]); };
      return html`<${Hero} title="Abfrage" back="" backLabel="Abbrechen" sub=${`${lernen.length} Karte${lernen.length > 1 ? 'n' : ''} übrig · Fach ${c.box}`} />
      <div class="content"><button class="card col" style="min-height:220px;justify-content:center;align-items:center;text-align:center;cursor:pointer" onClick=${() => setZeig(true)}>
          <span class="tiny b">${zeig ? 'ANTWORT' : 'FRAGE'}</span><span style="font-size:20px;font-weight:800;color:var(--text);white-space:pre-line">${zeig ? c.hinten : c.vorne}</span>${!zeig && html`<span class="tiny">Tippen zum Umdrehen</span>`}</button>
        ${zeig && html`<div class="row"><button class="btn ghost" onClick=${() => antwort(false)}>Nochmal</button><button class="btn" onClick=${() => antwort(true)}>Gewusst</button></div>`}</div>`;
    }
    return html`<${Hero} title="Karteikarten"><label class="field" style="border:0">Modul<select value=${mod} onChange=${e => setMod(e.target.value)}><option value="">alle</option>${mods.map(m => html`<option value=${m.id}>${m.code} ${m.name}</option>`)}</select></label></${Hero}>
    <div class="content"><div class="row"><div class="stat"><span class="tiny b">Karten</span><b>${sel.length}</b></div><div class="stat"><span class="tiny b">Heute fällig</span><b>${faellig.length}</b></div></div>
      <button class="btn" disabled=${!faellig.length} onClick=${() => setLernen([...faellig].sort(() => Math.random() - 0.5))}>${faellig.length ? 'Abfrage starten' : 'Heute nichts fällig'}</button>
      <form class="card col" onSubmit=${async e => { e.preventDefault(); if (!f.vorne || !f.hinten) return; await save({ module_id: mod || null, vorne: f.vorne, hinten: f.hinten, box: 1, faellig: heute }); setF({ vorne: '', hinten: '' }); toast('Karte gespeichert'); }}>
        <span class="tiny b">NEUE KARTE${mod ? ' · ' + st.modules.find(m => m.id === mod)?.code : ''}</span>
        <textarea class="input" style="min-height:60px" placeholder="Vorderseite (Frage)" value=${f.vorne} onInput=${e => setF({ ...f, vorne: e.target.value })}></textarea>
        <textarea class="input" style="min-height:60px" placeholder="Rückseite (Antwort)" value=${f.hinten} onInput=${e => setF({ ...f, hinten: e.target.value })}></textarea>
        <button class="btn small">Karte speichern</button></form>
      ${sel.length > 0 && html`<span class="h2">Alle Karten</span><div class="card" style="padding:4px 14px">${sel.map(c => html`<div class="between" style="min-height:40px;border-bottom:1px solid var(--line)"><span class="small" style="color:var(--text);flex:1">${c.vorne}</span><span class="tiny">Fach ${c.box}</span><button class="back" aria-label="Löschen" onClick=${() => del(c.id)}>✕</button></div>`)}</div>`}
      <span class="tiny">Gewusste Karten wandern ein Fach weiter und kommen nach 1, 2, 4, 8 und 16 Tagen wieder. Nicht gewusste starten von vorn.</span></div>`;
  }

  // ======================= WOCHENRÜCKBLICK =======================
  function Rueckblick({ st }) {
    const mo = (() => { const d = dayStart(new Date()); return addDays(d, -((d.getDay() + 6) % 7)); })(); const so = addDays(mo, 7);
    const ses = st.sessions.filter(s => new Date(s.start_at) >= mo && new Date(s.start_at) < so); const min = ses.reduce((a, s) => a + (s.arbeit_min || 0), 0);
    const geplant = st.events.filter(e => e.typ === 'arbeitsphase' && new Date(e.start_at) >= mo && new Date(e.start_at) < new Date());
    const geschafft = geplant.filter(e => ses.some(s => new Date(s.start_at) < new Date(e.ende_at) && (s.ende_at ? new Date(s.ende_at) : new Date()) > new Date(e.start_at))).length;
    const dienste = st.events.filter(e => e.typ === 'dienst' && new Date(e.start_at) >= mo && new Date(e.start_at) < so).length;
    const naechste = st.tasks.filter(t => (t.status || 'offen') === 'offen' && t.abgabe && new Date(t.abgabe) >= so && new Date(t.abgabe) < addDays(so, 7));
    const quote = geplant.length ? geschafft / geplant.length : 1; const mood = quote >= 0.7 ? 'zufrieden' : quote >= 0.4 ? 'enttaeuscht' : 'wuetend';
    const satz = { zufrieden: 'Starke Woche! Ich bin stolz auf dich. Sag’s aber keinem.', enttaeuscht: 'Geht so. Nächste Woche schaffen wir mehr, oder?', wuetend: 'Diese Woche war … sagen wir: ausbaufähig. Neue Woche, neues Glück.' }[mood];
    return html`<${Hero} title="Wochenrückblick" sub=${`${fmtDate(mo)} – ${fmtDate(addDays(so, -1))}`}><div class="row" style="align-items:flex-end"><${Bernd} mood=${mood} size=${80} /><div class="bubble">${satz}</div></div></${Hero}>
    <div class="content"><div class="row"><div class="stat"><span class="tiny b">Gearbeitet</span><b>${Math.floor(min / 60)}:${pad(min % 60)} Std.</b></div><div class="stat"><span class="tiny b">Arbeitsphasen</span><b>${geschafft} / ${geplant.length}</b><span class="tiny">geplant & gemacht</span></div><div class="stat"><span class="tiny b">Dienste</span><b>${dienste}</b></div></div>
      <span class="h2">Nächste Woche fällig</span>${naechste.length ? naechste.map(t => html`<a class="card between" style="text-decoration:none;color:var(--text)" href=${'#/modul/' + t.module_id}><span class="b small">${t.titel}</span><span class="chip dark">${fmtDate(t.abgabe)}</span></a>`) : html`<div class="card small">Keine Abgaben nächste Woche.</div>`}
      <span class="tiny">Jeden Sonntag um 18 Uhr schickt Bernd dir den Rückblick als Benachrichtigung.</span></div>`;
  }

  return { Einkauf, Packliste, Zertifikate, Praxisanleiter, EHKurse, EHKurs, Karteikarten, Rueckblick };
}
