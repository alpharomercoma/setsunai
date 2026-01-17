import { authOptions, redis } from "@/lib/auth-options";
import { timingSafeEqual } from "@/lib/crypto";
import { type SessionWithId, UserPinDataSchema, safeParseJson } from "@/lib/types";
import { getServerSession } from "next-auth";
import { type NextRequest, NextResponse } from "next/server";

// Rate limiting constants
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 300; // 5 minutes in seconds

async function getUserPinData(userId: string) {
  const userData = await redis.get(`setsunai:user:${userId}:pin`);
  return safeParseJson(userData, UserPinDataSchema);
}

async function getRateLimitStatus(userId: string): Promise<{ attempts: number; locked: boolean; }> {
  const key = `setsunai:ratelimit:pin:${userId}`;
  const attempts = await redis.get(key);
  const count = typeof attempts === "number" ? attempts : parseInt(String(attempts) || "0", 10);
  return {
    attempts: count,
    locked: count >= MAX_ATTEMPTS,
  };
}

async function incrementRateLimit(userId: string): Promise<void> {
  const key = `setsunai:ratelimit:pin:${userId}`;
  await redis.incr(key);
  await redis.expire(key, LOCKOUT_DURATION);
}

async function resetRateLimit(userId: string): Promise<void> {
  const key = `setsunai:ratelimit:pin:${userId}`;
  await redis.del(key);
}

export async function POST(request: NextRequest) {
  try {
    const session = (await getServerSession(authOptions)) as SessionWithId | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const userId = session.user.id;

    // Check rate limiting
    const { locked } = await getRateLimitStatus(userId);
    if (locked) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait 5 minutes." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { pinHash } = body

    if (!pinHash || typeof pinHash !== "string") {
      return NextResponse.json({ error: "PIN hash is required" }, { status: 400 })
    }

    const userData = await getUserPinData(userId)

    if (!userData?.pinHash) {
      return NextResponse.json({ error: "PIN not set up" }, { status: 400 })
    }

    // Use timing-safe comparison to prevent timing attacks
    const isValid = timingSafeEqual(userData.pinHash, pinHash);

    if (!isValid) {
      // Increment failed attempts
      await incrementRateLimit(userId);
      return NextResponse.json({ valid: false });
    }

    // Reset rate limit on successful verification
    await resetRateLimit(userId);
    return NextResponse.json({ valid: true })
  } catch (error) {
    console.error("PIN verify error:", error)
    return NextResponse.json({ error: "Verification failed" }, { status: 500 })
  }
}
