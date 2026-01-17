"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Footer } from "@/components/footer"

export function VerifyContent() {
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    // If user is authenticated after callback, redirect to home
    if (status === "authenticated" && session?.user) {
      const timer = setTimeout(() => {
        router.push("/")
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [status, session, router])

  if (status === "loading") {
    return (
      <main className="flex min-h-screen flex-col">
        <div className="flex flex-1 items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
              <CardTitle>Verifying...</CardTitle>
              <CardDescription>Please wait while we sign you in</CardDescription>
            </CardHeader>
          </Card>
        </div>
        <Footer />
      </main>
    )
  }

  if (status === "authenticated") {
    return (
      <main className="flex min-h-screen flex-col">
        <div className="flex flex-1 items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <CardTitle>Success!</CardTitle>
              <CardDescription>Redirecting you to the app...</CardDescription>
            </CardHeader>
          </Card>
        </div>
        <Footer />
      </main>
    )
  }

  // Unauthenticated - redirect to home
  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Session Expired</CardTitle>
            <CardDescription>Please sign in again</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => router.push("/")}>
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </main>
  )
}
