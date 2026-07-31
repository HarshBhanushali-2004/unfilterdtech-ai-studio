import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const brandKits = await prisma.brandKit.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(brandKits);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Unable to fetch Brand Kits" },
      { status: 500 }
    );
  }
}