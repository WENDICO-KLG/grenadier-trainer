// Minimaler Service Worker: macht die App installierbar.
// Kein Caching – Daten kommen immer frisch vom Server.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
