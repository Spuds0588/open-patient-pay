# Open Patient Pay

An open-source, self-hosted billing and installment engine for independent medical practices. Give patients a **Stripe-grade payment experience** with flexible, transparent payment plans — and give providers full data ownership with **zero software licensing fees**.

> **Try the live demo** (no install needed): see [`demo/`](demo/) — it's a static page that can be hosted on GitHub Pages.

---

## What it does

- **Patient portal** — a mobile-friendly page where a patient sees a clear balance breakdown, picks a plan (pay-in-full, 3/6/12 months, or a custom period with their own interval and count), chooses a **first-payment date** (if the provider allows), and checks out through Stripe. Card data is tokenized at Stripe and **never touches your server**.
- **Magic-link login & email** — patients sign in with just their email (a signed, expiring magic link in dev is printed to the server log or sent via SMTP). From the portal they can opt into payment reminders, email themselves receipts and statements, and print a statement as PDF. Billing contact buttons (call / email) are always one tap away.
- **Provider dashboard** — upload a weekly billing CSV, **add patients manually** (walk-ins, one-off bills), open any patient's full payment history and invoices, email portal links / statements / reminders, and record manual payments or adjustments straight into the append-only ledger.
- **Accounts receivable workflows** — the dashboard KPIs are drill-downs into the patient list (outstanding, overdue, no-plan, in-collections); every email sent to a patient is logged (magic links, receipts, statements, reminders, bulk sends); billing staff can log phone calls and internal notes on a patient's record; and there are one-click workflows to **send an account to collections** or **re-submit to insurance** (new carrier), each written to the patient's timeline.
- **Installment engine** — pure, stateless logic that splits a balance into exact installments (integer cents, remainder front-loaded) and recalculates future installments when a balance is adjusted mid-plan. Supports presets (3/6/12 monthly, weekly, bi-weekly) plus **patient-defined periods** (days/weeks/months with a custom interval and count).
- **Provider-controlled limits** — cap the number of payments, the plan length, and the minimum payment, gate custom periods, and optionally let patients choose their first-payment date.
- **Adapters** — `PaymentAdapter` and `DataIngestionAdapter` interfaces isolate Stripe and CSV behind swappable contracts (swap in a FHIR feed or another processor later).

---

## Quick start

### Option A — everything in Docker (recommended)

```bash
git clone https://github.com/your-org/open-patient-pay.git
cd open-patient-pay
cp .env.example .env
docker compose up -d
```

That builds the app, starts Postgres with a persistent volume, applies migrations, and serves the app at <http://localhost:3000>. To load the demo dataset:

```bash
docker compose exec app npx prisma db seed
```

### Option B — local Node with Docker Postgres

```bash
cp .env.example .env
docker compose up -d db          # just the database
npm install
npm run db:push                  # or: npm run db:migrate
npm run db:seed
npm run dev                      # http://localhost:3000
```

---

## Payments

The app runs in **mock mode** out of the box (`MOCK_PAYMENTS=true`), so the full checkout and reconciliation flow works with no credentials. To go live with Stripe:

1. Create a Stripe account and copy your secret key + publishable key into `.env`:

   ```env
   STRIPE_SECRET_KEY=sk_live_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   MOCK_PAYMENTS=false
   ```

2. Add a webhook endpoint pointing at `https://your-host/api/webhooks/stripe` for the `checkout.session.completed` event, and paste the signing secret into `STRIPE_WEBHOOK_SECRET`.

Reconciliation is **idempotent** — it keys on the payment intent id, so duplicate webhooks or a user reloading the success page never double-charge the ledger.

---

## CSV import format

Paste a practice-management export on the **Import CSV** page. Columns are matched by name (case-insensitive, aliases allowed):

| Column | Required | Notes |
| --- | --- | --- |
| `externalId` | yes | e.g. `MRN-1001` (also `patientId`, `mrn`) |
| `name` | yes | patient name |
| `email` / `phone` | no | |
| `invoiceNumber` | yes | dedup key for re-imports |
| `description` | no | service description |
| `amount` | yes | dollars (`1240.00`); use `amountCents` for integer cents |
| `issuedAt` / `dueAt` | no | any parseable date |

Example:

```csv
externalId,name,email,invoiceNumber,description,amount,issuedAt,dueAt
MRN-1001,Marcus Chen,marcus@example.com,INV-1001,Emergency room visit,1240.00,2026-07-01,2026-07-30
```

A sample export is bundled — click **Load sample** on the import page, or see [`src/lib/sample-csv.ts`](src/lib/sample-csv.ts).

---

## Architecture

