import { Palette, Plus } from "lucide-react"

import { EmptyState } from "@/components/dashboard/empty-state"
import { PageHeader } from "@/components/dashboard/page-header"
import { Button } from "@/components/ui/button"

export default function BrandKitPage() { return <div className="space-y-8"><PageHeader title="Brand Kit" description="Give AI the guardrails it needs to make every creation feel on-brand." action={<Button><Plus />Add brand</Button>} /><EmptyState icon={Palette} title="Build your brand foundation" description="Add your logo, colors, typography, and voice. Your brand kit will be available in every new creation." action={<Button variant="outline"><Plus />Set up brand kit</Button>} /></div> }
