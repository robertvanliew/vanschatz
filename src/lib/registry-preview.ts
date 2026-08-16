import { listGifts } from "@/lib/gifts";
import { placeholderInitials } from "@/lib/registry";
import type { RegistryPreviewGift } from "@/components/Sections";

/**
 * Data for the Gifts teaser: the total, plus three thumbnails.
 *
 * Gifts that still have a photograph are preferred for the preview, so the
 * teaser doesn't lead with three placeholder tiles while real product shots sit
 * further down the list.
 */
export async function getRegistryPreview(): Promise<{
  preview: RegistryPreviewGift[];
  total: number;
}> {
  const gifts = await listGifts();
  const withImage = gifts.filter((g) => g.image);
  const chosen = (withImage.length >= 3 ? withImage : gifts).slice(0, 3);

  return {
    total: gifts.length,
    preview: chosen.map((g) => ({
      id: g.id,
      title: g.title,
      image: g.image,
      initials: placeholderInitials(g.title),
    })),
  };
}
