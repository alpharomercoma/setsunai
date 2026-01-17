import { Mail } from "lucide-react";
import { Footer } from "@/components/footer";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function VerifyRequestPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex items-center justify-center py-12">
        <div className="w-full max-w-sm mx-auto px-6 animate-fade-in">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 glow-sm">
              <Mail className="w-7 h-7 text-primary" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-display font-medium text-foreground">
                Check your email
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                A magic link has been sent to your email address.
              </p>
            </div>

            <p className="text-xs text-muted-foreground/60">
              Click the link in the email to sign in.
              <br />
              The link expires in 15 minutes.
            </p>

            <p className="text-xs text-muted-foreground/40">
              If you don't see the email, check your spam folder.
            </p>

            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              asChild
            >
              <Link href="/">Back to Sign In</Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
