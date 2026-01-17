import { authOptions, redis } from "@/lib/auth-options";
import { getServerSession } from "next-auth";
import { type NextRequest, NextResponse } from "next/server";

// Extended session type with user id
interface SessionWithId {
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  expires: string;
}

interface UserPinData {
  pinHash: string | null;
  createdAt: number;
  updatedAt?: number;
}

async function getUserPinData(userId: string): Promise<UserPinData | null> {
  const userData = await redis.get(`setsunai:user:${userId}:pin`);
  if (!userData) return null;
  if (typeof userData === "string") {
    try {
      return JSON.parse(userData) as UserPinData;
    } catch {
      return null;
    }
  }
  return userData as UserPinData;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as SessionWithId | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { pinHash } = await request.json()

    if (!pinHash || typeof pinHash !== "string") {
      return NextResponse.json({ error: "PIN hash is required" }, { status: 400 });
    }

    const userData = await getUserPinData(session.user.id)

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
