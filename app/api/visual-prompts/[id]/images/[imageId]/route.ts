import { NextResponse } from "next/server"

import { deleteGeneratedImage } from "@/lib/image-generation/service"

type RouteContext = {
  params: Promise<{ id: string; imageId: string }>
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id, imageId } = await params

  try {
    const deleted = await deleteGeneratedImage(id, imageId)

    if (!deleted) {
      return NextResponse.json({ error: "Generated image not found." }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to delete generated image." }, { status: 500 })
  }
}
