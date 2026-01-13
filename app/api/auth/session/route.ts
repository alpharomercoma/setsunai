import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getSession()
    return NextResponse.json({ session })
  } catch (error) {
    console.error("Session error:", error)
    return NextResponse.json({ session: null })
  }
}
