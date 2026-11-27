// Startdaten aus Studienverlaufsplan (Modulhandbuch 02/2026) und BPO Anlage 4 (inkl. Änderung 41/2025)
// Schwerpunkt Pädagogik. gewicht = Gewicht für die Gesamtnote; benotet=false -> "bestanden/nicht bestanden".
export const MODULE_SEED = [
  // 1. Semester
  { code: 'BMRD-01', name: 'Berufliches Selbstverständnis im Rettungsdienst', semester: 1, cp: 5, gewicht: 0, benotet: false, pruefungsform: 'EP + B' },
  { code: 'BMRD-02', name: 'Medizin- und Rettungswissenschaften', semester: 1, cp: 7, gewicht: 0, benotet: false, pruefungsform: 'EP', zulassungsrelevant: true },
  { code: 'BMRD-09', name: 'Evidence Based Medicine', semester: 1, cp: 5, gewicht: 5, benotet: true, pruefungsform: 'KO' },
  { code: 'BMRD-03.1', name: 'Wissenschaftliches Arbeiten (Teil 1+2)', semester: 1, cp: 4, gewicht: 4, benotet: true, pruefungsform: 'H', zulassungsrelevant: true },
  { code: 'BMRD-12', name: 'Medizinische Grundlagen', semester: 1, cp: 10, gewicht: 0, benotet: false, pruefungsform: 'M', pauschal_angerechnet: true },
  // 2. Semester
  { code: 'BMRD-03.3', name: 'Wissenschaftliches Arbeiten (Teil 3)', semester: 2, cp: 3, gewicht: 3, benotet: true, pruefungsform: 'KO', zulassungsrelevant: true },
  { code: 'BMRD-04', name: 'Recht im Rettungsdienst', semester: 2, cp: 5, gewicht: 5, benotet: true, pruefungsform: 'ES' },
  { code: 'BMRD-10', name: 'Heilkundliche Maßnahmen', semester: 2, cp: 5, gewicht: 5, benotet: true, pruefungsform: 'KO' },
  { code: 'BMRD-11.1', name: 'Wahlpflichtbereich (Teil 1)', semester: 2, cp: 2, gewicht: 0, benotet: false, pruefungsform: '' },
  { code: 'BMRDB-15', name: 'Einführung in die Berufspädagogik', semester: 2, cp: 5, gewicht: 5, benotet: true, pruefungsform: 'ES' },
  { code: 'BMRD-13', name: 'Grundlagen der Notfallversorgung', semester: 2, cp: 10, gewicht: 0, benotet: false, pruefungsform: 'M', pauschal_angerechnet: true },
  // 3. Semester
  { code: 'BMRD-05', name: 'Digitalisierung im Rettungsdienst', semester: 3, cp: 5, gewicht: 5, benotet: true, pruefungsform: 'K90' },
  { code: 'BMRD-06', name: 'Diversity Management', semester: 3, cp: 5, gewicht: 0, benotet: false, pruefungsform: 'KO' },
  { code: 'BMRD-11.2', name: 'Wahlpflichtbereich (Teil 2)', semester: 3, cp: 4, gewicht: 0, benotet: false, pruefungsform: '' },
  { code: 'BMRDB-16', name: 'Einführung in die Didaktik und Methodik in der beruflichen Bildung', semester: 3, cp: 5, gewicht: 5, benotet: true, pruefungsform: 'ES' },
  { code: 'BMRD-14.1', name: 'Praxisphasen', semester: 3, cp: 10, gewicht: 0, benotet: false, pruefungsform: '', pauschal_angerechnet: true },
  // 4. Semester
  { code: 'BMRD-07', name: 'Forschungsmethodik', semester: 4, cp: 5, gewicht: 5, benotet: true, pruefungsform: 'H' },
  { code: 'BMRD-08', name: 'Qualitätsmanagement', semester: 4, cp: 5, gewicht: 5, benotet: true, pruefungsform: 'KO' },
  { code: 'BMRDB-17', name: 'Einführung in die Curriculaentwicklung und Lernortgestaltung', semester: 4, cp: 5, gewicht: 5, benotet: true, pruefungsform: 'KN' },
  { code: 'BMRDB-18', name: 'Berufspädagogik und Fachdidaktik Rettungsdienst', semester: 4, cp: 5, gewicht: 5, benotet: true, pruefungsform: 'H' },
  { code: 'BMRD-14.2', name: 'Praxisphasen', semester: 4, cp: 10, gewicht: 0, benotet: false, pruefungsform: '', pauschal_angerechnet: true },
  // 5. Semester
  { code: 'BMRDB-19.1', name: 'Theorie-Praxis-Transfer (Projektmanagement)', semester: 5, cp: 4, gewicht: 0, benotet: false, pruefungsform: 'EP' },
  { code: 'BMRDB-20', name: 'Reflexion und Beurteilung', semester: 5, cp: 5, gewicht: 5, benotet: true, pruefungsform: 'KO' },
  { code: 'BMRDB-21', name: 'Lehr-/Lernsituationen am Lernort Praxis', semester: 5, cp: 5, gewicht: 5, benotet: true, pruefungsform: 'KO' },
  { code: 'BMRDB-22', name: 'Lehr-/Lernsituationen in Bildungseinrichtungen', semester: 5, cp: 5, gewicht: 5, benotet: true, pruefungsform: 'KO' },
  { code: 'BMRD-14.3', name: 'Praxisphasen', semester: 5, cp: 10, gewicht: 0, benotet: false, pruefungsform: '', pauschal_angerechnet: true },
  // 6. Semester
  { code: 'BMRDB-19.2', name: 'Theorie-Praxis-Transfer (Innovations- und Transferprojekt)', semester: 6, cp: 4, gewicht: 4, benotet: true, pruefungsform: 'PA' },
  { code: 'BMRDB-23', name: 'Digitalisierung in der gesundheitsberuflichen Bildung', semester: 6, cp: 5, gewicht: 5, benotet: true, pruefungsform: 'KO' },
  { code: 'BMRD-24', name: 'Bachelorarbeit mit abschließendem Kolloquium', semester: 6, cp: 12, gewicht: 25, benotet: true, pruefungsform: 'BA' },
  { code: 'BMRD-14.4', name: 'Praxisphasen', semester: 6, cp: 10, gewicht: 0, benotet: false, pruefungsform: '', pauschal_angerechnet: true },
];

