"use server";

import { revalidatePath } from "next/cache";
import { getStaff, isOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { GALLERY_BUCKET } from "@/lib/supabase/env";

export type PartnerFormState = { error?: "forbidden" | "generic" | "nameRequired" | "badUrl"; ok?: number };

const text = (fd: FormData, key: string) => {
  const v = String(fd.get(key) ?? "").trim();
  return v === "" ? null : v;
};

/** Creates (id = null) or updates a partner. The logo is uploaded by the browser; we get its path. */
export async function savePartner(id: string | null, prev: PartnerFormState, fd: FormData): Promise<PartnerFormState> {
  if (!isOwner(await getStaff())) return { error: "forbidden" };
  const name = text(fd, "name");
  if (!name) return { error: "nameRequired" };

  let url = text(fd, "url");
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
  if (url) {
    try {
      new URL(url);
    } catch {
      return { error: "badUrl" };
    }
  }

  const logoPath = text(fd, "logo_path");
  if (logoPath && !logoPath.startsWith("partners/")) return { error: "forbidden" };

  const row: Record<string, unknown> = {
    name,
    name_en: text(fd, "name_en"),
    url,
    description_ru: text(fd, "description_ru"),
    description_en: text(fd, "description_en"),
    sort: Number(text(fd, "sort") ?? 0) || 0,
  };

  const supabase = await createClient();
  let oldLogo: string | null = null;
  if (id) {
    const { data } = await supabase.from("partners").select("logo_path").eq("id", id).maybeSingle();
    oldLogo = data?.logo_path ?? null;
  }
  if (logoPath) row.logo_path = logoPath;
  else if (fd.get("remove_logo") === "on") row.logo_path = null;

  const { error } = id
    ? await supabase.from("partners").update(row).eq("id", id)
    : await supabase.from("partners").insert(row);
  if (error) return { error: "generic" };

  if (oldLogo && "logo_path" in row && row.logo_path !== oldLogo) {
    await supabase.storage.from(GALLERY_BUCKET).remove([oldLogo]);
  }
  revalidatePath("/[locale]", "layout");
  return { ok: (prev.ok ?? 0) + 1 };
}

export async function deletePartner(id: string) {
  if (!isOwner(await getStaff())) return;
  const supabase = await createClient();
  const { data } = await supabase.from("partners").delete().eq("id", id).select("logo_path");
  const logo = data?.[0]?.logo_path;
  if (logo) await supabase.storage.from(GALLERY_BUCKET).remove([logo]);
  revalidatePath("/[locale]", "layout");
}
