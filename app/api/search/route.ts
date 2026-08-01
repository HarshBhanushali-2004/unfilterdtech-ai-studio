import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() ?? "";

    if (!query) {
      return NextResponse.json({ projects: [], creations: [] });
    }

    const [projects, creations] = await Promise.all([
      prisma.project.findMany({
        where: { name: { contains: query, mode: "insensitive" } },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, name: true },
      }),
      prisma.creation.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { caption: { contains: query, mode: "insensitive" } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, title: true, contentType: true },
      }),
    ]);

    return NextResponse.json({ projects, creations });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
