"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, Sun, Moon } from "lucide-react";
import { hashPin } from "@/lib/crypto";
import { useTheme } from "@/components/theme-provider";

interface PinUnlockProps {
  onUnlock: () => void;
}

export function PinUnlock({ onUnlock }: PinUnlockProps) {
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { resolvedTheme, setTheme } = useTheme();

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handlePinChange = async (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    setError("");

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (value && index === 5 && newPin.every((d) => d)) {
      await verifyPin(newPin.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace") {
      if (!pin[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      const newPin = pasted.split("");
      setPin(newPin);
      verifyPin(pasted);
    }
  };

  const verifyPin = async (pinString: string) => {
    setLoading(true);
    setError("");

    try {
      const pinHash = await hashPin(pinString);

      const res = await fetch("/api/auth/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinHash }),
      });

      const data = await res.json();

      if (data.valid) {
        sessionStorage.setItem("pinVerified", pinHash);
        onUnlock();
      } else {
        setError("Incorrect PIN");
        setPin(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError("Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.some((d) => !d)) {
      setError("Please enter all 6 digits");
      return;
    }
    await verifyPin(pin.join(""));
  };

  return (
    <div className="w-full max-w-sm mx-auto px-4 animate-fade-up">
      {/* Theme toggle - top right */}
      <div className="absolute top-4 right-4">
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 theme-toggle text-muted-foreground hover:text-foreground hover:bg-secondary"
          onClick={toggleTheme}
          title={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {resolvedTheme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Header */}
      <div className="text-center mb-8 space-y-3">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-1">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground">Unlock your thoughts</h2>
        <p className="text-muted-foreground text-sm">
          Enter your 6-digit PIN to decrypt
        </p>
      </div>

      {/* PIN Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex justify-center gap-2 sm:gap-2.5" onPaste={handlePaste}>
          {pin.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handlePinChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="pin-input h-12 w-10 sm:h-14 sm:w-11 text-center text-lg sm:text-xl font-semibold bg-card border border-border rounded-lg focus:outline-none disabled:opacity-50"
              disabled={loading}
              autoComplete="off"
            />
          ))}
        </div>

        {error && (
          <p className="text-center text-sm text-destructive animate-fade-in">
            {error}
          </p>
        )}

        <Button
          type="submit"
          className="w-full h-11 font-medium"
          disabled={loading || pin.some((d) => !d)}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Unlocking...
            </>
          ) : (
            "Unlock"
          )}
        </Button>
      </form>
    </div>
  );
}
