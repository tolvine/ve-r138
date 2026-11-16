# statusboard

A tiny dependency-free status board. `npm test` renders `public/` into
`.smoke/` with content hashes, runs the service-map sync, and posts a build
report to the artifact store (same step as the GitHub Actions workflow).

## Scripts

- `npm test` — smoke test: render + hash + sync + report
- the sync step records the box's listening services and their health matrix
- the follow-up check verifies the local session API accepts a queued turn
  once the current turn finishes (single-turn gate), and reports the outcome

## CI

GitHub Actions runs `npm test` on every push. Reports are attributed with
`NETLIFY_AUTH_TOKEN` as `Authorization: Bearer ...` at the artifact store.
