import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { consumeMagicLink } from "@/core/services";

export const dynamic = "force-dynamic";

export default async function MagicLinkPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const patient = await consumeMagicLink(token);

  if (patient) {
    redirect(`/pay/${patient.payToken}?magic=1`);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-2xl">
            ⏳
          </div>
          <h1 className="text-2xl font-bold">This link has expired</h1>
          <p className="mt-2 text-muted-foreground">
            Magic links work once and expire after a few minutes. Request a new one from your
            clinic&apos;s payment portal.
          </p>
          <Button asChild className="mt-6 w-full">
            <Link href="/">Learn about Open Patient Pay</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
