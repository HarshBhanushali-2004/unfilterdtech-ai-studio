"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { FileText, FolderKanban, Search } from "lucide-react"

import { Input } from "@/components/ui/input"

type SearchResults = {
  projects: { id: string; name: string }[]
  creations: { id: string; title: string; contentType: string }[]
}

const EMPTY_RESULTS: SearchResults = { projects: [], creations: [] }

export function GlobalSearch() {
  const router = useRouter()
  const containerRef = React.useRef<HTMLDivElement>(null)

  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<SearchResults>(EMPTY_RESULTS)
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    const trimmed = query.trim()

    if (!trimmed) {
      return
    }

    let ignore = false

    const timeout = setTimeout(async () => {
      setLoading(true)

      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`)
        if (!res.ok) throw new Error("Search failed")
        const data = (await res.json()) as SearchResults
        if (!ignore) setResults(data)
      } catch {
        if (!ignore) setResults(EMPTY_RESULTS)
      } finally {
        if (!ignore) setLoading(false)
      }
    }, 200)

    return () => {
      ignore = true
      clearTimeout(timeout)
    }
  }, [query])

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const hasResults = results.projects.length > 0 || results.creations.length > 0
  const showDropdown = open && query.trim().length > 0

  function goTo(href: string) {
    setOpen(false)
    setQuery("")
    router.push(href)
  }

  return (
    <div ref={containerRef} className="relative hidden max-w-md flex-1 sm:block">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        className="h-9 bg-muted/50 pl-9 shadow-none"
        placeholder="Search projects, creations..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
      />

      {showDropdown && (
        <div className="absolute left-0 right-0 top-11 z-50 max-h-96 overflow-y-auto rounded-lg border bg-popover p-2 shadow-lg">
          {loading ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">Searching...</p>
          ) : !hasResults ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              No results for &ldquo;{query}&rdquo;
            </p>
          ) : (
            <>
              {results.projects.length > 0 && (
                <div className="mb-2">
                  <p className="px-3 py-1 text-xs font-semibold uppercase text-muted-foreground">
                    Projects
                  </p>
                  {results.projects.map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => goTo(`/projects/${project.id}`)}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      <FolderKanban className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{project.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {results.creations.length > 0 && (
                <div>
                  <p className="px-3 py-1 text-xs font-semibold uppercase text-muted-foreground">
                    Creations
                  </p>
                  {results.creations.map((creation) => (
                    <button
                      key={creation.id}
                      type="button"
                      onClick={() => goTo(`/creations/${creation.id}`)}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{creation.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