export const PRUEFUNGSFORM = {
  H: 'Hausarbeit', KO: 'Komplexe Aufgabe', ES: 'Einsendeaufgabe', EP: 'E-Portfolio', 'EP + B': 'E-Portfolio + Beratung',
  K90: 'Klausur 90 Min.', KN: 'Konzept', PA: 'Projektarbeit', M: 'Mündliche Prüfung', B: 'Beratung', BA: 'Bachelorarbeit',
};

// Dienstvorlagen
export const SHIFT_SEED = [
  { kuerzel: 'R24', start_zeit: '08:30', ende_zeit: '08:30', ruhezeit_danach: true },
  { kuerzel: 'R24-2', start_zeit: '08:00', ende_zeit: '08:00', ruhezeit_danach: true },
  { kuerzel: 'R12 Tag', start_zeit: '08:00', ende_zeit: '20:00', ruhezeit_danach: false },
  { kuerzel: 'R12 Nacht', start_zeit: '20:00', ende_zeit: '08:00', ruhezeit_danach: true },
  { kuerzel: 'R8', start_zeit: '07:00', ende_zeit: '15:30', ruhezeit_danach: false },
  { kuerzel: 'KTW 2', start_zeit: '06:30', ende_zeit: '17:30', ruhezeit_danach: false },
  { kuerzel: 'KTW 3 Tag', start_zeit: '08:00', ende_zeit: '19:00', ruhezeit_danach: false },
  { kuerzel: 'KTW 3 Nacht', start_zeit: '20:00', ende_zeit: '07:00', ruhezeit_danach: true },
  { kuerzel: 'KTW 4', start_zeit: '09:00', ende_zeit: '20:00', ruhezeit_danach: false },
];

