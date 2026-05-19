import { Request, Response } from "express";
import {
    getPublicCheckoutSettings,
    getStoreSettings,
    updateGcashQrUrl,
    updateStoreSettings
} from "../services/store-settings.service";
import { uploadPublicImage } from "../config/supabase";
import { fail, ok } from "../utils/response";

type RequestWithFile = Request & {
    file?: Express.Multer.File;
};

function disableCache(res: Response) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
}

export async function publicCheckoutSettings(_req: Request, res: Response) {
    try {
        disableCache(res);
        return ok(res, await getPublicCheckoutSettings(), "Checkout settings fetched.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Checkout settings fetch failed.", 400);
    }
}

export async function adminSettings(_req: Request, res: Response) {
    try {
        disableCache(res);
        return ok(res, await getStoreSettings(), "Store settings fetched.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Store settings fetch failed.", 400);
    }
}

export async function updateAdminSettings(req: Request, res: Response) {
    try {
        const settings = await updateStoreSettings(req.body);
        return ok(res, settings, "Store settings updated.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Unable to update settings.", 400);
    }
}

export async function updateAdminGcashQr(req: RequestWithFile, res: Response) {
    try {
        if (!req.file) return fail(res, "GCash QR image is required.", 400);
        const gcashQrUrl = await uploadPublicImage("landmark-images", "settings", req.file);
        const settings = await updateGcashQrUrl(gcashQrUrl);
        return ok(res, settings, "GCash QR code updated.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Unable to upload QR code.", 400);
    }
}
