# OG brand asset contract

This tracked contract exists so repository quality gates do not depend on a machine-local Grok workspace.

## Brand-asset pass:

Use `/workspace/.grok/og-pending` while an OG asset is being generated. Treat the marker as stale after 10 minutes.

Never `wait_tasks`. Never `get_task_output` for the brand task; the parent flow must continue and let the normal verification gate observe the result.

After preparing the assets, self-check with:

`node scripts/brand-check.mjs --placeholder-ok`

Hand completed files over atomically; examples live in `references/atomic.md`.

## Finish

Remove the pending marker when the hand-over is complete.
