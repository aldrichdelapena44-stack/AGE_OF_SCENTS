import { z } from "zod";

export const verificationSchema = z.object({
    documentType: z.enum(["NATIONAL_ID", "DRIVERS_LICENSE", "PASSPORT", "SCHOOL_ID", "OTHER"]),
    imageUrl: z.string().optional()
});
