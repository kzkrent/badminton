/** Plain text with http(s) links made clickable (e.g. a Google Maps link to the venue). */
export function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noopener" className="break-all text-accent hover:underline">
            {part.replace(/^https?:\/\//, "")}
          </a>
        ) : (
          part
        ),
      )}
    </>
  );
}
