"use client";

import type React from "react";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, ArrowRight, Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export function AuthForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("email", {
        email,
        redirect: false,
        callbackUrl: "/",
      });

      if (result?.error) {
        setError("Failed to send magic link. Please try again.");
        return;
      }

      setMagicLinkSent(true);
    } catch {
      setError("Failed to send magic link");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await signIn("google", { callbackUrl: "/" });
    } catch {
      setError("Failed to sign in with Google");
      setGoogleLoading(false);
    }
  };

  if (magicLinkSent) {
    return (
      <div className="w-full max-w-sm mx-auto px-4 animate-fade-up">
        <div className="text-center space-y-5">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-success/15">
            <Mail className="h-6 w-6 text-success" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">Check your inbox</h2>
            <p className="text-muted-foreground leading-relaxed">
              We sent a magic link to<br />
              <span className="font-medium text-foreground">{email}</span>
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Click the link in the email to sign in. It expires in 15 minutes.
          </p>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline mt-4"
            onClick={() => {
              setMagicLinkSent(false);
              setEmail("");
              setError("");
            }}
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

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

      {/* Brand Header */}
      <div className="text-center mb-8 space-y-3">
        <div className="inline-block">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">
            Setsunai
          </h1>
        </div>
        <p className="text-muted-foreground text-base leading-relaxed">
          Your private space for thoughts<br className="sm:hidden" /> that need no audience
        </p>
      </div>

      {/* Auth Options */}
      <div className="space-y-4">
        <Button
          type="button"
          variant="outline"
          className="w-full h-11 bg-card hover:bg-secondary border-border text-foreground font-medium"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
        >
          {googleLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <svg className="h-5 w-5 mr-2.5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </>
          )}
        </Button>

        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-3 text-xs uppercase tracking-wider text-muted-foreground">
              or
            </span>
          </div>
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium">
              Email address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="h-11 bg-card border-border focus:border-ring"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            type="submit"
            className="w-full h-11 font-medium group"
            disabled={loading || !email.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Sending link...
              </>
            ) : (
              <>
                Send magic link
                <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground pt-3">
          End-to-end encrypted. Your thoughts stay yours.
        </p>
      </div>
    </div>
  );
}
