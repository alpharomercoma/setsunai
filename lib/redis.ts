import { Redis } from "@upstash/redis"

export const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

// Post structure - content is encrypted
export interface Post {
  id: string
  userId: string
  encryptedContent: string // AES encrypted with user's PIN-derived key
  iv: string // Initialization vector for decryption
  createdAt: number
  updatedAt?: number
}
