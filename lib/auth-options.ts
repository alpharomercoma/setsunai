import { UpstashRedisAdapter } from "@auth/upstash-redis-adapter";
import { Redis } from "@upstash/redis";
import type { NextAuthOptions } from "next-auth";
import type { AdapterUser } from "next-auth/adapters";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import { Resend } from "resend";

// Extended session user type for internal use
interface ExtendedSessionUser {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    hasPin?: boolean;
}

interface ExtendedSession {
    user: ExtendedSessionUser;
    expires: string;
}

// Initialize Redis client
const redis = new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!,
});

// Custom adapter that wraps Upstash adapter with our key prefix
const upstashAdapter = UpstashRedisAdapter(redis, {
    baseKeyPrefix: "setsunai:",
});

export const authOptions: NextAuthOptions = {
    adapter: upstashAdapter,
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID ?? "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
            allowDangerousEmailAccountLinking: true,
        }),
        EmailProvider({
            server: {
                host: "smtp.resend.com",
                port: 465,
                auth: {
                    user: "resend",
                    pass: process.env.RESEND_API_KEY ?? "",
                },
            },
            from: process.env.EMAIL_FROM ?? "Setsunai <noreply@resend.dev>",
            maxAge: 15 * 60, // 15 minutes
            async sendVerificationRequest({ identifier: email, url }) {
                // Use Resend API directly for better email delivery
                if (!process.env.RESEND_API_KEY) {
                    console.log(`\n========================================`);
                    console.log(`Magic Link for ${email}:`);
                    console.log(url);
                    console.log(`========================================\n`);
                    return;
                }

                try {
                    const resend = new Resend(process.env.RESEND_API_KEY);
                    await resend.emails.send({
                        from: process.env.EMAIL_FROM ?? "Setsunai <noreply@resend.dev>",
                        to: email,
                        subject: "Sign in to Setsunai",
                        html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 400px; margin: 0 auto; padding: 32px 20px;">
                <div style="text-align: center; margin-bottom: 32px;">
                  <h1 style="font-size: 24px; font-weight: 600; color: #18181b; margin: 0;">Setsunai</h1>
                  <p style="font-size: 14px; color: #71717a; margin: 8px 0 0;">Private Encrypted Thoughts</p>
                </div>
                <div style="background: #fafafa; border-radius: 12px; padding: 24px; text-align: center;">
                  <h2 style="font-size: 18px; font-weight: 500; color: #18181b; margin: 0 0 8px;">Sign in to your account</h2>
                  <p style="font-size: 14px; color: #52525b; margin: 0 0 24px;">Click the button below to sign in securely.</p>
                  <a href="${url}" style="display: inline-block; background: #18181b; color: #fff; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 14px;">
                    Sign In
                  </a>
                </div>
                <p style="font-size: 12px; color: #a1a1aa; text-align: center; margin: 24px 0 0;">
                  This link expires in 15 minutes. If you didn't request this, you can safely ignore this email.
                </p>
              </div>
            `,
                    });
                } catch (error) {
                    console.error("Failed to send verification email:", error);
                    // Log the URL for development fallback
                    console.log(`\n========================================`);
                    console.log(`Magic Link for ${email}:`);
                    console.log(url);
                    console.log(`========================================\n`);
                }
            },
        }),
    ],
    session: {
        strategy: "database",
        maxAge: 30 * 24 * 60 * 60, // 30 days
        updateAge: 24 * 60 * 60, // Update session every 24 hours
    },
    pages: {
        signIn: "/",
        verifyRequest: "/auth/verify-request",
        error: "/auth/error",
    },
    callbacks: {
        async session({ session, user }: { session: unknown; user: AdapterUser; }) {
            // Cast to our extended session type
            const extSession = session as ExtendedSession;

            // Add user ID and name to session
            if (extSession.user) {
                extSession.user.id = user.id;
                extSession.user.name = user.name;
                extSession.user.email = user.email;
                extSession.user.image = user.image;

                // Fetch PIN status and custom name from Redis
                const userData = await redis.get(`setsunai:user:${user.id}:pin`);
                const pinData = typeof userData === "string" ? JSON.parse(userData) : userData;
                extSession.user.hasPin = !!(pinData as { pinHash?: string; name?: string; } | null)?.pinHash;

                // Use custom name from PIN data if available (set during setup)
                const customName = (pinData as { name?: string; } | null)?.name;
                if (customName) {
                    extSession.user.name = customName;
                }
            }
            return extSession;
        },
        async signIn({ user }) {
            // Ensure user data structure exists
            if (user.id) {
                const existingPinData = await redis.get(`setsunai:user:${user.id}:pin`);
                if (!existingPinData) {
                    await redis.set(
                        `setsunai:user:${user.id}:pin`,
                        JSON.stringify({
                            pinHash: null,
                            createdAt: Date.now(),
                        })
                    );
                }
            }
            return true;
        },
    },
    events: {
        async createUser({ user }) {
            // Initialize PIN data for new users
            if (user.id) {
                await redis.set(
                    `setsunai:user:${user.id}:pin`,
                    JSON.stringify({
                        pinHash: null,
                        createdAt: Date.now(),
                    })
                );
            }
        },
    },
    debug: process.env.NODE_ENV === "development",
};

export { redis };
