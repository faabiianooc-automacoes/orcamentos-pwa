/* Service worker: guarda o app no aparelho para funcionar sem internet.
   Ao publicar uma nova versão, aumente VERSAO para forçar a atualização. */
const VERSAO = 'orcamentos-v1.13.0';
const ARQUIVOS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'js/tecnico.js',
  'js/catalogo-padrao.js',
  'js/formulas.js',
  'js/store.js',
  'js/rotas.js',
  'js/arquivos.js',
  'drawio/simbolos-planta.xml',
  'js/pdf.js',
  'js/whatsapp.js',
  'js/nuvem.js',
  'js/contatos.js',
  'js/app.js',
  'vendor/jspdf.umd.min.js',
  'vendor/jspdf.plugin.autotable.min.js',
  'vendor/firebase-app-compat.js',
  'vendor/firebase-auth-compat.js',
  'vendor/firebase-firestore-compat.js',
  'fonts/great-vibes.woff2',
  'fonts/allura.woff2',
  'fonts/dancing-script.woff2',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(chaves => Promise.all(chaves.filter(k => k !== VERSAO).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Primeiro o cache; se não houver, busca na rede.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request).catch(() => caches.match('index.html')))
  );
});
