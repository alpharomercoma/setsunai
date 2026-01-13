import { Suspense } from "react"
import { VerifyContent } from "@/components/verify-content"

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Verifying...</div>
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  )
}
