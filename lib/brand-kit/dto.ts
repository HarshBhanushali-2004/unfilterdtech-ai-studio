import type {
  BrandKit,
  Prisma,
} from "@prisma/client";

export type BrandKitDTO = BrandKit;

export type CreateBrandKitInput =
  Prisma.BrandKitCreateInput;

export type UpdateBrandKitInput =
  Prisma.BrandKitUpdateInput;

export interface BrandKitResponse {
  success: boolean;
  message: string;
  data?: BrandKitDTO;
}

export interface BrandKitListResponse {
  success: boolean;
  message: string;
  data: BrandKitDTO[];
}