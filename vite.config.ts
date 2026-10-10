import { defineConfig, type HtmlTagDescriptor, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'

import siteConfiguration from './.figma/make/site.json'


// Vite config — https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // .figma/make/deploy-preview passes `--mode development` for cached-preview builds.
  const emitSourcemaps = mode === 'development'

  return {
    base: process.env.FIGMA_PUBLIC_URL ? `${process.env.FIGMA_PUBLIC_URL}/` : '/',
    build: {
      sourcemap: emitSourcemaps ? 'inline' : false,
      minify: !emitSourcemaps,
    },
    plugins: [
      devAuthApiPlugin(),
react(),
      tailwindcss(),
      figmaSiteConfiguration(siteConfiguration),
      figmaErrorOverlayReplay(),
      figmaReactRefreshBoundaryFallback(),
      figmaMakeKitPlugin({ storiesGlob: '/src/**/*.stories.{ts,tsx,js,jsx}' }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: process.env.FIGMA_DEV_SERVER_HOST || '0.0.0.0',
      port: parseInt(process.env.PORT || '8443'),
      strictPort: true,
      watch: {
        ignored: [
          '**/.figma/**',
],
      },
    },
    preview: {
      host: process.env.FIGMA_DEV_SERVER_HOST || '0.0.0.0',
      port: parseInt(process.env.PORT || '8443'),
    },
  }
})

/** Development-only auth bridge. Cloudflare Pages Functions serve these routes
 * in deployed environments; Vite itself does not execute the functions folder. */
