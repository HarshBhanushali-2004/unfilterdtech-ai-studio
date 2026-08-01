import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.project.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });

    if (existing) {
      return NextResponse.json(
        { error: `A project named "${name}" already exists.` },
        { status: 409 }
      );
    }

    const project = await prisma.project.create({
      data: {
        name,
        description: body.description ?? "",
        color: body.color ?? "#7C3AED",
        brandKitId: body.brandKitId || null,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Unable to create project" },
      { status: 500 }
    );
  }
}