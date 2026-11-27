// Supabase Edge Function: privater Kalender-Feed (iCal) für Apple-/Google-Kalender und darüber TimeTree.
// Aufruf: /functions/v1/bernd-ical?t=<persönlicher Token>
import { createClient } from "npm:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const TZ = "Europe/Berlin";
const LABEL: Record<string, string> = {
  dienst: "Dienst", arbeitsphase: "Arbeitsphase", schule: "Schule", uni: "Uni-Präsenz", online: "Online-Termin", abgabe: "Abgabe",
  erste_hilfe: "Erste-Hilfe-Kurs", urlaub: "Urlaub", sport: "Sport", geburtstag: "Geburtstag", privat: "Privat", dlrg: "DLRG", ruhezeit: "Ruhezeit",
};
const esc = (s: string) => String(s ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const utc = (d: string) => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const localDate = (d: string | Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(d)).replace(/-/g, "");
const fold = (l: string) => { const out: string[] = []; let s = l; while (new TextEncoder().encode(s).length > 74) { let i = 74; while (new TextEncoder().encode(s.slice(0, i)).length > 74) i--; out.push(s.slice(0, i)); s = " " + s.slice(i); } out.push(s); return out.join("\r\n"); };

Deno.serve(async (req) => {
  const t = new URL(req.url).searchParams.get("t");
  if (!t || t.length < 20) return new Response("not found", { status: 404 });
  const { data: prof } = await sb.from("profiles").select("id").eq("ical_token", t).maybeSingle();
  if (!prof) return new Response("not found", { status: 404 });

  const seit = new Date(Date.now() - 90 * 864e5).toISOString();
  const { data: evs } = await sb.from("events").select("*").eq("user_id", prof.id).or(`start_at.gte.${seit},wiederholung.not.is.null`);
  const now = utc(new Date().toISOString());
  const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Bernd Uni-Planer//DE", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "X-WR-CALNAME:Bernd 🐧", "X-WR-TIMEZONE:Europe/Berlin", "REFRESH-INTERVAL;VALUE=DURATION:PT1H", "X-PUBLISHED-TTL:PT1H"];
  for (const e of evs || []) {
    if (e.typ === "ruhezeit") continue;
    const titel = e.titel && e.titel !== LABEL[e.typ] ? `${e.titel}` : LABEL[e.typ] || "Termin";
    const sum = e.typ === "geburtstag" ? `🎂 ${titel}` : e.typ === "abgabe" ? `📌 ${titel}` : e.typ === "dienst" ? `🚑 ${titel}` : titel;
    L.push("BEGIN:VEVENT", `UID:${e.id}@bernd`, `DTSTAMP:${now}`, `SUMMARY:${esc(sum)}`, `CATEGORIES:${esc(LABEL[e.typ] || "Termin")}`);
    if (e.ganztags || e.typ === "abgabe") {
      const end = e.ende_at ? e.ende_at : new Date(Date.parse(e.start_at) + 864e5).toISOString();
      let ed = localDate(end); const sd = localDate(e.start_at); if (ed <= sd) ed = localDate(new Date(Date.parse(e.start_at) + 864e5));
      L.push(`DTSTART;VALUE=DATE:${sd}`, `DTEND;VALUE=DATE:${ed}`, "TRANSP:TRANSPARENT");
    } else {
      L.push(`DTSTART:${utc(e.start_at)}`, `DTEND:${utc(e.ende_at || new Date(Date.parse(e.start_at) + 36e5).toISOString())}`);
    }
    if (e.wiederholung) L.push(`RRULE:${e.wiederholung}`);
    if (e.ort) L.push(`LOCATION:${esc(e.ort)}`);
    if (e.von_bernd) L.push("DESCRIPTION:Von Bernd geplant");
    L.push("END:VEVENT");
  }
  L.push("END:VCALENDAR");
  return new Response(L.map(fold).join("\r\n") + "\r\n", {
    headers: { "content-type": "text/calendar; charset=utf-8", "content-disposition": 'inline; filename="bernd.ics"', "cache-control": "no-cache" },
  });
});
