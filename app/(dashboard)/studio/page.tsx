import { Suspense } from "react"

import { StudioWorkspace } from "@/components/ai-studio/studio-workspace"
import { PageHeader } from "@/components/dashboard/page-header"

export default function StudioPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="AI Studio"
        description="Turn a topic, source, or reference into content that is ready to refine and share."
      />

      <Suspense fallback={<div>Loading AI Studio...</div>}>
        <StudioWorkspace />
      </Suspense>
    </div>
  )
}