"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { PinSetup } from "@/components/pin-setup"
import { Loader2 } from "lucide-react"

export function SetupContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [userName, setUserName] = useState("")

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/user-status")
        const data = await res.json()

        if (!data.authenticated) {
          router.push("/")
          return
        }

        setAuthenticated(true)
        setUserName(searchParams.get("name") || data.name || "")
      } catch {
        router.push("/")
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router, searchParams])

  const handleComplete = () => {
    router.push("/")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!authenticated) {
    return null
  }

  return <PinSetup defaultName={userName} onComplete={handleComplete} />
}
