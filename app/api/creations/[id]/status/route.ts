import { NextResponse } from "next/server";
import { CreationStatus, Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { formatZodError } from "@/lib/validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * `scheduledAt` is required (and must be in the future) only when moving to
 * SCHEDULED; it's cleared for every other status regardless of what's
 * passed in, so a client can't leave a stale schedule time sitting on a
 * PUBLISHED/APPROVED/DRAFT creation.
 */
const updateStatusSchema = z
  .object({
    status: z.enum(CreationStatus),
    scheduledAt: z.iso.datetime().optional(),
  })
  .refine((value) => value.status !== "SCHEDULED" || !!value.scheduledAt, {
    message: "scheduledAt is required when status is SCHEDULED.",
    path: ["scheduledAt"],
  })
  .refine(
    (value) =>
      value.status !== "SCHEDULED" ||
      !value.scheduledAt ||
      new Date(value.scheduledAt).getTime() > Date.now(),
    { message: "scheduledAt must be in the future.", path: ["scheduledAt"] }
  );

/**
 * Review page bottom action bar — "Approve & Publish" and "Schedule".
 *
 * There is no real social-publishing integration in this app today (no
 * OAuth, no Instagram/LinkedIn Graph API calls anywhere in the codebase) —
 * this route is a status-tracking scaffold for that future integration,
 * not a claim that a post actually goes out. "Approve & Publish" marks the
 * creation PUBLISHED immediately; "Schedule" marks it SCHEDULED with a
 * future `scheduledAt`. See CLAUDE.md Section 12.
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const validation = updateStatusSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: formatZodError(validation.error) }, { status: 400 });
  }

  try {
    const creation = await prisma.creation.update({
      where: { id },
      data: {
        status: validation.data.status,
        scheduledAt: validation.data.status === "SCHEDULED" ? new Date(validation.data.scheduledAt!) : null,
      },
    });

    return NextResponse.json({
      success: true,
      status: creation.status,
      scheduledAt: creation.scheduledAt?.toISOString() ?? null,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Creation not found." }, { status: 404 });
    }

    console.error(error);

    return NextResponse.json({ error: "Failed to update creation status" }, { status: 500 });
  }
}
