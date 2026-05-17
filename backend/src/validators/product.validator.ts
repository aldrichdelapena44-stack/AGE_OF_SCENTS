import { z } from "zod";

export const productCategorySchema = z.enum(["Men", "Women", "Unisex"]);

export const createProductSchema = z.object({
    name: z.string().min(2),
    slug: z.string().min(2),
    description: z.string().min(5),
    price: z.coerce.number().positive(),
    stock: z.coerce.number().int().min(0),
    imageUrl: z.string().optional(),
    scentNotes: z.string().min(2).optional(),
    volume: z.string().min(1).optional(),
    category: productCategorySchema.optional().default("Unisex"),
});

export const updateProductSchema = z.object({
    name: z.string().min(2).optional(),
    description: z.string().min(5).optional(),
    scentNotes: z.string().min(2).optional(),
    volume: z.string().min(1).optional(),
    price: z.coerce.number().positive().optional(),
    stock: z.coerce.number().int().min(0).optional(),
    imageUrl: z.string().min(1).optional(),
    isActive: z.boolean().optional(),
    category: productCategorySchema.optional(),
});