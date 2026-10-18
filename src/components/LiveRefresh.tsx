"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Re-renders the page when this tournament's matches or status change in the database. */
export function LiveRefresh({ tournamentId }: { tournamentId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Several rows may change at once (e.g. schedule regeneration): refresh once.
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 400);
    };

    const channel = supabase
      .channel(`tournament-${tournamentId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `tournament_id=eq.${tournamentId}` }, refresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tournaments", filter: `id=eq.${tournamentId}` }, refresh)
      .subscribe();

    // Catch up on anything missed while the tab was in the background.
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [tournamentId, router]);

  return null;
}
