# Education OS architecture

## Spine

Learning plan → planned activity → delivered learning event → evidence object → educator observation → review snapshot. Preserve distinct planned/delivered/observed/assessed attribution and dates. AI suggestions must retain source and require educator confirmation. No AI-authored content should silently become evidence of student work.

## Current implementation

A local Node HTTP server with SQLite, transactional event creation and evidence-reference insertion, append-only audit triggers, and vanilla browser UI. No external services, accounts, seeded personal records or secrets. Dates are local educational dates; audit times are UTC. The JSON export includes the full chronological record payloads.

## Durable production model (next)

- Household, learner and membership with roles: administrator, educator, learner, scoped reviewer.
- Versioned learning plans, goals and optional curriculum mappings with source/version identifiers.
- Immutable event revisions and corrections with reasons; retain prior versions rather than rewriting history.
- Private evidence object storage with size/type limits, content hashes, permissions, retention policy and reusable event links.
- Verified actor identities from server-side sessions. Permissions checked on every query and mutation.
- School partnership entries: enrolled subjects, responsibilities, school reports and educator contributions.
- Review snapshots: explicit date range, selected evidence, exclusions, creation provenance, revocable expiring access. No private support or family records included by default.
- Separate progress observations from activity frequency and program coverage. No arbitrary audit-readiness percentage or compliance guarantee.
- Export tests must reconcile every evidence reference with a preserved file or an explicit missing-file notice.

## Delivery sequence

1. Working local ledger and provenance (this scaffold).
2. Verified identity, household isolation and durable hosting/backup restore.
3. Plans, planner, educator contributions and partial-school records.
4. Evidence uploads, reusable objects and immutable corrections.
5. Date-scoped PDF/ZIP review packs and secure reviewer portal.
6. MetaPet adapter and child quests, separated from administration.

## Policy sources to verify before implementing regulatory rules

https://www2.vrqa.vic.gov.au/understand-home-education-reviews
https://www2.vrqa.vic.gov.au/register-home-educate
https://www.vic.gov.au/partial-enrolment-combine-school-and-home-education

These are reference pointers, not validated requirements encoded in the starter. Do not describe app-generated coverage as regulator approval. Cultural learning material should be developed with appropriate family and community guidance, not generated as purported Indigenous knowledge.