```
open-patient-pay/
├── src/
│   ├── app/              # Next.js App Router: admin dashboard + patient portal + API routes
│   │   ├── admin/        # dashboard, patients, plans, import, ledger
│   │   ├── pay/[token]   # patient portal + success page
│   │   └── api/          # plans, checkout, confirm, import, adjustment, stripe webhook
│   ├── components/       # UI (shadcn-style primitives, Tailwind)
│   ├── core/             # stateless engine + ledger math + services
│   ├── adapters/         # Stripe adapter, CSV adapter, interfaces
│   ├── db/               # Prisma client
│   └── lib/              # config, money (integer cents), queries, auth
├── prisma/               # schema + migrations + seed
├── demo/                 # static GitHub Pages demo
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

### Rules that keep it "Open Core" / SaaS-ready

1. **UUIDs only** — every primary key is a UUID string, never an auto-increment integer.
2. **Singleton multi-tenancy** — every table has an `organizationId`. V1 provisions exactly one organization; all writes default to it behind the scenes.
3. **Integer cents** — money is stored and computed as integers. The only float boundary is the `dollarsToCents` parser in `src/lib/money.ts`.
4. **Append-only ledger** — `Transaction` rows are never updated or deleted. The application has no such routes, and a Postgres trigger (`prisma/migrations/…_ledger_append_only_trigger`) rejects any `UPDATE`/`DELETE` at the database level. Corrections are recorded as new offsetting entries.
5. **Stateless app** — no local file writes, no in-memory sessions; the web layer can scale horizontally. (The mock payment adapter is stateless too — it encodes session data into the session id.)
6. **Feature toggles** — `ENABLE_CLINIC_REGISTRATION`, `ENABLE_PATIENT_PORTAL`, `ENABLE_AUTO_DEBIT` gate features so the self-hosted and future SaaS builds share one codebase.

---

## Configuration

See [`.env.example`](.env.example). Key variables:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `APP_BASE_URL` | Used to build checkout success/cancel URLs |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Live payments (empty → mock mode) |
| `MOCK_PAYMENTS` | Force mock payments even when a Stripe key is set |
| `ENABLE_CLINIC_REGISTRATION` | Open-core toggle (future multi-tenant) |
| `PLAN_ALLOW_CUSTOM_PERIODS` | Let patients define their own period (unit + interval + count) |
| `PLAN_ALLOW_CUSTOM_DATE` | Let patients choose their first-payment date |
| `PLAN_MIN_PAYMENT_CENTS` | Minimum amount per payment (cents) |
| `PLAN_MAX_PAYMENTS` | Maximum number of payments in a plan |
| `PLAN_MAX_MONTHS` | Maximum total plan length (months) |
| `PLAN_FIRST_PAYMENT_WINDOW_DAYS` | How far out a first payment may be scheduled |
| `PLAN_ALLOWED_PERIOD_UNITS` | Comma list of allowed units: `DAY,WEEK,MONTH` |
| `ADMIN_TOKEN` | If set, `/api/admin/*` requires `Authorization: Bearer <token>` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | Outbound email (magic links, receipts, statements, reminders). Empty → mock mode prints a preview instead |
| `BILLING_EMAIL` / `BILLING_PHONE` | "Questions about your bill?" contact shown on the patient portal |

---

## Data persistence & backups

Postgres runs in the named Docker volume `pgdata`, so a container crash or restart never loses data. **Host-server backups are the responsibility of the self-hosting clinic** — for example:

```bash
docker compose exec db pg_dump -U postgres open_patient_pay > backup-$(date +%F).sql
```

---

## Security notes

- Patient access uses **magic links**: a patient enters their email on `/login`, the app mints a high-entropy, expiring token, and (in production) emails it to them — no passwords to store or leak. Once signed in, they're redirected to their portal.
- The portal URL itself (`/pay/<token>`) remains a high-entropy, unguessable token. Regenerating a patient's token invalidates old links.
- Admin routes are protected by `ADMIN_TOKEN` (if set). Front the app with your own reverse proxy/SSO for production.
- No raw card data ever reaches the application server; tokenization happens at Stripe.

---

## Development

```bash
npm run typecheck   # tsc --noEmit
npm test            # vitest (engine, money, ledger, CSV adapter)
npm run build       # production build
```

The core engine is pure and heavily unit-tested — see [`src/core/engine.test.ts`](src/core/engine.test.ts) for schedule-splitting, date clamping, and mid-plan recalculation.

---

## Hosting the demo on GitHub Pages

The [`demo/`](demo/) directory is a single self-contained `index.html` (inline CSS/JS, no build step). To publish it:

1. Enable **GitHub Pages** for the repo (Settings → Pages).
2. Either point Pages at a branch/folder containing `demo/index.html`, or use the included workflow [`.github/workflows/deploy-demo.yml`](.github/workflows/deploy-demo.yml), which publishes `demo/` to the `gh-pages` branch on every push to `main`.

The demo simulates the full patient checkout (mock Stripe) and the provider dashboard (CSV import, FHIR/EHR lookup), so anyone can experience the product without a server.

---

## Roadmap (beyond V1)

- Stripe **subscriptions / auto-debit** for saved payment methods (the `ENABLE_AUTO_DEBIT` toggle is already wired).
- A **FHIR ingestion adapter** (`DataIngestionAdapter`) to pull balances straight from an EHR instead of CSV.
- Scheduled, automated payment reminders (the opt-in is already wired; a cron/queue would send them on due dates).
- Provider auth (login, roles) and a full audit trail UI.
- Multi-tenant SaaS mode behind `ENABLE_CLINIC_REGISTRATION`.

## License

Apache-2.0 — see [LICENSE](LICENSE).
