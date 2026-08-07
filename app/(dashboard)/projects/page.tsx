import Link from "next/link";
import { FolderKanban, Plus } from "lucide-react";

import { prisma } from "@/lib/prisma";

import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/dashboard/empty-state";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { ProjectsGrid } from "@/components/projects/projects-grid";

// Without this, Next statically prerenders this page at build time (no
// dynamic API/searchParams usage for Next to infer freshness from) — in
// production, newly created/edited/deleted projects then silently fail to
// show up until the next full rebuild, even though `router.refresh()` is
// called correctly on every mutation. Matches the pattern already used on
// `/` and `/history`.
export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    include: {
      brandKit: {
        select: {
          id: true,
          name: true,
        },
      },

      _count: {
        select: {
          creations: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Projects"
        description="Organize every campaign, idea, and creation in one place."
        action={<CreateProjectDialog />}
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Your projects will live here"
          description="Create a project to group related AI creations."
          action={
            <Button asChild>
              <Link href="/studio">
                <Plus className="mr-2 h-4 w-4" />
                Create your first project
              </Link>
            </Button>
          }
        />
      ) : (
        <ProjectsGrid
          projects={projects.map((project) => ({
            id: project.id,
            name: project.name,
            description: project.description,
            color: project.color ?? "#7C3AED",
            brandKit: project.brandKit,
            creations: project._count.creations,
            createdAt: project.createdAt.toISOString(),
            updatedAt: project.updatedAt.toISOString(),
          }))}
        />
      )}
    </div>
  );
}