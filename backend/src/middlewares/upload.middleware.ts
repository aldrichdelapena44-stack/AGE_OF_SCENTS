import fs from "fs";
import multer from "multer";
import path from "path";
import { env } from "../config/env";

const imageFilter: multer.Options["fileFilter"] = (_req, file, callback) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];

    if (!allowed.includes(file.mimetype)) {
        return callback(new Error("Only JPG, PNG, and WEBP files are allowed."));
    }

    callback(null, true);
};

function ensureUploadDir(folder: string) {
    const uploadPath = path.join(process.cwd(), "uploads", folder);
    fs.mkdirSync(uploadPath, { recursive: true });
    return uploadPath;
}

function safeUploadName(originalName: string) {
    const extension = path.extname(originalName).toLowerCase();
    const baseName = path
        .basename(originalName, extension)
        .replace(/[^a-z0-9_-]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80) || "image";

    return `${Date.now()}-${baseName}${extension}`;
}

const idStorage = multer.diskStorage({
    destination: (_req, _file, callback) => {
        callback(null, ensureUploadDir("ids"));
    },
    filename: (_req, file, callback) => {
        callback(null, safeUploadName(file.originalname));
    }
});

const productStorage = multer.diskStorage({
    destination: (_req, _file, callback) => {
        callback(null, ensureUploadDir("products"));
    },
    filename: (_req, file, callback) => {
        callback(null, safeUploadName(file.originalname));
    }
});

const storyStorage = multer.diskStorage({
    destination: (_req, _file, callback) => {
        callback(null, ensureUploadDir("stories"));
    },
    filename: (_req, file, callback) => {
        callback(null, safeUploadName(file.originalname));
    }
});

const settingsStorage = multer.diskStorage({
    destination: (_req, _file, callback) => {
        callback(null, ensureUploadDir("settings"));
    },
    filename: (_req, file, callback) => {
        callback(null, safeUploadName(file.originalname));
    }
});

export const uploadIdImage = multer({
    storage: idStorage,
    fileFilter: imageFilter,
    limits: {
        fileSize: env.maxFileSizeMb * 1024 * 1024
    }
});

export const uploadProductImage = multer({
    storage: productStorage,
    fileFilter: imageFilter,
    limits: {
        fileSize: env.maxFileSizeMb * 1024 * 1024
    }
});

export const uploadStoryImage = multer({
    storage: storyStorage,
    fileFilter: imageFilter,
    limits: {
        fileSize: env.maxFileSizeMb * 1024 * 1024
    }
});

export const uploadSettingsImage = multer({
    storage: settingsStorage,
    fileFilter: imageFilter,
    limits: {
        fileSize: env.maxFileSizeMb * 1024 * 1024
    }
});
