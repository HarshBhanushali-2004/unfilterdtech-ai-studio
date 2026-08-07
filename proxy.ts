import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { ACCESS_COOKIE_NAME, verifyAccessCookie } from "@/app/api/access/cookie"

/**
 * Private beta password gate.
 *
 * Next.js 16 renamed the `middleware.ts` convention to `proxy.ts` (same
 * behavior, new file/function name — see AGENTS.md and
 * node_modules/next/dist/docs/.../file-conventions/proxy.md). This file is
 * that convention's entry point.
 *
 * Isolated on purpose: this file, app/access, app/api/access, and
 * app/api/logout are the entire gate. Deleting all four (and unsetting
 * SITE_PASSWORD/COOKIE_SECRET) makes the app public again.
 */

const PUBLIC_PATHS = new Set([
  "/access",
  "/api/access",
  "/api/logout",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
])

const PUBLIC_PREFIXES = ["/_next/", "/images/", "/fonts/", "/public/"]

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export function proxy(request: NextRequest) {
  // Dev must behave exactly as it does today — no password, ever.
  if (process.env.NODE_ENV === "development") {
    return NextResponse.next()
  }

  const { pathname } = request.nextUrl

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  const cookie = request.cookies.get(ACCESS_COOKIE_NAME)?.value

  if (verifyAccessCookie(cookie)) {
    return NextResponse.next()
  }

  const accessUrl = new URL("/access", request.url)
  return NextResponse.redirect(accessUrl)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