function devAuthApiPlugin(): Plugin {
  type DevUser = { id: string; email: string; name: string; workspaceName: string; password: string }
  type DevPasswordReset = { email: string; expiresAt: number }
  const usersFile = path.resolve(__dirname, '.tmp-dev-auth-users.json')
  let savedUsers: DevUser[] = []
  try {
    if (existsSync(usersFile)) savedUsers = JSON.parse(readFileSync(usersFile, 'utf8')) as DevUser[]
  } catch {
    console.warn('[dev-auth] Could not read local test accounts; starting with an empty account list.')
  }
  const users = new Map<string, DevUser>(savedUsers.map(user => [user.email, user]))
  const persistUsers = () => writeFileSync(usersFile, JSON.stringify([...users.values()], null, 2), { mode: 0o600 })
  const sessions = new Map<string, string>()
  const passwordResets = new Map<string, DevPasswordReset>()
  const encodePassword = (password: string) => {
    const salt = randomBytes(16)
    return `${salt.toString('hex')}:${scryptSync(password, salt, 32).toString('hex')}`
  }
  const matchesPassword = (password: string, encoded: string) => {
    const [saltHex, hashHex] = encoded.split(':')
    if (!saltHex || !hashHex) return false
    const expected = Buffer.from(hashHex, 'hex')
    const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length)
    return timingSafeEqual(actual, expected)
  }
  return {
    name: 'sentinel-dev-auth-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = (req.url || '').split('?')[0]
        if (!pathname?.startsWith('/api/auth/') && !pathname?.startsWith('/api/members')) return next()
        const send = (status: number, body: unknown, cookie?: string) => {
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.setHeader('Cache-Control', 'no-store')
          if (cookie) res.setHeader('Set-Cookie', cookie)
          res.end(JSON.stringify(body))
        }
        const readBody = async () => {
          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
          try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') }
          catch { return {} }
        }
        const sessionToken = (req.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith('sentinel_dev_session='))?.slice('sentinel_dev_session='.length)
        const sessionEmail = sessionToken ? sessions.get(sessionToken) : undefined
        const sessionUser = sessionEmail ? users.get(sessionEmail) : undefined
        if (pathname === '/api/members' && req.method === 'GET') {
          if (!sessionUser) return send(401, { error: 'Authentication required' })
          return send(200, {
            data: {
              members: [{ id: sessionUser.id, name: sessionUser.name, email: sessionUser.email, role: 'owner', created_at: new Date().toISOString() }],
              invitations: [],
              seats: { included: 3, used: 0, extra: 0 },
            },
          })
        }
        const memberMatch = pathname?.match(/^\/api\/members\/([^/]+)$/)
        if (memberMatch && req.method === 'PATCH') {
          if (!sessionUser) return send(401, { error: 'Authentication required' })
          const target = [...users.values()].find(user => user.id === decodeURIComponent(memberMatch[1]))
          if (!target || target.id === sessionUser.id) return send(404, { error: 'Member not found' })
          const body = await readBody(); const password = String(body.password || '')
          if (password.length < 6) return send(400, { error: 'Password must be at least 6 characters' })
          target.password = encodePassword(password)
          persistUsers()
          for (const [session, email] of sessions) if (email === target.email) sessions.delete(session)
          return send(200, { success: true, devMode: true })
        }
        if (pathname === '/api/auth/session' && req.method === 'GET') {
          const email = sessionEmail
          const user = sessionUser
          if (!user) return send(401, { error: 'Authentication required' })
          return send(200, { data: { user: { id: user.id, email: user.email, name: user.name }, workspace: { id: `dev-${user.id}`, name: user.workspaceName }, role: 'owner', subscription: { status: 'incomplete', interval: 'month', currentPeriodEnd: null, writable: false, hasSubscription: false }, permissions: { view: true, create: false, edit: false, delete: false, manageMembers: false, manageBilling: true, viewAdmin: true } } })
        }
        if (pathname === '/api/auth/register' && req.method === 'POST') {
          const body = await readBody(); const email = String(body.email || '').trim().toLowerCase(); const password = String(body.password || '')
          if (!body.name || !/^\S+@\S+\.\S+$/.test(email) || password.length < 6) return send(400, { error: 'Name, valid email, and a password of at least 6 characters are required' })
          if (users.has(email)) return send(409, { error: 'An account with this email already exists' })
          users.set(email, { id: randomUUID(), email, name: String(body.name).trim(), workspaceName: String(body.workspaceName || `${body.name}'s K9 Unit`).trim(), password: encodePassword(password) })
          persistUsers()
          const token = randomUUID(); sessions.set(token, email)
          return send(201, { success: true, devMode: true }, `sentinel_dev_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`)
        }
        if (pathname === '/api/auth/login' && req.method === 'POST') {
          const body = await readBody(); const email = String(body.email || '').trim().toLowerCase(); const user = users.get(email)
          if (!user || !matchesPassword(String(body.password || ''), user.password)) return send(401, { error: 'Invalid email or password' })
          const token = randomUUID(); sessions.set(token, email)
          return send(200, { success: true, devMode: true }, `sentinel_dev_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`)
        }
        if (pathname === '/api/auth/forgot-password' && req.method === 'POST') {
          const body = await readBody(); const email = String(body.email || '').trim().toLowerCase()
          const user = users.get(email)
          if (!user) return send(200, { success: true, message: 'If that account exists, a reset link has been sent.' })
          const token = randomUUID()
          passwordResets.set(token, { email, expiresAt: Date.now() + 60 * 60 * 1000 })
          return send(200, {
            success: true,
            devMode: true,
            message: 'Development mode does not send email. Use the reset link below.',
            resetUrl: `/reset-password?token=${encodeURIComponent(token)}`,
          })
        }
        if (pathname === '/api/auth/reset-password' && req.method === 'POST') {
          const body = await readBody(); const token = String(body.token || ''); const password = String(body.password || '')
          const reset = passwordResets.get(token)
          if (!reset || reset.expiresAt <= Date.now()) {
            passwordResets.delete(token)
            return send(400, { error: 'This reset link is invalid or expired' })
          }
          if (password.length < 6) return send(400, { error: 'A password of at least 6 characters is required' })
          const user = users.get(reset.email)
          if (!user) return send(400, { error: 'This reset link is invalid or expired' })
          user.password = encodePassword(password)
          persistUsers()
          passwordResets.delete(token)
          for (const [session, email] of sessions) if (email === reset.email) sessions.delete(session)
          return send(200, { success: true, devMode: true })
        }
        if (pathname === '/api/auth/logout' && req.method === 'POST') {
          if (sessionToken) sessions.delete(sessionToken)
          return send(200, { success: true }, 'sentinel_dev_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0')
        }
        return send(404, { error: 'This auth endpoint requires Cloudflare Pages Functions in development.' })
      })
    },
  }
}

type FigmaSiteConfiguration = {
  title?: string
  description?: string
  language?: string
  robots?: {
    index?: boolean
  }
  icons?: {
    icon?: string
  }
  openGraph?: {
    image?: string
  }
  analytics?: {
    googleAnalyticsId?: string
  }
  customScripts?: {
    headStart?: string
    headEnd?: string
    bodyStart?: string
    bodyEnd?: string
  }
  accessibility?: {
    addBypassLinks?: boolean
  }
}

