"use server";

import { revalidatePath } from "next/cache";
import { getStaff, isOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type OrganizerFormState = { error?: "forbidden" | "generic" | "nameRequired"; ok?: number };

const text = (fd: FormData, key: string) => {
  const v = String(fd.get(key) ?? "").trim();
  return v === "" ? null : v;
};

/** Creates and links the signed-in organizer's own profile (once). */
export async function createMyProfile(): Promise<OrganizerFormState> {
  const staff = await getStaff();
  if (!staff) return { error: "forbidden" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("ensure_my_organizer", { p_name: staff.email.split("@")[0] });
  if (error) return { error: "generic" };
  revalidatePath("/[locale]", "layout");
  return { ok: 1 };
}

/** Owner adds a profile (id = null) or anyone edits a profile RLS lets them edit (own; owner — all). */
export async function saveOrganizer(id: string | null, prev: OrganizerFormState, fd: FormData): Promise<OrganizerFormState> {
  const staff = await getStaff();
  if (!staff || (!id && !isOwner(staff))) return { error: "forbidden" };
  const name = text(fd, "name");
  if (!name) return { error: "nameRequired" };
  const row = {
    name,
    name_en: text(fd, "name_en"),
    phone: text(fd, "phone"),
    whatsapp: text(fd, "whatsapp"),
    telegram: text(fd, "telegram"),
    line_id: text(fd, "line_id"),
  };

  const supabase = await createClient();
  if (id) {
    const { data, error } = await supabase.from("organizers").update(row).eq("id", id).select("id");
    if (error) return { error: "generic" };
    if (!data?.length) return { error: "forbidden" };
  } else {
    const { error } = await supabase.from("organizers").insert(row);
    if (error) return { error: "generic" };
  }
  revalidatePath("/[locale]", "layout");
  return { ok: (prev.ok ?? 0) + 1 };
}

export async function deleteOrganizer(id: string) {
  if (!isOwner(await getStaff())) return;
  const supabase = await createClient();
  await supabase.from("organizers").delete().eq("id", id);
  revalidatePath("/[locale]", "layout");
}
