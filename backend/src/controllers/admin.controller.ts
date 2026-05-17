import path from "path";
import { Request, Response } from "express";
import {
    getAdminFeedback,
    getAdminOrders,
    getAdminProductList,
    getAdminStoriesList,
    getAdminSummary,
    getAdminUsers,
    getAdminVerifications
} from "../services/admin.service";
import { approveStory, rejectStory, removeStory } from "../services/story.service";
import { getStoreSettings, updateGcashQrUrl, updateStoreSettings } from "../services/store-settings.service";
import { deleteFeedback, markFeedbackReviewed } from "../services/feedback.service";
import { updateProduct } from "../services/product.service";
import {
    approveVerification,
    deleteVerificationSubmission,
    keepVerificationFile,
    rejectVerification,
    removeVerificationFile
} from "../services/verification.service";
import { addOrderChatMessage, deleteOrderFromAdmin, updateOrderLandmarkStatus, updateOrderStatus } from "../services/order.service";
import { fail, ok } from "../utils/response";

type RequestWithFile = Request & {
    file?: Express.Multer.File;
};

function toPublicProductUploadUrl(filePath: string) {
    const normalized = filePath.replace(/\\/g, "/");
    const uploadsIndex = normalized.lastIndexOf("/uploads/");
    if (uploadsIndex >= 0) return normalized.slice(uploadsIndex);
    if (normalized.startsWith("uploads/")) return `/${normalized}`;
    const baseName = path.basename(normalized);
    return `/uploads/products/${baseName}`;
}

function disableCache(res: Response) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
}

export function summary(_req: Request, res: Response) {
    return ok(res, getAdminSummary(), "Admin summary fetched.");
}

export function users(_req: Request, res: Response) {
    return ok(res, getAdminUsers(), "Admin users fetched.");
}

export function orders(_req: Request, res: Response) {
    disableCache(res);
    return ok(res, getAdminOrders(), "Admin orders fetched.");
}


export function updateAdminOrderStatus(req: Request & { user?: { id: number; fullName: string; role: "ADMIN" | "CUSTOMER" } }, res: Response) {
    try {
        const record = updateOrderStatus(
            Number(req.params.id),
            req.body.status,
            typeof req.body.deliveryNote === "string" ? req.body.deliveryNote : undefined,
            typeof req.body.shippingFee !== "undefined" ? Number(req.body.shippingFee) : undefined
        );
        if (!record) return fail(res, "Order not found.", 404);
        return ok(res, record, "Order status updated.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Order status update failed.", 400);
    }
}

export function updateAdminOrderLandmark(req: Request, res: Response) {
    try {
        const status = req.body.landmarkStatus === "REJECTED" ? "REJECTED" : req.body.landmarkStatus === "PENDING" ? "PENDING" : "APPROVED";
        const record = updateOrderLandmarkStatus(
            Number(req.params.id),
            status,
            typeof req.body.note === "string" ? req.body.note : undefined,
            typeof req.body.shippingFee !== "undefined" ? Number(req.body.shippingFee) : undefined
        );
        if (!record) return fail(res, "Order not found.", 404);
        return ok(res, record, "Delivery landmark confirmation updated.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Landmark update failed.", 400);
    }
}


export function deleteAdminOrder(req: Request, res: Response) {
    const record = deleteOrderFromAdmin(Number(req.params.id));
    if (!record) return fail(res, "Order not found.", 404);
    return ok(res, record, "Order deleted from admin view. The client was notified.");
}

export function sendAdminOrderMessage(req: Request & { user?: { id: number; fullName: string; role: "ADMIN" | "CUSTOMER" } }, res: Response) {
    try {
        const record = addOrderChatMessage(Number(req.params.id), {
            senderId: req.user!.id,
            senderName: req.user!.fullName || "Admin",
            senderRole: "ADMIN",
            message: String(req.body.message || "")
        });
        if (!record) return fail(res, "Order not found.", 404);
        return ok(res, record, "Message sent.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Message failed.", 400);
    }
}

export function verifications(_req: Request, res: Response) {
    return ok(res, getAdminVerifications(), "Admin verifications fetched.");
}

export function products(_req: Request, res: Response) {
    return ok(res, getAdminProductList(), "Admin products fetched.");
}

export function stories(_req: Request, res: Response) {
    return ok(res, getAdminStoriesList(), "Admin stories fetched.");
}

