"use client";

import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { LoginPage } from "@takaki/go-design-system";
import { Zap } from "lucide-react";

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const handleGoogleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    });
  };

  return (
    <LoginPage
      productName="TaskGo"
      productLogo={
        <div
          className="flex items-center justify-center w-full h-full rounded-md"
          style={{
            background:
              "linear-gradient(135deg, var(--color-primary) 0%, color-mix(in srgb, var(--color-primary) 70%, white) 100%)",
          }}
        >
          <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
      }
      tagline="PdMの設計貯金を守るツール"
      onGoogleSignIn={handleGoogleLogin}
    />
  );
}

export default function LoginPageRoute() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