/** Applies /.figma/make/site.json to the generated document shell. */
function figmaSiteConfiguration(config: FigmaSiteConfiguration): Plugin {
  function sanitizeHtmlValue(value: string | undefined): string {
    return value?.replace(/[^a-zA-Z0-9_-]/g, '') || ''
  }
  function escapeHtmlText(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }
  function replaceHtmlCommentSlot(html: string, slotName: string, content: string): string {
    return html.replace(`<!-- ${slotName} -->`, content)
  }

  const title = config.title ?? "Figma Make App"
  const description = config.description ?? ''
  const favicon = config.icons?.icon ?? ''
  const socialImage = config.openGraph?.image ?? ''
  const language = sanitizeHtmlValue(config.language) || 'en'
  const googleAnalyticsId = sanitizeHtmlValue(config.analytics?.googleAnalyticsId)
  const headStart = config.customScripts?.headStart ?? ''
  const headEnd = config.customScripts?.headEnd ?? ''
  const bodyStart = config.customScripts?.bodyStart ?? ''
  const bodyEnd = config.customScripts?.bodyEnd ?? ''
  const robotsTxt = config.robots?.index === false ? 'User-agent: *\nDisallow: /\n' : ''

  return {
    name: 'figma-site-configuration',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!robotsTxt || req.url?.split('?')[0] !== '/robots.txt') return next()

        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.end(robotsTxt)
      })
    },
    generateBundle() {
      if (!robotsTxt) return

      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: robotsTxt,
      })
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        let result = html
        result = replaceHtmlCommentSlot(result, 'figma:lang', language)
        result = replaceHtmlCommentSlot(result, 'figma:title', escapeHtmlText(title))
        result = replaceHtmlCommentSlot(result, 'figma:head-start', headStart)
        result = replaceHtmlCommentSlot(result, 'figma:head-end', headEnd)
        result = replaceHtmlCommentSlot(result, 'figma:body-start', bodyStart)
        result = replaceHtmlCommentSlot(result, 'figma:body-end', bodyEnd)

        const tags: HtmlTagDescriptor[] = []
        if (description) {
          tags.push({ tag: 'meta', attrs: { name: 'description', content: description }, injectTo: 'head' })
        }
        if (config.robots?.index === false) {
          tags.push({ tag: 'meta', attrs: { name: 'robots', content: 'noindex, nofollow' }, injectTo: 'head' })
        }
        if (favicon) {
          tags.push({ tag: 'link', attrs: { rel: 'icon', href: favicon }, injectTo: 'head' })
        }
        if (title) {
          tags.push({ tag: 'meta', attrs: { property: 'og:title', content: title }, injectTo: 'head' })
        }
        if (description) {
          tags.push({ tag: 'meta', attrs: { property: 'og:description', content: description }, injectTo: 'head' })
        }
        if (socialImage) {
          tags.push(
            { tag: 'meta', attrs: { property: 'og:image', content: socialImage }, injectTo: 'head' },
            { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' }, injectTo: 'head' },
            { tag: 'meta', attrs: { name: 'twitter:image', content: socialImage }, injectTo: 'head' },
          )
        }

        if (googleAnalyticsId) {
          tags.push(
            {
              tag: 'script',
              attrs: {
                async: true,
                src: `https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`,
              },
              injectTo: 'head',
            },
            {
              tag: 'script',
              children: `
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', ${JSON.stringify(googleAnalyticsId)});
`,
              injectTo: 'head',
            },
          )
        }

        if (config.accessibility?.addBypassLinks) {
          tags.push(
            {
              tag: 'style',
              children: `
  .figma-bypass-link {
    position: fixed;
    top: 8px;
    left: 8px;
    z-index: 2147483647;
    transform: translateY(-150%);
    border-radius: 6px;
    background: #111827;
    color: #fff;
    padding: 8px 12px;
    font: 600 14px/1.2 system-ui, sans-serif;
    text-decoration: none;
  }
  .figma-bypass-link:focus {
    transform: translateY(0);
  }
`,
              injectTo: 'head',
            },
            {
              tag: 'a',
              attrs: { class: 'figma-bypass-link', href: '#root' },
              children: 'Skip to content',
              injectTo: 'body-prepend',
            },
          )
        }

        return {
          html: result,
          tags,
        }
      },
    },
  }
}

