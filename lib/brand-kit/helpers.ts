import type { BrandKit } from "@prisma/client";

export function serializeBrandKit(brandKit: BrandKit) {
  return {
    ...brandKit,
    createdAt: brandKit.createdAt.toISOString(),
    updatedAt: brandKit.updatedAt.toISOString(),
  };
}

export function serializeBrandKits(brandKits: BrandKit[]) {
  return brandKits.map(serializeBrandKit);
}