/* Service Worker da loja (cache versionado por release) */
"use strict";

const CACHE = "site-20261021-1811";
const CORE = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./manifest.webmanifest",
  "./img/logo.webp",
  "./img/poster-guadalupe.webp"
];

/* recursos que sempre refletem o painel admin (rede primeiro, nunca cacheiam) */
const DINAMICOS = ["/config.json", "/js/catalog.json"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (!req.url.startsWith(self.location.origin)) return;

  const url = new URL(req.url);

  /* admin, superadmin, landing e api: nunca cachear (sempre versão atual) */
  if (url.pathname.startsWith("/api/") || url.pathname === "/admin.html" ||
      url.pathname === "/admin-completo.html" || url.pathname === "/editor.html" ||
      url.pathname === "/admin.css" || url.pathname === "/admin.js" || url.pathname === "/js/app.js" ||
      url.pathname === "/editor.css" || url.pathname === "/editor.js" ||
      url.pathname === "/saas-admin.html" || url.pathname === "/landing.html") return;

  /* navegação: rede primeiro, fallback para o cache (funciona offline) */
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put("./index.html", clone));
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  /* config.json e catálogo: sempre rede (as edições do admin devem valer) */
  if (DINAMICOS.some(d => url.pathname.endsWith(d))) {
    e.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
    return;
  }

  /* demais recursos: cache primeiro, baixa e guarda na sequência */
  e.respondWith(
    caches.match(req).then(cached => {
      return cached || fetch(req).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(req, clone));
        }
        return res;
      });
    })
  );
});