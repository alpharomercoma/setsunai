import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions, redis } from "@/lib/auth-options"

// Extended session type with user id
interface SessionWithId {
  user?: {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
  }
  expires: string
}

interface UserPinData {
  pinHash: string | null
  createdAt: number
  updatedAt?: number
  name?: string
}

async function getUserPinData(userId: string): Promise<UserPinData | null> {
  const userData = await redis.get(`setsunai:user:${userId}:pin`)
  if (!userData) return null
  if (typeof userData === "string") {
    try {
      return JSON.parse(userData) as UserPinData
    } catch {
      return null
    }
  }
  return userData as UserPinData
}

async function updateUserPinData(
  userId: string,
  data: { pinHash?: string; name?: string }
): Promise<UserPinData> {
  const existing = await getUserPinData(userId) || { pinHash: null, createdAt: Date.now() }
  const updated: UserPinData = {
    ...existing,
    ...data,
    updatedAt: Date.now(),
  }
  await redis.set(`setsunai:user:${userId}:pin`, JSON.stringify(updated))
  return updated
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as SessionWithId | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { name, pinHash } = await request.json()

    if (!pinHash || typeof pinHash !== "string") {
      return NextResponse.json({ error: "PIN hash is required" }, { status: 400 })
    }

    // Validate PIN hash format (should be base64 encoded SHA-256)
    if (pinHash.length < 20 || pinHash.length > 100) {
      return NextResponse.json({ error: "Invalid PIN hash format" }, { status: 400 })
    }

    // Update user PIN data
    await updateUserPinData(session.user.id, {
      pinHash,
      name: name || session.user.name || "User",
    })

    return NextResponse.json({
      success: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: name || session.user.name,
      },
    })
  } catch (error) {
    console.error("Setup PIN error:", error)
    return NextResponse.json({ error: "Setup failed" }, { status: 500 })
  }
}
