"use client";

import { AuthForm } from "@/components/auth-form";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { PinUnlock } from "@/components/pin-unlock";
import { PostComposer } from "@/components/post-composer";
import { PostFeed } from "@/components/post-feed";
import { Loader2 } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type AppState = "loading" | "unauthenticated" | "needs-pin" | "unlock" | "feed";

// Extended session type with id
type SessionWithId = {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  expires: string;
};

export default function Home() {
  const { data: session, status } = useSession();
  const [state, setState] = useState<AppState>("loading");
  const [hasPin, setHasPin] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const router = useRouter();

  const checkPinStatus = useCallback(async () => {
    const sessionWithId = session as SessionWithId | null;
    if (!sessionWithId?.user?.id) {
      return;
    }

    try {
      const res = await fetch("/api/auth/user-status");
      const data = await res.json();

      if (!data.hasPin) {
        router.push(`/auth/setup?name=${encodeURIComponent(sessionWithId.user.name || "")}`);
        return;
      }

      setHasPin(true);

      // Check if PIN is already verified in this session
      const pinVerified = sessionStorage.getItem("pinVerified");
      if (pinVerified) {
        setState("feed");
      } else {
        setState("unlock");
      }
    } catch {
      setState("unlock");
    }
  }, [session, router]);

  useEffect(() => {
    if (status === "loading") {
      setState("loading");
      return;
    }

    if (status === "unauthenticated") {
      setState("unauthenticated");
      return;
    }

    if (status === "authenticated" && session?.user) {
      checkPinStatus();
    }
  }, [status, session, checkPinStatus]);

  const handleUnlock = () => {
    setState("feed");
  };

  const handleLogout = async () => {
    sessionStorage.removeItem("pinVerified");
    await signOut({ redirect: false });
    setState("unauthenticated");
  };

  const handlePostCreated = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  // Loading state
  if (state === "loading" || status === "loading") {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50" />
        </div>
        <Footer />
      </div>
    );
  }

  // Unauthenticated - Show login
  if (state === "unauthenticated") {
    return (
      <div className="min-h-screen flex flex-col">
        <main className="flex-1 flex items-center justify-center py-12">
          <AuthForm />
        </main>
        <Footer />
      </div>
    );
  }

  // PIN unlock
  if (state === "unlock") {
    return (
      <div className="min-h-screen flex flex-col">
        <main className="flex-1 flex items-center justify-center py-12">
          <PinUnlock onUnlock={handleUnlock} />
        </main>
        <Footer />
      </div>
    );
  }

  // Main feed
  if (state === "feed" && session?.user) {
    const sessionWithId = session as SessionWithId;
    return (
      <div className="min-h-screen flex flex-col">
        <Header userName={sessionWithId.user.name || "User"} onLogout={handleLogout} />

        <main className="flex-1 w-full max-w-xl mx-auto px-4 sm:px-6 py-6">
          <div className="space-y-6">
            <PostComposer
              userName={sessionWithId.user.name || "User"}
              userId={sessionWithId.user.id}
              onPostCreated={handlePostCreated}
            />
            <PostFeed
              userId={sessionWithId.user.id}
              userName={sessionWithId.user.name || "User"}
              refreshTrigger={refreshTrigger}
            />
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  return null;
}
