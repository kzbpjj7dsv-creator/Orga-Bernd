// Supabase Edge Function: Bernd schickt Push-Benachrichtigungen.
// Wird alle 15 Minuten per pg_cron aufgerufen. Geheimnisse liegen in der Tabelle app_secrets (nur service_role).
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const TZ = "Europe/Berlin";

const LINES: Record<string, string[][]> = {
  start: [["Gleich beginnt deine Arbeitsphase. Du schaffst das."], ["In 10 Minuten geht’s los. Laptop auf, Handy weg."], ["Arbeitsphase in 10 Minuten. Keine Ausreden, ich hab sie alle schon gehört."], ["10 Minuten. Dann wird gearbeitet. Ende der Diskussion."]],
  verpasst: [["Die geplante Arbeitsphase ist vorbei. Morgen klappt es bestimmt."], ["Ich bin nicht wütend. Nur enttäuscht."], ["Arbeitsphase verpasst. Ich trage das mal in dein Sündenregister ein."], ["Verpasst. Schon wieder. Ich schreib es auf deinen Grabstein."]],
  abgabe7: [["In einer Woche ist Abgabe: {t}. Du hast Zeit, nutz sie."], ["Noch 7 Tage bis „{t}“. Langsam wird’s ernst."], ["7 Tage bis „{t}“. Ich fang schon mal an, Kerzen zu kaufen."], ["7 Tage. „{t}“. Tick, tack."]],
  abgabe3: [["Noch 3 Tage bis „{t}“. Ein Schritt nach dem anderen."], ["3 Tage bis „{t}“. Wir müssen reden."], ["3 Tage bis „{t}“. Ich suche schon mal Blumen für dein Grab aus."], ["3 Tage. „{t}“. Panik ist jetzt angebracht."]],
  abgabe1: [["Morgen ist Abgabe: „{t}“. Du packst das!"], ["Morgen! „{t}“! Letzte Kurve."], ["Morgen ist „{t}“ fällig. Wenn nicht jetzt, reanimiert dich auch kein R24 mehr."], ["MORGEN. „{t}“. Los."]],
  gehalt: [["Neuer Monat! Trag dein Gehalt in Finanzen ein."], ["Monatsanfang: Gehalt eintragen, sonst rechne ich mit null."], ["Neuer Monat. Gehalt eintragen, bevor ich deine Finanzen schätze."], ["Gehalt. Eintragen. Jetzt."]],
};
const line = (k: string, frech: number, t = "") => { const l = LINES[k][Math.min(Math.max(frech, 1), 4) - 1]; return l[Math.floor(Math.random() * l.length)].replace("{t}", t); };

function local(d: Date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: +p.hour % 24, min: +p.minute, day: +p.day };
}
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);

Deno.serve(async (req) => {
  const { data: sec } = await sb.from("app_secrets").select("key,value");
  const S = Object.fromEntries((sec || []).map((r: any) => [r.key, r.value]));
  if (req.headers.get("x-bernd-secret") !== S.cron_secret) return new Response("forbidden", { status: 403 });
  webpush.setVapidDetails("mailto:bernd@example.com", S.vapid_public, S.vapid_private);

  const now = new Date(); const L = local(now);
  const { data: subs } = await sb.from("push_subscriptions").select("*");
  const users = [...new Set((subs || []).map((s: any) => s.user_id))];
  let sent = 0;

  for (const uid of users) {
    const { data: prof } = await sb.from("profiles").select("settings").eq("id", uid).single();
    const set = prof?.settings || {}; const frech = set.schonmodus ? 1 : (set.bernd_frechheit || 3);
    const msgs: { key: string; title: string; body: string; url: string }[] = [];

    // Urlaub / Ruhezeit / Dienst gerade? Dann nur Abgabe-Erinnerungen, keine Arbeitsphasen-Meldungen
    const { data: evs } = await sb.from("events").select("typ,start_at,ende_at,von_bernd,titel,task_id,id")
      .eq("user_id", uid).gte("ende_at", new Date(now.getTime() - 864e5).toISOString()).lte("start_at", new Date(now.getTime() + 864e5).toISOString());
    const aktiv = (evs || []).filter((e: any) => Date.parse(e.start_at) <= now.getTime() && Date.parse(e.ende_at) > now.getTime());
    const still = aktiv.some((e: any) => ["urlaub", "ruhezeit", "dienst"].includes(e.typ));

    if (!still) {
      // Start einer Arbeitsphase in 5–20 Minuten (nur erste Phase eines Blocks)
      const ap = (evs || []).filter((e: any) => e.typ === "arbeitsphase").sort((a: any, b: any) => Date.parse(a.start_at) - Date.parse(b.start_at));
      for (const e of ap) {
        const dt = (Date.parse(e.start_at) - now.getTime()) / 6e4;
        const vorher = ap.find((x: any) => Math.abs(Date.parse(x.ende_at) - Date.parse(e.start_at)) <= 25 * 6e4 && x.id !== e.id);
        if (dt > 5 && dt <= 20 && !vorher) msgs.push({ key: `start:${e.id}`, title: "Bernd", body: line("start", frech), url: "./#/timer" + (e.task_id ? "/" + e.task_id : "") });
      }
      // Verpasste Arbeitsphase (in den letzten 15–30 Minuten geendet, keine Sitzung)
      const { data: ses } = await sb.from("work_sessions").select("start_at,ende_at").eq("user_id", uid).gte("start_at", new Date(now.getTime() - 864e5).toISOString());
      for (const e of ap) {
        const seit = (now.getTime() - Date.parse(e.ende_at)) / 6e4;
        if (seit < 0 || seit > 30) continue;
        const gearbeitet = (ses || []).some((s: any) => Date.parse(s.start_at) < Date.parse(e.ende_at) && (s.ende_at ? Date.parse(s.ende_at) : now.getTime()) > Date.parse(e.start_at));
        if (!gearbeitet) msgs.push({ key: `verpasst:${e.id}`, title: "Bernd ist enttäuscht", body: line("verpasst", frech), url: "./#/home" });
      }
    }

    // Abgabe-Erinnerungen um 9 Uhr (7, 3, 1 Tag vorher)
    if (L.hour === 9) {
      const { data: tasks } = await sb.from("tasks").select("id,titel,abgabe,status,erinnerungen_tage").eq("user_id", uid).eq("status", "offen").not("abgabe", "is", null);
      for (const t of tasks || []) {
        const d = daysBetween(L.date, local(new Date(t.abgabe)).date);
        const tage = t.erinnerungen_tage || set.erinnerungen_tage || [7, 3, 1];
        if (tage.includes(d) && [7, 3, 1].includes(d)) msgs.push({ key: `abgabe${d}:${t.id}`, title: d === 1 ? "Morgen ist Abgabe!" : `Abgabe in ${d} Tagen`, body: line(`abgabe${d}`, frech, t.titel), url: "./#/aufgaben" });
      }
      if (L.day === 1) msgs.push({ key: `gehalt:${L.date}`, title: "Bernd", body: line("gehalt", frech), url: "./#/buchung" });
    }

    for (const m of msgs) {
      const { error: dup } = await sb.from("notification_log").insert({ user_id: uid, key: m.key });
      if (dup) continue; // schon gesendet
      for (const s of (subs || []).filter((x: any) => x.user_id === uid)) {
        try { await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify(m)); sent++; }
        catch (e: any) { if (e.statusCode === 404 || e.statusCode === 410) await sb.from("push_subscriptions").delete().eq("id", s.id); }
      }
    }
  }
  return new Response(JSON.stringify({ ok: true, sent }), { headers: { "content-type": "application/json" } });
});
