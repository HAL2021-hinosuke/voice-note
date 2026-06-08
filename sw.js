// 声から綴る — Service Worker (v3: HTMLは常に最新を取得)
const CACHE = "koe-tsuzuru-v3";
const ASSETS = [
  "./manifest.json",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(()=>{}));
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

  // 外部API(OpenAI等)とGET以外は一切介入しない（ネットワーク直通）
  if (url.origin !== location.origin || e.request.method !== "GET") {
    return;
  }

  // HTMLナビゲーションは常にネットワーク優先（最新を取得、失敗時のみキャッシュ）
  const isHTML = e.request.mode === "navigate" ||
                 (e.request.headers.get("accept")||"").includes("text/html");
  if (isHTML) {
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match(e.request).then(h => h || caches.match("./index.html")))
    );
    return;
  }

  // それ以外のアセットはキャッシュ優先
  e.respondWith(
    caches.match(e.request).then(hit =>
      hit || fetch(e.request).then(res => {
        if (res.ok) { const c = res.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); }
        return res;
      }).catch(() => hit)
    )
  );
});
