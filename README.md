# Mossjr — Moss Gurukul

**Curiosity above. Evidence beneath.** An evidence-first home and partial education OS foundation.

## Run locally

Node.js 24 or newer. No third-party dependencies.

```sh
npm start
# Open http://127.0.0.1:3000
npm test
```

SQLite records persist under `data/` (excluded from Git). Stop the server before copying this directory for a backup. The app starts empty: no real student data or invented evidence is committed.

## Working foundation

- Separate learner and educator views (view switching, not access control).
- Log learning intentions, delivery, educator attribution, date, duration, location, observation and learner reflection.
- Link one activity to multiple learning areas.
- Add descriptions and references to evidence stored privately elsewhere.
- Transactional records and append-only audit entries with SQL mutation guards.
- Area activity counts, JSON record/audit export and CSV ledger export.
- Responsive interface, semantic controls and B$S forest/brass identity.

## Honest boundaries

This is a local single-user prototype, not a hosted multi-user service. The server intentionally binds to loopback. Do not expose it publicly or enter sensitive records on shared computers. Names are self-attributed, not verified identities. Database administrators can bypass triggers: this is not independently tamper-proof. Evidence references do not upload, verify, or preserve file contents. Coverage counts do not establish mastery or regulatory compliance. Learner mode is not a privacy boundary. Export files contain the recorded data: handle them privately.

## Next build stages

See [architecture](docs/architecture.md). Build authenticated household/educator permissions, learning-plan versioning, actual evidence storage, partial-school collaboration and scoped review exports before hosted use.
