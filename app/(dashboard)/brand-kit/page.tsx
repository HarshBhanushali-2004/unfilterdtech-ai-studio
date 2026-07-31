import { BrandKitPageClient } from "@/components/brand-kit/brand-kit-page";
import { getBrandKits } from "@/lib/brand-kit/actions";

export default async function BrandKitPage() {
  const brandKits = await getBrandKits();

  return (
    <BrandKitPageClient
      brandKits={brandKits}
    />
  );
}