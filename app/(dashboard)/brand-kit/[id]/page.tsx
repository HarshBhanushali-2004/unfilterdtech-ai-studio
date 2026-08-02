import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Globe, Sparkles, Type } from "lucide-react";

import { getBrandKit } from "@/lib/brand-kit/actions";
import { prisma } from "@/lib/prisma";
import { BrandKitDetailActions } from "@/components/brand-kit/brand-kit-detail-actions";
import { formatDate } from "@/lib/format-date";

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 text-sm leading-6">
        {value && value.trim() ? value : "Not set"}
      </p>
    </div>
  );
}

function ChipList({
  label,
  values,
  prefix,
}: {
  label: string;
  values: string[];
  prefix?: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {values.length === 0 ? (
        <p className="mt-1.5 text-sm text-muted-foreground">Not set</p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {values.map((value) => (
            <span
              key={value}
              className="rounded-full border bg-muted px-3 py-1 text-xs font-medium"
            >
              {prefix ? `${prefix}${value.replace(new RegExp(`^\\${prefix}`), "")}` : value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ColorSwatch({
  label,
  color,
}: {
  label: string;
  color: string | null;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-10 w-10 shrink-0 rounded-lg border shadow-sm"
        style={{ backgroundColor: color ?? "transparent" }}
      />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-mono">{color ?? "Not set"}</p>
      </div>
    </div>
  );
}

export default async function BrandKitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const brand = await getBrandKit(id);

  if (!brand) {
    notFound();
  }

  const recentCreations = await prisma.creation.findMany({
    where: { project: { brandKitId: id } },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { project: { select: { id: true, name: true } } },
  });

  return (
    <div className="space-y-8">
      <Link
        href="/brand-kit"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Brand Kit
      </Link>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">{brand.name}</h1>

          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {brand.industry && (
              <span className="rounded-full border px-3 py-1">
                {brand.industry}
              </span>
            )}
            {brand.language && (
              <span className="rounded-full border px-3 py-1">
                {brand.language}
              </span>
            )}
          </div>
        </div>

        <BrandKitDetailActions brand={brand} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Basic Information */}
        <div className="rounded-2xl border bg-card p-6">
          <h2 className="mb-5 text-lg font-semibold">Basic Information</h2>

          <div className="space-y-5">
            <InfoRow label="Brand Name" value={brand.name} />

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Website
              </p>
              {brand.website ? (
                <a
                  href={brand.website}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-violet-600 hover:underline dark:text-violet-300"
                >
                  <Globe className="h-3.5 w-3.5" />
                  {brand.website}
                </a>
              ) : (
                <p className="mt-1.5 text-sm text-muted-foreground">Not set</p>
              )}
            </div>

            <InfoRow label="Industry" value={brand.industry} />
            <InfoRow label="Description" value={brand.description} />
          </div>
        </div>

        {/* Brand Voice */}
        <div className="rounded-2xl border bg-card p-6">
          <h2 className="mb-5 text-lg font-semibold">Brand Voice</h2>

          <div className="space-y-5">
            <InfoRow label="Target Audience" value={brand.targetAudience} />
            <InfoRow label="Tone" value={brand.tone} />
            <InfoRow label="Writing Style" value={brand.writingStyle} />
            <InfoRow label="CTA Style" value={brand.ctaStyle} />
            <InfoRow label="Emoji Style" value={brand.emojiStyle} />
          </div>
        </div>

        {/* Keywords & Guidance */}
        <div className="rounded-2xl border bg-card p-6">
          <h2 className="mb-5 text-lg font-semibold">AI Guidance</h2>

          <div className="space-y-5">
            <ChipList label="Keywords" values={brand.keywords} />
            <ChipList label="Hashtags" values={brand.hashtags} prefix="#" />
            <ChipList label="Avoid Words" values={brand.avoidWords} />
          </div>
        </div>

        {/* Colors & Typography */}
        <div className="rounded-2xl border bg-card p-6">
          <h2 className="mb-5 text-lg font-semibold">Colors &amp; Typography</h2>

          <div className="space-y-5">
            <ColorSwatch label="Primary Color" color={brand.primaryColor} />
            <ColorSwatch label="Secondary Color" color={brand.secondaryColor} />
            <ColorSwatch label="Accent Color" color={brand.accentColor} />

            <div className="flex items-start gap-3 border-t pt-5">
              <Type className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Typography
                </p>
                <p className="mt-1.5 text-sm leading-6">
                  {brand.writingStyle
                    ? `Copy follows a "${brand.writingStyle}" writing style to keep every generated caption on-brand.`
                    : "No writing style set yet — add one to guide how AI-generated copy reads."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Creations */}
      <div className="rounded-2xl border bg-card p-6">
        <h2 className="mb-5 text-lg font-semibold">Recent Creations</h2>

        {recentCreations.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-10 text-center">
            <span className="grid size-10 place-items-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
              <Sparkles className="size-5" />
            </span>
            <p className="max-w-sm text-sm text-muted-foreground">
              No creations use this Brand Kit yet. Link a project to it, then
              generate content in AI Studio.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentCreations.map((creation) => (
              <Link
                key={creation.id}
                href={`/creations/${creation.id}`}
                className="flex items-center justify-between gap-3 rounded-xl p-3 transition-colors hover:bg-muted"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {creation.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {creation.project?.name ?? "No project"}
                    {" · "}
                    {formatDate(creation.createdAt)}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="flex flex-col gap-2 rounded-2xl border bg-muted/30 p-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>Created {formatDate(brand.createdAt)}</span>
        <span>Last updated {formatDate(brand.updatedAt)}</span>
      </div>
    </div>
  );
}
