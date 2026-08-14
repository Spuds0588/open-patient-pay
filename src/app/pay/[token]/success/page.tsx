import Link from "next/link";
import { Check, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { reconcileCheckoutSession } from "@/lib/payments";

export const dynamic = "force-dynamic";

export default async function SuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { token } = await params;
  const { session_id } = await searchParams;

  const result = session_id ? await reconcileCheckoutSession(session_id) : null;
  const ok = result?.status === "complete" && (result.recorded || result.alreadyRecorded);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          {ok ? (
            <>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <Check className="h-7 w-7 text-emerald-700" />
              </div>
              <h1 className="text-2xl font-bold">Payment received</h1>
              <p className="mt-2 text-muted-foreground">
                Thank you — your payment has been recorded and your installment is marked paid.
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
                <TriangleAlert className="h-7 w-7 text-amber-700" />
              </div>
              <h1 className="text-2xl font-bold">We couldn&apos;t confirm that payment</h1>
              <p className="mt-2 text-muted-foreground">
                {result?.error ??
                  "The payment session is still open or has expired. No charge was recorded."}
              </p>
            </>
          )}
          <Button asChild className="mt-6 w-full">
            <Link href={`/pay/${token}`}>Back to my bill</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
