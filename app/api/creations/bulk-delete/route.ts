import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { formatZodError } from "@/lib/validation";

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "Select at least one creation."),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const validation = bulkDeleteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: formatZodError(validation.error) },
        { status: 400 }
      );
    }

    const result = await prisma.creation.deleteMany({
      where: { id: { in: validation.data.ids } },
    });

    return NextResponse.json({ success: true, count: result.count });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to delete creations" },
      { status: 500 }
    );
  }
}
