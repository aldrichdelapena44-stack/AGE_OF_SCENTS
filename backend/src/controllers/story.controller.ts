import { Request, Response } from "express";
import { createStory, getPublicStories, getStoriesByUser, removeOwnStory, updateOwnStory } from "../services/story.service";
import { uploadPublicImage } from "../config/supabase";
import { fail, ok } from "../utils/response";

type RequestWithUserAndFile = Request & {
    user?: { id: number; fullName: string };
    file?: Express.Multer.File;
};

export async function listStories(_req: Request, res: Response) {
    try {
        return ok(res, await getPublicStories(), "Stories fetched.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Stories fetch failed.", 400);
    }
}

export async function listMyStories(req: RequestWithUserAndFile, res: Response) {
    try {
        return ok(res, await getStoriesByUser(req.user!.id), "Your stories fetched.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Stories fetch failed.", 400);
    }
}

export async function submitStory(req: RequestWithUserAndFile, res: Response) {
    try {
        const imageUrl = req.file ? await uploadPublicImage("story-images", "stories", req.file) : "";
        const story = await createStory({
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

export async function updateStory(req: RequestWithUserAndFile, res: Response) {
    try {
        const imageUrl = req.file ? await uploadPublicImage("story-images", "stories", req.file) : undefined;
        const story = await updateOwnStory(Number(req.params.id), req.user!.id, {
            imageUrl,
            note: typeof req.body.note === "string" ? req.body.note : undefined
        });
        if (!story) return fail(res, "Story not found.", 404);
        return ok(res, story, "Story updated. Admin approval is required again.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Story update failed.", 400);
    }
}

export async function deleteMyStory(req: RequestWithUserAndFile, res: Response) {
    try {
        const story = await removeOwnStory(Number(req.params.id), req.user!.id);
        if (!story) return fail(res, "Story not found.", 404);
        return ok(res, story, "Story removed.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Story delete failed.", 400);
    }
}
