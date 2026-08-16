import InvitePage from "@/components/InvitePage";
import { getRegistryPreview } from "@/lib/registry-preview";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { preview, total } = await getRegistryPreview();
  return <InvitePage guest={null} registryPreview={preview} registryTotal={total} />;
}
