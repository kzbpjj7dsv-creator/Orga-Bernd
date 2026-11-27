# Bernd – Uni-Planer (Web-App)

Persönliche Web-App für Studium, Dienste und Arbeitsphasen – mit Bernd, dem Pinguin.
Läuft im Browser auf iPhone und Windows-Laptop; die Daten liegen in Supabase (Region Frankfurt).

## Etappe 1 (dieser Stand)
- Login (E-Mail + Passwort)
- Studium: alle Module aus dem Studienverlaufsplan (Schwerpunkt Pädagogik), CP, Notenschnitt nach BPO-Gewichten
- Aufgaben mit Teilschritten, Format-Check nach Leitfaden, Abgaben im Kalender
- Kalender (Woche/Monat) mit Dienstvorlagen und automatischer Ruhezeit
- To-do-Listen: Studium, Arbeit, Praxisanleiter, Privat, DLRG
- Arbeitsphase-Timer im eigenen Rhythmus
- Bernd mit Stimmungen, Nachtmodus, Einstellungen

## Einrichtung
1. `supabase/schema.sql` einmal im Supabase SQL Editor ausführen.
2. Supabase → Authentication → URL Configuration → **Site URL**: `https://kzbpjj7dsv-creator.github.io/Orga-Bernd/`
3. GitHub → Repository → Settings → Pages → Source: **Deploy from a branch**, Branch `main`, Ordner `/ (root)`.
4. Auf dem iPhone die Adresse in **Safari** öffnen → Teilen → **Zum Home-Bildschirm**.

`config.js` enthält nur die Projekt-URL und den *publishable key* (öffentlich gedacht). Niemals den secret/service_role key eintragen.
