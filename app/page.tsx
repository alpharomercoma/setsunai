"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession, signOut } from "next-auth/react"
import { AuthForm } from "@/components/auth-form"
import { PinUnlock } from "@/components/pin-unlock"
import { PostComposer } from "@/components/post-composer"
import { PostFeed } from "@/components/post-feed"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

type AppState = "loading" | "unauthenticated" | "needs-pin" | "unlock" | "feed"

export default function Home() {
  const { data: session, status } = useSession()
  const [state, setState] = useState<AppState>("loading")
  const [hasPin, setHasPin] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const router = useRouter()

  const checkPinStatus = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      const res = await fetch("/api/auth/user-status")
      const data = await res.json()

      if (!data.hasPin) {
        router.push(`/auth/setup?name=${encodeURIComponent(session.user.name || "")}`)
        return
      }

      setHasPin(true)

      // Check if PIN is already verified in this session
      const pinVerified = sessionStorage.getItem("pinVerified")
      if (pinVerified) {
        setState("feed")
      } else {
        setState("unlock")
      }
    } catch {
      setState("unlock")
    }
  }, [session?.user?.id, session?.user?.name, router])

  useEffect(() => {
    if (status === "loading") {
      setState("loading")
      return
    }

    if (status === "unauthenticated") {
      setState("unauthenticated")
      return
    }

    if (status === "authenticated" && session?.user) {
      checkPinStatus()
    }
  }, [status, session, checkPinStatus])

  const handleUnlock = () => {
    setState("feed")
  }

  const handleLogout = async () => {
    sessionStorage.removeItem("pinVerified")
    await signOut({ redirect: false })
    setState("unauthenticated")
  }

  const handlePostCreated = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  if (state === "loading" || status === "loading") {
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
          <AuthForm />
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

  if (state === "feed" && session?.user) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header userName={session.user.name || "User"} onLogout={handleLogout} />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
          <div className="space-y-6">
            <PostComposer
              userName={session.user.name || "User"}
              userId={session.user.id}
              onPostCreated={handlePostCreated}
            />
            <PostFeed userId={session.user.id} userName={session.user.name || "User"} refreshTrigger={refreshTrigger} />
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return null
}
