// Verbindung zu deiner Supabase-Datenbank.
// Der "publishable key" darf öffentlich im Code stehen – geschützt wird über die Sicherheitsregeln (RLS).
// NIEMALS den service_role/secret key hier eintragen!
export const SUPABASE_URL = 'https://dpuwdgqqcstjitrcfnmg.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_AfBTsT5DbyByxK6UOkmiWw_b6kn6Rd7';
// Öffentlicher Schlüssel für Push-Benachrichtigungen (VAPID public key – darf öffentlich sein)
export const VAPID_PUBLIC = 'BAQk17uzUPPDIvTytjg5XvNJ91yq1MH6DTPlLO1a15-jZqbUZypL3z_7YJw_qpKfiJq-u1sAmtAD5784ZwTWpxY';
