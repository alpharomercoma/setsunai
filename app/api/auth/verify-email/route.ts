import { NextResponse } from "next/server"
import { verifyMagicToken, getOrCreateUser, createToken, setSessionCookie } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const { email, token } = await request.json()

    if (!email || !token) {
      return NextResponse.json({ error: "Email and token required" }, { status: 400 })
    }

    // Verify the magic token
    const isValid = await verifyMagicToken(email, token)
    if (!isValid) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 401 })
    }

    // Get or create user
    const { id: userId, isNew } = await getOrCreateUser(email)

    // Create session token
    const sessionToken = await createToken({ id: userId, email })

    // Set session cookie
    await setSessionCookie(sessionToken)

    return NextResponse.json({ success: true, isNew, userId })
  } catch (error) {
    console.error("Verify email error:", error)
    return NextResponse.json({ error: "Verification failed" }, { status: 500 })
  }
}
