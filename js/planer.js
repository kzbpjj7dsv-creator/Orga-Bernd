// Bernds Arbeitsphasen-Planer: verteilt Arbeitsphasen in freie Lücken der nächsten 7 Tage.
// Regeln: nie in Diensten, Ruhezeiten, Urlaub, Schul-/Uni-Tagen; Puffer zu Terminen; Tagesmaximum; Dringlichkeit.

const BLOCK_ALL_DAY = ['urlaub', 'uni', 'schule'];
const BUSY = ['dienst', 'ruhezeit', 'schule', 'uni', 'online', 'erste_hilfe', 'urlaub', 'sport', 'privat', 'dlrg', 'arbeitsphase'];

const at = (day, hhmm) => { const [h, m] = hhmm.split(':').map(Number); const d = new Date(day); d.setHours(h, m, 0, 0); return d; };
const progress = t => { const s = t.schritte || []; return s.length ? s.filter(x => x.erledigt).length / s.length : 0; };

export function planeWoche(st, expand) {
  const set = st.profile?.settings || {};
  const fenster = set.zeitfenster || [['10:00', '16:00'], ['19:00', '21:00']];
  const softEnde = set.zeitfenster_soft_ende || '15:30';
  const rhythm = set.rhythmus || [45, 5, 45, 20, 45, 5];
  const maxMin = set.tagesmaximum_min || 360;
  const puffer = (set.puffer_min ?? 30) * 6e4;
  const now = new Date();
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 7);

  // Aufgaben nach Dringlichkeit
  const offen = st.tasks.filter(t => (t.status || 'offen') === 'offen' && t.abgabe && new Date(t.abgabe) > now)
    .map(t => { const tage = Math.max(0.5, (new Date(t.abgabe) - now) / 864e5); const rest = 1 - progress(t); return { t, tage, score: rest / tage }; })
    .filter(x => x.score > 0).sort((a, b) => b.score - a.score);
  if (!offen.length) return [];

  const evs = expand(st.events.filter(e => !(e.von_bernd && new Date(e.start_at) > now)), start, end);
  const neu = [];
  for (let d = 0; d < 7; d++) {
    const day = new Date(start); day.setDate(day.getDate() + d);
    const dayEnd = new Date(day); dayEnd.setDate(dayEnd.getDate() + 1);
    if (!set.wochenende && set.wochenende !== undefined && (day.getDay() === 0 || day.getDay() === 6)) continue;
    const heute = evs.filter(e => e._e > day && e._s < dayEnd);
    if (heute.some(e => BLOCK_ALL_DAY.includes(e.typ))) continue;
    // Bedarf: je dringender, desto mehr Zeit
    const dringend = offen.filter(x => x.tage - d <= 7);
    const bald = offen.filter(x => x.tage - d <= 21);
    const ziel = dringend.length ? maxMin : bald.length ? Math.min(maxMin, 135) : 90;
    let geplant = st.sessions.filter(s => new Date(s.start_at) >= day && new Date(s.start_at) < dayEnd).reduce((a, s) => a + (s.arbeit_min || 0), 0);
    const busy = heute.filter(e => BUSY.includes(e.typ)).map(e => [e._s.getTime() - puffer, e._e.getTime() + puffer]);
    const frei = (a, b) => !busy.some(([s, e]) => a < e && b > s);
    for (let w = 0; w < fenster.length; w++) {
      const [von, bis] = fenster[w];
      let cur = at(day, von).getTime();
      const hart = at(day, bis).getTime();
      const weich = w === 0 && !dringend.length ? Math.min(hart, at(day, softEnde).getTime()) : hart;
      if (cur < now.getTime()) cur = Math.ceil(now.getTime() / 9e5) * 9e5; // frühestens ab jetzt (Viertelstunde)
      let i = 0;
      while (cur < weich && geplant < ziel) {
        const len = rhythm[i % rhythm.length] * 6e4; const isWork = i % 2 === 0;
        if (isWork) {
          if (cur + len > weich) break;
          if (!frei(cur, cur + len)) { cur += 15 * 6e4; i = 0; continue; }
          const task = (dringend[0] || bald[0] || offen[0]).t;
          neu.push({ typ: 'arbeitsphase', titel: 'Arbeitsphase · ' + task.titel, start_at: new Date(cur).toISOString(), ende_at: new Date(cur + len).toISOString(), task_id: task.id, von_bernd: true, quelle: 'bernd' });
          geplant += len / 6e4;
        }
        cur += len; i++;
      }
    }
  }
  return neu;
}
