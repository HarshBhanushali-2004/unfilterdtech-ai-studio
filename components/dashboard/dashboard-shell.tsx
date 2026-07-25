"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import * as React from "react"
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FolderKanban,
  LayoutGrid,
  Menu,
  Moon,
  Palette,
  Plus,
  Search,
  Settings,
  Sparkles,
  Sun,
  UserRound,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const navigation = [
  { href: "/", label: "Overview", icon: LayoutGrid },
  { href: "/studio", label: "AI Studio", icon: Sparkles },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/history", label: "History", icon: Clock3 },
  { href: "/brand-kit", label: "Brand Kit", icon: Palette },
]

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20">
        <Bot className="size-5" />
      </span>
      {!compact && (
        <span className="min-w-0 leading-tight">
          <span className="block font-semibold tracking-tight">unfilterd</span>
          <span className="block text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase">AI Studio</span>
        </span>
      )}
    </Link>
  )
}

function SidebarContent({ compact = false, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-18 items-center px-4", compact && "justify-center px-2")}>
        <Brand compact={compact} />
      </div>
      <div className="px-3 py-4">
        {!compact && <p className="mb-2 px-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Workspace</p>}
        <nav className="space-y-1" aria-label="Main navigation">
          {navigation.map((item) => {
            const active = pathname === item.href
            const link = (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  active && "bg-violet-500/10 text-violet-700 dark:text-violet-300",
                  compact && "justify-center px-0"
                )}
              >
                <item.icon className="size-4 shrink-0" />
                {!compact && <span>{item.label}</span>}
              </Link>
            )
            return compact ? (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            ) : link
          })}
        </nav>
      </div>
      <div className="mt-auto p-3">
        <Link
          href="/settings"
          onClick={onNavigate}
          className={cn(
            "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            pathname === "/settings" && "bg-violet-500/10 text-violet-700 dark:text-violet-300",
            compact && "justify-center px-0"
          )}
        >
          <Settings className="size-4 shrink-0" />
          {!compact && <span>Settings</span>}
        </Link>
        {!compact && <div className="mt-3 rounded-xl bg-gradient-to-br from-violet-500/15 to-indigo-500/10 p-3"><p className="text-xs font-semibold">Ready to create?</p><p className="mt-1 text-[11px] leading-4 text-muted-foreground">Turn your next idea into content.</p><Button asChild size="sm" className="mt-3 w-full bg-violet-600 text-white hover:bg-violet-700"><Link href="/studio"><Plus />New creation</Link></Button></div>}
      </div>
    </div>
  )
}

function ThemeMenu() {
  const { setTheme } = useTheme()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Change theme"><Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" /><Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end"><DropdownMenuLabel>Appearance</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem onClick={() => setTheme("light")}><Sun />Light</DropdownMenuItem><DropdownMenuItem onClick={() => setTheme("dark")}><Moon />Dark</DropdownMenuItem><DropdownMenuItem onClick={() => setTheme("system")}><Settings />System</DropdownMenuItem></DropdownMenuContent>
    </DropdownMenu>
  )
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false)
  const [mobileOpen, setMobileOpen] = React.useState(false)

  return (
    <div className="min-h-screen bg-muted/35">
      <aside className={cn("fixed inset-y-0 left-0 z-30 hidden border-r bg-background transition-[width] duration-200 lg:block", collapsed ? "w-16" : "w-64")}>
        <SidebarContent compact={collapsed} />
        <Button variant="outline" size="icon-xs" className="absolute top-6 -right-3 z-10 rounded-full bg-background" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>{collapsed ? <ChevronRight /> : <ChevronLeft />}</Button>
      </aside>
      <div className={cn("min-h-screen transition-[margin] duration-200", collapsed ? "lg:ml-16" : "lg:ml-64")}>
          <header className="sticky top-0 z-50 flex h-18 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur lg:px-8">          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}><SheetTrigger asChild><Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation"><Menu /></Button></SheetTrigger><SheetContent side="left" showCloseButton={false} className="w-72 p-0"><SidebarContent onNavigate={() => setMobileOpen(false)} /></SheetContent></Sheet>
          <div className="relative hidden max-w-md flex-1 sm:block"><Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="h-9 bg-muted/50 pl-9 shadow-none" placeholder="Search projects, creations..." /></div>
          <div className="ml-auto flex items-center gap-1"><Button asChild size="sm" className="hidden bg-violet-600 text-white hover:bg-violet-700 sm:inline-flex"><Link href="/studio"><Plus />Create</Link></Button><ThemeMenu /><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="ml-1 rounded-full"><Avatar className="size-7"><AvatarFallback className="bg-violet-100 text-xs font-semibold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">HB</AvatarFallback></Avatar></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-48"><DropdownMenuLabel><p>Harsh Bhanushali</p><p className="font-normal text-muted-foreground">Creator workspace</p></DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem><UserRound />Profile</DropdownMenuItem><DropdownMenuItem asChild><Link href="/settings"><Settings />Settings</Link></DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  )
}
