# Grenadier Trainer

Next.js-App zur Vorbereitung auf den Sporttest der Eignungsprüfung für Grenadiere (AZ SK).

- **Ziele & Rekorde** pro Disziplin, gespeichert in Supabase
- **Test-Modus** mit Countdown, Zähler, Sekundentakt (Metronom) und Stoppuhr – gibt die Note gemäss offizieller Notentabelle zurück
- **Aushebungsdatum** mit Countdown und automatischer Trainingsphase
- Verlauf aller Tests
- **Als App installierbar** (PWA): Button «App installieren» – auf Android nativ, auf dem iPhone mit Anleitung «Zum Home-Bildschirm»
- **Tipps & Fragen** pro Übung: Kommentare mit Antworten, für alle Mitglieder sichtbar
- **Mitglieder entdecken**: Liste aller sichtbaren Mitglieder mit Suche und Einladen per Klick (abschaltbar im Profil)
- **Rekorde teilen** als Bildkarte (Instagram/WhatsApp) direkt nach einem neuen Rekord oder auf der Übungsseite
- **Profilbild** (Supabase Storage) und **Freunde** per 6-stelligem Code – mit Rangliste und Vergleich der Bestleistungen

## Setup

1. Projekt auf [supabase.com](https://supabase.com) erstellen.
2. Im Supabase **SQL Editor** nacheinander ausführen:
   - [`supabase/schema.sql`](supabase/schema.sql)
   - [`supabase/migrations/002_avatars_friends.sql`](supabase/migrations/002_avatars_friends.sql) (Profilbilder, Freunde, Storage-Bucket)
   - [`supabase/migrations/003_comments_members.sql`](supabase/migrations/003_comments_members.sql) (Kommentare, Mitgliederliste, Einladen)
   - [`supabase/migrations/004_security_hardening.sql`](supabase/migrations/004_security_hardening.sql) (Security-Advisor-Fixes, Spaltenrechte, Wertebereiche, Spam-Schutz)
3. `.env.local` anlegen (Werte unter *Project Settings → API*):

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

4. Unter *Authentication → URL Configuration* die Site URL setzen (lokal `http://localhost:3000`) und `http://localhost:3000/auth/callback` als Redirect-URL erlauben.
5. Starten:

   ```bash
   npm install
   npm run dev
   ```

## Struktur

| Pfad | Inhalt |
| --- | --- |
| `src/lib/exercises.ts` | Disziplinen, Ausführung, Notentabelle, Notenberechnung |
| `src/lib/plan.ts` | Trainingsphasen je nach Zeit bis zur Aushebung |
| `src/components/test-runner.tsx` | Test-Modus (Timer, Takt, Zähler, Resultat) |
| `src/app/actions.ts` | Server Actions (Profil, Ziele, Rekorde, Resultate) |
| `src/app/(app)/freunde/` | Freundesliste, Rangliste, Vergleich |
| `src/components/avatar-upload.tsx` | Profilbild zuschneiden (512 px) und hochladen |
| `src/components/install-app.tsx` | Install-Button, Anleitung iPhone/Android/Computer, Service-Worker-Registrierung |
| `src/lib/share-card.ts` | Zeichnet die Rekord-Karte (1080×1350) im Browser |
| `public/logo.png`, `public/icons/` | Logo (Flammen-Granate, mit ChatGPT erstellt) und App-Icons |
| `public/exercises/` | Übungsbilder (mit ChatGPT generiert) |

Quelle: VBS / Kommando Spezialkräfte – «Sporttest an der Eignungsprüfung für Grenadiere» und «Notentabelle Eignungsprüfung EP_AZ SK» (Stand 26.02.2025).

## Sicherheit

- **Row Level Security** auf allen Tabellen; Freunde sehen nur Rekorde/Tests, Mitglieder nur Name + Bild
- **Server Actions** prüfen jede Eingabe (Whitelists, Wertebereiche, IDs, echte Bild-Signatur) und geben keine DB-Fehler preis
- **Datenbank-Constraints & Spaltenrechte** gelten auch bei direktem API-Zugriff (Migration 004)
- **Spam-Schutz**: max. 5 Kommentare/Minute, 100/Tag, 30 offene Freundschaftsanfragen
- **Security-Header**: CSP, HSTS, X-Frame-Options, nosniff, Referrer-, Permissions- und Opener-Policy
- **Secrets**: nur Publishable Key im Client; Secret Key wird erkannt und blockiert
