import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { formatZodError } from "@/lib/validation";

const updateCaptionSchema = z.object({
  caption: z.string().trim().min(1, "Caption cannot be empty."),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const validation = updateCaptionSchema.safeParse(body);
  if (!validation.success) {
    return Response.json(
      { error: formatZodError(validation.error) },
      { status: 400 }
    );
  }

  try {
    const creation = await prisma.creation.update({
      where: {
        id,
      },
      data: {
        caption: validation.data.caption,
      },
    });

    return Response.json({
      success: true,
      caption: creation.caption,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return Response.json(
        { error: "Creation not found." },
        { status: 404 }
      );
    }

    console.error(error);

    return Response.json(
      { error: "Failed to update caption." },
      { status: 500 }
    );
  }
}
