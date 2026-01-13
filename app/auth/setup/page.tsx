import { Suspense } from "react"
import { SetupContent } from "@/components/setup-content"
import { Footer } from "@/components/footer"
import { Loader2 } from "lucide-react"

export default function SetupPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex flex-1 items-center justify-center p-4">
        <Suspense
          fallback={
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          }
        >
          <SetupContent />
        </Suspense>
      </div>
      <Footer />
    </main>
  )
}
