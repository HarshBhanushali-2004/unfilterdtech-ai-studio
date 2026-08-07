import { NextResponse } from "next/server"

import { ACCESS_COOKIE_NAME } from "../access/cookie"

export const runtime = "nodejs"

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.set({
    name: ACCESS_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })

  return response
}
