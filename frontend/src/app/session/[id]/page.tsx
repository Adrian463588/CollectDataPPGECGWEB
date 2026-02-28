// ============================================================
// Session Orchestrator — Main session page (redirects to current phase)
// ============================================================

"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { getSessionState } from "@/lib/api-client";

export default function SessionPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  useEffect(() => {
    async function redirect() {
      try {
        const state = await getSessionState(sessionId);
        const phaseRoutes: Record<string, string> = {
          INTRO: "device-check",
          DEVICE_CHECK: "device-check",
          COUNTDOWN: "relaxation",
          RELAXATION: "relaxation",
          STRESS: "stress",
          COMPLETE: "complete",
        };
        const route = phaseRoutes[state.current_phase] || "device-check";
        router.replace(`/session/${sessionId}/${route}`);
      } catch {
        router.replace("/session/new");
      }
    }
    void redirect();
  }, [sessionId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-slate-400">Resuming session…</div>
    </div>
  );
}
