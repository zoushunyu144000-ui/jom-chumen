# Atomic OG hand-over examples

Use a staged file outside `public/`, then rename it into place atomically.

`node scripts/write-atomic.mjs /workspace/.grok/og.jpg.tmp /workspace/public/og.jpg`

`node scripts/write-atomic.mjs /workspace/.grok/x-banner.jpg.tmp /workspace/public/x-banner.jpg`

`node scripts/write-atomic.mjs /workspace/.grok/site.json.tmp /workspace/src/lib/og/site.json`
