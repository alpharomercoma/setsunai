"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { XCircle, Loader2 } from "lucide-react";
import { Footer } from "@/components/footer";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const errorMessages: Record<string, string> = {
  Configuration: "There is a problem with the server configuration.",
  AccessDenied: "Access was denied. You may not have permission to sign in.",
  Verification: "The verification link has expired or has already been used.",
  OAuthSignin: "Error during OAuth sign in. Please try again.",
  OAuthCallback: "Error during OAuth callback. Please try again.",
  OAuthCreateAccount: "Could not create OAuth account. Please try again.",
  EmailCreateAccount: "Could not create account with this email. Please try again.",
  Callback: "Error during authentication callback.",
  OAuthAccountNotLinked: "This email is already associated with another account.",
  EmailSignin: "Error sending verification email. Please try again.",
  CredentialsSignin: "Invalid credentials provided.",
  SessionRequired: "Please sign in to access this page.",
  Default: "An unexpected error occurred. Please try again.",
};

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") || "Default";
  const errorMessage = errorMessages[error] || errorMessages.Default;

  return (
    <div className="w-full max-w-sm mx-auto px-6 animate-fade-in">
      <div className="text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10">
          <XCircle className="w-7 h-7 text-destructive" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-display font-medium text-foreground">
            Authentication Error
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {errorMessage}
          </p>
        </div>

        <Button
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
          asChild
        >
          <Link href="/">Try Again</Link>
        </Button>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex items-center justify-center py-12">
        <Suspense
          fallback={
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50" />
            </div>
          }
        >
          <ErrorContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
