import Link from "next/link"
import { FolderKanban, Plus } from "lucide-react"

import { EmptyState } from "@/components/dashboard/empty-state"
import { PageHeader } from "@/components/dashboard/page-header"
import { Button } from "@/components/ui/button"

export default function ProjectsPage() { return <div className="space-y-8"><PageHeader title="Projects" description="Organize every campaign, idea, and creation in one place." action={<Button><Plus />New project</Button>} /><EmptyState icon={FolderKanban} title="Your projects will live here" description="Create a project to group related AI creations, drafts, and brand direction together." action={<Button asChild variant="outline"><Link href="/studio"><Plus />Create your first project</Link></Button>} /></div> }
