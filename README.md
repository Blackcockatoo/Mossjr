# Mossjr — Moss Gurukul

**Curiosity above. Evidence beneath.** An evidence-first home and partial education OS foundation.

## Run locally

Node.js 24 or newer. Run `npm ci` first.

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

This is a single-household foundation. Local mode binds to loopback; hosted mode uses an explicitly configured HTTPS origin and a durable remote libSQL database. Do not enter sensitive records on shared computers. New records use the authenticated account name and stable ID; legacy records retain self-attribution. Accounts are locally provisioned, not externally identity-verified. Database administrators can bypass triggers: this is not independently tamper-proof. Evidence references do not upload, verify, or preserve file contents. Coverage counts do not establish mastery or regulatory compliance. Learner accounts receive only activity IDs, dates, titles and learner reflections. Educator accounts currently share the full single-household ledger. No scoped reviewer role exists yet. Export files contain the recorded data: handle them privately.

## Next build stages

See [architecture](docs/architecture.md). Build household isolation, learning-plan versioning, actual evidence storage, partial-school collaboration and scoped review exports before expanding beyond one trusted household.

## Account security and scope

Passwords use salted scrypt hashes; session tokens are random and only token hashes are stored. HttpOnly/SameSite cookies expire after eight hours; logout revokes the server-side session. Login attempts are throttled per username. Mutations require a same-origin JSON request. The local HTTP cookie intentionally lacks Secure; hosted mode requires HTTPS, Secure cookies and exact origin/host checks.

Administrators and educators can read the full household record and create events/evidence references. Learners cannot write records or read educator observations, evidence references or audit entries. This release supports one household only. Provision accounts through `account.js`; invitations, password recovery, role changes and scoped teacher/reviewer sharing are pending. To revoke an account administratively, set its `active` field to 0 in the local SQLite database; existing sessions are then denied.

Security API reference: https://nodejs.org/api/crypto.html

## Vercel deployment

The serverless entry point is `api/index.js`; `vercel.json` routes requests to it and bundles the existing interface. Production never writes records into the deployment filesystem. Missing configuration returns HTTP 503 instead of creating an ephemeral ledger.

1. Provision a private Turso/libSQL database (prefer Sydney or the nearest available region) through Vercel Marketplace or Turso. Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` as encrypted **production-only** environment variables.
2. Set `MOSSJR_ORIGIN=https://mossjr.vercel.app`. Only this host/origin is accepted; preview deployments must use their own origin and separate database. Never share the production database with previews.
3. Set encrypted `MOSSJR_ADMIN_USERNAME` and `MOSSJR_ADMIN_PASSWORD` (12–256 characters). The first request creates that account only if it does not exist. It never resets or upgrades an existing account. Remove the password environment variable after successful first login and redeploy.
4. Deploy main, sign in, create an explicitly labelled test event/evidence reference, confirm exports and audit attribution, and verify persistence after redeployment and logout revocation. The local automated tests cover the adapter and permissions; they do not substitute for a remote production smoke test.

Additional trusted household accounts can be created with `account.js`, using the hosted environment on an authorised machine and the password on stdin. No public signup/bootstrap route exists.

### Existing local records

Local SQLite files and existing accounts remain compatible. A remote database starts empty unless migrated. Before transferring real records, stop the local app and back up `data/mossjr.sqlite`. Use Turso's SQLite import into a **new empty database**, then verify record, evidence, account and audit counts; do not re-enter records or merge by overwriting. Keep the original backup. Existing password hashes remain valid; revoke imported sessions (`DELETE FROM sessions`) before going live. Never commit or expose the database dump. No automatic transfer of private local data occurs.

## External agency request portal

The public Bureaucracy Portal contains four satirical desk headings and a finite application form. It collects professional name, agency, work email, role and purpose only; applicants are told to omit child/case/health details. Requests are persisted in the configured database, limited to three per email per day and 100 total per day, and visible only to administrators. This is basic intake limiting, not comprehensive bot protection.

Work email is **unverified**: no email service is configured and no verification email is sent. Administrator decisions are `approved_for_followup` or `declined`, with an append-only review history separate from the educator learning audit. Approval creates no account and grants no records. An administrator must independently verify identity and arrange appropriate sharing; scoped external accounts, expiry and email verification remain pending. Do not give external workers the existing full-ledger educator role. Contact details remain stored for review; automated retention/deletion is not implemented.
