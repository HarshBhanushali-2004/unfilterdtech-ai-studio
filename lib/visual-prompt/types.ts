import type { PlannerObject } from "@/lib/ai/planner-schemas"
import type { ResearchObject } from "@/lib/ai/research-schemas"

export type VisualPromptInput = {
  plannerId: string
  planner: PlannerObject
  research: ResearchObject
  brandKitId: string | null
  brandContext: string
}
