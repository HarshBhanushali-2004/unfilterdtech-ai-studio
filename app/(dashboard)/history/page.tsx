import { Clock3, Sparkles } from "lucide-react"
import Link from "next/link"

import { prisma } from "@/lib/prisma"
import { EmptyState } from "@/components/dashboard/empty-state"
import { PageHeader } from "@/components/dashboard/page-header"
import { Button } from "@/components/ui/button"
import { HistoryPageClient } from "@/components/history/history-page-client"

export const dynamic = "force-dynamic"

export default async function HistoryPage() {
  const [creations, projects] = await Promise.all([
    prisma.creation.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            brandKit: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.project.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])

  return (
    <div className="space-y-8">
      <PageHeader
        title="History"
        description="All your generated content, in one searchable archive."
      />

      {creations.length === 0 ? (
        <EmptyState
          icon={Clock3}
          title="No creation history yet"
          description="Your finished AI creations will appear here, ready to revisit, duplicate, or export."
          action={
            <Button asChild>
              <Link href="/studio">
                <Sparkles />
                Create something
              </Link>
            </Button>
          }
        />
      ) : (
        <HistoryPageClient
          creations={creations.map((creation) => ({
            id: creation.id,
            title: creation.title,
            contentType: creation.contentType,
            createdAt: creation.createdAt.toISOString(),
            project: creation.project,
          }))}
          projects={projects}
        />
      )}
    </div>
  )
}
