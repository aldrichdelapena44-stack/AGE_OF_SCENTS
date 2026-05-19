import multer from "multer";
import { env } from "../config/env";

const imageFilter: multer.Options["fileFilter"] = (_req, file, callback) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];

    if (!allowed.includes(file.mimetype)) {
        return callback(new Error("Only JPG, PNG, and WEBP files are allowed."));
    }

    callback(null, true);
};

const memoryStorage = multer.memoryStorage();

function makeImageUploader() {
    return multer({
        storage: memoryStorage,
        fileFilter: imageFilter,
        limits: {
            fileSize: env.maxFileSizeMb * 1024 * 1024
        }
    });
}

export const uploadIdImage = makeImageUploader();
export const uploadProductImage = makeImageUploader();
export const uploadStoryImage = makeImageUploader();
export const uploadSettingsImage = makeImageUploader();
