import { Platform } from "@prisma/client";
import { z } from "zod";

export const PlatformSchema = z.enum(Platform);
