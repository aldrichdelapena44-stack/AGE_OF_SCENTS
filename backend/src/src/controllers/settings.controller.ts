import path from "path";
import { Request, Response } from "express";
import {
    getPublicCheckoutSettings,
    getStoreSettings,
    updateGcashQrUrl,
    updateStoreSettings
} from "../services/store-settings.service";
import { fail, ok } from "../utils/response";

type RequestWithFile = Request & {
    file?: Express.Multer.File;
};

function toPublicUploadUrl(filePath: string) {
    const normalized = filePath.replace(/\\/g, "/");
    const uploadsIndex = normalized.lastIndexOf("/uploads/");
    if (uploadsIndex >= 0) return normalized.slice(uploadsIndex);
    if (normalized.startsWith("uploads/")) return `/${normalized}`;
    return `/uploads/settings/${path.basename(normalized)}`;
}

export function publicCheckoutSettings(_req: Request, res: Response) {
    return ok(res, getPublicCheckoutSettings(), "Checkout settings fetched.");
}

export function adminSettings(_req: Request, res: Response) {
    return ok(res, getStoreSettings(), "Store settings fetched.");
}

export function updateAdminSettings(req: Request, res: Response) {
    try {
        const settings = updateStoreSettings(req.body);
        return ok(res, settings, "Store settings updated.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Unable to update settings.", 400);
    }
}

export function updateAdminGcashQr(req: RequestWithFile, res: Response) {
    try {
        const gcashQrUrl = req.file?.path ? toPublicUploadUrl(req.file.path) : "";
        if (!gcashQrUrl) return fail(res, "GCash QR image is required.", 400);

        const settings = updateGcashQrUrl(gcashQrUrl);
        return ok(res, settings, "GCash QR code updated.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Unable to upload QR code.", 400);
    }
}
