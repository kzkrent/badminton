export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const PHOTO_BUCKET = "player-photos";

export const GALLERY_BUCKET = "tournament-photos";

export function photoUrl(path: string | null | undefined, bucket = PHOTO_BUCKET): string | null {
  if (!path || !supabaseUrl) return null;
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}
