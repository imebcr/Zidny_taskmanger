const CACHE_NAME = 'zidny-v1'
const STATIC = ['/dashboard', '/tasks', '/kanban', '/offline']

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC).catch(() => {}))
  )
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  if (e.request.url.includes('/api/')) return

  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone))
        return res
      })
      .catch(() => caches.match(e.request).then(cached => cached || new Response('Offline', { status: 503 })))
  )
})

self.addEventListener('push', e => {
  const data = e.data?.json() || { title: 'Zidny', body: 'Nouvelle notification' }
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url || '/dashboard' },
      vibrate: [200, 100, 200],
    })
  )
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  const url = e.notification.data?.url || '/dashboard'
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(cs => {
      const c = cs.find(c => c.url.includes(url))
      if (c) return c.focus()
      return clients.openWindow(url)
    })
  )
})
