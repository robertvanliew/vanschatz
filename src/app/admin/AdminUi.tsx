"use client";

import { useState } from "react";

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="rounded-lg border border-white/20 px-3 py-1.5 text-xs uppercase tracking-wider hover:bg-white/10"
    >
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}
