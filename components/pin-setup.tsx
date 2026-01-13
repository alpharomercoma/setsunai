"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { KeyRound, Loader2 } from "lucide-react"
import { hashPin } from "@/lib/crypto"

interface PinSetupProps {
  defaultName?: string
  onComplete: () => void
}

export function PinSetup({ defaultName = "", onComplete }: PinSetupProps) {
  const [name, setName] = useState(defaultName)
  const [pin, setPin] = useState(["", "", "", "", "", ""])
  const [confirmPin, setConfirmPin] = useState(["", "", "", "", "", ""])
  const [step, setStep] = useState<"name" | "pin" | "confirm">(defaultName ? "pin" : "name")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const confirmRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (step === "pin") {
      inputRefs.current[0]?.focus()
    } else if (step === "confirm") {
      confirmRefs.current[0]?.focus()
    }
  }, [step])

  const handlePinChange = (index: number, value: string, isConfirm = false) => {
    if (!/^\d*$/.test(value)) return

    const newPin = isConfirm ? [...confirmPin] : [...pin]
    newPin[index] = value.slice(-1)

    if (isConfirm) {
      setConfirmPin(newPin)
    } else {
      setPin(newPin)
    }

    if (value && index < 5) {
      const refs = isConfirm ? confirmRefs : inputRefs
      refs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent, isConfirm = false) => {
    if (e.key === "Backspace") {
      const currentPin = isConfirm ? confirmPin : pin
      if (!currentPin[index] && index > 0) {
        const refs = isConfirm ? confirmRefs : inputRefs
        refs.current[index - 1]?.focus()
      }
    }
  }

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim().length < 2) {
      setError("Name must be at least 2 characters")
      return
    }
    setError("")
    setStep("pin")
  }

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pin.some((d) => !d)) {
      setError("Please enter all 6 digits")
      return
    }
    setError("")
    setStep("confirm")
  }

  const handleConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (confirmPin.some((d) => !d)) {
      setError("Please enter all 6 digits")
      return
    }

    if (pin.join("") !== confirmPin.join("")) {
      setError("PINs do not match")
      setConfirmPin(["", "", "", "", "", ""])
      confirmRefs.current[0]?.focus()
      return
    }

    setLoading(true)
    setError("")

    try {
      const pinString = pin.join("")
      const pinHash = await hashPin(pinString)

      const res = await fetch("/api/auth/setup-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, pinHash }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Setup failed")
        return
      }

      sessionStorage.setItem("pinVerified", pinHash)
      onComplete()
    } catch {
      setError("Setup failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const renderPinInputs = (
    values: string[],
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
    isConfirm = false,
  ) => (
    <div className="flex justify-center gap-2">
      {values.map((digit, index) => (
        <Input
          key={index}
          ref={(el) => {
            refs.current[index] = el
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handlePinChange(index, e.target.value, isConfirm)}
          onKeyDown={(e) => handleKeyDown(index, e, isConfirm)}
          className="h-12 w-12 text-center text-lg font-semibold"
        />
      ))}
    </div>
  )

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <KeyRound className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>
          {step === "name" && "Set Your Name"}
          {step === "pin" && "Create Your PIN"}
          {step === "confirm" && "Confirm Your PIN"}
        </CardTitle>
        <CardDescription>
          {step === "name" && "How should we call you?"}
          {step === "pin" && "This 6-digit PIN encrypts all your posts. Remember it!"}
          {step === "confirm" && "Enter your PIN again to confirm"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === "name" && (
          <form onSubmit={handleNameSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">
              Continue
            </Button>
          </form>
        )}

        {step === "pin" && (
          <form onSubmit={handlePinSubmit} className="space-y-6">
            {renderPinInputs(pin, inputRefs)}
            {error && <p className="text-center text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">
              Continue
            </Button>
          </form>
        )}

        {step === "confirm" && (
          <form onSubmit={handleConfirmSubmit} className="space-y-6">
            {renderPinInputs(confirmPin, confirmRefs, true)}
            {error && <p className="text-center text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                "Complete Setup"
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
