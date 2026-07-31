import {
  AIServiceError,
  rewriteContent,
} from "@/lib/ai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const { content, instruction } = body as {
    content?: string;
    instruction?: string;
  };

  if (!content || !instruction) {
    return Response.json(
      {
        error: "Both content and instruction are required.",
      },
      {
        status: 400,
      }
    );
  }

  try {
    const rewritten = await rewriteContent(
      content,
      instruction
    );

    return Response.json({
      data: rewritten,
    });
  } catch (error) {
    if (error instanceof AIServiceError) {
      return Response.json(
        { error: error.message },
        { status: error.status }
      );
    }

    return Response.json(
      { error: "Unable to rewrite content." },
      { status: 500 }
    );
  }
}