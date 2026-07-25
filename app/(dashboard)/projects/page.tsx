import Link from "next/link";
import { FolderKanban, Plus } from "lucide-react";

import { prisma } from "@/lib/prisma";

import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { ProjectCard } from "@/components/projects/project-card";

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    include: {
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
        <div className="rounded-xl border p-16 text-center">
          <FolderKanban className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />

          <h2 className="text-xl font-semibold">
            Your projects will live here
          </h2>

          <p className="mt-2 text-muted-foreground">
            Create a project to group related AI creations.
          </p>

          <Button asChild className="mt-6">
            <Link href="/studio">
              <Plus className="mr-2 h-4 w-4" />
              Create your first project
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              id={project.id}
              name={project.name}
              description={project.description}
              color={project.color ?? "#7C3AED"}
              creations={project._count.creations}
            />
          ))}
        </div>
      )}
    </div>
  );
}