import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail } from "lucide-react"
import { Footer } from "@/components/footer"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function VerifyRequestPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
              <Mail className="h-6 w-6 text-green-500" />
            </div>
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              A magic link has been sent to your email address
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Click the link in the email to sign in. The link expires in 15 minutes.
            </p>
            <p className="text-center text-xs text-muted-foreground">
              If you don&apos;t see the email, check your spam folder.
            </p>
            <Button variant="ghost" className="w-full" asChild>
              <Link href="/">Back to Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </main>
  )
}
