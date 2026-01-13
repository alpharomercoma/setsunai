import { NextResponse } from "next/server"
import { getSession, getUserData } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getSession()

    if (!session?.user?.id) {
      return NextResponse.json({ authenticated: false })
    }

    const userData = await getUserData(session.user.id)

    return NextResponse.json({
      authenticated: true,
      hasPin: !!userData?.pinHash,
      name: userData?.name || "",
      email: session.user.email,
    })
  } catch (error) {
    console.error("User status error:", error)
    return NextResponse.json({ authenticated: false })
  }
}
