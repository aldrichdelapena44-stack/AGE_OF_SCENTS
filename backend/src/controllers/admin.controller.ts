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
import { getStoreSettings, updateDeliveryLandmarkImageUrl, updateGcashQrUrl, updateStoreSettings } from "../services/store-settings.service";
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

export async function summary(_req: Request, res: Response) {
    try {
        return ok(res, await getAdminSummary(), "Admin summary fetched.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Admin summary failed.", 400);
    }
}

export async function users(_req: Request, res: Response) {
    try {
        return ok(res, await getAdminUsers(), "Admin users fetched.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Admin users fetch failed.", 400);
    }
}

export async function orders(_req: Request, res: Response) {
    try {
        disableCache(res);
        return ok(res, await getAdminOrders(), "Admin orders fetched.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Admin orders fetch failed.", 400);
    }
}

export async function updateAdminOrderStatus(req: Request & { user?: { id: number; fullName: string; role: "ADMIN" | "CUSTOMER" } }, res: Response) {
    try {
        const record = await updateOrderStatus(
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

export async function updateAdminOrderLandmark(req: Request, res: Response) {
    try {
        const status = req.body.landmarkStatus === "REJECTED" ? "REJECTED" : req.body.landmarkStatus === "PENDING" ? "PENDING" : "APPROVED";
        const record = await updateOrderLandmarkStatus(
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

export async function deleteAdminOrder(req: Request, res: Response) {
    try {
        const record = await deleteOrderFromAdmin(Number(req.params.id));
        if (!record) return fail(res, "Order not found.", 404);
        return ok(res, record, "Order deleted from admin view. The client was notified.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Order delete failed.", 400);
    }
}

export async function sendAdminOrderMessage(req: Request & { user?: { id: number; fullName: string; role: "ADMIN" | "CUSTOMER" } }, res: Response) {
    try {
        const record = await addOrderChatMessage(Number(req.params.id), {
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

export async function verifications(_req: Request, res: Response) {
    try {
        return ok(res, await getAdminVerifications(), "Admin verifications fetched.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Admin verifications fetch failed.", 400);
    }
}

export async function products(_req: Request, res: Response) {
    try {
        return ok(res, await getAdminProductList(), "Admin products fetched.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Admin products fetch failed.", 400);
    }
}

export async function stories(_req: Request, res: Response) {
    try {
        return ok(res, await getAdminStoriesList(), "Admin stories fetched.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Admin stories fetch failed.", 400);
    }
}

export async function approveStorySubmission(req: Request, res: Response) {
    try {
        const record = await approveStory(Number(req.params.id));
        if (!record) return fail(res, "Story not found.", 404);
        return ok(res, record, "Story approved.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Story approval failed.", 400);
    }
}

export async function rejectStorySubmission(req: Request, res: Response) {
    try {
        const record = await rejectStory(Number(req.params.id), typeof req.body.reason === "string" ? req.body.reason : undefined);
        if (!record) return fail(res, "Story not found.", 404);
        return ok(res, record, "Story rejected.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Story rejection failed.", 400);
    }
}

export async function deleteStorySubmission(req: Request, res: Response) {
    try {
        const record = await removeStory(Number(req.params.id));
        if (!record) return fail(res, "Story not found.", 404);
        return ok(res, record, "Story removed.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Story delete failed.", 400);
    }
}

export async function storeSettings(_req: Request, res: Response) {
    try {
        disableCache(res);
        return ok(res, await getStoreSettings(), "Store settings fetched.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Store settings fetch failed.", 400);
    }
}

export async function updateStoreSettingsController(req: Request, res: Response) {
    try {
        const settings = await updateStoreSettings(req.body);
        return ok(res, settings, "Store settings updated.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Store settings update failed.", 400);
    }
}

export async function updateStoreGcashQr(req: RequestWithFile, res: Response) {
    try {
        if (!req.file) return fail(res, "GCash QR image is required.", 400);
        const imageUrl = await uploadPublicImage("landmark-images", "settings", req.file);
        const settings = await updateGcashQrUrl(imageUrl);
        return ok(res, settings, "GCash QR code updated.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "GCash QR upload failed.", 400);
    }
}

export async function updateStoreLandmarkImage(req: RequestWithFile, res: Response) {
    try {
        if (!req.file) return fail(res, "Landmark image is required.", 400);
        const imageUrl = await uploadPublicImage("landmark-images", "landmarks", req.file);

        const settings = await updateDeliveryLandmarkImageUrl(Number(req.params.id), imageUrl);
        if (!settings) return fail(res, "Landmark not found. Save checkout settings first, then upload the photo.", 404);
        return ok(res, settings, "Landmark photo updated.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Landmark photo upload failed.", 400);
    }
}

export async function updateAdminProduct(req: Request, res: Response) {
    try {
        const record = await updateProduct(Number(req.params.id), req.body);
        if (!record) return fail(res, "Product not found.", 404);
        return ok(res, record, "Product updated.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Product update failed.", 400);
    }
}

export async function updateAdminProductImage(req: RequestWithFile, res: Response) {
    try {
        const imageUrl = req.file
            ? await uploadPublicImage("product-images", "products", req.file)
            : typeof req.body.imageUrl === "string"
              ? req.body.imageUrl
              : "";

        if (!imageUrl) return fail(res, "Product image is required.", 400);

        const record = await updateProduct(Number(req.params.id), { imageUrl });
        if (!record) return fail(res, "Product not found.", 404);
        return ok(res, record, "Product image updated.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Product image update failed.", 400);
    }
}

export async function feedback(_req: Request, res: Response) {
    try {
        return ok(res, await getAdminFeedback(), "Feedback fetched.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Feedback fetch failed.", 400);
    }
}

export async function reviewFeedback(req: Request, res: Response) {
    try {
        const record = await markFeedbackReviewed(Number(req.params.id));
        if (!record) return fail(res, "Feedback record not found.", 404);
        return ok(res, record, "Feedback marked as reviewed.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Feedback review failed.", 400);
    }
}

export async function removeFeedback(req: Request, res: Response) {
    try {
        const record = await deleteFeedback(Number(req.params.id));
        if (!record) return fail(res, "Feedback record not found.", 404);
        return ok(res, record, "Feedback removed.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Feedback delete failed.", 400);
    }
}

export async function approveVerificationSubmission(req: Request, res: Response) {
    try {
        const record = await approveVerification(Number(req.params.id));
        if (!record) return fail(res, "Verification record not found.", 404);
        return ok(res, record, "Verification approved.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Verification approval failed.", 400);
    }
}

export async function rejectVerificationSubmission(req: Request, res: Response) {
    try {
        const record = await rejectVerification(Number(req.params.id));
        if (!record) return fail(res, "Verification record not found.", 404);
        return ok(res, record, "Verification rejected.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Verification rejection failed.", 400);
    }
}

export async function keepVerificationSubmissionFile(req: Request, res: Response) {
    try {
        const record = await keepVerificationFile(Number(req.params.id));
        if (!record) return fail(res, "Verification record not found.", 404);
        return ok(res, record, "Client file kept in admin storage.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Unable to keep file.", 400);
    }
}

export async function removeVerificationSubmissionFile(req: Request, res: Response) {
    try {
        const record = await removeVerificationFile(Number(req.params.id));
        if (!record) return fail(res, "Verification record not found.", 404);
        return ok(res, record, "Client file removed from storage.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Unable to remove file.", 400);
    }
}

export async function deleteVerificationSubmissionController(req: Request, res: Response) {
    try {
        const record = await deleteVerificationSubmission(Number(req.params.id));
        if (!record) return fail(res, "Verification record not found.", 404);
        return ok(res, record, "Verification submission deleted permanently.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Verification delete failed.", 400);
    }
}
