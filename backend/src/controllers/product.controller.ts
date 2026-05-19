import { Request, Response } from "express";
import { getAllProducts, getProductBySlug } from "../services/product.service";
import { fail, ok } from "../utils/response";

export async function listProducts(_req: Request, res: Response) {
    try {
        return ok(res, await getAllProducts(), "Products fetched.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Products fetch failed.", 400);
    }
}

export async function getProduct(req: Request, res: Response) {
    try {
        const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
        const product = await getProductBySlug(slug);

        if (!product) {
            return fail(res, "Product not found.", 404);
        }

        return ok(res, product, "Product fetched.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Product fetch failed.", 400);
    }
}
