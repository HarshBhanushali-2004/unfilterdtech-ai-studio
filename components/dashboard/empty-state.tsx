import type { LucideIcon } from "lucide-react"

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: React.ReactNode }) {
  return <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed bg-card px-6 py-12 text-center"><span className="grid size-12 place-items-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-300"><Icon className="size-6" /></span><h2 className="mt-5 text-lg font-semibold">{title}</h2><p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>{action && <div className="mt-5">{action}</div>}</div>
}