// Teilschritt-Vorlagen je Prüfungsart (Leitfaden Ostfalia: Format-Check vor Abgabe)
export const SCHRITTE = {
  H: ['Thema festlegen', 'Literatur recherchieren', 'Gliederung', 'Schreiben', 'Korrektur lesen', 'Format-Check nach Leitfaden', 'Abgabe'],
  KO: ['Aufgabenstellung verstehen', 'Material sammeln', 'Bearbeiten', 'Überarbeiten', 'Abgabe'],
  ES: ['Aufgabe lesen', 'Recherche', 'Ausarbeiten', 'Korrektur', 'Einsenden'],
  EP: ['Struktur anlegen', 'Einträge schreiben', 'Reflexion', 'Prüfen', 'Abgabe'],
  KN: ['Ausgangslage klären', 'Konzept entwerfen', 'Ausarbeiten', 'Korrektur', 'Abgabe'],
  PA: ['Projektplan', 'Durchführung', 'Dokumentation', 'Präsentation', 'Abgabe'],
  K90: ['Stoff sammeln', 'Zusammenfassung', 'Lernen', 'Probeklausur', 'Klausur'],
  M: ['Stoff sammeln', 'Lernen', 'Probe-Abfrage', 'Prüfung'],
  BA: ['Exposé', 'Literatur', 'Methodik', 'Schreiben', 'Korrektur', 'Format-Check nach Leitfaden', 'Abgabe', 'Kolloquium'],
  _: ['Planen', 'Bearbeiten', 'Prüfen', 'Abgabe'],
};

export const FORMAT_CHECK = [
  'Schrift 12 pt, 1,5-zeilig, Blocksatz mit Silbentrennung',
  'Fußnoten 10 pt, einzeilig',
  'Ränder: links 3,5 cm, sonst 2,5 cm',
  'Times New Roman, Calibri oder Arial',
  'Seitenzahlen 10 pt: vor dem Text römisch, ab Text arabisch',
  'Reihenfolge: Deckblatt, Verzeichnisse, Text, Literatur, ggf. Anhang, Ehrenwörtliche Erklärung',
  'Zitierweise mit Prüfenden abgestimmt',
  'KI-Nutzung mit Prompts angegeben (falls genutzt)',
];

export const TODO_LISTEN = [
  ['studium', 'Studium'], ['arbeit', 'Arbeit'], ['praxisanleiter', 'Arbeit › Praxisanleiter'], ['privat', 'Privat'], ['dlrg', 'DLRG'],
];

export const EVENT_TYPEN = {
  dienst: { label: 'Dienst', farbe: '#8C1C2B', text: '#FFFFFF' },
  arbeitsphase: { label: 'Arbeitsphase', farbe: '#F6C1CB', text: '#3D1418' },
  schule: { label: 'Schule', farbe: '#5E3A4A', text: '#FFFFFF' },
  uni: { label: 'Uni-Präsenz', farbe: '#5E3A4A', text: '#FFFFFF' },
  online: { label: 'Online-Termin', farbe: '#D9536A', text: '#FFFFFF' },
  abgabe: { label: 'Abgabe', farbe: '#A3202E', text: '#FFFFFF' },
  erste_hilfe: { label: 'Erste-Hilfe-Kurs', farbe: '#B4413F', text: '#FFFFFF' },
  urlaub: { label: 'Urlaub', farbe: '#E8A33D', text: '#3D1418' },
  sport: { label: 'Sport', farbe: '#008BA8', text: '#FFFFFF' },
  geburtstag: { label: 'Geburtstag', farbe: '#8152B5', text: '#FFFFFF' },
  privat: { label: 'Privat', farbe: '#8A7F82', text: '#FFFFFF' },
  dlrg: { label: 'DLRG', farbe: '#C8344A', text: '#FFFFFF' },
  ruhezeit: { label: 'Ruhezeit', farbe: '#EADFE2', text: '#6E3D42' },
};

