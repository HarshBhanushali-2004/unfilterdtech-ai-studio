import { Bell, ImageIcon, Monitor, Palette, UserRound } from "lucide-react"

import { PageHeader } from "@/components/dashboard/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  IMAGE_PROVIDER_NAMES,
  getActiveImageProviderName,
  getRegisteredImageProviderNames,
} from "@/lib/ai/image-providers"

const IMAGE_PROVIDER_LABELS: Record<string, string> = {
  gemini: "Google Gemini / Imagen",
  flux: "HuggingFace FLUX",
  openai: "OpenAI Images",
  "stable-diffusion": "Stable Diffusion",
  "local-flux": "Local FLUX",
}

export default function SettingsPage() { const rows = [{ icon: UserRound, title: "Profile", text: "Manage your name and workspace details." }, { icon: Palette, title: "Appearance", text: "Use the theme menu in the top bar to select light, dark, or system." }, { icon: Bell, title: "Notifications", text: "Receive updates when your creations are ready.", toggle: true }, { icon: Monitor, title: "Desktop experience", text: "Keep your dashboard preferences in sync.", toggle: true }]; const activeImageProvider = getActiveImageProviderName(); const registeredImageProviders = getRegisteredImageProviderNames(); return <div className="space-y-8"><PageHeader title="Settings" description="Manage your workspace preferences and account." /><Card><CardHeader><CardTitle>Workspace preferences</CardTitle><CardDescription>These settings apply to your personal AI Studio workspace.</CardDescription></CardHeader><CardContent className="divide-y">{rows.map(({ icon: Icon, title, text, toggle }) => <div key={title} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"><span className="grid size-9 place-items-center rounded-lg bg-muted"><Icon className="size-4 text-muted-foreground" /></span><div className="flex-1"><p className="text-sm font-medium">{title}</p><p className="mt-0.5 text-sm text-muted-foreground">{text}</p></div>{toggle && <Switch defaultChecked />}</div>)}</CardContent></Card>

    <Card>
      <CardHeader>
        <CardTitle>AI Image Provider</CardTitle>
        <CardDescription>
          Which Image Provider generates the images behind your Visual Assets. Configured via the{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">IMAGE_PROVIDER</code> environment variable.
        </CardDescription>
      </CardHeader>
      <CardContent className="divide-y">
        {IMAGE_PROVIDER_NAMES.map((name) => {
          const isActive = name === activeImageProvider
          const isRegistered = registeredImageProviders.includes(name)
          return (
            <div key={name} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
              <span className="grid size-9 place-items-center rounded-lg bg-muted">
                <ImageIcon className="size-4 text-muted-foreground" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium">{IMAGE_PROVIDER_LABELS[name] ?? name}</p>
              </div>
              {isActive ? (
                <Badge className="bg-violet-600 text-white">Active</Badge>
              ) : isRegistered ? (
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                  Available
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  Coming soon
                </Badge>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  </div> }
