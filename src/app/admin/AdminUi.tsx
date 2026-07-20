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
      className="cursor-pointer rounded-lg border border-line px-3 py-1.5 text-xs tracking-wider uppercase transition-colors duration-200 hover:bg-[#f0eaf7]"
    >
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}
