# Verification

Checked on 9 October 2026.

## Application

Type checking, linting and the production build pass. All 24 core tests pass, covering unit conversion, conflict detection, fact selection, missing years, trends, correction history and report staleness.

Five browser checks pass on the public deployment. These cover navigation, source previews, request validation, map tile failures, refresh errors and mobile keyboard navigation. All twenty document downloads and thirty-nine source previews return HTTP 200.

## Supabase

The database is reachable and authenticated queries succeed. All three integration tests pass:

- The sample dataset persists and outdated commits are rejected.
- Structured facts and evidence records stay in sync.
- Per-IP and global AI budgets are enforced atomically.

Verified records: **5 mines, 20 documents, 102 facts and 20 Gemini embeddings**.

## Live AI

The configured local Gemini key successfully completes structured generation and returns embeddings with 1,536 dimensions.

The complete workflow was also tested on 30 September 2026: shared reviews in two browser sessions, conflict resolution, live questions, report generation and demo approval. Five question evaluations passed against the sample ground truth. Those earlier results are separate from the current service connectivity checks.

## Hosted configuration

The public site is available at https://coalsmart.vercel.app/ and automatic Vercel deployment succeeds. Its latest API check reports that Supabase and AI environment variables have not been configured in the production project. The hosted workspace serves read-only sample data until those variables are added and the project is redeployed.

Database connectivity is verified for the local configuration. Shared production reviews, live production answers and production report latency require verification after deployment configuration is complete.
