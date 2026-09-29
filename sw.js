const CACHE = "mobile-html-editor-v4";
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icon.svg"
];
const CDN = [
  "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.css",
  "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/theme/material-darker.min.css",
  "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/xml/xml.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/javascript/javascript.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/css/css.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/htmlmixed/htmlmixed.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/hint/show-hint.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/hint/xml-hint.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/hint/html-hint.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/edit/closebrackets.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/edit/matchbrackets.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/hint/show-hint.min.css",
  "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(async cache => {
      await cache.addAll(APP_SHELL);
      await Promise.all(
        CDN.map(async url => {
          try {
            const response = await fetch(url, {cache: "no-store"});
            if (response.ok) await cache.put(url, response);
          } catch {}
        })
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isAppFile = isSameOrigin && (
    url.pathname.endsWith("/") ||
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".json") ||
    url.pathname.endsWith(".svg")
  );

  if (isAppFile) {
    // Always try the newest deployed app first.
    event.respondWith(
      fetch(event.request, {cache: "no-store"})
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then(cached => cached || caches.match("./index.html")))
    );
    return;
  }

  // CDN libraries: cache-first for offline use.
  event.respondWith(
    caches.match(event.request).then(cached =>
      cached || fetch(event.request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
        }
        return response;
      })
    )
  );
});
