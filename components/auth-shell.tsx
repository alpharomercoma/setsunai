import type React from "react"
import { Shield } from "lucide-react"

interface AuthShellProps {
  children: React.ReactNode
}

export function AuthShell({ children }: AuthShellProps) {
  return (
    <section className="flex flex-1 items-center">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-10">
        <div className="grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5" />
              End-to-end encrypted by your PIN
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Setsunai</h1>
              <p className="max-w-lg text-sm text-muted-foreground sm:text-base">
                A quiet place for private thoughts. Everything is encrypted before it leaves your device, and only you can
                unlock it.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-muted px-3 py-1">Zero-knowledge</span>
              <span className="rounded-full bg-muted px-3 py-1">Fast capture</span>
              <span className="rounded-full bg-muted px-3 py-1">Minimal, focused</span>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-lg">{children}</div>
          </div>
        </div>
      </div>
    </section>
  )
}
