// src/middleware.ts

import { NextResponse } from "next/server"

export function middleware() {
  // No auth logic here.
  // Authentication is handled inside Server Components.
  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*"], // only run middleware for admin routes
}
