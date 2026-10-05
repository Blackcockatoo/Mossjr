# Mossjr — Moss Gurukul

**Curiosity above. Evidence beneath.** An evidence-first home and partial education OS foundation.

## Run locally

Node.js 24 or newer. No third-party dependencies.

```sh
# Create each local account (password prompted without terminal echo)
read -rsp 'New password: ' MOSSJR_PASSWORD; printf '\n'
printf '%s' "$MOSSJR_PASSWORD" | node account.js mossparent "Parent educator" administrator
unset MOSSJR_PASSWORD
# Repeat with educator or learner as the final argument for other roles.
npm start
# Open http://127.0.0.1:3000
npm test
```

SQLite records persist under `data/` (excluded from Git). Stop the server before copying this directory for a backup. The app starts empty: no real student data or invented evidence is committed.

## Working foundation

- Signed-in educator and learner views with server-enforced role permissions.
- Log learning intentions, delivery, educator attribution, date, duration, location, observation and learner reflection.
- Link one activity to multiple learning areas.
- Add descriptions and references to evidence stored privately elsewhere.
- Transactional records and append-only audit entries with SQL mutation guards.
- Area activity counts, JSON record/audit export and CSV ledger export.
- Responsive interface, semantic controls and B$S forest/brass identity.

## Honest boundaries

This is a local single-household prototype, not a hosted service. The server intentionally binds to loopback. Do not expose it publicly or enter sensitive records on shared computers. New records use the authenticated account name and stable ID; legacy records retain self-attribution. Accounts are locally provisioned, not externally identity-verified. Database administrators can bypass triggers: this is not independently tamper-proof. Evidence references do not upload, verify, or preserve file contents. Coverage counts do not establish mastery or regulatory compliance. Learner accounts receive only activity IDs, dates, titles and learner reflections. Educator accounts currently share the full single-household ledger. No scoped reviewer role exists yet. Export files contain the recorded data: handle them privately.

## Next build stages

See [architecture](docs/architecture.md). Build household isolation, learning-plan versioning, actual evidence storage, partial-school collaboration and scoped review exports before hosted use.

## Account security and scope

Passwords use salted scrypt hashes; session tokens are random and only token hashes are stored. HttpOnly/SameSite cookies expire after eight hours; logout revokes the server-side session. Login attempts are throttled per username. Mutations require a same-origin JSON request. The local HTTP cookie intentionally lacks Secure; hosted use needs HTTPS and Secure cookies, trusted origin checks and production authentication review.

Administrators and educators can read the full household record and create events/evidence references. Learners cannot write records or read educator observations, evidence references or audit entries. This release supports one household only. Provision accounts through `account.js`; invitations, password recovery, role changes and scoped teacher/reviewer sharing are pending. To revoke an account administratively, set its `active` field to 0 in the local SQLite database; existing sessions are then denied.

Security API reference: https://nodejs.org/api/crypto.html
