import path from "path";
import { Request, Response } from "express";
import { createStory, getPublicStories, getStoriesByUser, removeOwnStory, updateOwnStory } from "../services/story.service";
import { fail, ok } from "../utils/response";

type RequestWithUserAndFile = Request & {
    user?: { id: number; fullName: string };
    file?: Express.Multer.File;
};

function toPublicUploadUrl(filePath: string) {
    const normalized = filePath.replace(/\\/g, "/");
    const uploadsIndex = normalized.lastIndexOf("/uploads/");
    if (uploadsIndex >= 0) return normalized.slice(uploadsIndex);
    if (normalized.startsWith("uploads/")) return `/${normalized}`;
    return `/uploads/stories/${path.basename(normalized)}`;
}

export function listStories(_req: Request, res: Response) {
    return ok(res, getPublicStories(), "Stories fetched.");
}

export function listMyStories(req: RequestWithUserAndFile, res: Response) {
    return ok(res, getStoriesByUser(req.user!.id), "Your stories fetched.");
}

export function submitStory(req: RequestWithUserAndFile, res: Response) {
    try {
        const imageUrl = req.file?.path ? toPublicUploadUrl(req.file.path) : "";
        const story = createStory({
            userId: req.user!.id,
            userName: req.user!.fullName,
            imageUrl,
            note: typeof req.body.note === "string" ? req.body.note : ""
        });
        return ok(res, story, "Story submitted. It will appear after admin approval.", 201);
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Story submission failed.", 400);
    }
}

export function updateStory(req: RequestWithUserAndFile, res: Response) {
    try {
        const imageUrl = req.file?.path ? toPublicUploadUrl(req.file.path) : undefined;
        const story = updateOwnStory(Number(req.params.id), req.user!.id, {
            imageUrl,
            note: typeof req.body.note === "string" ? req.body.note : undefined
        });
        if (!story) return fail(res, "Story not found.", 404);
        return ok(res, story, "Story updated. Admin approval is required again.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Story update failed.", 400);
    }
}

export function deleteMyStory(req: RequestWithUserAndFile, res: Response) {
    const story = removeOwnStory(Number(req.params.id), req.user!.id);
    if (!story) return fail(res, "Story not found.", 404);
    return ok(res, story, "Story removed.");
}
