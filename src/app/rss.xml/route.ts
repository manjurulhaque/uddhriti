import { NextResponse } from "next/server"
import { getSiteUrl } from "@/lib/site"

export const revalidate = 3600

export async function GET() {
  const siteUrl = getSiteUrl()
  return NextResponse.redirect(`${siteUrl}/feed.xml`, {
    status: 308,
  })
}

