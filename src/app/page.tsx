import Link from "next/link";
import { prisma } from "@/db/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

async function getDemoPatientToken(): Promise<string | null> {
  try {
    const patient = await prisma.patient.findFirst({
      where: { externalId: "MRN-1001" },
      select: { payToken: true },
    });
    return patient?.payToken ?? null;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const demoToken = await getDemoPatientToken();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              OP
            </span>
            <span className="font-semibold">Open Patient Pay</span>
          </div>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Patient sign in</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/admin">Admin</Link>
            </Button>
            {demoToken ? (
              <Button asChild>
                <Link href={`/pay/${demoToken}`}>Try patient portal</Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href="/admin">Get started</Link>
              </Button>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="border-b bg-gradient-to-b from-muted/50 to-background">
          <div className="mx-auto max-w-6xl px-4 py-20 text-center">
            <Badge variant="outline" className="mb-4">
              Open source · Self-hosted · Apache-2.0
            </Badge>
            <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              Dignified medical billing,{" "}
              <span className="text-primary">without the predatory fees.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              A Stripe-grade payment and installment portal that independent practices can spin
              up in minutes on their own servers — and patients can actually understand.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" asChild>
                <Link href="/admin">Open provider dashboard</Link>
              </Button>
              {demoToken && (
                <Button size="lg" variant="outline" asChild>
                  <Link href={`/pay/${demoToken}`}>View a patient&apos;s bill</Link>
                </Button>
              )}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-2xl font-semibold">Built for both sides of the bill</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-muted-foreground">
            Providers keep 100% of their data and pay no software licensing fees. Patients get a
            clear, mobile-friendly checkout with flexible plans.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle>Append-only ledger</CardTitle>
                <CardDescription>
                  Invoices, payments, adjustments, and refunds tracked as strict integer cents —
                  never floats, never overwritten.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Installment engine</CardTitle>
                <CardDescription>
                  Weekly, bi-weekly, or monthly plans with automatic recalculation when a balance
                  changes.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Stripe adapter</CardTitle>
                <CardDescription>
                  Card data is tokenized at Stripe and never touches your server. Webhooks
                  reconcile every payment automatically.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>CSV import</CardTitle>
                <CardDescription>
                  Drop in your practice management export. Patients and invoices are ingested in
                  memory, statelessly.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        <section className="border-t bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <h2 className="text-2xl font-semibold">Spin it up in one command</h2>
                <p className="mt-3 text-muted-foreground">
                  Postgres runs in a Docker volume so a container crash never costs you data. The
                  app is 100% stateless, ready to scale when you are.
                </p>
                <pre className="mt-6 overflow-x-auto rounded-lg bg-foreground p-4 text-sm text-background">
                  {`git clone https://github.com/your-org/open-patient-pay\ncd open-patient-pay\ncp .env.example .env\ndocker compose up -d\nnpm install && npm run db:push && npm run db:seed\nnpm run dev`}
                </pre>
              </div>
              <div>
                <h2 className="text-2xl font-semibold">Open Core, SaaS-ready</h2>
                <ul className="mt-3 space-y-3 text-muted-foreground">
                  <li className="flex gap-2">
                    <span>•</span> UUID primary keys and an <code>organizationId</code> on every
                    table, so a future multi-tenant cloud is a migration, not a rewrite.
                  </li>
                  <li className="flex gap-2">
                    <span>•</span> Feature toggles like{" "}
                    <code>ENABLE_CLINIC_REGISTRATION</code> keep self-hosted and SaaS on one
                    codebase.
                  </li>
                  <li className="flex gap-2">
                    <span>•</span> Adapter interfaces mean your EHR feed or payment processor is a
                    drop-in swap.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row">
          <p>Open Patient Pay · open-source financial infrastructure for healthcare.</p>
          <p>
            Interactive demo (GitHub Pages):{" "}
            <code>demo/index.html</code> — published automatically by the included workflow.
          </p>
        </div>
      </footer>
    </div>
  );
}
