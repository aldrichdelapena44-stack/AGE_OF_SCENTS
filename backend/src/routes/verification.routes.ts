import { Router } from "express";
import {
    listMyVerifications,
    submitAgeVerification
} from "../controllers/verification.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { uploadIdImage } from "../middlewares/upload.middleware";
import { validateBody } from "../middlewares/validation.middleware";
import { verificationSchema } from "../validators/verification.validator";

const router = Router();

router.get("/mine", requireAuth, listMyVerifications);
router.post(
    "/submit",
    requireAuth,
    uploadIdImage.single("idImage"),
    validateBody(verificationSchema),
    submitAgeVerification
);

export default router;