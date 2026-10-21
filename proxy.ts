// proxy.ts

import { NextResponse } from "next/server"

export function proxy() {
  // No auth logic here.
  // Authentication is handled inside Server Components.
  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*"], // only run proxy for admin routes
}
