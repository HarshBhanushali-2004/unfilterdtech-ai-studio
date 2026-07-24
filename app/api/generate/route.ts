import {
  AIServiceError,
  buildInstagramContentPrompt,
  generateContentInputSchema,
  generateInstagramContent,
  generatedInstagramContentSchema,
} from "@/lib/ai"

export const runtime = "nodejs"

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
      { error: "Invalid generation request.", details: inputValidation.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const prompt = buildInstagramContentPrompt(inputValidation.data)
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
