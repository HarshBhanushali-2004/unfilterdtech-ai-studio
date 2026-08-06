import Link from "next/link";
import { ChevronRight } from "lucide-react";

type CreationBreadcrumbsProps = {
  /** Which top-level section this creation was reached through — resolved server-side by the Creation Details page (see its `resolveOrigin`), never guessed client-side. */
  origin: "projects" | "history";
  project: { id: string; name: string } | null;
  creationTitle: string;
};

function Crumb({
  href,
  children,
  current = false,
}: {
  href?: string;
  children: React.ReactNode;
  current?: boolean;
}) {
  const className = current
    ? "max-w-[280px] truncate text-foreground"
    : "max-w-[220px] truncate transition hover:text-foreground";

  if (!href || current) {
    return <span className={className}>{children}</span>;
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

/** Breadcrumb trail at the top of Creation Details — reflects wherever the user actually came from (Projects or History), matching the sidebar's active item. */
export function CreationBreadcrumbs({ origin, project, creationTitle }: CreationBreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-2 text-sm text-muted-foreground"
    >
      {origin === "projects" && project ? (
        <>
          <Crumb href="/projects">Projects</Crumb>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <Crumb href={`/projects/${project.id}`}>{project.name}</Crumb>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <Crumb current>{creationTitle}</Crumb>
        </>
      ) : (
        <>
          <Crumb href="/history">History</Crumb>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <Crumb current>{creationTitle}</Crumb>
        </>
      )}
    </nav>
  );
}
