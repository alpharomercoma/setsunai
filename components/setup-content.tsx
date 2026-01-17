"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { PinSetup } from "@/components/pin-setup"
import { Loader2 } from "lucide-react"

export function SetupContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState("")

  useEffect(() => {
    if (status === "loading") return

    if (status === "unauthenticated") {
      router.push("/")
      return
    }

    if (status === "authenticated" && session?.user) {
      setUserName(searchParams.get("name") || session.user.name || "")
      setLoading(false)
    }
  }, [status, session, router, searchParams])

  const handleComplete = () => {
    router.push("/")
  }

  if (loading || status === "loading") {
    return (
      <div className="flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (status === "unauthenticated") {
    return null
  }

  return <PinSetup defaultName={userName} onComplete={handleComplete} />
}
