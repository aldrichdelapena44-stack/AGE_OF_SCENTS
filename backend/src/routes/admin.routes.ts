import { Router } from "express";
import {
    approveVerificationSubmission,
    deleteAdminOrder,
    deleteVerificationSubmissionController,
    feedback,
    keepVerificationSubmissionFile,
    orders,
    updateAdminOrderStatus,
    updateAdminOrderLandmark,
    sendAdminOrderMessage,
    products,
    stories,
    approveStorySubmission,
    rejectStorySubmission,
    deleteStorySubmission,
    storeSettings,
    updateStoreSettingsController,
    updateStoreGcashQr,
    updateStoreLandmarkImage,
    rejectVerificationSubmission,
    removeFeedback,
    removeVerificationSubmissionFile,
    reviewFeedback,
    summary,
    updateAdminProduct,
    updateAdminProductImage,
    users,
    verifications
} from "../controllers/admin.controller";
import { requireAdmin } from "../middlewares/auth.middleware";
import { uploadProductImage, uploadSettingsImage } from "../middlewares/upload.middleware";
import { validateBody } from "../middlewares/validation.middleware";
import { updateProductSchema } from "../validators/product.validator";

const router = Router();

router.get("/summary", requireAdmin, summary);
router.get("/users", requireAdmin, users);
router.get("/orders", requireAdmin, orders);
router.put("/orders/:id/status", requireAdmin, updateAdminOrderStatus);
router.put("/orders/:id/landmark", requireAdmin, updateAdminOrderLandmark);
router.post("/orders/:id/messages", requireAdmin, sendAdminOrderMessage);
router.delete("/orders/:id", requireAdmin, deleteAdminOrder);
router.get("/products", requireAdmin, products);
router.get("/stories", requireAdmin, stories);
router.put("/stories/:id/approve", requireAdmin, approveStorySubmission);
router.put("/stories/:id/reject", requireAdmin, rejectStorySubmission);
router.delete("/stories/:id", requireAdmin, deleteStorySubmission);
router.get("/settings", requireAdmin, storeSettings);
router.put("/settings", requireAdmin, updateStoreSettingsController);
router.put("/settings/gcash-qr", requireAdmin, uploadSettingsImage.single("image"), updateStoreGcashQr);
router.put("/settings/landmarks/:id/image", requireAdmin, uploadSettingsImage.single("image"), updateStoreLandmarkImage);
router.put("/products/:id", requireAdmin, validateBody(updateProductSchema), updateAdminProduct);
router.put("/products/:id/image", requireAdmin, uploadProductImage.single("image"), updateAdminProductImage);
router.get("/feedback", requireAdmin, feedback);
router.put("/feedback/:id/review", requireAdmin, reviewFeedback);
router.delete("/feedback/:id", requireAdmin, removeFeedback);
router.get("/verifications", requireAdmin, verifications);
router.put("/verifications/:id/approve", requireAdmin, approveVerificationSubmission);
router.put("/verifications/:id/reject", requireAdmin, rejectVerificationSubmission);
router.put("/verifications/:id/file/keep", requireAdmin, keepVerificationSubmissionFile);
router.put("/verifications/:id/file/remove", requireAdmin, removeVerificationSubmissionFile);
router.delete("/verifications/:id", requireAdmin, deleteVerificationSubmissionController);

export default router;
