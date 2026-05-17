import fs from "fs";
import path from "path";
import { VerificationState, getUserById, updateUserVerificationStatus } from "../utils/auth-store";

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
    const currentUser = getUserById(input.userId);
    const shouldPreserveApproval = currentUser?.verificationStatus === "APPROVED";

    const submission: VerificationRecord = {
        id: nextVerificationId++,
        userId: input.userId,
        documentType: input.documentType,
        fileUrl: input.fileUrl,
        originalFileUrl: input.fileUrl,
        fileStatus: "PENDING_REVIEW",
        status: shouldPreserveApproval ? "APPROVED" : "PENDING",
        createdAt: new Date().toISOString()
    };
    submissions.push(submission);
    saveSubmissions();
    syncUserVerificationStatus(input.userId);
    return submission;
}

export function getVerificationsByUser(userId: number) {
    syncUserVerificationStatus(userId);
    return submissions.filter((item) => item.userId === userId);
}

export function getAllVerifications() {
    syncAllUserVerificationStatuses();
    return [...submissions].sort((a, b) => b.id - a.id);
}

export function getEffectiveVerificationStatusForUser(userId: number): VerificationState {
    const userSubmissions = submissions
        .filter((item) => item.userId === userId)
        .sort((a, b) => {
            const dateDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            return dateDiff || b.id - a.id;
        });

    if (!userSubmissions.length) return "UNVERIFIED";

    // Once a user is approved, preserve that approval unless an admin explicitly rejects
    // all verification records for that user. This prevents a new upload or page refresh
    // from accidentally showing APPROVED users as PENDING again.
    if (userSubmissions.some((item) => item.status === "APPROVED")) return "APPROVED";

    const latestStatus = userSubmissions[0].status;
    if (latestStatus === "PENDING") return "PENDING";
    if (latestStatus === "REJECTED") return "REJECTED";
    return "UNVERIFIED";
}

export function syncUserVerificationStatus(userId: number) {
    const effectiveStatus = getEffectiveVerificationStatusForUser(userId);
    return updateUserVerificationStatus(userId, effectiveStatus);
}

export function syncAllUserVerificationStatuses() {
    const userIds = new Set(submissions.map((item) => item.userId));
    userIds.forEach((userId) => syncUserVerificationStatus(userId));
}

export function approveVerification(verificationId: number) {
    const record = submissions.find((item) => item.id === verificationId);
    if (!record) return null;
    record.status = "APPROVED";
    saveSubmissions();
    syncUserVerificationStatus(record.userId);
    return record;
}

export function rejectVerification(verificationId: number) {
    const record = submissions.find((item) => item.id === verificationId);
    if (!record) return null;
    record.status = "REJECTED";
    saveSubmissions();
    syncUserVerificationStatus(record.userId);
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

export function deleteVerificationSubmission(verificationId: number) {
    const index = submissions.findIndex((item) => item.id === verificationId);
    if (index < 0) return null;
    const [removed] = submissions.splice(index, 1);
    if (removed.fileUrl) {
        deleteLocalFile(removed.fileUrl);
    }
    saveSubmissions();
    syncUserVerificationStatus(removed.userId);
    return removed;
}
