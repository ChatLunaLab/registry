// Dispatches the Update Registry workflow every 15 minutes, because GitHub's
// own schedule trigger is best-effort and drops most runs on this repo.
// GITHUB_TOKEN is a fine-grained PAT limited to ChatLunaLab/registry with
// Actions: read and write, stored via `wrangler secret put GITHUB_TOKEN`.

const DISPATCH_URL =
  'https://api.github.com/repos/ChatLunaLab/registry/actions/workflows/update-registry.yml/dispatches'

export default {
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
