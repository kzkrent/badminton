"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { GALLERY_BUCKET, photoUrl } from "@/lib/supabase/env";
import { resizeImage } from "@/lib/image-resize";

export type TournamentPhoto = {
  id: string;
  path: string;
  thumb_path: string;
  width: number | null;
  height: number | null;
  uploaded_by: string;
};

type Props = {
  tournamentId: string;
  photos: TournamentPhoto[];
  /** Signed-in organizer, if any: can upload; deletes own photos (owner deletes all). */
  staff: { email: string; isOwner: boolean } | null;
};

const FULL_SIDE = 2000;
const THUMB_SIDE = 480;

export function TournamentGallery({ tournamentId, photos, staff }: Props) {
  const t = useTranslations("gallery");
  const router = useRouter();
  const [open, setOpen] = useState<number | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  if (photos.length === 0 && !staff) return null;

  const upload = async (files: FileList) => {
    const supabase = createClient();
    const list = [...files];
    const failed: string[] = [];
    setErrors([]);
    setProgress({ done: 0, total: list.length });
    for (const [i, file] of list.entries()) {
      try {
        const full = await resizeImage(file, FULL_SIDE);
        const thumb = await resizeImage(file, THUMB_SIDE, 0.8);
        const id = crypto.randomUUID();
        const path = `${tournamentId}/${id}.jpg`;
        const thumbPath = `${tournamentId}/${id}_thumb.jpg`;
        const bucket = supabase.storage.from(GALLERY_BUCKET);
        const up1 = await bucket.upload(path, full.blob, { contentType: "image/jpeg" });
        const up2 = await bucket.upload(thumbPath, thumb.blob, { contentType: "image/jpeg" });
        if (up1.error || up2.error) throw up1.error ?? up2.error;
        const { error } = await supabase.from("tournament_photos").insert({
          tournament_id: tournamentId,
          path,
          thumb_path: thumbPath,
          width: full.width,
          height: full.height,
        });
        if (error) {
          await bucket.remove([path, thumbPath]);
          throw error;
        }
      } catch {
        failed.push(file.name);
      }
      setProgress({ done: i + 1, total: list.length });
    }
    setProgress(null);
    setErrors(failed);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  };

  const remove = async (photo: TournamentPhoto) => {
    if (!confirm(t("deleteConfirm"))) return;
    const supabase = createClient();
    const { data } = await supabase.from("tournament_photos").delete().eq("id", photo.id).select("id");
    if (data?.length) await supabase.storage.from(GALLERY_BUCKET).remove([photo.path, photo.thumb_path]);
    setOpen(null);
    router.refresh();
  };

  const canDelete = (p: TournamentPhoto) => !!staff && (staff.isOwner || p.uploaded_by === staff.email);

  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="mr-auto text-lg font-semibold">{t("title")}</h2>
        {staff && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => e.target.files?.length && upload(e.target.files)}
            />
            <button
              type="button"
              className="btn-secondary"
              disabled={!!progress}
              onClick={() => inputRef.current?.click()}
            >
              {progress ? t("uploading", progress) : `+ ${t("upload")}`}
            </button>
          </>
        )}
      </div>

      {errors.length > 0 && <p className="mb-3 text-sm text-danger">{t("errUpload", { names: errors.join(", ") })}</p>}

      {photos.length === 0 ? (
        <div className="card p-6 text-sm text-muted">{t("empty")}</div>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setOpen(i)}
                className="block aspect-square w-full cursor-zoom-in overflow-hidden rounded-lg bg-border"
                aria-label={t("photoOf", { n: i + 1, total: photos.length })}
              >
                <Image
                  src={photoUrl(p.thumb_path, GALLERY_BUCKET)!}
                  alt=""
                  width={THUMB_SIDE}
                  height={THUMB_SIDE}
                  unoptimized
                  className="h-full w-full object-cover transition-transform hover:scale-105"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      {open !== null && photos[open] && (
        <Lightbox
          photos={photos}
          index={open}
          onIndex={setOpen}
          onClose={() => setOpen(null)}
          onDelete={canDelete(photos[open]) ? () => remove(photos[open]) : undefined}
        />
      )}
    </section>
  );
}

function Lightbox({
  photos,
  index,
  onIndex,
  onClose,
  onDelete,
}: {
  photos: TournamentPhoto[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  onDelete?: () => void;
}) {
  const t = useTranslations("gallery");
  const touchX = useRef<number | null>(null);
  const prev = useCallback(() => onIndex((index - 1 + photos.length) % photos.length), [index, photos.length, onIndex]);
  const next = useCallback(() => onIndex((index + 1) % photos.length), [index, photos.length, onIndex]);
  const photo = photos[index];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, prev, next]);

  const navButton = "absolute top-1/2 -translate-y-1/2 cursor-pointer rounded-full bg-black/50 px-3 py-2 text-2xl text-white hover:bg-black/70";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      role="dialog"
      aria-modal
      aria-label={t("photoOf", { n: index + 1, total: photos.length })}
      onClick={onClose}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) (dx > 0 ? prev : next)();
        touchX.current = null;
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- full-size original, already resized on upload */}
      <img
        src={photoUrl(photo.path, GALLERY_BUCKET)!}
        alt=""
        className="max-h-[90vh] max-w-[95vw] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      <div className="absolute top-3 right-3 left-3 flex items-center gap-2 text-sm text-white" onClick={(e) => e.stopPropagation()}>
        <span className="mr-auto">{t("photoOf", { n: index + 1, total: photos.length })}</span>
        <a href={photoUrl(photo.path, GALLERY_BUCKET)!} target="_blank" rel="noreferrer" className="rounded bg-black/50 px-3 py-1 hover:bg-black/70">
          {t("original")}
        </a>
        {onDelete && (
          <button type="button" onClick={onDelete} className="cursor-pointer rounded bg-black/50 px-3 py-1 hover:bg-danger">
            {t("delete")}
          </button>
        )}
        <button type="button" onClick={onClose} className="cursor-pointer rounded bg-black/50 px-3 py-1 hover:bg-black/70" aria-label={t("close")}>
          ✕
        </button>
      </div>
      {photos.length > 1 && (
        <>
          <button type="button" className={`${navButton} left-3`} onClick={(e) => (e.stopPropagation(), prev())} aria-label={t("prev")}>
            ‹
          </button>
          <button type="button" className={`${navButton} right-3`} onClick={(e) => (e.stopPropagation(), next())} aria-label={t("next")}>
            ›
          </button>
        </>
      )}
    </div>
  );
}
