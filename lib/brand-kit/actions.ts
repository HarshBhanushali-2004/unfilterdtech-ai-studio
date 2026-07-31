"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { formatZodError } from "@/lib/validation";

import {
  CreateBrandKitSchema,
  UpdateBrandKitSchema,
} from "./schema";

export async function getBrandKits() {
  return prisma.brandKit.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getBrandKit(id: string) {
  return prisma.brandKit.findUnique({
    where: {
      id,
    },
  });
}

export async function createBrandKit(input: unknown) {
  const validation = CreateBrandKitSchema.safeParse(input);

  if (!validation.success) {
    throw new Error(formatZodError(validation.error));
  }

  const brandKit = await prisma.brandKit.create({
    data: validation.data,
  });

  revalidatePath("/brand-kit");

  return brandKit;
}

export async function updateBrandKit(
  id: string,
  input: unknown
) {
  const validation = UpdateBrandKitSchema.safeParse(input);

  if (!validation.success) {
    throw new Error(formatZodError(validation.error));
  }

  const brandKit = await prisma.brandKit.update({
    where: {
      id,
    },
    data: validation.data,
  });

  revalidatePath("/brand-kit");

  return brandKit;
}

export async function deleteBrandKit(id: string) {
  await prisma.brandKit.delete({
    where: {
      id,
    },
  });

  revalidatePath("/brand-kit");
}