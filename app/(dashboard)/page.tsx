import Link from "next/link"
import { ArrowRight, CalendarDays, FileText, FolderKanban, ImageIcon, Sparkles, WandSparkles } from "lucide-react"

import { PageHeader } from "@/components/dashboard/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const stats = [
  { label: "Total creations", value: "24", detail: "+8 this month", icon: Sparkles },
  { label: "Active projects", value: "6", detail: "2 in progress", icon: FolderKanban },
  { label: "Saved drafts", value: "12", detail: "Ready to finish", icon: FileText },
]

const creations = [
  ["Product launch carousel", "Carousel", "2 hours ago", "from-violet-500 to-indigo-700"],
  ["The future of design", "Instagram post", "Yesterday", "from-amber-400 to-orange-600"],
  ["Creator economy trends", "Story", "Jul 18", "from-cyan-500 to-blue-700"],
]

export default function DashboardPage() {
  return <div className="space-y-8"><PageHeader title="Good morning, Harsh" description="Here’s what’s happening in your creative workspace." action={<Button asChild className="bg-violet-600 text-white hover:bg-violet-700"><Link href="/studio"><WandSparkles />Create with AI</Link></Button>} /><section className="grid gap-4 md:grid-cols-3">{stats.map(({ icon: Icon, ...stat }) => <Card key={stat.label} className="gap-3"><CardHeader><div className="flex items-center justify-between"><CardDescription>{stat.label}</CardDescription><span className="grid size-8 place-items-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-300"><Icon className="size-4" /></span></div><CardTitle className="text-3xl">{stat.value}</CardTitle></CardHeader><CardContent className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{stat.detail}</CardContent></Card>)}</section><section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]"><Card><CardHeader><div className="flex items-center justify-between"><div><CardTitle>Recent creations</CardTitle><CardDescription className="mt-1">Pick up where you left off.</CardDescription></div><Button asChild variant="ghost" size="sm"><Link href="/history">View all <ArrowRight /></Link></Button></div></CardHeader><CardContent className="space-y-3">{creations.map(([title, type, date, color]) => <Link key={title} href="/history" className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-muted"><div className={`grid size-12 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${color}`}><ImageIcon className="size-5 text-white/90" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{title}</p><p className="mt-0.5 text-xs text-muted-foreground">{type} · {date}</p></div><Badge variant="secondary" className="hidden sm:inline-flex">Published</Badge></Link>)}</CardContent></Card><Card className="bg-gradient-to-br from-violet-600 to-indigo-700 text-white ring-0"><CardHeader><span className="grid size-9 place-items-center rounded-lg bg-white/15"><CalendarDays className="size-5" /></span><CardTitle className="mt-3 text-white">Create with intention</CardTitle><CardDescription className="text-violet-100">Plan your next week of content and let AI help fill the gaps.</CardDescription></CardHeader><CardContent><Button asChild variant="secondary" className="bg-white text-violet-700 hover:bg-violet-50"><Link href="/projects">Open content planner <ArrowRight /></Link></Button></CardContent></Card></section></div>
}
