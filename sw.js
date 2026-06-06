// 声から綴る — Service Worker
const CACHE = "koe-tsuzuru-v1";
const ASSETS = [
  "./index.html",
  "./manifest.json",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  // OpenAI など外部APIは絶対にキャッシュせずネットワーク直通
  if (url.hostname.includes("openai.com") || e.request.method !== "GET") {
    return; // ブラウザ標準の動作にまかせる
  }
  // 自分のアセットはキャッシュ優先、なければネットワーク
  e.respondWith(
    caches.match(e.request).then(hit =>
      hit || fetch(e.request).then(res => {
        if (res.ok && url.origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => hit)
    )
  );
});
