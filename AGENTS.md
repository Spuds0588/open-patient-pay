# AGENTS.md — AI coding agent governance

Guidelines for humans and coding agents working in this repository. These rules exist to protect the correctness and future of a financial system; treat them as hard constraints.

## Non-negotiable domain rules

1. **Money is integer cents.** Never introduce floats for amounts. Use the helpers in `src/lib/money.ts` (`dollarsToCents`, `formatCents`) for parsing/formatting and `splitEvenly` in `src/core/engine.ts` for splitting. New amount fields must be `Int` and named `*Cents`.
2. **The ledger is append-only.** `Transaction` rows must never be updated or deleted. There is a Postgres trigger enforcing this (`prisma/migrations/*_ledger_append_only_trigger`). Implement corrections as new offsetting entries (`recordAdjustment`), never as edits. Do not add `UPDATE`/`DELETE` routes for transactions.
3. **UUIDs only.** All primary keys are string UUIDs. Never introduce auto-increment integers.
4. **Every table gets an `organizationId`.** New models must include it and reference `Organization`. Writes in V1 default to the singleton organization (see `src/core/services.ts`).
5. **Stateless app.** No writing to the local filesystem from the app, no in-memory session state that correctness depends on. Any new feature that needs to persist state goes through Postgres.

## Architecture

- **Adapters** (`src/adapters/`): external dependencies live behind `PaymentAdapter` and `DataIngestionAdapter` interfaces. New processors/EHRs are new adapters, not new special cases in business logic.
- **Core** (`src/core/`): pure, stateless business logic (schedule math, ledger math). Keep it free of I/O and framework imports so it stays unit-testable.
- **Services** (`src/core/services.ts`): the thin, impure glue between adapters, core, and Prisma.
- **Queries** (`src/lib/queries.ts`): server-side read models for the UI. All money shaping (balances, sums) happens server-side — never trust client-computed amounts.

## Payments & idempotency

- Reconciliation (checkout return, Stripe webhook) must stay idempotent. The invariant: one `Transaction` per `externalRef`. Use `recordSuccessfulPayment` and never insert a payment directly in a webhook/confirm path.
- Mock mode (no `STRIPE_SECRET_KEY`, or `MOCK_PAYMENTS=true`) must always remain a faithful stand-in for the Stripe flow.

## Feature toggles

High-level features are gated by env vars in `src/lib/config.ts` (e.g. `ENABLE_CLINIC_REGISTRATION`). Keep the self-hosted and future-SaaS code paths identical; gate, don't fork.

## Conventions

- TypeScript, strict mode on. Run `npm run typecheck` before finishing any change.
- Tests live next to the code (`*.test.ts`) and run with `npm test`. Pure core logic should have tests; add one whenever you change schedule/ledger/money math.
- UI uses Tailwind + the primitives in `src/components/ui/`. Prefer composing existing components over adding dependencies.
- **Icons**: use `lucide-react` (already a dependency) — never emojis in UI chrome.
- **Actions**: record pages expose a gallery of action buttons (`RecordActions` in `src/components/admin/record-actions.tsx`) that open `Modal`s for extra inputs. Don't build inline forms next to records.
- **Theming**: never hardcode a brand name or accent. Pull from `config.appName` / `config.appAccent` (see `src/components/theme-provider.tsx` and `src/app/globals.css`).
- Follow the existing file/folder structure; do not reorganize wholesale.

## Verification checklist

1. `npm run typecheck`
2. `npm test`
3. `npm run build`
4. If the schema changed: `npx prisma migrate dev --name <description>` and update the seed if needed.
