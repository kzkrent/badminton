import Image from "next/image";
import { photoUrl } from "@/lib/supabase/env";

type Props = { photoPath: string | null; name: string; size?: number };

export function PlayerAvatar({ photoPath, name, size = 40 }: Props) {
  const src = photoUrl(photoPath);
  const style = { width: size, height: size };

  if (!src) {
    const initials = name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("");
    return (
      <span
        style={{ ...style, fontSize: size * 0.38 }}
        className="inline-flex shrink-0 items-center justify-center rounded-full bg-border font-medium text-muted"
        aria-hidden
      >
        {initials}
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt={name}
      width={size}
      height={size}
      style={style}
      className="shrink-0 rounded-full object-cover"
    />
  );
}
