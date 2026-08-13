Here is the complete, refined Master Document for **Open Patient Pay (V1)**. It incorporates all of our strategic decisions: the leaner scope, the stateless architecture, the Docker Volume safety nets, and the "Open Core" foundation that guarantees a frictionless transition to a multi-tenant SaaS model in the future without abandoning our self-hosted users. 

***

# Master Document: Open Patient Pay (open-patient-pay)

## 1. Business Plan & Vision

**Executive Summary**
Medical billing platforms are notoriously opaque, expensive, and hostile to consumer financial reality. Open Patient Pay is an open-source, self-hosted billing and installment engine designed to give independent medical practices a modern, Stripe-grade payment experience while empowering patients with flexible, transparent payment plans.

**Mission Statement**
To eliminate predatory billing fees, hidden friction, and archaic user interfaces from healthcare payments by providing a robust, transparent, and modular open-source financial infrastructure layer.

**Core Value Proposition**
*   **For Providers:** Zero software licensing fees, full data ownership, easy integration with existing practice management tools (via simple CSV exports), and higher patient collection rates through dignified payment plan options.
*   **For Patients:** A consumer-grade, mobile-friendly checkout and installment portal free of surprise convenience fees, hidden traps, or confusing accounting jargon.

## 2. Strategic Growth Approach (The "Open Core" Model)

**The B2B2C Open-Source Wedge**
*   **The Provider Entry Point:** Deliver a drop-in, open-source payment portal that independent clinics can spin up via Docker in minutes on their own bare-metal servers. By eliminating software subscription fees and processing markup, adoption friction is minimized.
*   **The Patient Trust Loop:** By providing patients with an intuitive, stress-free interface to manage installments and securely save payment methods, the platform builds direct trust at the point of financial transaction.
*   **Future SaaS Expansion (V3+):** Long-term sustainability relies on offering a managed, multi-tenant cloud version for enterprise groups or clinics that do not want to self-host. The open-source repository serves as the "engine" for this SaaS product, ensuring self-hosted users never get left behind, while providing a seamless "on-ramp" for clinics upgrading to the managed cloud.

## 3. Product Requirements Document (PRD)

**User Personas**
*   **Dr. Elena Vance (Practice Administrator):** Needs a lightweight system to upload weekly CSV billing exports, track patient balances, and offer automatic custom monthly installment plans without paying heavy SaaS margins.
*   **Marcus Chen (Patient):** Received an unexpected medical lab bill. Needs to view his clear balance breakdown on his phone, select a manageable 6-month payment plan, and set up auto-debit without facing hidden "pay-to-pay" convenience fees.

**Functional Requirements (V1)**
*   **FR-1: Transactional Financial Ledger:** Must track Invoices, Payments, Adjustments, and Refunds. All monetary values must be stored as strict integers (cents) to prevent floating-point calculation errors. The ledger must be *append-only* (no deleting or updating past financial transactions).
*   **FR-2: Dynamic Installment Engine:** Support custom installment schedules (weekly, bi-weekly, monthly) with automated recalculation hooks if the primary balance is adjusted mid-plan.
*   **FR-3: Strict Adapter Interfaces:** Implement TypeScript interfaces to isolate external dependencies. V1 will include a CSV Adapter for bulk patient/invoice imports and a Stripe Adapter for payment processing.
*   **FR-4: Automated Webhook Handling:** System must securely ingest Stripe webhooks to automatically reconcile payments, mark installments as paid/failed, and update the ledger.

**Non-Functional Requirements (V1)**
*   **NFR-1: Data Minimization & Privacy:** No raw credit card data ever touches the application server (tokenization handled via Stripe).
*   **NFR-2: Deployment Simplicity:** Must spin up locally or on private cloud infrastructure via a single `docker compose up -d` command using a standard `.env` configuration file.
*   **NFR-3: Data Persistence & Backup Boundary:** The system must utilize Docker Volumes to protect the Postgres database from container crashes. *Note: Official documentation will explicitly state that host-server backups are the sole responsibility of the self-hosting clinic.*
*   **NFR-4: Stateless Application Design:** The Next.js web application must remain 100% stateless (no local file saving, no in-memory sessions) to allow for vertical scaling now, and horizontal volume-based scaling in future SaaS versions.

