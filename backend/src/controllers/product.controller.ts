import { Request, Response } from "express";
import { getAllProducts, getProductBySlug } from "../services/product.service";
import { fail, ok } from "../utils/response";

export function listProducts(_req: Request, res: Response) {
    return ok(res, getAllProducts(), "Products fetched.");
}

export function getProduct(req: Request, res: Response) {
    const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
    const product = getProductBySlug(slug);

    if (!product) {
        return fail(res, "Product not found.", 404);
    }

    return ok(res, product, "Product fetched.");
}