"use client"

import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { XCircle } from "lucide-react"
import { Footer } from "@/components/footer"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const errorMessages: Record<string, string> = {
  Configuration: "There is a problem with the server configuration.",
  AccessDenied: "Access was denied. You may not have permission to sign in.",
  Verification: "The verification link has expired or has already been used.",
  OAuthSignin: "Error during OAuth sign in. Please try again.",
  OAuthCallback: "Error during OAuth callback. Please try again.",
  OAuthCreateAccount: "Could not create OAuth account. Please try again.",
  EmailCreateAccount: "Could not create account with this email. Please try again.",
  Callback: "Error during authentication callback.",
  OAuthAccountNotLinked: "This email is already associated with another account.",
  EmailSignin: "Error sending verification email. Please try again.",
  CredentialsSignin: "Invalid credentials provided.",
  SessionRequired: "Please sign in to access this page.",
  Default: "An unexpected error occurred. Please try again.",
}

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error") || "Default"
  const errorMessage = errorMessages[error] || errorMessages.Default

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <XCircle className="h-6 w-6 text-destructive" />
        </div>
        <CardTitle>Authentication Error</CardTitle>
        <CardDescription>{errorMessage}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button className="w-full" asChild>
          <Link href="/">Back to Sign In</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export default function AuthErrorPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex flex-1 items-center justify-center p-4">
        <Suspense
          fallback={
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <CardTitle>Loading...</CardTitle>
              </CardHeader>
            </Card>
          }
        >
          <ErrorContent />
        </Suspense>
      </div>
      <Footer />
    </main>
  )
}
