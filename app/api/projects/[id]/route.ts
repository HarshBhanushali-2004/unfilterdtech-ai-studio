import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: {
        id,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to load project" },
      { status: 500 }
    );
  }
}
export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    const body = await request.json();

    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.project.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        NOT: { id },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `A project named "${name}" already exists.` },
        { status: 409 }
      );
    }

    const project = await prisma.project.update({
      where: {
        id,
      },
      data: {
        name,
        description: body.description,
        color: body.color,
        brandKitId: body.brandKitId || null,
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to update project" },
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

    await prisma.project.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Failed to delete project",
      },
      {
        status: 500,
      }
    );
  }
}