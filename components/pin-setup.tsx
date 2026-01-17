"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Loader2, ArrowRight, ArrowLeft, Check, Sun, Moon } from "lucide-react";
import { hashPin } from "@/lib/crypto";
import { useTheme } from "@/components/theme-provider";

interface PinSetupProps {
  defaultName?: string;
  onComplete: () => void;
}

export function PinSetup({ defaultName = "", onComplete }: PinSetupProps) {
  const [name, setName] = useState(defaultName);
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [confirmPin, setConfirmPin] = useState(["", "", "", "", "", ""]);
  const [step, setStep] = useState<"name" | "pin" | "confirm">(defaultName ? "pin" : "name");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { resolvedTheme, setTheme } = useTheme();

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmRefs = useRef<(HTMLInputElement | null)[]>([]);

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  useEffect(() => {
    if (step === "pin") {
      inputRefs.current[0]?.focus();
    } else if (step === "confirm") {
      confirmRefs.current[0]?.focus();
    }
  }, [step]);

  const handlePinChange = (index: number, value: string, isConfirm = false) => {
    if (!/^\d*$/.test(value)) return;

    const newPin = isConfirm ? [...confirmPin] : [...pin];
    newPin[index] = value.slice(-1);

    if (isConfirm) {
      setConfirmPin(newPin);
    } else {
      setPin(newPin);
    }
    setError("");

    if (value && index < 5) {
      const refs = isConfirm ? confirmRefs : inputRefs;
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent, isConfirm = false) => {
    if (e.key === "Backspace") {
      const currentPin = isConfirm ? confirmPin : pin;
      if (!currentPin[index] && index > 0) {
        const refs = isConfirm ? confirmRefs : inputRefs;
        refs.current[index - 1]?.focus();
      }
    }
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }
    setError("");
    setStep("pin");
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.some((d) => !d)) {
      setError("Please enter all 6 digits");
      return;
    }
    setError("");
    setStep("confirm");
  };

  const handleConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (confirmPin.some((d) => !d)) {
      setError("Please enter all 6 digits");
      return;
    }

    if (pin.join("") !== confirmPin.join("")) {
      setError("PINs do not match");
      setConfirmPin(["", "", "", "", "", ""]);
      confirmRefs.current[0]?.focus();
      return;
    }

    setLoading(true);
    setError("");

    try {
      const pinString = pin.join("");
      const pinHash = await hashPin(pinString);

      const res = await fetch("/api/auth/setup-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, pinHash }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Setup failed");
        return;
      }

      sessionStorage.setItem("pinVerified", pinHash);
      onComplete();
    } catch {
      setError("Setup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderPinInputs = (
    values: string[],
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
    isConfirm = false,
  ) => (
    <div className="flex justify-center gap-2 sm:gap-2.5">
      {values.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handlePinChange(index, e.target.value, isConfirm)}
          onKeyDown={(e) => handleKeyDown(index, e, isConfirm)}
          className="pin-input h-12 w-10 sm:h-14 sm:w-11 text-center text-lg sm:text-xl font-semibold bg-card border border-border rounded-lg focus:outline-none"
          autoComplete="off"
        />
      ))}
    </div>
  );

  // Progress indicator
  const steps = defaultName ? ["pin", "confirm"] : ["name", "pin", "confirm"];
  const currentStepIndex = steps.indexOf(step);

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

      {/* Progress dots */}
      <div className="flex justify-center gap-1.5 mb-6">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`h-1 rounded-full transition-all duration-300 ${i <= currentStepIndex
                ? "w-6 bg-primary"
                : "w-3 bg-border"
              }`}
          />
        ))}
      </div>

      {/* Header */}
      <div className="text-center mb-8 space-y-3">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-1">
          <KeyRound className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground">
          {step === "name" && "What should we call you?"}
          {step === "pin" && "Create your PIN"}
          {step === "confirm" && "Confirm your PIN"}
        </h2>
        <p className="text-muted-foreground text-sm">
          {step === "name" && "Choose a display name"}
          {step === "pin" && "This encrypts all your posts. Remember it!"}
          {step === "confirm" && "Enter the same PIN to confirm"}
        </p>
      </div>

      {/* Name Step */}
      {step === "name" && (
        <form onSubmit={handleNameSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-sm font-medium">
              Your name
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 bg-card border-border"
              required
              autoFocus
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full h-11 font-medium group">
            Continue
            <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </form>
      )}

      {/* PIN Step */}
      {step === "pin" && (
        <form onSubmit={handlePinSubmit} className="space-y-5">
          {renderPinInputs(pin, inputRefs)}
          {error && <p className="text-center text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            {!defaultName && (
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-11"
                onClick={() => setStep("name")}
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back
              </Button>
            )}
            <Button
              type="submit"
              className={`h-11 font-medium group ${defaultName ? "w-full" : "flex-1"}`}
            >
              Continue
              <ArrowRight className="h-4 w-4 ml-1.5 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>
        </form>
      )}

      {/* Confirm Step */}
      {step === "confirm" && (
        <form onSubmit={handleConfirmSubmit} className="space-y-5">
          {renderPinInputs(confirmPin, confirmRefs, true)}
          {error && <p className="text-center text-sm text-destructive animate-fade-in">{error}</p>}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-11"
              onClick={() => {
                setStep("pin");
                setConfirmPin(["", "", "", "", "", ""]);
                setError("");
              }}
              disabled={loading}
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back
            </Button>
            <Button
              type="submit"
              className="flex-1 h-11 font-medium"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  Setting up...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1.5" />
                  Complete
                </>
              )}
            </Button>
          </div>
        </form>
      )}

      {/* Security note */}
      <p className="text-center text-xs text-muted-foreground mt-6">
        Your PIN never leaves your device. Lost PIN = lost data.
      </p>
    </div>
  );
}
