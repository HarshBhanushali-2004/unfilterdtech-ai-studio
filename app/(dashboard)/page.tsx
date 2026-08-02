import Link from "next/link"
import {
  ArrowRight,
  Clock3,
  FolderKanban,
  FolderPlus,
  ImageIcon,
  Images,
  Layers,
  Palette,
  PlaySquare,
  Sparkles,
  WandSparkles,
} from "lucide-react"

import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/dashboard/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatRelativeTime } from "@/lib/format-date"

export const dynamic = "force-dynamic"

const contentTypeLabels: Record<string, string> = {
  POST: "Instagram post",
  CAROUSEL: "Carousel",
  STORY: "Story",
  REEL: "Reel",
}

export default async function DashboardPage() {
  const [
    totalCreations,
    totalProjects,
    totalBrandKits,
    postCount,
    carouselCount,
    storyCount,
    reelCount,
    recentCreations,
    recentProjects,
  ] = await Promise.all([
    prisma.creation.count(),
    prisma.project.count(),
    prisma.brandKit.count(),
    prisma.creation.count({ where: { contentType: "POST" } }),
    prisma.creation.count({ where: { contentType: "CAROUSEL" } }),
    prisma.creation.count({ where: { contentType: "STORY" } }),
    prisma.creation.count({ where: { contentType: "REEL" } }),
    prisma.creation.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { project: { select: { name: true } } },
    }),
    prisma.project.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { creations: true } } },
    }),
  ])

  const stats = [
    { label: "Total creations", value: totalCreations, icon: Sparkles },
    { label: "Projects", value: totalProjects, icon: FolderKanban },
    { label: "Brand Kits", value: totalBrandKits, icon: Palette },
  ]

  const contentTypeStats = [
    { label: "Posts", value: postCount, icon: ImageIcon },
    { label: "Carousels", value: carouselCount, icon: Images },
    { label: "Stories", value: storyCount, icon: Layers },
    { label: "Reels", value: reelCount, icon: PlaySquare },
  ]

  const quickActions = [
    {
      label: "Generate content",
      description: "Start a new AI creation",
      href: "/studio",
      icon: WandSparkles,
    },
    {
      label: "New project",
      description: "Organize your next campaign",
      href: "/projects",
      icon: FolderPlus,
    },
    {
      label: "New Brand Kit",
      description: "Define a new brand voice",
      href: "/brand-kit",
      icon: Palette,
    },
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        title="Good morning, Harsh"
        description="Here’s what’s happening in your creative workspace."
        action={
          <Button asChild className="bg-violet-600 text-white hover:bg-violet-700">
            <Link href="/studio">
              <WandSparkles />
              Create with AI
            </Link>
          </Button>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        {stats.map(({ icon: Icon, ...stat }) => (
          <Card key={stat.label} className="gap-3 transition-shadow hover:shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardDescription>{stat.label}</CardDescription>
                <span className="grid size-8 place-items-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-300">
                  <Icon className="size-4" />
                </span>
              </div>
              <CardTitle className="text-3xl">{stat.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {contentTypeStats.map(({ icon: Icon, ...stat }) => (
          <Card key={stat.label} className="gap-2 transition-shadow hover:shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardDescription>{stat.label}</CardDescription>
                <span className="grid size-7 place-items-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
                  <Icon className="size-3.5" />
                </span>
              </div>
              <CardTitle className="text-2xl">{stat.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          Quick actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {quickActions.map((action) => (
            <Link key={action.label} href={action.href}>
              <Card className="h-full transition-all hover:border-primary/40 hover:shadow-md">
                <CardContent className="flex items-center gap-3 py-2">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-700 text-white">
                    <action.icon className="size-4.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{action.label}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent creations</CardTitle>
                <CardDescription className="mt-1">
                  Pick up where you left off.
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/history">
                  View all <ArrowRight />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentCreations.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <span className="grid size-10 place-items-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
                  <Sparkles className="size-5" />
                </span>
                <p className="text-sm text-muted-foreground">
                  No creations yet. Generate your first one in AI Studio.
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link href="/studio">Generate content</Link>
                </Button>
              </div>
            ) : (
              recentCreations.map((creation) => (
                <Link
                  key={creation.id}
                  href={`/creations/${creation.id}`}
                  className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-muted"
                >
                  <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-700">
                    <ImageIcon className="size-5 text-white/90" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{creation.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {contentTypeLabels[creation.contentType] ?? creation.contentType}
                      {" · "}
                      {creation.project?.name ?? "No project"}
                    </p>
                  </div>
                  <Badge variant="secondary" className="hidden shrink-0 sm:inline-flex">
                    {formatRelativeTime(creation.createdAt)}
                  </Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent projects</CardTitle>
                <CardDescription className="mt-1">
                  Your latest workspaces.
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/projects">
                  View all <ArrowRight />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentProjects.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <span className="grid size-10 place-items-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
                  <FolderKanban className="size-5" />
                </span>
                <p className="text-sm text-muted-foreground">
                  No projects yet. Create one to organize your creations.
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link href="/projects">Create a project</Link>
                </Button>
              </div>
            ) : (
              recentProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-muted"
                >
                  <div
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: project.color ?? "#7C3AED" }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{project.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {project._count.creations} creation
                      {project._count.creations === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Badge variant="secondary" className="hidden shrink-0 sm:inline-flex">
                    <Clock3 className="mr-1 size-3" />
                    {formatRelativeTime(project.createdAt)}
                  </Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
