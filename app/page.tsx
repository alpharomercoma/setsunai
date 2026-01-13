"use client"

import { useEffect, useState, useCallback } from "react"
import { AuthForm } from "@/components/auth-form"
import { PinUnlock } from "@/components/pin-unlock"
import { PostComposer } from "@/components/post-composer"
import { PostFeed } from "@/components/post-feed"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

type AppState = "loading" | "unauthenticated" | "needs-pin" | "unlock" | "feed"

interface UserStatus {
  authenticated: boolean
  hasPin: boolean
  name: string
  email: string
}

export default function Home() {
  const [state, setState] = useState<AppState>("loading")
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const router = useRouter()

  const checkAuthStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/user-status")
      const data: UserStatus = await res.json()

      if (!data.authenticated) {
        setState("unauthenticated")
        return
      }

      setUserStatus(data)

      if (!data.hasPin) {
        router.push(`/auth/setup?name=${encodeURIComponent(data.name || "")}`)
        return
      }

      // Check if PIN is already verified in this session
      const pinVerified = sessionStorage.getItem("pinVerified")
      if (pinVerified) {
        setState("feed")
      } else {
        setState("unlock")
      }
    } catch {
      setState("unauthenticated")
    }
  }, [router])

  useEffect(() => {
    checkAuthStatus()
  }, [checkAuthStatus])

  const handleUnlock = () => {
    setState("feed")
  }

  const handleLogout = async () => {
    sessionStorage.removeItem("pinVerified")
    await fetch("/api/auth/logout", { method: "POST" })
    setState("unauthenticated")
    setUserStatus(null)
  }

  const handlePostCreated = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  const handleAuthenticated = () => {
    checkAuthStatus()
  }

  if (state === "loading") {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
        <Footer />
      </div>
    )
  }

  if (state === "unauthenticated") {
    return (
      <main className="flex min-h-screen flex-col">
        <div className="flex flex-1 items-center justify-center p-4">
          <AuthForm onAuthenticated={handleAuthenticated} />
        </div>
        <Footer />
      </main>
    )
  }

  if (state === "unlock") {
    return (
      <main className="flex min-h-screen flex-col">
        <div className="flex flex-1 items-center justify-center p-4">
          <PinUnlock onUnlock={handleUnlock} />
        </div>
        <Footer />
      </main>
    )
  }

  if (state === "feed" && userStatus) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header userName={userStatus.name || "User"} onLogout={handleLogout} />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
          <div className="space-y-6">
            <PostComposer
              userName={userStatus.name || "User"}
              userId={userStatus.email}
              onPostCreated={handlePostCreated}
            />
            <PostFeed userId={userStatus.email} userName={userStatus.name || "User"} refreshTrigger={refreshTrigger} />
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return null
}
