"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Send, Loader2, Lock } from "lucide-react"
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
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px"
    }
  }, [content])

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
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
      }
      onPostCreated()
    } catch {
      setError("Failed to create post")
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Cmd/Ctrl + Enter
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && content.trim()) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm">
      <div className="flex gap-3 p-4">
        {/* Avatar */}
        <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
          {getInitials(userName)}
        </div>

        {/* Input area */}
        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            placeholder={`What's on your mind, ${userName.split(" ")[0]}?`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full min-h-[56px] max-h-[200px] resize-none bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 border-0 text-base leading-relaxed"
            disabled={loading}
            rows={2}
          />

          {error && (
            <p className="text-sm text-destructive mt-2 animate-fade-in">{error}</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-4 pb-3 pt-0">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" />
          <span className="hidden sm:inline">End-to-end encrypted</span>
          <span className="sm:hidden">Encrypted</span>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!content.trim() || loading}
          size="sm"
          className="h-8 px-3 text-xs font-medium"
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              <span className="hidden sm:inline">Posting...</span>
            </>
          ) : (
            <>
              <Send className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Post</span>
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
