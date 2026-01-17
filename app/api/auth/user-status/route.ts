import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions, redis } from "@/lib/auth-options"
import { type SessionWithId, UserPinDataSchema, safeParseJson } from "@/lib/types"

async function getUserPinData(userId: string) {
  const userData = await redis.get(`setsunai:user:${userId}:pin`)
  return safeParseJson(userData, UserPinDataSchema)
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
