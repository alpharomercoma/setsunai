"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Send, Loader2 } from "lucide-react"
import { encryptContent, deriveKeyFromPin } from "@/lib/crypto"

interface PostComposerProps {
  userName: string
  userId: string
  onPostCreated: () => void
}

export function PostComposer({ userName, userId, onPostCreated }: PostComposerProps) {
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleSubmit = async () => {
    if (!content.trim()) return

    setLoading(true)
    setError("")

    try {
      const pinHash = sessionStorage.getItem("pinVerified")
      if (!pinHash) {
        setError("Please unlock with your PIN first")
        return
      }

      // Derive encryption key from PIN hash and user ID as salt
      const key = await deriveKeyFromPin(pinHash, userId)

      // Encrypt the content
      const { encrypted, iv } = await encryptContent(content, key)

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encryptedContent: encrypted, iv }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to create post")
        return
      }

      setContent("")
      onPostCreated()
    } catch (err) {
      setError("Failed to create post")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardContent className="pt-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary">{getInitials(userName)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-3">
            <Textarea
              placeholder={`What's on your mind, ${userName.split(" ")[0]}?`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[80px] resize-none border-0 bg-muted/50 focus-visible:ring-1"
              disabled={loading}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!content.trim() || loading} size="sm">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Post
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
