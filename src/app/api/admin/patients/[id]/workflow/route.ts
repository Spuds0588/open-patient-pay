import { NextResponse } from "next/server";
import { z } from "zod";
import { resubmitInsurance, setCollectionsStatus } from "@/core/services";
import { isAdminRequestAuthorized } from "@/lib/auth";

const schema = z.object({
  action: z.enum(["COLLECTIONS", "RELEASE_COLLECTIONS", "RESUBMIT_INSURANCE"]),
  carrier: z.string().optional(),
  note: z.string().optional(),
  author: z.string().min(1).default("Billing team"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    if (parsed.data.action === "RESUBMIT_INSURANCE") {
      const patient = await resubmitInsurance({
        patientId: id,
        carrier: parsed.data.carrier,
        author: parsed.data.author,
        note: parsed.data.note,
      });
      return NextResponse.json({ patient });
    }

    const patient = await setCollectionsStatus({
      patientId: id,
      inCollections: parsed.data.action === "COLLECTIONS",
      author: parsed.data.author,
      note: parsed.data.note,
    });
    return NextResponse.json({ patient });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not run workflow." },
      { status: 400 }
    );
  }
}
