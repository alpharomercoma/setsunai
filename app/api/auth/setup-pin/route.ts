import { type NextRequest, NextResponse } from "next/server"
import { getSession, updateUserData } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { name, pinHash } = await request.json()

    if (!pinHash) {
      return NextResponse.json({ error: "PIN required" }, { status: 400 })
    }

    // Update user data with PIN
    await updateUserData(session.user.id, {
      name: name || session.user.name || "User",
      pinHash,
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
