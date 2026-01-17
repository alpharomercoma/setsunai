// Shared type definitions for type-safe API routes

import { z } from "zod"

// Session types
export interface SessionWithId {
  user?: {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
  }
  expires: string
}

// PIN data schema with Zod validation
export const UserPinDataSchema = z.object({
  pinHash: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number().optional(),
  name: z.string().optional(),
})

export type UserPinData = z.infer<typeof UserPinDataSchema>

// Post schema
export const PostSchema = z.object({
  id: z.string(),
  userId: z.string(),
  encryptedContent: z.string(),
  iv: z.string(),
  createdAt: z.number(),
  updatedAt: z.number().optional(),
})

export type Post = z.infer<typeof PostSchema>

// Safe JSON parse with Zod validation
export function safeParseJson<T>(
  data: unknown,
  schema: z.ZodType<T>
): T | null {
  if (data === null || data === undefined) {
    return null
  }

  try {
    const jsonData = typeof data === "string" ? JSON.parse(data) : data
    const result = schema.safeParse(jsonData)
    return result.success ? result.data : null
  } catch {
    return null
  }
}
