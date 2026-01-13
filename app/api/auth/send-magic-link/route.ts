import { NextResponse } from "next/server"
import { createMagicToken, redis } from "@/lib/auth"
import { headers } from "next/headers"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 })
    }

    // Rate limiting: max 3 requests per email per 5 minutes
    const rateLimitKey = `setsunai:ratelimit:magic:${email}`
    const attempts = await redis.incr(rateLimitKey)
    if (attempts === 1) {
      await redis.expire(rateLimitKey, 300)
    }
    if (attempts > 3) {
      return NextResponse.json({ error: "Too many requests. Please wait a few minutes." }, { status: 429 })
    }

    // Create magic link token
    const token = await createMagicToken(email)

    // Build the magic link URL
    const headersList = await headers()
    const host = headersList.get("host") || "localhost:3000"
    const protocol = headersList.get("x-forwarded-proto") || "http"
    const baseUrl = `${protocol}://${host}`
    const magicLink = `${baseUrl}/auth/verify?email=${encodeURIComponent(email)}&token=${token}`

    // Log the magic link for development
    console.log(`\n========================================`)
    console.log(`Magic Link for ${email}:`)
    console.log(magicLink)
    console.log(`========================================\n`)

    // Try to send email if Resend is configured
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import("resend")
        const resend = new Resend(process.env.RESEND_API_KEY)

        await resend.emails.send({
          from: process.env.EMAIL_FROM || "Setsunai <noreply@resend.dev>",
          to: email,
          subject: "Sign in to Setsunai",
          html: `
            <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
              <h2 style="text-align: center; color: #333;">Sign in to Setsunai</h2>
              <p style="color: #666; text-align: center;">Click the button below to sign in to your account.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${magicLink}" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Sign In
                </a>
              </div>
              <p style="color: #999; font-size: 12px; text-align: center;">
                This link expires in 15 minutes. If you didn't request this, you can ignore this email.
              </p>
            </div>
          `,
        })
      } catch (emailError) {
        console.error("Failed to send email:", emailError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Magic link error:", error)
    return NextResponse.json({ error: "Failed to send magic link" }, { status: 500 })
  }
}
