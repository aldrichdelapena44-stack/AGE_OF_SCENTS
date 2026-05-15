import path from "path";
import { Request, Response } from "express";
import { getVerificationsByUser, submitVerification } from "../services/verification.service";
import { updateUserVerificationStatus } from "../utils/auth-store";
import { fail, ok } from "../utils/response";

type RequestWithUser = Request & {
    user?: { id: number };
    file?: Express.Multer.File;
};

function toPublicUploadUrl(filePath: string) {
    const normalized = filePath.replace(/\\/g, "/");
    const uploadsIndex = normalized.lastIndexOf("/uploads/");
    if (uploadsIndex >= 0) return normalized.slice(uploadsIndex);
    if (normalized.startsWith("uploads/")) return `/${normalized}`;
    const baseName = path.basename(normalized);
    return `/uploads/ids/${baseName}`;
}

export function submitAgeVerification(req: RequestWithUser, res: Response) {
    const rawFileUrl = req.file?.path || req.body.imageUrl || "";
    const fileUrl = rawFileUrl ? toPublicUploadUrl(rawFileUrl) : "";
    if (!fileUrl) return fail(res, "Verification image is required.", 400);

    const submission = submitVerification({
        userId: req.user!.id,
        documentType: req.body.documentType,
        fileUrl
    });

    updateUserVerificationStatus(req.user!.id, "PENDING");

    return ok(res, { ...submission, verificationStatus: "PENDING" }, "Verification submitted.", 201);
}

export function listMyVerifications(req: RequestWithUser, res: Response) {
    return ok(res, getVerificationsByUser(req.user!.id), "Verification records fetched.");
}
