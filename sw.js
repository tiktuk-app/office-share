/* משימה למשרד: מקבל שיתוף מהטלפון ושומר אותו עד שהמסך נפתח */
const VERSION = 'v4';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

function db() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('office-share', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('inbox', { keyPath: 'id' });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function put(item) {
  const d = await db();
  await new Promise((res, rej) => {
    const tx = d.transaction('inbox', 'readwrite');
    tx.objectStore('inbox').put(item);
    tx.oncomplete = res; tx.onerror = () => rej(tx.error);
  });
}

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method === 'POST' && u.pathname.endsWith('/share')) {
    e.respondWith((async () => {
      const f = await e.request.formData();
      const item = { id: Date.now(), title: f.get('title') || '', text: f.get('text') || '', url: f.get('url') || '', files: [] };
      for (const x of f.getAll('media')) if (x && x.size) item.files.push({ name: x.name, type: x.type, blob: x });
      await put(item);
      return Response.redirect(new URL('./?shared=' + item.id, self.registration.scope).href, 303);
    })());
    return;
  }
  if (e.request.method === 'GET' && u.origin === location.origin) {
    e.respondWith(fetch(e.request).then(r => {
      const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true })));
  }
});