export function approveStorySubmission(req: Request, res: Response) {
    const record = approveStory(Number(req.params.id));
    if (!record) return fail(res, "Story not found.", 404);
    return ok(res, record, "Story approved.");
}

export function rejectStorySubmission(req: Request, res: Response) {
    const record = rejectStory(Number(req.params.id), typeof req.body.reason === "string" ? req.body.reason : undefined);
    if (!record) return fail(res, "Story not found.", 404);
    return ok(res, record, "Story rejected.");
}

export function deleteStorySubmission(req: Request, res: Response) {
    const record = removeStory(Number(req.params.id));
    if (!record) return fail(res, "Story not found.", 404);
    return ok(res, record, "Story removed.");
}

export function storeSettings(_req: Request, res: Response) {
    disableCache(res);
    return ok(res, getStoreSettings(), "Store settings fetched.");
}

export function updateStoreSettingsController(req: Request, res: Response) {
    try {
        const settings = updateStoreSettings(req.body);
        return ok(res, settings, "Store settings updated.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Store settings update failed.", 400);
    }
}

export function updateStoreGcashQr(req: RequestWithFile, res: Response) {
    try {
        const imageUrl = req.file?.path ? toPublicProductUploadUrl(req.file.path).replace("/uploads/products/", "/uploads/settings/") : "";
        if (!imageUrl) return fail(res, "GCash QR image is required.", 400);
        const settings = updateGcashQrUrl(imageUrl);
        return ok(res, settings, "GCash QR code updated.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "GCash QR upload failed.", 400);
    }
}

export function updateAdminProduct(req: Request, res: Response) {
    try {
        const record = updateProduct(Number(req.params.id), req.body);
        if (!record) return fail(res, "Product not found.", 404);
        return ok(res, record, "Product updated.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Product update failed.", 400);
    }
}

export function updateAdminProductImage(req: RequestWithFile, res: Response) {
    try {
        const imageUrl = req.file?.path
            ? toPublicProductUploadUrl(req.file.path)
            : typeof req.body.imageUrl === "string"
              ? req.body.imageUrl
              : "";

        if (!imageUrl) return fail(res, "Product image is required.", 400);

        const record = updateProduct(Number(req.params.id), { imageUrl });
        if (!record) return fail(res, "Product not found.", 404);
        return ok(res, record, "Product image updated.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Product image update failed.", 400);
    }
}

export function feedback(_req: Request, res: Response) {
    return ok(res, getAdminFeedback(), "Feedback fetched.");
}

export function reviewFeedback(req: Request, res: Response) {
    const record = markFeedbackReviewed(Number(req.params.id));
    if (!record) return fail(res, "Feedback record not found.", 404);
    return ok(res, record, "Feedback marked as reviewed.");
}

export function removeFeedback(req: Request, res: Response) {
    const record = deleteFeedback(Number(req.params.id));
    if (!record) return fail(res, "Feedback record not found.", 404);
    return ok(res, record, "Feedback removed.");
}

export function approveVerificationSubmission(req: Request, res: Response) {
    const record = approveVerification(Number(req.params.id));
    if (!record) return fail(res, "Verification record not found.", 404);
    return ok(res, record, "Verification approved.");
}

export function rejectVerificationSubmission(req: Request, res: Response) {
    const record = rejectVerification(Number(req.params.id));
    if (!record) return fail(res, "Verification record not found.", 404);
    return ok(res, record, "Verification rejected.");
}

export function keepVerificationSubmissionFile(req: Request, res: Response) {
    try {
        const record = keepVerificationFile(Number(req.params.id));
        if (!record) return fail(res, "Verification record not found.", 404);
        return ok(res, record, "Client file kept in admin storage.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Unable to keep file.", 400);
    }
}

export function removeVerificationSubmissionFile(req: Request, res: Response) {
    const record = removeVerificationFile(Number(req.params.id));
    if (!record) return fail(res, "Verification record not found.", 404);
    return ok(res, record, "Client file removed from storage.");
}

export function deleteVerificationSubmissionController(req: Request, res: Response) {
    const record = deleteVerificationSubmission(Number(req.params.id));
    if (!record) return fail(res, "Verification record not found.", 404);
    return ok(res, record, "Verification submission deleted permanently.");
}
