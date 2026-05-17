import { Router } from "express";
import { deleteMyStory, listMyStories, listStories, submitStory, updateStory } from "../controllers/story.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { uploadStoryImage } from "../middlewares/upload.middleware";

const router = Router();

router.get("/", listStories);
router.get("/mine", requireAuth, listMyStories);
router.post("/", requireAuth, uploadStoryImage.single("image"), submitStory);
router.put("/:id", requireAuth, uploadStoryImage.single("image"), updateStory);
router.delete("/:id", requireAuth, deleteMyStory);

export default router;
