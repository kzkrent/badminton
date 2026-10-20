"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { StatusActionState } from "@/app/actions/tournaments";
import { createClient } from "@/lib/supabase/client";
import { GALLERY_BUCKET, photoUrl } from "@/lib/supabase/env";
import { resizeImage } from "@/lib/image-resize";

type Props = {
  tournamentId: string;
  coverPath: string | null;
  setCover: (path: string | null) => Promise<StatusActionState>;
};

const COVER_SIDE = 2000;

/** Upload / replace / remove the tournament cover (resized in the browser). */
export function CoverEditor({ tournamentId, coverPath, setCover }: Props) {
  const t = useTranslations("cover");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const src = photoUrl(coverPath, GALLERY_BUCKET);

  const upload = async (file: File) => {
    setBusy(true);
    setError(false);
    try {
      const { blob } = await resizeImage(file, COVER_SIDE);
      const path = `${tournamentId}/cover-${crypto.randomUUID()}.jpg`;
      const supabase = createClient();
      const { error: upErr } = await supabase.storage.from(GALLERY_BUCKET).upload(path, blob, { contentType: "image/jpeg" });
      if (upErr) throw upErr;
      const res = await setCover(path);
      if (res.error) {
        await supabase.storage.from(GALLERY_BUCKET).remove([path]);
        throw new Error(res.error);
      }
    } catch {
      setError(true);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="card overflow-hidden">
      <div className="relative aspect-[3/1] bg-background">
        {src ? (
          <Image src={src} alt="" fill unoptimized className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted">{t("none")}</div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 p-3">
        <span className="mr-auto text-sm font-medium">{t("title")}</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? t("uploading") : src ? t("replace") : t("upload")}
        </button>
        {src && (
          <button
            type="button"
            className="btn-danger"
            disabled={busy}
            onClick={() => confirm(t("removeConfirm")) && startTransition(() => void setCover(null))}
          >
            {t("remove")}
          </button>
        )}
        <p className="w-full text-xs text-muted">{t("hint")}</p>
        {error && <p className="w-full text-sm text-danger">{t("error")}</p>}
      </div>
    </div>
  );
}
