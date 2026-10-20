"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { PartnerFormState } from "@/app/actions/partners";
import type { Partner } from "@/lib/partners";
import { createClient } from "@/lib/supabase/client";
import { GALLERY_BUCKET } from "@/lib/supabase/env";
import { resizeImage } from "@/lib/image-resize";

type Props = {
  action: (prev: PartnerFormState, fd: FormData) => Promise<PartnerFormState>;
  partner?: Partner;
  onDone: () => void;
};

const LOGO_SIDE = 600;

export function PartnerForm({ action, partner, onDone }: Props) {
  const t = useTranslations("partners");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: PartnerFormState, fd: FormData) => {
    const result = await action(prev, fd);
    if (result.ok) onDone();
    return result;
  }, {});

  const submit = async (form: HTMLFormElement) => {
    const fd = new FormData(form);
    fd.delete("logo_file");
    const file = fileRef.current?.files?.[0];
    if (file) {
      setUploading(true);
      setUploadError(false);
      try {
        // PNG/WebP logos keep transparency; photos become JPEG.
        const png = file.type === "image/png" || file.type === "image/webp";
        const { blob } = await resizeImage(file, LOGO_SIDE, 0.9, png ? "image/png" : "image/jpeg");
        const path = `partners/${crypto.randomUUID()}.${png ? "png" : "jpg"}`;
        const { error } = await createClient()
          .storage.from(GALLERY_BUCKET)
          .upload(path, blob, { contentType: png ? "image/png" : "image/jpeg" });
        if (error) throw error;
        fd.set("logo_path", path);
      } catch {
        setUploadError(true);
        setUploading(false);
        return;
      }
      setUploading(false);
    }
    startTransition(() => formAction(fd));
  };

  const error =
    state.error === "nameRequired" || state.error === "badUrl"
      ? t(state.error)
      : state.error
        ? te(state.error)
        : uploadError
          ? t("logoError")
          : null;

  const input = (name: keyof Partner, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block text-sm">
      <span className="label">{label}</span>
      <input name={name} defaultValue={(partner?.[name] as string | number | null) ?? ""} className="input" {...props} />
    </label>
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit(e.currentTarget);
      }}
      className="card space-y-4 p-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {input("name", `${t("name")} *`, { required: true })}
        {input("name_en", t("nameEn"))}
        {input("url", t("url"), { placeholder: "https://" })}
        {input("sort", t("sort"), { type: "number", step: 1 })}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="label">{t("descriptionRu")}</span>
          <textarea name="description_ru" rows={3} defaultValue={partner?.description_ru ?? ""} className="input" />
        </label>
        <label className="block text-sm">
          <span className="label">{t("descriptionEn")}</span>
          <textarea name="description_en" rows={3} defaultValue={partner?.description_en ?? ""} className="input" />
        </label>
      </div>
      <div className="text-sm">
        <span className="label">{t("logo")}</span>
        <input ref={fileRef} name="logo_file" type="file" accept="image/png,image/jpeg,image/webp" />
        <p className="mt-1 text-xs text-muted">{t("logoHint")}</p>
        {partner?.logo_path && (
          <label className="mt-2 flex items-center gap-2">
            <input type="checkbox" name="remove_logo" />
            {t("removeLogo")}
          </label>
        )}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-3">
        <button className="btn-primary" disabled={pending || uploading}>
          {tc("save")}
        </button>
        <button type="button" onClick={onDone} className="btn-secondary">
          {tc("cancel")}
        </button>
      </div>
    </form>
  );
}
