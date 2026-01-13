"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Lock, Loader2 } from "lucide-react"
import { hashPin } from "@/lib/crypto"

interface PinUnlockProps {
  onUnlock: () => void
}

export function PinUnlock({ onUnlock }: PinUnlockProps) {
  const [pin, setPin] = useState(["", "", "", "", "", ""])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const handlePinChange = async (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return

    const newPin = [...pin]
    newPin[index] = value.slice(-1)
    setPin(newPin)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all digits entered
    if (value && index === 5 && newPin.every((d) => d)) {
      await verifyPin(newPin.join(""))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace") {
      if (!pin[index] && index > 0) {
        inputRefs.current[index - 1]?.focus()
      }
    }
  }

  const verifyPin = async (pinString: string) => {
    setLoading(true)
    setError("")

    try {
      const pinHash = await hashPin(pinString)

      const res = await fetch("/api/auth/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinHash }),
      })

      const data = await res.json()

      if (data.valid) {
        sessionStorage.setItem("pinVerified", pinHash)
        onUnlock()
      } else {
        setError("Incorrect PIN")
        setPin(["", "", "", "", "", ""])
        inputRefs.current[0]?.focus()
      }
    } catch (err) {
      setError("Verification failed")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pin.some((d) => !d)) {
      setError("Please enter all 6 digits")
      return
    }
    await verifyPin(pin.join(""))
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Unlock Your Thoughts</CardTitle>
        <CardDescription>Enter your 6-digit PIN to decrypt your posts</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center gap-2">
            {pin.map((digit, index) => (
              <Input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el
                }}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handlePinChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="h-12 w-12 text-center text-lg font-semibold"
                disabled={loading}
              />
            ))}
          </div>
          {error && <p className="text-center text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading || pin.some((d) => !d)}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Unlock"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
