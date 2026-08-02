"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Clock, FileText, FolderKanban, Loader2, Search, X } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type SearchResults = {
  projects: { id: string; name: string }[]
  creations: { id: string; title: string; contentType: string }[]
}

type FlatResult =
  | { kind: "project"; id: string; label: string; href: string }
  | { kind: "creation"; id: string; label: string; href: string }

const EMPTY_RESULTS: SearchResults = { projects: [], creations: [] }
const RECENT_SEARCHES_KEY = "unfilterd:recent-searches"
const MAX_RECENT = 5

function loadRecentSearches(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : []
  } catch {
    return []
  }
}

function saveRecentSearch(query: string) {
  if (typeof window === "undefined") return
  const trimmed = query.trim()
  if (!trimmed) return

  const current = loadRecentSearches().filter(
    (item) => item.toLowerCase() !== trimmed.toLowerCase()
  )
  const next = [trimmed, ...current].slice(0, MAX_RECENT)

  window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next))
}

/** Renders `text` with the portions matching `query` wrapped in <mark>. */
function HighlightedText({ text, query }: { text: string; query: string }) {
  const trimmed = query.trim()
  if (!trimmed) return <>{text}</>

  const lower = text.toLowerCase()
  const lowerQuery = trimmed.toLowerCase()
  const index = lower.indexOf(lowerQuery)

  if (index === -1) return <>{text}</>

  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded-sm bg-violet-500/25 text-inherit">
        {text.slice(index, index + trimmed.length)}
      </mark>
      {text.slice(index + trimmed.length)}
    </>
  )
}

export function GlobalSearch() {
  const router = useRouter()
  const containerRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<SearchResults>(EMPTY_RESULTS)
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [activeIndex, setActiveIndex] = React.useState(0)
  const [recentSearches, setRecentSearches] = React.useState<string[]>([])

  React.useEffect(() => {
    // localStorage is only available after mount; hydrating here (rather
    // than in the initial state) avoids an SSR/client markup mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecentSearches(loadRecentSearches())
  }, [])

  React.useEffect(() => {
    const trimmed = query.trim()

    if (!trimmed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults(EMPTY_RESULTS)
      setLoading(false)
      return
    }

    let ignore = false

    setLoading(true)

    const timeout = setTimeout(async () => {
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets keyboard selection whenever the result set changes
    setActiveIndex(0)
  }, [query, results])

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const flatResults = React.useMemo<FlatResult[]>(() => {
    return [
      ...results.projects.map((project) => ({
        kind: "project" as const,
        id: project.id,
        label: project.name,
        href: `/projects/${project.id}`,
      })),
      ...results.creations.map((creation) => ({
        kind: "creation" as const,
        id: creation.id,
        label: creation.title,
        href: `/creations/${creation.id}`,
      })),
    ]
  }, [results])

  const trimmedQuery = query.trim()
  const hasResults = flatResults.length > 0
  const showingRecent = !trimmedQuery && recentSearches.length > 0
  const showDropdown = open && (trimmedQuery.length > 0 || showingRecent)

  function goTo(result: FlatResult) {
    saveRecentSearch(trimmedQuery)
    setRecentSearches(loadRecentSearches())
    setOpen(false)
    setQuery("")
    router.push(result.href)
  }

  function applyRecentSearch(value: string) {
    setQuery(value)
    inputRef.current?.focus()
  }

  function clearRecentSearches() {
    window.localStorage.removeItem(RECENT_SEARCHES_KEY)
    setRecentSearches([])
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false)
      inputRef.current?.blur()
      return
    }

    if (!showDropdown || !hasResults) return

    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActiveIndex((current) => (current + 1) % flatResults.length)
      return
    }

    if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveIndex((current) => (current - 1 + flatResults.length) % flatResults.length)
      return
    }

    if (event.key === "Enter") {
      event.preventDefault()
      const active = flatResults[activeIndex]
      if (active) goTo(active)
    }
  }

  return (
    <div ref={containerRef} className="relative hidden max-w-md flex-1 sm:block">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        className="h-9 bg-muted/50 pl-9 shadow-none"
        placeholder="Search projects, creations..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls="global-search-listbox"
        aria-autocomplete="list"
        aria-label="Search projects and creations"
      />
      {loading && (
        <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}

      {showDropdown && (
        <div
          id="global-search-listbox"
          role="listbox"
          className="absolute left-0 right-0 top-11 z-50 max-h-96 overflow-y-auto rounded-lg border bg-popover p-2 shadow-lg animate-in fade-in-0 zoom-in-95 duration-100"
        >
          {showingRecent ? (
            <div>
              <div className="flex items-center justify-between px-3 py-1">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Recent searches
                </p>
                <button
                  type="button"
                  onClick={clearRecentSearches}
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Clear
                </button>
              </div>
              {recentSearches.map((recent) => (
                <button
                  key={recent}
                  type="button"
                  onClick={() => applyRecentSearch(recent)}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                >
                  <Clock className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{recent}</span>
                </button>
              ))}
            </div>
          ) : loading ? (
            <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Searching...
            </div>
          ) : !hasResults ? (
            <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
              <span className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground">
                <X className="size-4" />
              </span>
              <p className="text-sm text-muted-foreground">
                No results for &ldquo;{trimmedQuery}&rdquo;
              </p>
            </div>
          ) : (
            <>
              {results.projects.length > 0 && (
                <div className="mb-2">
                  <p className="px-3 py-1 text-xs font-semibold uppercase text-muted-foreground">
                    Projects
                  </p>
                  {results.projects.map((project) => {
                    const flatIndex = flatResults.findIndex(
                      (r) => r.kind === "project" && r.id === project.id
                    )
                    return (
                      <button
                        key={project.id}
                        type="button"
                        role="option"
                        aria-selected={activeIndex === flatIndex}
                        onMouseEnter={() => setActiveIndex(flatIndex)}
                        onClick={() => goTo(flatResults[flatIndex])}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                          activeIndex === flatIndex && "bg-muted"
                        )}
                      >
                        <FolderKanban className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">
                          <HighlightedText text={project.name} query={trimmedQuery} />
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              {results.creations.length > 0 && (
                <div>
                  <p className="px-3 py-1 text-xs font-semibold uppercase text-muted-foreground">
                    Creations
                  </p>
                  {results.creations.map((creation) => {
                    const flatIndex = flatResults.findIndex(
                      (r) => r.kind === "creation" && r.id === creation.id
                    )
                    return (
                      <button
                        key={creation.id}
                        type="button"
                        role="option"
                        aria-selected={activeIndex === flatIndex}
                        onMouseEnter={() => setActiveIndex(flatIndex)}
                        onClick={() => goTo(flatResults[flatIndex])}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                          activeIndex === flatIndex && "bg-muted"
                        )}
                      >
                        <FileText className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">
                          <HighlightedText text={creation.title} query={trimmedQuery} />
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
