import { Suspense } from "react";
import { SetupContent } from "@/components/setup-content";
import { Footer } from "@/components/footer";
import { Loader2 } from "lucide-react";

export default function SetupPage() {
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
          <SetupContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
