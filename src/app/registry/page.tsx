import type { Metadata } from "next";
import RegistryPage from "@/components/registry/RegistryPage";
import { listGifts } from "@/lib/gifts";
import { readFund } from "@/lib/fund-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gifts — Julie & Robert",
  description: "A few things Julie & Robert have had their eye on.",
};

/**
 * The public registry. Browsing and buying work for anyone with the link;
 * claiming needs a personal invitation, so the page offers it read-only.
 */
export default async function PublicRegistry() {
  // No address is read here at all — it cannot leak into a public page's HTML.
  const [gifts, fund] = await Promise.all([listGifts(), readFund()]);
  return (
    <RegistryPage
      gifts={gifts}
      guestId={null}
      guestName={null}
      token={null}
      shipping={null}
      fund={fund}
    />
  );
}
