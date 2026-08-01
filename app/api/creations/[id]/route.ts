import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { formatZodError } from "@/lib/validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const updateCreationSchema = z.object({
  caption: z.string().trim().min(1, "Caption cannot be empty.").optional(),
  prompt: z.string().trim().min(1, "Prompt cannot be empty.").optional(),
});

export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    const body = await request.json();

    const validation = updateCreationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: formatZodError(validation.error) },
        { status: 400 }
      );
    }

    const creation = await prisma.creation.update({
      where: { id },
      data: validation.data,
    });

    return NextResponse.json(creation);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Creation not found." },
        { status: 404 }
      );
    }

    console.error(error);

    return NextResponse.json(
      { error: "Failed to update creation" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    await prisma.creation.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Creation not found." },
        { status: 404 }
      );
    }

    console.error(error);

    return NextResponse.json(
      { error: "Failed to delete creation" },
      { status: 500 }
    );
  }
}
