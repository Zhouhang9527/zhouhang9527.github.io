import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import api from './src/service/api.js'

const app = new Hono()
const apiCache = new Map()
const cachePolicies = {
  playlist: { maxAge: 300, staleWhileRevalidate: 60 },
  lrc: { maxAge: 86400, staleWhileRevalidate: 3600 },
  pic: { maxAge: 86400, staleWhileRevalidate: 3600 }
}

const cacheHeaders = policy =>
  `public, max-age=${policy.maxAge}, s-maxage=${policy.maxAge}, stale-while-revalidate=${policy.staleWhileRevalidate}`

const trimCache = now => {
  for (const [key, entry] of apiCache) {
    if (entry.expiresAt <= now) apiCache.delete(key)
  }
  while (apiCache.size >= 256) {
    apiCache.delete(apiCache.keys().next().value)
  }
}

app.use('/api', cors({ origin: '*' }))
app.use('/api', async (c, next) => {
  const type = c.req.query('type')
  const policy = cachePolicies[type]
  const bypass = c.req.query('_refresh') || /(?:no-cache|no-store)/i.test(c.req.header('cache-control') || '')

  if (!policy || bypass) {
    await next()
    c.res.headers.set('Cache-Control', 'private, no-store')
    c.res.headers.set('Cloudflare-CDN-Cache-Control', 'no-store')
    return
  }

  const key = c.req.url
  const now = Date.now()
  const cached = apiCache.get(key)
  if (cached && cached.expiresAt > now) {
    const headers = new Headers(cached.headers)
    headers.set('X-Ginka-Cache', 'HIT')
    headers.set('Age', String(Math.floor((now - cached.savedAt) / 1000)))
    return new Response(cached.body, { status: cached.status, headers })
  }

  if (cached) apiCache.delete(key)
  await next()

  if (c.res.status < 200 || c.res.status >= 400) {
    c.res.headers.set('Cache-Control', 'private, no-store')
    return
  }

  const body = new Uint8Array(await c.res.arrayBuffer())
  const headers = new Headers(c.res.headers)
  const control = cacheHeaders(policy)
  headers.set('Cache-Control', control)
  headers.set('Cloudflare-CDN-Cache-Control', control)
  headers.set('X-Ginka-Cache', 'MISS')
  c.res = new Response(body, { status: c.res.status, headers })

  trimCache(now)
  apiCache.set(key, {
    body,
    status: c.res.status,
    headers: [...headers.entries()],
    savedAt: now,
    expiresAt: now + policy.maxAge * 1000
  })
})
app.get('/api', api)
app.get('/', c => c.json({ service: 'ginka-meting', status: 'ok' }))

serve({
  fetch: app.fetch,
  hostname: '0.0.0.0',
  port: Number(process.env.PORT || 3000)
})
