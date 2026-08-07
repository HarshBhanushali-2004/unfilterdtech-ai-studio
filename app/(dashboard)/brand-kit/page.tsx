import { BrandKitPageClient } from "@/components/brand-kit/brand-kit-page";
import { getBrandKits } from "@/lib/brand-kit/actions";

// Same static-prerendering trap as `/projects` (Section: this page has no
// dynamic API usage Next can key freshness off of, so without this it gets
// statically optimized at build time and stops reflecting new/edited/
// deleted Brand Kits in production).
export const dynamic = "force-dynamic";

export default async function BrandKitPage() {
  const brandKits = await getBrandKits();

  return (
    <BrandKitPageClient
      brandKits={brandKits}
    />
  );
}