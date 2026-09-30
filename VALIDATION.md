# Prototype validation

Local validation completed on 30 September 2026:

- TypeScript checking, ESLint, production Next.js build and GitHub Actions checks pass.
- 27 unit/database tests cover normalization, comparable conflict categories, selected facts, missing years, zero baselines, original values, revisions, concurrent updates, reset, report staleness and atomic rate budgets.
- Browser checks exercise all eight pages, exact source previews, shared conflict resolution in two browser contexts, concurrent-edit rejection, live question answering, report generation/approval, mobile keyboard navigation, failed map tiles and invalid API requests.
- Live Gemini evaluation passes numerical, descriptive, combined, missing-evidence and conflicting-data questions. Baseline Aaranya production changes from 5.30 Mt to 4.00 Mt across 2020–2024 (−24.53%). Unresolved 2022 recoverable reserves remain 126.00 / 142.00 Mt.
- All twenty source files and thirty-nine exact page/cell previews were generated and visually inspected. Prepared extraction is labeled throughout. No extraction-accuracy claim is made.
- Supabase migrations, idempotent sample seed and twenty Gemini chunk embeddings are applied. The app uses Gemini 3.5 Flash-Lite after validating account/model access. Credentials remain outside Git.

GitHub confirms that the initial implementation was deployed automatically by the existing Vercel project in `akshh229s-projects` (commit `4ce5058`). The deployment URL redirects unauthenticated visitors to Vercel sign-in, while the supplied `https://coalsmart.vercel.app/` still returns HTTP 404. The separately signed-in `gargujjwal136-gmailcoms-projects` workspace cannot configure that owner's project. Production domain, server environment and live latency verification remain pending access to the existing project. Do not interpret deployment build success as a verified public production workflow.
