import type { LucideIcon } from "lucide-react"

export type SourceType = "topic" | "text" | "url"
export type ContentType = "post" | "carousel" | "story" | "reel"
export type OutputTab = "caption" | "carousel" | "story" | "reel"

export type SourceOption = {
  value: SourceType
  label: string
  description: string
  icon: LucideIcon
}

export type ContentOption = {
  value: ContentType
  label: string
  description: string
  icon: LucideIcon
}
