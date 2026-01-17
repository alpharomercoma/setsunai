// Re-export auth utilities for convenience
// Most API routes should import directly from auth-options for better tree-shaking

export { authOptions, redis } from "./auth-options"
export { getServerSession } from "next-auth"
