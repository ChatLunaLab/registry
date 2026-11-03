// Dispatches the Update Registry workflow every 15 minutes, because GitHub's
// own schedule trigger is best-effort and drops most runs on this repo.
// It also serves index.json and version.txt on chatluna-registry.dingyi222666.top,
// a short-cached proxy of this repo that is reachable from mainland China;
// jsDelivr caches @main for hours.
// GITHUB_TOKEN is a fine-grained PAT limited to ChatLunaLab/registry with
// Actions: read and write, stored via `wrangler secret put GITHUB_TOKEN`.

const DISPATCH_URL =
  'https://api.github.com/repos/ChatLunaLab/registry/actions/workflows/update-registry.yml/dispatches'
const RAW_URL = 'https://raw.githubusercontent.com/ChatLunaLab/registry/main'
const FILES = {
  '/index.json': 'application/json; charset=utf-8',
  '/version.txt': 'text/plain; charset=utf-8',
}
const CACHE_SECONDS = 60

export default {
  async fetch(request) {
    const { pathname } = new URL(request.url)
    const type = FILES[pathname]
    if (type === undefined) return new Response('Not Found', { status: 404 })
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, HEAD' } })
    }
    const upstream = await fetch(RAW_URL + pathname, {
      cf: { cacheTtl: CACHE_SECONDS, cacheEverything: true },
    })
    if (!upstream.ok) return new Response(`upstream returned ${upstream.status}`, { status: 502 })
    return new Response(request.method === 'HEAD' ? null : upstream.body, {
      headers: {
        'Content-Type': type,
        'Cache-Control': `public, max-age=${CACHE_SECONDS}`,
        'Access-Control-Allow-Origin': '*',
      },
    })
  },

  async scheduled(controller, env) {
    const response = await fetch(DISPATCH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'chatluna-registry-trigger',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ ref: 'main' }),
    })
    if (response.status === 204) return
    throw new Error(`workflow dispatch failed: ${response.status} ${await response.text()}`)
  },
}
