"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Footer } from "@/components/footer"

export function VerifyContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [error, setError] = useState("")

  useEffect(() => {
    const email = searchParams.get("email")
    const token = searchParams.get("token")

    if (!email || !token) {
      setStatus("error")
      setError("Invalid verification link")
      return
    }

    const verify = async () => {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, token }),
        })

        const data = await res.json()

        if (!res.ok || !data.success) {
          setStatus("error")
          setError(data.error || "Invalid or expired link. Please request a new one.")
        } else {
          setStatus("success")
          // Redirect after a short delay
          setTimeout(() => {
            if (data.isNew) {
              router.push(`/auth/setup?name=`)
            } else {
              router.push("/")
            }
          }, 1500)
        }
      } catch {
        setStatus("error")
        setError("Verification failed. Please try again.")
      }
    }

    verify()
  }, [searchParams, router])

  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            {status === "loading" && (
              <>
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
                <CardTitle>Verifying...</CardTitle>
                <CardDescription>Please wait while we sign you in</CardDescription>
              </>
            )}
            {status === "success" && (
              <>
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <CardTitle>Success!</CardTitle>
                <CardDescription>Redirecting you to the app...</CardDescription>
              </>
            )}
            {status === "error" && (
              <>
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                  <XCircle className="h-6 w-6 text-destructive" />
                </div>
                <CardTitle>Verification Failed</CardTitle>
                <CardDescription>{error}</CardDescription>
              </>
            )}
          </CardHeader>
          {status === "error" && (
            <CardContent>
              <Button className="w-full" onClick={() => router.push("/")}>
                Back to Sign In
              </Button>
            </CardContent>
          )}
        </Card>
      </div>
      <Footer />
    </main>
  )
}
