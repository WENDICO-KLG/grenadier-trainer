# Grenadier Trainer

Next.js-App zur Vorbereitung auf den Sporttest der Eignungsprüfung für Grenadiere (AZ SK).

- **Ziele & Rekorde** pro Disziplin, gespeichert in Supabase
- **Test-Modus** mit Countdown, Zähler, Sekundentakt (Metronom) und Stoppuhr – gibt die Note gemäss offizieller Notentabelle zurück
- **Aushebungsdatum** mit Countdown und automatischer Trainingsphase
- Verlauf aller Tests
- **Als App installierbar** (PWA): Button «App installieren» – auf Android nativ, auf dem iPhone mit Anleitung «Zum Home-Bildschirm»
- **Rekorde teilen** als Bildkarte (Instagram/WhatsApp) direkt nach einem neuen Rekord oder auf der Übungsseite
- **Profilbild** (Supabase Storage) und **Freunde** per 6-stelligem Code – mit Rangliste und Vergleich der Bestleistungen

## Setup

1. Projekt auf [supabase.com](https://supabase.com) erstellen.
2. Im Supabase **SQL Editor** nacheinander ausführen:
   - [`supabase/schema.sql`](supabase/schema.sql)
   - [`supabase/migrations/002_avatars_friends.sql`](supabase/migrations/002_avatars_friends.sql) (Profilbilder, Freunde, Storage-Bucket)
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
