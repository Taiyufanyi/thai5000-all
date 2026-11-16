// 离线缓存：页面用“联网优先、断网用缓存”，录音用“缓存优先”
const SHELL_CACHE = 'thai5000-shell-v4';
const PDF_CACHE = 'thai5000-pdf-v1';
const AUDIO_CACHE = 'thai5000-audio-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL_CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== SHELL_CACHE && k !== AUDIO_CACHE && k !== PDF_CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const isPdf = /\.pdf$/i.test(url.pathname);
  if (url.pathname.includes('/audio/') || isPdf) {
    e.respondWith(caches.open(isPdf ? PDF_CACHE : AUDIO_CACHE).then(async c => {
      const hit = await c.match(req, {ignoreSearch: true});
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok && res.status === 200) c.put(req, res.clone());
      return res;
    }));
    return;
  }
  e.respondWith(fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(SHELL_CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(async () => (await caches.match(req, {ignoreSearch: true})) || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())));
});
