"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { AlertCircle, Loader2, Sparkles } from "lucide-react"

import { ContentTypeSelector } from "@/components/ai-studio/content-type-selector"
import { GenerationProgress } from "@/components/ai-studio/generation-progress"
import { OutputSkeleton } from "@/components/ai-studio/output-skeleton"
import { GenerationSettings } from "@/components/ai-studio/generation-settings"
import { OutputPanel } from "@/components/ai-studio/output-panel"
import { SourceSelector } from "@/components/ai-studio/source-selector"
import { CollapsibleSection } from "@/components/dashboard/collapsible-section"
import type {
  ContentType,
  SourceType,
} from "@/components/ai-studio/types"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { GeneratedInstagramContent } from "@/lib/ai"
import { getTemplate } from "@/lib/template-renderer/registry"

const apiContentTypeByContentType = {
  post: "instagram_post",
  carousel: "carousel",
  story: "story",
  reel: "reel",
} as const

type GenerateApiResponse = {
  data?: GeneratedInstagramContent
  researchId?: string
  plannerId?: string
  visualPromptId?: string
  carouselPlanId?: string | null
  postPlanId?: string | null
  storyPlanId?: string | null
  reelPlanId?: string | null
  error?: string
}

export function StudioWorkspace() {
  const searchParams = useSearchParams()

  const selectedProjectId = React.useMemo(
    () => searchParams.get("project"),
    [searchParams]
  )
  const [sourceType, setSourceType] =
    React.useState<SourceType>("topic")

  const [sourceValues, setSourceValues] = React.useState<
    Record<SourceType, string>
  >({
    topic: "",
    text: "",
    url: "",
  })

  const [contentType, setContentType] =
    React.useState<ContentType>("post")

  const [tone, setTone] = React.useState("confident")
  const [creativity, setCreativity] = React.useState(55)

  const [generatedContent, setGeneratedContent] =
    React.useState<GeneratedInstagramContent | null>(null)
  const [researchId, setResearchId] = React.useState<string | null>(null)
  const [plannerId, setPlannerId] = React.useState<string | null>(null)
  const [visualPromptId, setVisualPromptId] = React.useState<string | null>(null)
  const [carouselPlanId, setCarouselPlanId] = React.useState<string | null>(null)
  const [postPlanId, setPostPlanId] = React.useState<string | null>(null)
  const [storyPlanId, setStoryPlanId] = React.useState<string | null>(null)
  const [reelPlanId, setReelPlanId] = React.useState<string | null>(null)

  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [projectName, setProjectName] =
    React.useState<string | null>(null)
  // Phase 1C — resolved from the project's Brand Kit, never chosen here;
  // "configured in Brand Settings" is the point (Core Requirement #17).
  const [templateName, setTemplateName] =
    React.useState<string | null>(null)

  React.useEffect(() => {
    let ignore = false;

    async function loadProject() {
      if (!selectedProjectId) {
        if (!ignore) {
          setProjectName(null);
          setTemplateName(null);
        }
        return;
      }

      try {
        const res = await fetch(`/api/projects/${selectedProjectId}`);

        if (!res.ok) {
          if (!ignore) {
            setProjectName(null);
            setTemplateName(null);
          }
          return;
        }

        const project = await res.json();

        if (!ignore) {
          setProjectName(project.name);
          setTemplateName(getTemplate(project.brandKit?.templateFamilyId).name);
        }
      } catch {
        if (!ignore) {
          setProjectName(null);
          setTemplateName(null);
        }
      }
    }

    void loadProject();

    return () => {
      ignore = true;
    };
  }, [selectedProjectId]);

  const sourceValue = sourceValues[sourceType]

  const generate = async () => {
    if (!sourceValue.trim() || isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceType,
          input: sourceValue,
          contentTypes: [
            apiContentTypeByContentType[contentType],
          ],
          tone,
          creativity,
          projectId: selectedProjectId ?? undefined,
        }),
      })

      const payload =
        (await response.json()) as GenerateApiResponse

      if (!response.ok || !payload.data) {
        throw new Error(
          payload.error ??
            "Unable to generate content right now."
        )
      }

      setGeneratedContent(payload.data)
      setResearchId(payload.researchId ?? null)
      setPlannerId(payload.plannerId ?? null)
      setVisualPromptId(payload.visualPromptId ?? null)
      setCarouselPlanId(payload.carouselPlanId ?? null)
      setPostPlanId(payload.postPlanId ?? null)
      setStoryPlanId(payload.storyPlanId ?? null)
      setReelPlanId(payload.reelPlanId ?? null)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to generate content right now."
      )
    } finally {
      setIsLoading(false)
    }
  }

  const clearGeneratedContent = () => {
    setGeneratedContent(null)
    setResearchId(null)
    setPlannerId(null)
    setVisualPromptId(null)
    setCarouselPlanId(null)
    setPostPlanId(null)
    setStoryPlanId(null)
    setReelPlanId(null)
    setError(null)
  }

  const handleSourceTypeChange = (
    nextSourceType: SourceType
  ) => {
    setSourceType(nextSourceType)
    clearGeneratedContent()
  }

  const handleSourceValueChange = (
    type: SourceType,
    value: string
  ) => {
    setSourceValues((current) => ({
      ...current,
      [type]: value,
    }))

    clearGeneratedContent()
  }

  return (
    <div className="space-y-6">
      {projectName && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                📁
              </div>

              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  Creating content for
                </p>

                <p className="text-lg font-semibold">
                  {projectName}
                </p>
              </div>

              {templateName && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Template</p>
                  <p className="text-sm font-semibold">{templateName}</p>
                  <p className="text-xs text-muted-foreground">Configured in Brand Settings</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] xl:items-start">
        <Card>
          <CardContent className="space-y-7 pt-6">
            <SourceSelector
              sourceType={sourceType}
              values={sourceValues}
              onSourceTypeChange={handleSourceTypeChange}
              onValueChange={handleSourceValueChange}
            />

            <ContentTypeSelector
              value={contentType}
              onChange={(value) => {
                setContentType(value)
                clearGeneratedContent()
              }}
            />

            <CollapsibleSection
              title="Advanced Settings"
              description="Fine-tune tone and creativity"
              icon={
                <span className="grid size-7 place-items-center rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-300">
                  <Sparkles className="size-3.5" />
                </span>
              }
              className="rounded-xl bg-muted/55 p-4"
            >
              <GenerationSettings
                tone={tone}
                creativity={creativity}
                onToneChange={(value) => {
                  setTone(value)
                  clearGeneratedContent()
                }}
                onCreativityChange={(value) => {
                  setCreativity(value)
                  clearGeneratedContent()
                }}
              />
            </CollapsibleSection>

            <Button
              className="w-full bg-violet-600 text-white hover:bg-violet-700"
              size="lg"
              disabled={!sourceValue.trim() || isLoading}
              onClick={generate}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating your content...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate{" "}
                  {contentType === "post"
                    ? "Instagram post"
                    : contentType}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {isLoading ? (
            <div className="space-y-6">
              <GenerationProgress />
              <OutputSkeleton />
            </div>
          ) : error ? (
            <GenerationError message={error} onRetry={generate} />
          ) : (
            <OutputPanel
              key={`${contentType}-${generatedContent ? "generated" : "empty"}`}
              content={generatedContent}
              projectId={selectedProjectId}
              researchId={researchId}
              plannerId={plannerId}
              visualPromptId={visualPromptId}
              carouselPlanId={carouselPlanId}
              postPlanId={postPlanId}
              storyPlanId={storyPlanId}
              reelPlanId={reelPlanId}
              prompt={sourceValue}
              contentType={contentType}
              tone={tone}
              creativity={creativity}
              onRegenerate={generate}
              onClear={clearGeneratedContent}
              onExampleSelect={(topic) => {
                setSourceType("topic")
                handleSourceValueChange("topic", topic)
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function GenerationError({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-destructive/10 text-destructive">
              <AlertCircle className="size-5" />
            </span>

            <div>
              <CardTitle>Generation unavailable</CardTitle>

              <CardDescription className="mt-1">
                {message}
              </CardDescription>
            </div>
          </div>

          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry} className="shrink-0">
              Try again
            </Button>
          )}
        </div>
      </CardHeader>
    </Card>
  )
}