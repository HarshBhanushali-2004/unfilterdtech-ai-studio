import Link from "next/link"
import { Clock3, Sparkles } from "lucide-react"

import { EmptyState } from "@/components/dashboard/empty-state"
import { PageHeader } from "@/components/dashboard/page-header"
import { Button } from "@/components/ui/button"

export default function HistoryPage() { return <div className="space-y-8"><PageHeader title="History" description="All your generated content, in one searchable archive." /><EmptyState icon={Clock3} title="No creation history yet" description="Your finished AI creations will appear here, ready to revisit, duplicate, or export." action={<Button asChild><Link href="/studio"><Sparkles />Create something</Link></Button>} /></div> }