// Bernds Sprüche: [Stimmung][Frechheitsstufe 1-4]
export const BERND = {
  zufrieden: [
    ['Schön, dass du da bist. Heute wird gut.', 'Alles im Griff. Ich bin fast ein bisschen stolz.'],
    ['Läuft bei dir. Ich hab nichts zu meckern, und das ärgert mich.', 'Du bist im Plan. Wer bist du und was hast du mit Arlene gemacht?'],
    ['Alles erledigt? Dann darfst du heute ausnahmsweise leben.', 'Im Plan. Ich muss meinen Nachruf auf dich wohl verschieben.'],
    ['Gut gemacht. Gewöhn dich nicht dran.', 'Keine Ausreden heute. Respekt. Widerwillig.'],
  ],
  enttaeuscht: [
    ['Die geplante Arbeitsphase ist vorbei. Morgen klappt es bestimmt.', 'Heute war wohl nicht dein Tag. Ist okay.'],
    ['Ich bin nicht wütend. Nur enttäuscht.', 'Die Arbeitsphase hat auf dich gewartet. Sie wartet immer noch.'],
    ['Geplante Arbeitsphase verpasst. Ich trage das mal in dein Sündenregister ein.', 'Ich hab den Laptop schon warmgehalten. Umsonst.'],
    ['Verpasst. Schon wieder. Ich schreib es auf deinen Grabstein.', 'Wenn Ausreden ECTS gäben, wärst du schon fertig.'],
  ],
  wuetend: [
    ['Die Abgabe kommt näher. Lass uns heute ein Stück schaffen.', 'Nur noch wenige Tage. Kleine Schritte helfen.'],
    ['Abgabe in Sichtweite und du bei unter der Hälfte. Wir müssen reden.', 'Die Deadline rennt. Du gehst spazieren.'],
    ['Abgabe bald. Ich suche schon mal Blumen für dein Grab aus.', 'Deine Hausarbeit schreibt sich nicht von allein. Ich hab es getestet.'],
    ['Wenn du jetzt nicht anfängst, reanimiert dich auch kein R24 mehr.', 'Deadline. Panik. Los.'],
  ],
  ruhe: [['Ruhezeit. Schlaf dich aus, ich halte die Stellung.', 'Nach dem Dienst wird erst geschlafen. Ich bin heute leise.']],
  urlaub: [['Urlaubsmodus. Bitte nicht wecken.', 'Zzz … ich bin im Urlaub. Du auch.']],
  schonmodus: [['Heute ist Schonmodus. Pass auf dich auf.', 'Kein Druck heute. Ich bin da, wenn du mich brauchst.']],
};

// Kontaktstudienzeiten (Präsenz) für Kohorte BMRD 2026 W – aus den Kontaktstudienzeitplänen der Ostfalia
// (WiSe 2026/27 Stand 23.07.2025, SoSe 2027 Stand 03.08.2026, WiSe 2027/28 Stand 31.07.2026). Änderungen vorbehalten.
export const PRAESENZ_SEED = [
  ['2026-09-21', '2026-09-22', 'Ersti-Begrüßungstage'],
  ['2026-09-23', '2026-09-26', 'Uni-Präsenz 1. Semester'],
  ['2026-10-12', '2026-10-17', 'Uni-Präsenz 1. Semester'],
  ['2026-11-23', '2026-11-28', 'Uni-Präsenz 1. Semester'],
  ['2027-01-04', '2027-01-04', 'Start Prüfungszeitraum WiSe 26/27'],
  ['2027-03-08', '2027-03-13', 'Uni-Präsenz 2. Semester'],
  ['2027-04-05', '2027-04-10', 'Uni-Präsenz 2. Semester'],
  ['2027-05-10', '2027-05-14', 'Uni-Präsenz 2. Semester'],
  ['2027-06-07', '2027-06-12', 'Uni-Präsenz 2. Semester'],
  ['2027-06-14', '2027-06-14', 'Start Prüfungszeitraum SoSe 27'],
  ['2027-09-27', '2027-10-01', 'Uni-Präsenz 3. Semester'],
  ['2027-11-01', '2027-11-06', 'Uni-Präsenz 3. Semester'],
  ['2027-11-29', '2027-12-04', 'Uni-Präsenz 3. Semester (ggf. Teilgruppen)'],
  ['2028-01-03', '2028-01-03', 'Start Prüfungszeitraum WiSe 27/28'],
  ['2028-01-05', '2028-01-05', 'Uni-Termin 3. Semester'],
];
