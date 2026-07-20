"use client";

import { useRef, useState } from "react";

/**
 * A form submit button that first asks for confirmation in a small modal.
 * Rendered as type="button"; on confirm it submits its enclosing <form>, which
 * triggers the server action.
 */
export function ConfirmButton({
  children,
  className,
  message,
  confirmLabel = "Yes, do it",
  tone = "primary",
}: {
  children: React.ReactNode;
  className?: string;
  message: string;
  confirmLabel?: string;
  tone?: "primary" | "danger";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button ref={ref} type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#332c44]/40 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-line bg-white p-7 text-center shadow-[0_24px_60px_-24px_rgba(107,79,150,0.5)]"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-display text-xl text-ink">{message}</p>
            <div className="mt-7 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="cursor-pointer rounded-full border border-line px-5 py-2.5 text-sm tracking-wider uppercase text-ink-dim transition-colors duration-200 hover:bg-[#f3eee7]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  ref.current?.form?.requestSubmit();
                }}
                className={`cursor-pointer rounded-full px-5 py-2.5 text-sm font-medium tracking-wider text-white transition-opacity duration-200 hover:opacity-90 ${
                  tone === "danger"
                    ? "bg-[#a24a56]"
                    : "bg-gradient-to-r from-[#6b4f96] to-[#8a6db1]"
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="cursor-pointer rounded-lg border border-line px-3 py-1.5 text-xs tracking-wider uppercase transition-colors duration-200 hover:bg-[#f0eaf7]"
    >
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}