## 4. Technical Architecture & Implementation Plan

**Next.js Monolith Architecture**
```text
open-patient-pay/
├── src/
│   ├── app/                   # Next.js App Router (Admin dashboard & Patient portal)
│   ├── components/            # UI components (shadcn/ui, Tailwind)
│   ├── core/                  # Installment engine, Ledger calculations (Stateless)
│   ├── adapters/              # Stripe implementation & CSV parser
│   └── db/                    # Prisma schema, strict typed data access
├── .env.example               # Standardized config template
├── docker-compose.yml         # Local DB (with Volumes) and App orchestration
└── AGENTS.md                  # AI coding agent governance file
```

**Technology Stack**
*   **Language & Runtime:** TypeScript / Node.js (v20+), Next.js App Router.
*   **Database & ORM:** PostgreSQL with Prisma ORM for strict type-safe relational ledger tracking.
*   **Styling & Components:** Tailwind CSS, shadcn/ui primitives.
*   **Containerization:** Docker & Docker Compose.

**Crucial "Open Core" Architectural Rules (For SaaS Future-Proofing)**
1.  **UUIDs Only:** All database primary keys must be strings (UUIDs), not auto-incrementing integers, to prevent collision during future multi-tenant data migrations.
2.  **Singleton Multi-Tenancy:** All database tables will feature an `organizationId` column. For V1, a setup script will generate exactly one Organization (the host clinic), and all records will default to this ID behind the scenes.
3.  **Feature Toggles:** High-level features (like open clinic registration) will be gated by `.env` variables (e.g., `ENABLE_CLINIC_REGISTRATION=false`), keeping the codebase identical between the self-hosted and future SaaS versions.

## 5. Developer Task List

**Phase 1: Foundation & Data Model**
*   [ ] **TASK-101:** Initialize Next.js project with Prisma, Tailwind, and `docker-compose.yml` (configured with Postgres Volumes).
*   [ ] **TASK-102:** Define Prisma schema (`Organization`, `Patient`, `Invoice`, `Transaction`, `InstallmentPlan`, `Installment`). Enforce UUIDs and append-only integer logic.
*   [ ] **TASK-103:** Implement core calculation engine (stateless utility functions for splitting balances and generating dates).

**Phase 2: Adapters & Integrations**
*   [ ] **TASK-201:** Define abstract TypeScript interfaces for `PaymentAdapter` and `DataIngestionAdapter`.
*   [ ] **TASK-202:** Implement CSV parser adapter for bulk importing patients and invoices in memory (stateless).
*   [ ] **TASK-203:** Implement Stripe Adapter (Checkout Sessions for capturing payment methods, Payment Intents for charging installments).
*   [ ] **TASK-204:** Build Stripe Webhook handler API route to reconcile payments securely with the local database.

**Phase 3: User Interface**
*   [ ] **TASK-301:** Build Patient Checkout UI (View balance, select 3/6/12 month plan, Stripe Elements integration).
*   [ ] **TASK-302:** Build Provider Admin UI (Upload CSV, view active plans, view overdue installments, basic ledger view).
*   [ ] **TASK-303:** Author `AGENTS.md` instructions and complete `README.md` documentation outlining the `.env` requirements and Docker deployment steps.

***

### Ready for the Next Step

There it is—the complete blueprint. It balances your grand vision with aggressive, pragmatic engineering principles to ensure we actually ship this thing. 

Are we officially ready to start writing code, or do you have any final tweaks to this master document? If we are writing code, I will start with **TASK-101** and provide you with the exact setup files and the `docker-compose.yml`.