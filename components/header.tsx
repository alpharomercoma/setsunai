"use client"

import { Button } from "@/components/ui/button"
import { LogOut, Shield } from "lucide-react"

interface HeaderProps {
  userName: string
  onLogout: () => void
}

export function Header({ userName, onLogout }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary shrink-0" />
          <span className="font-semibold">Setsunai</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="text-sm text-muted-foreground truncate max-w-[120px] sm:max-w-none">{userName}</span>
          <Button variant="ghost" size="sm" className="shrink-0">
            <LogOut className="h-4 w-4" onClick={onLogout} />
          </Button>
        </div>
      </div>
    </header>
  )
}
