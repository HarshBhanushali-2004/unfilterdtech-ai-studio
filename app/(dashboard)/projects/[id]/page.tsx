import Link from "next/link";
import { ArrowLeft, Plus, Pencil } from "lucide-react";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
  });

  if (!project) {
    notFound();
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <Link
        href="/projects"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Projects
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div
            className="h-6 w-6 rounded-full"
            style={{ backgroundColor: project.color }}
          />

          <div>
            <h1 className="text-4xl font-bold tracking-tight">
              {project.name}
            </h1>

            <p className="text-muted-foreground">
              {project.description || "No description"}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline">
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>

          <Button asChild>
          <Link href={`/studio?project=${project.id}`}>
            <Plus className="mr-2 h-4 w-4" />
            New Creation
          </Link>
        </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border p-6">
          <p className="text-sm text-muted-foreground">
            Total Creations
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            0
          </h2>
        </div>

        <div className="rounded-xl border p-6">
          <p className="text-sm text-muted-foreground">
            Posts
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            0
          </h2>
        </div>

        <div className="rounded-xl border p-6">
          <p className="text-sm text-muted-foreground">
            Carousels
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            0
          </h2>
        </div>

        <div className="rounded-xl border p-6">
          <p className="text-sm text-muted-foreground">
            Reels
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            0
          </h2>
        </div>
      </div>

      {/* Recent creations */}
      <div className="rounded-2xl border p-12 text-center">
        <h2 className="text-2xl font-semibold">
          No creations yet
        </h2>

        <p className="mt-2 text-muted-foreground">
          Generate your first AI content for this project.
        </p>

        <Button asChild className="mt-6">
        <Link href={`/studio?project=${project.id}`}>
          <Plus className="mr-2 h-4 w-4" />
          Generate Content
        </Link>
      </Button>
      </div>
    </div>
  );
}