/**
 * Replay the most recent build error to clients that connect after
 * it was first broadcast. Vite buffers an error payload only while
 * no clients are connected and clears the buffer on the first
 * reconnect (see `bufferedMessage` in `createWebSocketServer`), so
 * if the preview iframe reloads after Vite already delivered an
 * error to a live socket, the new socket misses the payload and
 * the overlay stays hidden even though the build is still broken.
 * We intercept `ws.send` to remember the latest error and replay
 * it on every new connection; the cache clears on a successful
 * `update` or `full-reload` so a stale overlay can't survive a
 * fixed build.
 */
function figmaErrorOverlayReplay(): Plugin {
  return {
    name: 'figma-error-overlay-replay',
    apply: 'serve',
    configureServer(server) {
      let lastError: object | null = null

      const origSend = server.ws.send.bind(server.ws) as (...args: any[]) => void
      server.ws.send = ((...args: any[]) => {
        const payload = args[0]
        if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
          const type = (payload as { type?: string }).type
          if (type === 'error') {
            lastError = payload as object
          } else if (type === 'update' || type === 'full-reload') {
            lastError = null
          }
        }
        return origSend(...args)
      }) as typeof server.ws.send

      server.ws.on('connection', (socket) => {
        if (lastError !== null) {
          socket.send(JSON.stringify(lastError))
        }
      })
    },
  }
}

/**
 * Reload when a module that previously defined a React Refresh boundary stops
 * defining one. This happens when an agent moves a component into a new file
 * and replaces the old module with a re-export:
 *
 *   export { default } from './app/App'
 *
 * Vite otherwise accepts the update using the previous module's HMR boundary,
 * but the re-export-only transform no longer registers a replacement for the
 * mounted component family. React reports a successful refresh while leaving
 * the old tree mounted until the page is reloaded.
 */
function figmaReactRefreshBoundaryFallback(): Plugin {
  const hadRefreshBoundary = new Map<string, boolean>()
  let sendFullReload: (() => void) | null = null

  return {
    name: 'figma-react-refresh-boundary-fallback',
    apply: 'serve',
    enforce: 'post',
    configureServer(server) {
      sendFullReload = () => server.ws.send({ type: 'full-reload', path: '*' })
    },
    transform(code, id) {
      if (!/\.[jt]sx?(?:\?|$)/.test(id) || id.includes('/node_modules/')) return null

      const moduleId = id.split('?')[0] ?? id
      const hasRefreshBoundary = code.includes('registerExportsForReactRefresh')
      const previousHadRefreshBoundary = hadRefreshBoundary.get(moduleId)
      hadRefreshBoundary.set(moduleId, hasRefreshBoundary)

      if (previousHadRefreshBoundary && !hasRefreshBoundary) {
        queueMicrotask(() => sendFullReload?.())
      }

      return null
    },
  }
}

/**
 * Serves a blank render-target page at /.figma/make/kit.html that
 * the Figma preview script drives directly. The page exposes a
 * registry of every file matching `storiesGlob` on
 * window.__FIGMA__.stories so the design surface can dynamically
 * import + mount each entry into its own grid view.
 *
 * Dev-only: `apply: 'serve'` gates the plugin to `vite dev`. Prod
 * builds (`vite build`) skip it entirely so the route doesn't leak
 * into shipped bundles.
 */
function figmaMakeKitPlugin(options: { storiesGlob: string | string[] }): Plugin {
  const storiesGlob = Array.isArray(options.storiesGlob) ? options.storiesGlob : [options.storiesGlob]
  const ROUTE = '/.figma/make/kit.html'
  const VIRTUAL_ID = 'virtual:figma-stories'
  const RESOLVED_ID = '\0' + VIRTUAL_ID
  const STORIES_MODULE = `export const stories = import.meta.glob(${JSON.stringify(storiesGlob)})`
  const HTML_BOOTSTRAP = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body>
<div id="figma-make-kit-root"></div>
<script type="module">
  import { stories } from 'virtual:figma-stories'
  window.__FIGMA__ = Object.assign(window.__FIGMA__ ?? {}, { stories })
  window.dispatchEvent(new CustomEvent('figma.ready'))
</script>
</body>
</html>`

  return {
    name: 'figma-make-kit',
    apply: 'serve',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID
      return null
    },
    load(id) {
      if (id !== RESOLVED_ID) return null
      return STORIES_MODULE
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || ''
        if (url.split('?')[0] !== ROUTE) return next()

        try {
          res.setHeader('Content-Type', 'text/html')
          res.end(await server.transformIndexHtml(url, HTML_BOOTSTRAP))
        } catch (err) {
          next(err as Error)
        }
      })
    },
  }
}
