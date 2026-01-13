import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { getOrCreateUser, createToken, setSessionCookie, updateUserData } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const error = searchParams.get("error")

    if (error || !code) {
      return NextResponse.redirect(new URL("/?error=google_auth_failed", request.url))
    }

    const headersList = await headers()
    const host = headersList.get("host") || "localhost:3000"
    const protocol = headersList.get("x-forwarded-proto") || "http"
    const baseUrl = `${protocol}://${host}`
    const redirectUri = `${baseUrl}/api/auth/google/callback`

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    })

    const tokens = await tokenResponse.json()

    if (!tokens.access_token) {
      return NextResponse.redirect(new URL("/?error=google_token_failed", request.url))
    }

    // Get user info
    const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })

    const googleUser = await userResponse.json()

    if (!googleUser.email) {
      return NextResponse.redirect(new URL("/?error=google_email_missing", request.url))
    }

    // Get or create user
    const { id: userId, isNew } = await getOrCreateUser(googleUser.email, googleUser.name)

    // Update name if it's from Google and user is new
    if (isNew && googleUser.name) {
      await updateUserData(userId, { name: googleUser.name })
    }

    // Create session token
    const sessionToken = await createToken({ id: userId, email: googleUser.email })

    // Set session cookie
    await setSessionCookie(sessionToken)

    // Redirect based on whether user needs to set up PIN
    return NextResponse.redirect(new URL("/", request.url))
  } catch (error) {
    console.error("Google callback error:", error)
    return NextResponse.redirect(new URL("/?error=google_auth_error", request.url))
  }
}
