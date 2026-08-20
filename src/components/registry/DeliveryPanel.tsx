"use client";

import { useState } from "react";
import { addressLines, addressOneLine, type Delivery, type Shipping } from "@/lib/shipping";

/**
 * Shown once a guest has claimed a gift: how are they getting it to the couple?
 *
 * The address appears at the moment it is needed — the guest is about to paste
 * it into a retailer's checkout — rather than sitting in a footer they have to
 * go hunting for afterwards.
 */
export default function DeliveryPanel({
  shipping,
  delivery,
  pending,
  onChoose,
}: {
  /** Null on the public registry, where the address is never sent. */
  shipping: Shipping | null;
  delivery: Delivery | null;
  pending: boolean;
  onChoose: (choice: Delivery) => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!shipping) return;
    try {
      await navigator.clipboard.writeText(addressOneLine(shipping));
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard access can be refused (older browsers, insecure contexts).
      // The address is on screen regardless, so this is not worth an error.
      setCopied(false);
    }
  }

  const choiceBtn =
    "flex-1 rounded-full px-3 py-2 text-xs font-medium transition-colors disabled:opacity-60";

  return (
    <div className="mt-3 rounded-2xl bg-[#faf8f4] p-3">
      <p className="text-center text-[11px] tracking-wide text-ink-dim">
        {delivery ? "Getting it to us" : "How will you get it to us?"}
      </p>

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => onChoose("SHIP")}
          disabled={pending}
          aria-pressed={delivery === "SHIP"}
          className={`${choiceBtn} ${
            delivery === "SHIP"
              ? "bg-gradient-to-r from-[#6b4f96] to-[#8a6db1] text-white"
              : "border border-[#e0d4f0] bg-white text-[#6b4f96] hover:bg-[#f4eefb]"
          }`}
        >
          Post it to you
        </button>
        <button
          type="button"
          onClick={() => onChoose("BRING")}
          disabled={pending}
          aria-pressed={delivery === "BRING"}
          className={`${choiceBtn} ${
            delivery === "BRING"
              ? "bg-gradient-to-r from-[#6b4f96] to-[#8a6db1] text-white"
              : "border border-[#e0d4f0] bg-white text-[#6b4f96] hover:bg-[#f4eefb]"
          }`}
        >
          Bring it on the day
        </button>
      </div>

      {delivery === "SHIP" && (
        <div className="mt-3">
          {shipping ? (
            <>
              <address className="not-italic text-center text-sm leading-relaxed text-ink">
                {addressLines(shipping).map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </address>
              <button
                type="button"
                onClick={copy}
                className="mt-3 w-full rounded-full border border-[#e0d4f0] bg-white px-4 py-2 text-xs font-medium text-[#6b4f96] transition-colors hover:bg-[#f4eefb]"
              >
                {copied ? "Copied" : "Copy address"}
              </button>
              {shipping.arriveBy && (
                <p className="mt-2 text-center text-[11px] text-ink-dim">
                  Please aim for it to arrive by {shipping.arriveBy}.
                </p>
              )}
            </>
          ) : (
            <p className="text-center text-xs text-ink-dim">
              Open your personal invitation link to see where to send it.
            </p>
          )}
        </div>
      )}

      {delivery === "BRING" && (
        <p className="mt-3 text-center text-xs text-ink-dim">
          Wonderful — we&rsquo;ll see it on the day.
        </p>
      )}
    </div>
  );
}
