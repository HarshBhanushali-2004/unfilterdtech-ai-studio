import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { visualPromptObjectSchema } from "@/lib/ai"
import { formatZodError } from "@/lib/validation"
import { generateImageInputSchema } from "@/lib/image-generation/schemas"
import { resolveSlotPrompt } from "@/lib/image-generation/slot-resolver"
import { generateImageForSlot, listGeneratedImages } from "@/lib/image-generation/service"

export const runtime = "nodejs"

type RouteContext = {
  params: Promise<{ id: string }>
}

/** Lists every generated image for a Visual Prompt — used to hydrate the Visual Assets panel on load/reload. */
export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params

  try {
    const images = await listGeneratedImages(id)
    return NextResponse.json({ data: images })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to load generated images." }, { status: 500 })
  }
}

/** Generates (or reuses, or regenerates) the image for one prompt slot. */
export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 })
  }

  const inputValidation = generateImageInputSchema.safeParse(body)
  if (!inputValidation.success) {
    return NextResponse.json({ error: formatZodError(inputValidation.error) }, { status: 400 })
  }

  try {
    const visualPrompt = await prisma.visualPrompt.findUnique({ where: { id } })
    if (!visualPrompt) {
      return NextResponse.json({ error: "Visual prompt not found." }, { status: 404 })
    }

    const parsedVisualPrompt = visualPromptObjectSchema.safeParse(visualPrompt.data)
    if (!parsedVisualPrompt.success) {
      return NextResponse.json({ error: "Visual prompt data is invalid." }, { status: 502 })
    }

    const { slot, promptOverride, forceRegenerate } = inputValidation.data
    const promptSpec = resolveSlotPrompt(parsedVisualPrompt.data, slot)

    if (!promptSpec) {
      return NextResponse.json({ error: `Unknown image slot: "${slot}".` }, { status: 400 })
    }

    const image = await generateImageForSlot({
      visualPromptId: id,
      slot,
      promptSpec,
      promptOverride,
      forceRegenerate,
    })

    return NextResponse.json({ data: image })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Unable to generate this image right now." }, { status: 500 })
  }
}
