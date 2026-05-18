"use client";

import { useEffect, useState } from "react";
import PageShell from "@/components/layout/PageShell";
import AdminGuard from "@/components/admin/AdminGuard";
import { api, mediaUrl } from "@/lib/api";

type Landmark = {
    id: number;
    name: string;
    details?: string;
    imageUrl?: string;
    shippingFee?: number;
    isActive: boolean;
};

type StoreSettings = {
    gcashNumber: string;
    gcashQrUrl: string;
    gcashInstructions: string;
    codInstructions: string;
    adminDeliveryAddress: string;
    deliveryLandmarks: Landmark[];
};

const blankSettings: StoreSettings = {
    gcashNumber: "",
    gcashQrUrl: "",
    gcashInstructions: "",
    codInstructions: "",
    adminDeliveryAddress: "",
    deliveryLandmarks: []
};

export default function AdminSettingsPage() {
    const [settings, setSettings] = useState<StoreSettings>(blankSettings);
    const [message, setMessage] = useState("Loading checkout settings...");
    const [saving, setSaving] = useState(false);
    const [qrFile, setQrFile] = useState<File | null>(null);
    const [landmarkFiles, setLandmarkFiles] = useState<Record<number, File | null>>({});

    async function loadSettings() {
        try {
            const response = await api.get<{ success: boolean; message: string; data: StoreSettings }>("/admin/settings");
            setSettings(response.data || blankSettings);
            setMessage("");
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Failed to load settings.");
        }
    }

    useEffect(() => {
        loadSettings();
    }, []);

    function updateLandmark(index: number, field: keyof Landmark, value: string | number | boolean) {
        setSettings((current) => ({
            ...current,
            deliveryLandmarks: current.deliveryLandmarks.map((landmark, itemIndex) => (
                itemIndex === index ? { ...landmark, [field]: value } : landmark
            ))
        }));
    }

    function addLandmark() {
        setSettings((current) => ({
            ...current,
            deliveryLandmarks: [
                ...current.deliveryLandmarks,
                { id: Date.now(), name: "", details: "", imageUrl: "", shippingFee: 0, isActive: true }
            ]
        }));
    }

    function removeLandmark(index: number) {
        setSettings((current) => ({
            ...current,
            deliveryLandmarks: current.deliveryLandmarks.filter((_, itemIndex) => itemIndex !== index)
        }));
    }

    async function saveSettings() {
        try {
            setSaving(true);
            const response = await api.put<{ success: boolean; message: string; data: StoreSettings }>("/admin/settings", settings);
            setSettings(response.data);
            setMessage(response.message || "Settings saved. Checkout will use the new shipping fees after refresh.");
            window.dispatchEvent(new CustomEvent("checkout-settings-updated"));
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Settings update failed.");
        } finally {
            setSaving(false);
        }
    }


    async function uploadLandmarkPhoto(index: number) {
        const landmark = settings.deliveryLandmarks[index];
        const file = landmark ? landmarkFiles[landmark.id] : null;

        if (!landmark) {
            setMessage("Landmark not found.");
            return;
        }

        if (!file) {
            setMessage("Choose a landmark photo first.");
            return;
        }

        try {
            setSaving(true);
            const formData = new FormData();
            formData.append("image", file);
            const response = await api.put<{ success: boolean; message: string; data: StoreSettings }>(
                `/admin/settings/landmarks/${landmark.id}/image`,
                formData
            );
            setSettings(response.data);
            setLandmarkFiles((current) => ({ ...current, [landmark.id]: null }));
            setMessage(response.message || "Landmark photo uploaded.");
            window.dispatchEvent(new CustomEvent("checkout-settings-updated"));
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Landmark photo upload failed. Save checkout settings first, then try again.");
        } finally {
            setSaving(false);
        }
    }

    async function uploadQr() {
        if (!qrFile) {
            setMessage("Choose a GCash QR image first.");
            return;
        }

        try {
            setSaving(true);
            const formData = new FormData();
            formData.append("image", qrFile);
            const response = await api.put<{ success: boolean; message: string; data: StoreSettings }>("/admin/settings/gcash-qr", formData);
            setSettings(response.data);
            setQrFile(null);
            setMessage(response.message || "QR code uploaded.");
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "QR upload failed.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <PageShell title="Admin Checkout Settings" description="Control GCash, COD, your delivery address, approved landmarks, and customer requested places.">
            <AdminGuard>
                {message ? <p className="muted">{message}</p> : null}

                <div className="grid grid--2">
                    <section className="card form-card">
                        <p className="eyebrow">GCash</p>
                        <div className="form-group">
                            <label>GCash number</label>
                            <input
                                value={settings.gcashNumber}
                                onChange={(event) => setSettings((current) => ({ ...current, gcashNumber: event.target.value }))}
                                placeholder="09XXXXXXXXX"
                            />
                        </div>
                        <div className="form-group">
                            <label>GCash checkout instructions</label>
                            <textarea
                                value={settings.gcashInstructions}
                                onChange={(event) => setSettings((current) => ({ ...current, gcashInstructions: event.target.value }))}
                            />
                        </div>
                        {settings.gcashQrUrl ? <img className="checkout-qr" src={mediaUrl(settings.gcashQrUrl)} alt="Current GCash QR" /> : null}
                        <div className="form-group">
                            <label>Upload GCash QR code</label>
                            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setQrFile(event.target.files?.[0] || null)} />
                        </div>
                        <button className="btn btn--ghost" type="button" disabled={saving || !qrFile} onClick={uploadQr}>
                            Upload QR Code
                        </button>
                    </section>

                    <section className="card form-card">
                        <p className="eyebrow">Delivery / COD</p>
                        <div className="form-group">
                            <label>Your complete delivery coverage address</label>
                            <textarea
                                value={settings.adminDeliveryAddress}
                                onChange={(event) => setSettings((current) => ({ ...current, adminDeliveryAddress: event.target.value }))}
                                placeholder="Example: Store address, city, barangay, nearby landmarks"
                            />
                        </div>
                        <div className="form-group">
                            <label>COD instructions</label>
                            <textarea
                                value={settings.codInstructions}
                                onChange={(event) => setSettings((current) => ({ ...current, codInstructions: event.target.value }))}
                            />
                        </div>
                    </section>
                </div>

                <section className="card form-card">
                    <p className="eyebrow">Delivery Landmarks</p>
                    <p className="muted">These approved choices appear on checkout. Checkout also includes an Other option where users can write their own address or landmark. Other requests will appear in Admin Orders for approval or rejection.</p>

                    {settings.deliveryLandmarks.map((landmark, index) => (
                        <div className="landmark-editor" key={landmark.id || index}>
                            <div className="grid grid--2">
                                <div className="form-group">
                                    <label>Landmark name</label>
                                    <input value={landmark.name} onChange={(event) => updateLandmark(index, "name", event.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Details</label>
                                    <input value={landmark.details || ""} onChange={(event) => updateLandmark(index, "details", event.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Shipping fee for this landmark</label>
                                    <input type="number" min="0" step="1" value={landmark.shippingFee ?? 0} onChange={(event) => updateLandmark(index, "shippingFee", Number(event.target.value || 0))} />
                                    <p className="field-hint">This fee is shown to customers and added to checkout totals.</p>
                                </div>
                            </div>
                            <div className="landmark-photo-control">
                                <div className="landmark-photo-preview">
                                    {landmark.imageUrl ? (
                                        <img src={mediaUrl(landmark.imageUrl, true)} alt={`${landmark.name || "Delivery landmark"} preview`} />
                                    ) : (
                                        <span>No landmark photo yet</span>
                                    )}
                                </div>
                                <div className="form-group landmark-photo-control__field">
                                    <label>Landmark photo for customer visualization</label>
                                    <div className="upload-field upload-field--landmark">
                                        <input
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp"
                                            onChange={(event) => setLandmarkFiles((current) => ({
                                                ...current,
                                                [landmark.id]: event.target.files?.[0] || null
                                            }))}
                                        />
                                        <span>{landmarkFiles[landmark.id]?.name || "No file chosen"}</span>
                                    </div>
                                    <p className="field-hint">Save checkout settings first for new landmarks, then upload the photo.</p>
                                </div>
                                <button
                                    className="btn btn--small btn--ghost"
                                    type="button"
                                    disabled={saving || !landmarkFiles[landmark.id]}
                                    onClick={() => uploadLandmarkPhoto(index)}
                                >
                                    Upload Landmark Photo
                                </button>
                            </div>

                            <div className="button-row">
                                <label className="checkbox-row">
                                    <input type="checkbox" checked={landmark.isActive} onChange={(event) => updateLandmark(index, "isActive", event.target.checked)} />
                                    Show at checkout
                                </label>
                                <button className="btn btn--small btn--ghost" type="button" onClick={() => removeLandmark(index)}>
                                    Remove
                                </button>
                            </div>
                        </div>
                    ))}

                    <div className="button-row">
                        <button className="btn btn--ghost" type="button" onClick={addLandmark}>Add Landmark</button>
                        <button className="btn" type="button" disabled={saving} onClick={saveSettings}>
                            {saving ? "Saving..." : "Save Checkout Settings"}
                        </button>
                    </div>
                </section>
            </AdminGuard>
        </PageShell>
    );
}
