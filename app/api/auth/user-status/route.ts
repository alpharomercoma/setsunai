import { NextResponse } from "next/server"
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

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as SessionWithId | null

    if (!session?.user?.id) {
      return NextResponse.json({ authenticated: false })
    }

    const userData = await getUserPinData(session.user.id)

    return NextResponse.json({
      authenticated: true,
      hasPin: !!userData?.pinHash,
      name: userData?.name || session.user.name || "",
      email: session.user.email || "",
      userId: session.user.id,
    })
  } catch (error) {
    console.error("User status error:", error)
    return NextResponse.json({ authenticated: false })
  }
}
