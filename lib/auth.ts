import { Redis } from "@upstash/redis"
import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"
import { randomUUID } from "crypto"

const redis = new Redis({
  url: process.env.KV_REST_API_URL || "",
  token: process.env.KV_REST_API_TOKEN || "",
})

const JWT_SECRET = new TextEncoder().encode(process.env.AUTH_SECRET || "setsunai-dev-secret-change-in-production")

export interface User {
  id: string
  email: string
  name: string | null
  hasPin: boolean
}

export interface Session {
  user: User
}

// Create a JWT token
export async function createToken(payload: { id: string; email: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET)
}

// Verify a JWT token
export async function verifyToken(token: string): Promise<{ id: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as { id: string; email: string }
  } catch {
    return null
  }
}

// Get current session from cookies
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("auth-token")?.value

  if (!token) return null

  const payload = await verifyToken(token)
  if (!payload) return null

  // Get user data from Redis
  const userData = await redis.get(`setsunai:user:${payload.id}:data`)
  if (!userData) return null

  const data = typeof userData === "string" ? JSON.parse(userData) : userData

  return {
    user: {
      id: payload.id,
      email: payload.email,
      name: data.name || null,
      hasPin: !!data.pinHash,
    },
  }
}

// Set session cookie
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set("auth-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: "/",
  })
}

// Clear session cookie
export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete("auth-token")
}

// Create magic link token
export async function createMagicToken(email: string): Promise<string> {
  const token = randomUUID()
  await redis.set(`setsunai:magic:${email}`, token, { ex: 900 }) // 15 min expiry
  return token
}

// Verify magic link token
export async function verifyMagicToken(email: string, token: string): Promise<boolean> {
  const storedToken = await redis.get(`setsunai:magic:${email}`)
  if (!storedToken || storedToken !== token) return false
  await redis.del(`setsunai:magic:${email}`)
  return true
}

// Get or create user by email
export async function getOrCreateUser(email: string, name?: string): Promise<{ id: string; isNew: boolean }> {
  const existingUserId = await redis.get(`setsunai:email:${email}`)

  if (existingUserId) {
    return { id: existingUserId as string, isNew: false }
  }

  const userId = randomUUID()
  await redis.set(`setsunai:email:${email}`, userId)
  await redis.set(
    `setsunai:user:${userId}:data`,
    JSON.stringify({
      email,
      name: name || null,
      pinHash: null,
      createdAt: Date.now(),
    }),
  )

  return { id: userId, isNew: true }
}

// Get user data
export async function getUserData(userId: string) {
  const userData = await redis.get(`setsunai:user:${userId}:data`)
  if (!userData) return null
  return typeof userData === "string" ? JSON.parse(userData) : userData
}

// Update user data
export async function updateUserData(userId: string, data: { name?: string; pinHash?: string }) {
  const existing = await getUserData(userId)
  const updated = {
    ...existing,
    ...data,
    updatedAt: Date.now(),
  }
  await redis.set(`setsunai:user:${userId}:data`, JSON.stringify(updated))
  return updated
}

export { redis }
