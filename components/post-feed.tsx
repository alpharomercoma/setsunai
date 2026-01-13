"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Loader2, Lock, MoreHorizontal, Pencil, Trash2, X, Check } from "lucide-react"
import { decryptContent, deriveKeyFromPin, encryptContent } from "@/lib/crypto"
import type { Post } from "@/lib/redis"

interface DecryptedPost extends Post {
  decryptedContent?: string
  decryptError?: boolean
}

interface PostFeedProps {
  userId: string
  userName: string
  refreshTrigger: number
}

export function PostFeed({ userId, userName, refreshTrigger }: PostFeedProps) {
  const [posts, setPosts] = useState<DecryptedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [saving, setSaving] = useState(false)
  const [deletePostId, setDeletePostId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`

    return date.toLocaleDateString()
  }

  const decryptPosts = useCallback(
    async (postsToDecrypt: Post[]): Promise<DecryptedPost[]> => {
      const pinHash = sessionStorage.getItem("pinVerified")
      if (!pinHash) return postsToDecrypt.map((p) => ({ ...p, decryptError: true }))

      try {
        const key = await deriveKeyFromPin(pinHash, userId)

        return Promise.all(
          postsToDecrypt.map(async (post) => {
            try {
              const decrypted = await decryptContent(post.encryptedContent, post.iv, key)
              return { ...post, decryptedContent: decrypted }
            } catch {
              return { ...post, decryptError: true }
            }
          }),
        )
      } catch {
        return postsToDecrypt.map((p) => ({ ...p, decryptError: true }))
      }
    },
    [userId],
  )

  const fetchPosts = useCallback(
    async (cursor?: string) => {
      try {
        const url = cursor ? `/api/posts?cursor=${cursor}` : "/api/posts"
        const res = await fetch(url)

        if (!res.ok) return

        const data = await res.json()
        const decrypted = await decryptPosts(data.posts)

        if (cursor) {
          setPosts((prev) => [...prev, ...decrypted])
        } else {
          setPosts(decrypted)
        }

        setNextCursor(data.nextCursor)
        setHasMore(!!data.nextCursor)
      } catch (err) {
        console.error("Failed to fetch posts:", err)
      }
    },
    [decryptPosts],
  )

  const handleEdit = (post: DecryptedPost) => {
    setEditingPostId(post.id)
    setEditContent(post.decryptedContent || "")
  }

  const handleSaveEdit = async (postId: string) => {
    if (!editContent.trim()) return

    setSaving(true)
    try {
      const pinHash = sessionStorage.getItem("pinVerified")
      if (!pinHash) return

      const key = await deriveKeyFromPin(pinHash, userId)
      const { encrypted, iv } = await encryptContent(editContent.trim(), key)

      const res = await fetch("/api/posts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: postId,
          encryptedContent: encrypted,
          iv,
        }),
      })

      if (res.ok) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, decryptedContent: editContent.trim(), updatedAt: Date.now() } : p,
          ),
        )
        setEditingPostId(null)
        setEditContent("")
      }
    } catch (err) {
      console.error("Failed to edit post:", err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletePostId) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/posts?id=${deletePostId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== deletePostId))
      }
    } catch (err) {
      console.error("Failed to delete post:", err)
    } finally {
      setDeleting(false)
      setDeletePostId(null)
    }
  }

  // Initial load and refresh
  useEffect(() => {
    setLoading(true)
    setPosts([])
    setNextCursor(null)
    setHasMore(true)
    fetchPosts().finally(() => setLoading(false))
  }, [fetchPosts, refreshTrigger])

  // Infinite scroll observer
  useEffect(() => {
    if (loading) return

    observerRef.current = new IntersectionObserver(
      async (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && nextCursor) {
          setLoadingMore(true)
          await fetchPosts(nextCursor)
          setLoadingMore(false)
        }
      },
      { threshold: 0.1 },
    )

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => {
      observerRef.current?.disconnect()
    }
  }, [loading, hasMore, loadingMore, nextCursor, fetchPosts])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No posts yet. Share your first thought!</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {posts.map((post) => (
          <Card key={post.id} className="w-full">
            <CardContent className="p-4 sm:p-6">
              <div className="flex gap-3">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary">{getInitials(userName)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  {post.decryptError ? (
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Lock className="h-4 w-4" />
                        <span className="text-sm">Unable to decrypt this post</span>
                      </div>
                    </div>
                  ) : editingPostId === post.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[80px] resize-none"
                        disabled={saving}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingPostId(null)
                            setEditContent("")
                          }}
                          disabled={saving}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(post.id)}
                          disabled={saving || !editContent.trim()}
                        >
                          {saving ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4 mr-1" />
                          )}
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(post.updatedAt || post.createdAt)}
                          {post.updatedAt && " (edited)"}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Post options</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(post)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeletePostId(post.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <p className="whitespace-pre-wrap break-words text-base leading-relaxed">
                        {post.decryptedContent}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Infinite scroll trigger */}
        <div ref={loadMoreRef} className="py-4">
          {loadingMore && (
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={!!deletePostId} onOpenChange={(open) => !open && setDeletePostId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete post?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This post will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
