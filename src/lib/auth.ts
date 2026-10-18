import { createClient } from "./supabase/server";

export type StaffRole = "owner" | "admin";

export type Staff = { email: string; role: StaffRole };

/** The signed-in organizer, or null for viewers. */
export async function getStaff(): Promise<Staff | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const { data } = await supabase
    .from("staff")
    .select("email, role")
    .eq("email", user.email.toLowerCase())
    .maybeSingle();
  return (data as Staff | null) ?? null;
}

export const isOwner = (staff: Staff | null) => staff?.role === "owner";
