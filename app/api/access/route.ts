import { NextResponse } from "next/server"

import {
  ACCESS_COOKIE_MAX_AGE_SECONDS,
  ACCESS_COOKIE_NAME,
  createAccessCookieValue,
  timingSafeStringEqual,
} from "./cookie"

export const runtime = "nodejs"

export async function POST(request: Request) {
  let password: unknown

  try {
    const body = await request.json()
    password = (body as { password?: unknown })?.password
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (typeof password !== "string" || password.length === 0) {
    return NextResponse.json({ error: "Password is required" }, { status: 400 })
  }

  const sitePassword = process.env.SITE_PASSWORD
  const cookieSecret = process.env.COOKIE_SECRET

  if (!sitePassword || !cookieSecret) {
    console.error("Access gate is misconfigured: SITE_PASSWORD or COOKIE_SECRET is missing")
    return NextResponse.json({ error: "Access is not configured" }, { status: 500 })
  }

  if (!timingSafeStringEqual(password, sitePassword)) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 })
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set({
    name: ACCESS_COOKIE_NAME,
    value: createAccessCookieValue(),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_COOKIE_MAX_AGE_SECONDS,
  })

  return response
}
