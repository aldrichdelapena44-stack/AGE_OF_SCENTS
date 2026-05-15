import fs from "fs";
import path from "path";
import { updateUserVerificationStatus } from "../utils/auth-store";

export type VerificationFileStatus = "PENDING_REVIEW" | "KEPT" | "REMOVED";

export type VerificationRecord = {
    id: number;
    userId: number;
    documentType: string;
    fileUrl: string;
    originalFileUrl?: string;
    fileStatus: VerificationFileStatus;
    fileKeptAt?: string;
    fileRemovedAt?: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    createdAt: string;
};

const dataDir = path.join(process.cwd(), "data");
const verificationDataFile = path.join(dataDir, "verifications.json");

function ensureDataDir() {
    fs.mkdirSync(dataDir, { recursive: true });
}

function loadSubmissions() {
    try {
        if (!fs.existsSync(verificationDataFile)) return [] as VerificationRecord[];
        const parsed = JSON.parse(fs.readFileSync(verificationDataFile, "utf8")) as VerificationRecord[];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [] as VerificationRecord[];
    }
}

function saveSubmissions() {
    ensureDataDir();
    fs.writeFileSync(verificationDataFile, JSON.stringify(submissions, null, 2));
}

const submissions: VerificationRecord[] = loadSubmissions();
let nextVerificationId = submissions.reduce((max, item) => Math.max(max, item.id), 0) + 1;

function resolveUploadPath(fileUrl: string) {
    if (!fileUrl || fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) return null;
    if (path.isAbsolute(fileUrl)) return fileUrl;
    const normalized = fileUrl.replace(/\\/g, "/").replace(/^\/+/, "");
    const relativeUploadPath = normalized.startsWith("uploads/") ? normalized : path.join("uploads", normalized);
    return path.join(process.cwd(), relativeUploadPath);
}

function deleteLocalFile(fileUrl: string) {
    const filePath = resolveUploadPath(fileUrl);
    if (!filePath || !fs.existsSync(filePath)) return false;
    fs.unlinkSync(filePath);
    return true;
}

export function submitVerification(input: { userId: number; documentType: string; fileUrl: string }) {
    const submission: VerificationRecord = {
        id: nextVerificationId++,
        userId: input.userId,
        documentType: input.documentType,
        fileUrl: input.fileUrl,
        originalFileUrl: input.fileUrl,
        fileStatus: "PENDING_REVIEW",
        status: "PENDING",
        createdAt: new Date().toISOString()
    };
    submissions.push(submission);
    saveSubmissions();
    return submission;
}

export function getVerificationsByUser(userId: number) {
    return submissions.filter((item) => item.userId === userId);
}

export function getAllVerifications() {
    return [...submissions].sort((a, b) => b.id - a.id);
}

export function approveVerification(verificationId: number) {
    const record = submissions.find((item) => item.id === verificationId);
    if (!record) return null;
    record.status = "APPROVED";
    updateUserVerificationStatus(record.userId, "APPROVED");
    saveSubmissions();
    return record;
}

export function rejectVerification(verificationId: number) {
    const record = submissions.find((item) => item.id === verificationId);
    if (!record) return null;
    record.status = "REJECTED";
    updateUserVerificationStatus(record.userId, "REJECTED");
    saveSubmissions();
    return record;
}

export function keepVerificationFile(verificationId: number) {
    const record = submissions.find((item) => item.id === verificationId);
    if (!record) return null;
    if (record.fileStatus === "REMOVED") throw new Error("This file has already been removed from storage.");
    record.fileStatus = "KEPT";
    record.fileKeptAt = new Date().toISOString();
    saveSubmissions();
    return record;
}

export function removeVerificationFile(verificationId: number) {
    const record = submissions.find((item) => item.id === verificationId);
    if (!record) return null;
    if (record.fileStatus !== "REMOVED" && record.fileUrl) {
        deleteLocalFile(record.fileUrl);
        record.originalFileUrl = record.originalFileUrl || record.fileUrl;
        record.fileUrl = "";
    }
    record.fileStatus = "REMOVED";
    record.fileRemovedAt = new Date().toISOString();
    saveSubmissions();
    return record;
}

export function countPendingVerifications() {
    return submissions.filter((item) => item.status === "PENDING").length;
}
