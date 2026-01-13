import { NextResponse } from "next/server"
import { headers } from "next/headers"

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID

  if (!clientId) {
    return NextResponse.json({ error: "Google auth not configured" }, { status: 500 })
  }

  const headersList = await headers()
  const host = headersList.get("host") || "localhost:3000"
  const protocol = headersList.get("x-forwarded-proto") || "http"
  const baseUrl = `${protocol}://${host}`
  const redirectUri = `${baseUrl}/api/auth/google/callback`

  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  googleAuthUrl.searchParams.set("client_id", clientId)
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri)
  googleAuthUrl.searchParams.set("response_type", "code")
  googleAuthUrl.searchParams.set("scope", "openid email profile")
  googleAuthUrl.searchParams.set("access_type", "offline")
  googleAuthUrl.searchParams.set("prompt", "consent")

  return NextResponse.redirect(googleAuthUrl.toString())
}
