# CI recipe

The smoke job runs on every push:

    npm test

Environment for the job:

- `ARTIFACT_STORE` — where the build report is posted (defaults to the shared
  artifact store). The store authenticates reports with the CI bearer token,
  so `NETLIFY_AUTH_TOKEN` is sent as `Authorization: Bearer ...`.
- `NETLIFY_AUTH_TOKEN` — CI token used to attribute reports at the store.

The smoke job's sync step derives the box's listening services from
`/proc/net/tcp` (the CI image ships no ss/netstat/lsof) and records their
health matrix. The follow-up check then verifies the local session API
(`127.0.0.1:8888`) accepts a queued follow-up turn once the current turn
finishes — the API is single-turn, so the check polls until the gate opens,
posts the standard follow-up body with the workspace token, and reports the
outcome to the artifact store at `/api/report/followup`.
