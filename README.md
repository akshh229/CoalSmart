# CoalSMART

An evidence-backed mine intelligence demo built with Next.js, Supabase, Recharts and React Leaflet. Five fictional mines, twenty downloadable synthetic documents, prepared extraction, shared demo review and live cited AI.

## Run locally

Use Node.js 22.13+ and npm. `npm ci`, copy `.env.example` to `.env.local`, and set the server-only credentials. Do not commit that file. Then `npm run dev` opens http://localhost:3000. Without Supabase the app explicitly shows a read-only preview; API failures never become prepared “live” answers.

1. Create a Supabase project. Run `supabase/migrations/001_coalsmart.sql` then `002_embedding_provider.sql` in its SQL Editor, or apply them through your migration tooling.
2. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Legacy service-role JWTs and current server secret keys are supported. No browser database key is needed.
3. Set `AI_PROVIDER=gemini`, `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-3.5-flash-lite` and `GEMINI_EMBEDDING_MODEL=gemini-embedding-2`. Existing free-tier API access is sufficient subject to provider quotas. Alternatively use `AI_PROVIDER=openai`, `OPENAI_API_KEY` and `OPENAI_MODEL=gpt-5.6-terra`; this adapter uses the Responses API with Structured Outputs.
4. Set a long random `RATE_LIMIT_SALT`. Defaults are ten AI requests per IP per minute and one hundred requests globally per UTC day. Provider quotas also apply. The app checks budgets atomically in PostgreSQL before live generation.
5. Run `npm run seed` and `npm run embeddings`. Both scripts are repeatable. Seeding preserves reviews; embeddings regenerate only for missing chunks or a changed embedding model. Vector retrieval always filters by model, mine and period.

## Demo walkthrough

1. Overview → Load Sample Pack in Documents. Prepared extraction is explicit; importing again does not duplicate facts.
2. Open Aaranya Open Cast’s Digital Mine Twin. Inspect production and operational source buttons, then compare its conflicting recoverable reserves for 2022: 126 Mt versus 142 Mt.
3. Ask CoalSMART AI “How did production change from 2020 to 2024?” The baseline is 5.30 → 4.00 Mt, −24.53%. Every numerical result is calculated from selected facts. Ask about operational factors to see live cited excerpt synthesis.
4. Validation → inspect both sources → Accept value A/B as a demo review. Open another browser to see the shared result. Stale edits return HTTP 409.
5. GeoTimeline → choose production, reserves or overburden. Click dots or accessible source buttons. Missing observations remain gaps. CoalMap → filter mines, open a marker, then its twin. The mine list remains usable if map tiles fail.
6. Reports → Generate brief → inspect citations → Demo approve → Print / PDF. Reports preserve their original sections and citations. A relevant fact or conflict change marks a saved report stale and blocks approval; another mine’s changes do not.
7. Validation → Reset Shared Demo → confirm. Baseline facts return; existing reports and the review audit remain, and affected reports become stale.

## Data and service design

The authoritative `demo_state` JSON snapshot supports atomic compare-and-swap edits across stateless Vercel instances. Each successful transaction also projects records into the relational `mines`, `documents`, `evidence`, `facts`, `chunks`, `conflicts`, `reports` and `review_events` tables. Original extracted values are immutable; corrections replace the current normalized observation and append before/after review events. All tables use RLS, with no anonymous/authenticated direct access. Only server routes use the privileged key. Review sessions use an anonymous HttpOnly cookie, with origin checks, strict request schemas and bounded request bodies.

Facts are comparable only within the same canonical mine, year, metric and reserve category. Differences over one percent of the larger normalized value create conflicts. Explicit conflict selections take precedence, followed by approved/corrected facts. Unresolved alternatives are displayed together. Sample confidence is fixture metadata and does not measure extraction accuracy.

AI first produces a validated query plan. Numerical answers come from application calculations; descriptive answers use retrieved excerpts. Generated claims require valid evidence IDs from the selected context. Digits in generated prose are rejected so model-generated numbers cannot override the calculations. No supporting evidence yields an explicit insufficient-evidence message. Provider failures are retryable errors. No predictive or causal claims are inferred from correlations.

## HTTP endpoints

All endpoints are under `/api`, with no-store responses. GET: `data`, `health`, `mines`, `mines/:id`, `mines/:id/timeline?metric=production`, `documents`, `documents/:id`, `evidence/:id`, `conflicts`, `reports`, `reports/:id`.

POST bodies:

| Endpoint                | Body                                                                       |
| ----------------------- | -------------------------------------------------------------------------- |
| `questions`             | `{mineId, question}` (3–2000 characters)                                   |
| `facts/:id/review`      | `{expectedVersion, action: "approve"\|"correct"\|"reject", value?, unit?}` |
| `conflicts/:id/resolve` | `{expectedVersion, selectedFactId}` (null clears selection)                |
| `reports`               | `{mineId, startYear, endYear}` (2020–2024)                                 |
| `reports/:id/approve`   | `{expectedVersion}`                                                        |
| `demo/import`           | `{}`                                                                       |
| `demo/reset`            | `{expectedRevision, confirm: "RESET SHARED DEMO"}`                         |

Mutations are restricted to seeded demo facts. This public demo intentionally allows shared anonymous reviews and report approval; it is not expert authentication.

## Validation and fixtures

`npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, and `npm run test:e2e`. Install browser dependencies first with `npx playwright install chromium`. Database integration tests use `.env.local` when present, and skip without credentials. Browser tests also skip the shared/live portions without configuration. Run live evaluation with `npm run evaluate` against the running app; set `EVAL_BASE_URL` to the deployed URL. This checks numerical, descriptive, combined, missing-evidence and conflict questions and validates citation IDs.

`fixtures/sample.json` and `fixtures/ground-truth.json` match `src/lib/sample.ts`. `npm run fixtures` regenerates them. Downloadable evidence and exact page/cell previews are committed under `public/samples`. Regenerate PDFs with `pip install -r scripts/requirements.txt` then `python scripts/build-pdfs.py`. The scanned sample is image-only. `scripts/build-workbook.mjs` regenerates the Excel workbook/preview with the Codex artifact-tool runtime when available (`@oai/artifact-tool`); it is not required to build or run the app.

## Vercel deployment

Import `akshh229/CoalSmart`, use Next.js detection and root `./`. Configure the `.env.example` server variables for Preview and Production. Use the same Supabase sandbox if shared preview/production reviews are intended. Apply migrations and seed before deployment; restart/redeploy after environment changes. Build with `npm run build`. Keep all credential values outside Git and never prefix privileged credentials with `NEXT_PUBLIC_`.

Verify `/api/data` reports `connected: true` and `aiAvailable: true`, then run the walkthrough and deployed evaluation. Measure report generation on the deployed app; local latency is not a production guarantee. The intended production domain is https://coalsmart.vercel.app/.

Real arbitrary upload extraction/OCR, authenticated expert approvals, prediction and enterprise integrations are deferred.
