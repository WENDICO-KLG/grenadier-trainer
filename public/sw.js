// Minimaler Service Worker für die Installierbarkeit.
// Bewusst OHNE fetch-Handler: ein leerer Handler zwingt Safari, den Worker bei
// jeder Anfrage zu starten, und bremst so jede Navigation aus.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
