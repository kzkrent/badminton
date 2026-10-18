"use server";

import { revalidatePath } from "next/cache";
import { getStaff, isOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type StaffFormState = { error?: "forbidden" | "invalidEmail" | "exists" | "generic"; ok?: boolean };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function addAdmin(_prev: StaffFormState, formData: FormData): Promise<StaffFormState> {
  if (!isOwner(await getStaff())) return { error: "forbidden" };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: "invalidEmail" };

  const supabase = await createClient();
  const { error } = await supabase.from("staff").insert({ email, role: "admin" });
  if (error) return { error: error.code === "23505" ? "exists" : "generic" };

  revalidatePath("/[locale]/staff", "page");
  return { ok: true };
}

export async function removeAdmin(formData: FormData) {
  if (!isOwner(await getStaff())) return;
  const email = String(formData.get("email") ?? "");
  const supabase = await createClient();
  await supabase.from("staff").delete().eq("email", email).eq("role", "admin");
  revalidatePath("/[locale]/staff", "page");
}
