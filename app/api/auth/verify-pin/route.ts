import { type NextRequest, NextResponse } from "next/server"
import { getSession, getUserData } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { pinHash } = await request.json()
    const userData = await getUserData(session.user.id)

    if (!userData?.pinHash) {
      return NextResponse.json({ error: "PIN not set up" }, { status: 400 })
    }

    const isValid = userData.pinHash === pinHash

    return NextResponse.json({ valid: isValid })
  } catch (error) {
    console.error("PIN verify error:", error)
    return NextResponse.json({ error: "Verification failed" }, { status: 500 })
  }
}
