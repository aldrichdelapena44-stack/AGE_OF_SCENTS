import { Request, Response } from "express";
import { getVerificationsByUser, submitVerification, syncUserVerificationStatus } from "../services/verification.service";
import { uploadPrivateImage } from "../config/supabase";
import { fail, ok } from "../utils/response";

type RequestWithUser = Request & {
    user?: { id: number };
    file?: Express.Multer.File;
};

export async function submitAgeVerification(req: RequestWithUser, res: Response) {
    try {
        const fileUrl = req.file ? await uploadPrivateImage("verification-images", "ids", req.file) : String(req.body.imageUrl || "");
        if (!fileUrl) return fail(res, "Verification image is required.", 400);

        const submission = await submitVerification({
            userId: req.user!.id,
            documentType: req.body.documentType,
            fileUrl
        });

        const syncedUser = await syncUserVerificationStatus(req.user!.id);

        return ok(
            res,
            { ...submission, verificationStatus: syncedUser?.verificationStatus || submission.status },
            "Verification submitted.",
            201
        );
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Verification submission failed.", 400);
    }
}

export async function listMyVerifications(req: RequestWithUser, res: Response) {
    try {
        return ok(res, await getVerificationsByUser(req.user!.id), "Verification records fetched.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Verification fetch failed.", 400);
    }
}
