# Softly Wellness Companion

A gentle daily wellness companion featuring Move, Read, Talk (AI check-in companion), and Log check-in notebooks with zero gamification.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/softly run dev` — run the Vite frontend web client (port 3000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push Drizzle schema changes to Neon Lakebase Postgres
- Required env:
  - `DATABASE_URL`: Pooled Neon connection string (`postgresql://neondb_owner:...@ep-proud-tooth-39069065-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require`)
  - `DATABASE_URL_UNPOOLED`: Direct Neon connection string for schema migrations
  - `NEON_PROJECT_ID`: `proud-tooth-39069065`
  - `NEON_ORG_ID`: `org-frosty-dream-73567984`
  - `GEMINI_API_KEY` or `OPENAI_API_KEY`: For live Talk companion responses (optional; local empathetic fallback active otherwise)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Database: Neon Lakebase Postgres (project: `proud-tooth-39069065`, org: `org-frosty-dream-73567984`) + Drizzle ORM
- API: Express 5
- Frontend: React 18, Vite 7, Tailwind CSS, Lucide Icons, Wouter routing, TanStack React Query
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)

## Where things live

- Frontend SPA: [`artifacts/softly`](file:///Users/soumilimajumdar/code/Softly-Wellness-Companion/artifacts/softly)
- Backend API Server: [`artifacts/api-server`](file:///Users/soumilimajumdar/code/Softly-Wellness-Companion/artifacts/api-server)
- Database Schemas & Drizzle: [`lib/db`](file:///Users/soumilimajumdar/code/Softly-Wellness-Companion/lib/db)
- API Spec & Zod: [`lib/api-spec`](file:///Users/soumilimajumdar/code/Softly-Wellness-Companion/lib/api-spec), [`lib/api-zod`](file:///Users/soumilimajumdar/code/Softly-Wellness-Companion/lib/api-zod), [`lib/api-client-react`](file:///Users/soumilimajumdar/code/Softly-Wellness-Companion/lib/api-client-react)
- Neon Config: [`.neon`](file:///Users/soumilimajumdar/code/Softly-Wellness-Companion/.neon), [`neon.ts`](file:///Users/soumilimajumdar/code/Softly-Wellness-Companion/neon.ts), [`.env`](file:///Users/soumilimajumdar/code/Softly-Wellness-Companion/.env)

## Architecture decisions

- **Direct vs Pooled URLs**: Runtime application queries use the pooled connection (`DATABASE_URL`), while Drizzle schema migrations use the direct unpooled endpoint (`DATABASE_URL_UNPOOLED`) to avoid PgBouncer session lock conflicts.
- **Session Identity**: Sessions are managed with lightweight HTTP-only cookie tokens mapped to `softly_sessions`.


## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
