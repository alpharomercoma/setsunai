import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { redis, type Post } from "@/lib/redis"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { encryptedContent, iv } = await request.json()

    if (!encryptedContent || !iv) {
      return NextResponse.json({ error: "Invalid post data" }, { status: 400 })
    }

    const post: Post = {
      id: crypto.randomUUID(),
      userId: session.user.id,
      encryptedContent,
      iv,
      createdAt: Date.now(),
    }

    // Store post
    await redis.set(`post:${post.id}`, JSON.stringify(post))

    // Add to user's post list (sorted by timestamp, newest first)
    await redis.zadd(`posts:${session.user.id}`, {
      score: post.createdAt,
      member: post.id,
    })

    return NextResponse.json({ success: true, post })
  } catch (error) {
    console.error("Create post error:", error)
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get("cursor")
    const limit = 10

    // Get post IDs from sorted set (newest first)
    const startScore = cursor ? Number.parseInt(cursor) - 1 : "+inf"

    const postIds = await redis.zrange(`posts:${session.user.id}`, startScore, "-inf", {
      byScore: true,
      rev: true,
      count: limit + 1,
      offset: 0,
    })

    if (!postIds || postIds.length === 0) {
      return NextResponse.json({ posts: [], nextCursor: null })
    }

    // Fetch post data
    const posts: Post[] = []
    for (const postId of postIds.slice(0, limit)) {
      const postData = await redis.get(`post:${postId}`)
      if (postData) {
        const post = typeof postData === "string" ? JSON.parse(postData) : postData
        posts.push(post)
      }
    }

    const hasMore = postIds.length > limit
    const nextCursor = hasMore && posts.length > 0 ? posts[posts.length - 1].createdAt.toString() : null

    return NextResponse.json({ posts, nextCursor })
  } catch (error) {
    console.error("Fetch posts error:", error)
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { id, encryptedContent, iv } = await request.json()

    if (!id || !encryptedContent || !iv) {
      return NextResponse.json({ error: "Invalid post data" }, { status: 400 })
    }

    // Fetch existing post to verify ownership
    const existingPost = await redis.get(`post:${id}`)
    if (!existingPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    const post = typeof existingPost === "string" ? JSON.parse(existingPost) : existingPost

    if (post.userId !== session.user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 })
    }

    // Update post with new encrypted content
    const updatedPost: Post = {
      ...post,
      encryptedContent,
      iv,
      updatedAt: Date.now(),
    }

    await redis.set(`post:${id}`, JSON.stringify(updatedPost))

    return NextResponse.json({ success: true, post: updatedPost })
  } catch (error) {
    console.error("Update post error:", error)
    return NextResponse.json({ error: "Failed to update post" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Post ID required" }, { status: 400 })
    }

    // Fetch existing post to verify ownership
    const existingPost = await redis.get(`post:${id}`)
    if (!existingPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    const post = typeof existingPost === "string" ? JSON.parse(existingPost) : existingPost

    if (post.userId !== session.user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 })
    }

    // Remove from sorted set and delete post
    await redis.zrem(`posts:${session.user.id}`, id)
    await redis.del(`post:${id}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete post error:", error)
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 })
  }
}
