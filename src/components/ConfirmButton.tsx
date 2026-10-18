"use client";

type Props = { message: string; className?: string; children: React.ReactNode };

/** Submit button that asks for confirmation before submitting its form. */
export function ConfirmButton({ message, className, children }: Props) {
  return (
    <button
      className={className}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
