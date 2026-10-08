# CoalSMART

CoalSMART brings mine records, source documents and review decisions into one workspace. It helps users trace a reported value back to its source, compare conflicting records and prepare a mine performance brief.

[Open CoalSMART](https://coalsmart.vercel.app/)

## Features

- **Mine Twins:** mine profiles, annual production, recoverable reserves, operating observations and related documents.
- **Documents:** PDFs, a scanned report and an Excel return, with page previews and spreadsheet references.
- **Validation:** approve, correct or reject facts, compare competing values and keep a history of each decision.
- **CoalSMART AI:** answers supported by source excerpts, with numerical results calculated from reviewed facts.
- **GeoTimeline and CoalMap:** annual trends, target comparisons and mine locations, linked to the underlying evidence.
- **Reports:** generate a Mine Performance Brief, review it, give demo approval and export through Print to PDF.

The prototype contains five fictional mines and twenty sample documents covering 2020–2024. Extraction results are prepared fixtures. Arbitrary document extraction and OCR are outside the current release.

## Database

Supabase stores the shared dataset, review history, conflicts, reports and document embeddings. The configured database has been checked successfully: five mines, twenty documents, 102 facts and twenty embeddings. All three database integration tests pass.

Corrections preserve the original extracted value. Updates check record versions to prevent one visitor from overwriting another visitor's changes. Saved reports retain their original contents and become stale when relevant facts change.

Production uses its own environment settings. Local credentials stay outside Git; add them to the Vercel project to enable shared reviews and live answers on that deployment.

## Stack

Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Recharts, React Leaflet and Supabase PostgreSQL with pgvector. Gemini handles live answers and embeddings. An OpenAI Responses API adapter is also available.

## Local setup

Use Node.js 22.13 or later.

```sh
npm ci
```

Create `.env.local` with the following variables. Supply your own credential values.

```dotenv
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
AI_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_EMBEDDING_MODEL=gemini-embedding-2
RATE_LIMIT_SALT=
AI_PER_MINUTE=10
AI_PER_DAY=100
```

For OpenAI, set `AI_PROVIDER=openai`, `OPENAI_API_KEY` and `OPENAI_MODEL`. The adapter defaults to `gpt-5.6-terra`.

Apply these migrations in order to a new Supabase project:

1. `supabase/migrations/001_coalsmart.sql`
2. `supabase/migrations/002_embedding_provider.sql`

Then load the sample records, generate embeddings and start the app:

```sh
npm run seed
npm run embeddings
npm run dev
```

Open http://localhost:3000. The setup scripts can be run again without duplicating sample records or replacing existing reviews.

`.env.local` and `.env.example` are private local files ignored by Git. Neither is included in the repository or uploaded through Git deployment.

## Try the workflow

1. Open **Aaranya Open Cast** from Overview.
2. Inspect the sources for its conflicting 2022 reserves: **126 Mt** and **142 Mt**.
3. Ask how production changed between 2020 and 2024. The sample values are **5.30 Mt** and **4.00 Mt**, a **24.53% decline**.
4. Resolve the reserve conflict in Validation, then inspect the timeline and map.
5. Generate a Mine Performance Brief, open its citations and give demo approval.

Public review and approval actions belong to the shared sample sandbox. They do not represent authenticated expert approval. Reset Shared Demo restores sample facts while retaining review history and report snapshots.

## Checks

```sh
npm run typecheck
npm run lint
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
```

Run `npm run evaluate` against a configured app for numerical, descriptive, combined, missing-evidence and conflict questions. Set `EVAL_BASE_URL` to check another deployment. Browser tests that change shared reviews should use a dedicated test sandbox.

See [VALIDATION.md](VALIDATION.md) for verification results.

## Deployment

The repository is connected to Vercel. Pushes to `main` trigger deployment. Set the server variables in the project's **Production** and **Preview** environments, then redeploy after changing them.

Check `/api/health` for configured services and `/api/data` for `connected: true` and `aiAvailable: true`. A deployment without credentials serves the sample workspace in read-only mode.

Privileged keys stay on the server. Database tables use row-level security, and browser changes go through validated API routes. AI requests have per-IP and daily limits. Unsupported questions return an insufficient-evidence response; provider failures return retryable errors.
