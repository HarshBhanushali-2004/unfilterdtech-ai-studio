import {
  AIServiceError,
  buildBrandContext,
  buildInstagramContentPrompt,
  generateContentInputSchema,
  generateInstagramContent,
  generatedInstagramContentSchema,
} from "@/lib/ai"
import { prisma } from "@/lib/prisma"
import { formatZodError } from "@/lib/validation"

export const runtime = "nodejs"

async function loadBrandContext(projectId: string | undefined) {
  if (!projectId) return ""

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { brandKit: true },
    })

    return buildBrandContext(project?.brandKit)
  } catch (error) {
    // Brand Kit guidance is a nice-to-have, not a requirement — a missing
    // project, a deleted Brand Kit, or a database hiccup should never stop
    // generation from proceeding without it.
    console.error("Failed to load Brand Kit context:", error)
    return ""
  }
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 })
  }

  const inputValidation = generateContentInputSchema.safeParse(body)
  if (!inputValidation.success) {
    return Response.json(
      { error: formatZodError(inputValidation.error) },
      { status: 400 }
    )
  }

  try {
    const brandContext = await loadBrandContext(inputValidation.data.projectId)
    const prompt = buildInstagramContentPrompt(inputValidation.data, brandContext)
    const generatedContent = await generateInstagramContent(prompt)
    const outputValidation = generatedInstagramContentSchema.safeParse(generatedContent)

    if (!outputValidation.success) {
      return Response.json({ error: "Generated content could not be validated." }, { status: 502 })
    }

    return Response.json({ data: outputValidation.data })
  } catch (error) {
    if (error instanceof AIServiceError) {
      return Response.json({ error: error.message }, { status: error.status })
    }

    return Response.json({ error: "Unable to generate content right now." }, { status: 500 })
  }
}
