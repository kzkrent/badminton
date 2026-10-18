"use server";

import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { status: "idle" | "sent" | "notAllowed" | "rateLimited" | "error" };

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { status: "error" };

  const supabase = await createClient();
  const { data: allowed, error: rpcError } = await supabase.rpc("can_sign_in", { p_email: email });
  if (rpcError) return { status: "error" };
  if (!allowed) return { status: "notAllowed" };

  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? h.get("origin") ?? `https://${h.get("host")}`;
  const locale = await getLocale();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/confirm?next=/${locale}` },
  });
  if (error) {
    console.error("signInWithOtp failed:", error.code, error.message);
    // Supabase's built-in mailer allows only a few emails per hour.
    return { status: error.code === "over_email_send_rate_limit" || error.status === 429 ? "rateLimited" : "error" };
  }
  return { status: "sent" };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect({ href: "/", locale: await getLocale() });
}
