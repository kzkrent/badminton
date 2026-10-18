"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getStaff, isOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PHOTO_BUCKET } from "@/lib/supabase/env";

export type PlayerFormState = {
  error?: "forbidden" | "generic" | "photoTooBig" | "photoType";
  fieldErrors?: { first_name_ru?: "required"; gender?: "required" };
};

const MAX_PHOTO = 5 * 1024 * 1024;
const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

const text = (fd: FormData, key: string) => {
  const v = String(fd.get(key) ?? "").trim();
  return v === "" ? null : v;
};

function readFields(fd: FormData) {
  const ratingText = text(fd, "rating");
  const rating = ratingText === null ? null : Number(ratingText.replace(",", "."));
  return {
    first_name_ru: text(fd, "first_name_ru") ?? "",
    last_name_ru: text(fd, "last_name_ru"),
    first_name_en: text(fd, "first_name_en"),
    last_name_en: text(fd, "last_name_en"),
    birth_date: text(fd, "birth_date"),
    gender: text(fd, "gender"),
    club: text(fd, "club"),
    rating: rating === null || Number.isNaN(rating) ? null : rating,
    achievements: text(fd, "achievements"),
  };
}

function validate(fields: ReturnType<typeof readFields>): PlayerFormState | null {
  const fieldErrors: PlayerFormState["fieldErrors"] = {};
  if (!fields.first_name_ru) fieldErrors.first_name_ru = "required";
  if (fields.gender !== "M" && fields.gender !== "F") fieldErrors.gender = "required";
  return Object.keys(fieldErrors).length ? { fieldErrors } : null;
}

function readPhoto(fd: FormData): File | null | PlayerFormState {
  const file = fd.get("photo");
  if (!(file instanceof File) || file.size === 0) return null;
  if (!PHOTO_TYPES[file.type]) return { error: "photoType" };
  if (file.size > MAX_PHOTO) return { error: "photoTooBig" };
  return file;
}

async function uploadPhoto(supabase: Awaited<ReturnType<typeof createClient>>, file: File) {
  const path = `${crypto.randomUUID()}.${PHOTO_TYPES[file.type]}`;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, { contentType: file.type });
  return error ? null : path;
}

export async function createPlayer(_prev: PlayerFormState, fd: FormData): Promise<PlayerFormState> {
  if (!(await getStaff())) return { error: "forbidden" };
  const fields = readFields(fd);
  const invalid = validate(fields);
  if (invalid) return invalid;
  const photo = readPhoto(fd);
  if (photo && !(photo instanceof File)) return photo;

  const supabase = await createClient();
  const photo_path = photo ? await uploadPhoto(supabase, photo) : null;
  if (photo && !photo_path) return { error: "generic" };

  const { data, error } = await supabase
    .from("players")
    .insert({ ...fields, photo_path })
    .select("id")
    .single();
  if (error) return { error: "generic" };

  revalidatePath("/[locale]/players", "layout");
  redirect({ href: `/players/${data.id}`, locale: await getLocale() });
  return {};
}

export async function updatePlayer(id: string, _prev: PlayerFormState, fd: FormData): Promise<PlayerFormState> {
  if (!isOwner(await getStaff())) return { error: "forbidden" };
  const fields = readFields(fd);
  const invalid = validate(fields);
  if (invalid) return invalid;
  const photo = readPhoto(fd);
  if (photo && !(photo instanceof File)) return photo;

  const supabase = await createClient();
  const { data: current } = await supabase.from("players").select("photo_path").eq("id", id).single();
  const oldPath: string | null = current?.photo_path ?? null;

  let photo_path = oldPath;
  if (photo) {
    photo_path = await uploadPhoto(supabase, photo);
    if (!photo_path) return { error: "generic" };
  } else if (fd.get("remove_photo") === "on") {
    photo_path = null;
  }

  const { error } = await supabase
    .from("players")
    .update({ ...fields, photo_path })
    .eq("id", id);
  if (error) return { error: "generic" };
  if (oldPath && oldPath !== photo_path) await supabase.storage.from(PHOTO_BUCKET).remove([oldPath]);

  revalidatePath("/[locale]/players", "layout");
  redirect({ href: `/players/${id}`, locale: await getLocale() });
  return {};
}

export async function deletePlayer(id: string) {
  if (!isOwner(await getStaff())) return;
  const supabase = await createClient();
  const { data } = await supabase.from("players").delete().eq("id", id).select("photo_path").single();
  if (data?.photo_path) await supabase.storage.from(PHOTO_BUCKET).remove([data.photo_path]);

  revalidatePath("/[locale]/players", "layout");
  redirect({ href: "/players", locale: await getLocale() });
}
