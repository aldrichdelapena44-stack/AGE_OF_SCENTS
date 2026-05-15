"use client";

import { useEffect, useState } from "react";
import PageShell from "@/components/layout/PageShell";
import AdminGuard from "@/components/admin/AdminGuard";
import ProductVisual from "@/components/shop/ProductVisual";
import { api } from "@/lib/api";

type AdminProduct = {
    id: number;
    slug: string;
    name: string;
    description: string;
    scentNotes: string;
    volume: string;
    price: number;
    stock: number;
    imageUrl?: string;
    isActive: boolean;
    updatedAt?: string;
    category?: string;
};

type ProductDraft = {
    name: string;
    description: string;
    scentNotes: string;
    volume: string;
    price: string;
    stock: string;
    isActive: boolean;
    category: string;
};

function toDraft(product: AdminProduct): ProductDraft {
    return {
        name: product.name,
        description: product.description,
        scentNotes: product.scentNotes || "",
        volume: product.volume || "",
        price: String(product.price),
        stock: String(product.stock),
        isActive: product.isActive,
        category: product.category || "Unisex"
    };
}

export default function AdminProductsPage() {
    const [products, setProducts] = useState<AdminProduct[]>([]);
    const [drafts, setDrafts] = useState<Record<number, ProductDraft>>({});
    const [imageFiles, setImageFiles] = useState<Record<number, File>>({});
    const [imagePreviews, setImagePreviews] = useState<Record<number, string>>({});
    const [message, setMessage] = useState("Loading products...");
    const [savingId, setSavingId] = useState<number | null>(null);
    const [uploadingImageId, setUploadingImageId] = useState<number | null>(null);
    const [categories, setCategories] = useState(["Men", "Women", "Unisex"]);
    const [newCategory, setNewCategory] = useState("");

    async function loadProducts() {
        try {
            const response = await api.get<{ success: boolean; message: string; data: AdminProduct[] }>(
                "/admin/products"
            );
            const productList = response.data || [];
            setProducts(productList);
            setDrafts(
                productList.reduce<Record<number, ProductDraft>>((acc, product) => {
                    acc[product.id] = toDraft(product);
                    return acc;
                }, {})
            );
            setMessage("");
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Failed to load products.");
        }
    }

    useEffect(() => {
        loadProducts();
    }, []);

    function addCategory() {
        const clean = newCategory.trim();
        if (!clean) return;
        setCategories((current) => Array.from(new Set([...current, clean])));
        setNewCategory("");
        setMessage(`Category ${clean} is ready to use for product preference filters.`);
    }

    function updateDraft(id: number, field: keyof ProductDraft, value: string | boolean) {
        setDrafts((current) => ({
            ...current,
            [id]: {
                ...current[id],
                [field]: value
            }
        }));
    }

    function chooseProductImage(id: number, file?: File) {
        if (!file) return;

        const previewUrl = URL.createObjectURL(file);

        setImagePreviews((current) => {
            if (current[id]) URL.revokeObjectURL(current[id]);
            return {
                ...current,
                [id]: previewUrl
            };
        });

        setImageFiles((current) => ({
            ...current,
            [id]: file
        }));
        setMessage(`Selected ${file.name}. Click Upload Image to replace the current perfume image.`);
    }

    function clearSelectedImage(id: number) {
        setImagePreviews((current) => {
            if (current[id]) URL.revokeObjectURL(current[id]);
            const next = { ...current };
            delete next[id];
            return next;
        });

        setImageFiles((current) => {
            const next = { ...current };
            delete next[id];
            return next;
        });
    }

    async function saveProduct(id: number) {
        const draft = drafts[id];
        if (!draft) return;

        try {
            setSavingId(id);
            setMessage("");
            const response = await api.put<{ success: boolean; message: string; data: AdminProduct }>(
                `/admin/products/${id}`,
                {
                    name: draft.name,
                    description: draft.description,
                    scentNotes: draft.scentNotes,
                    volume: draft.volume,
                    price: Number(draft.price),
                    stock: Number(draft.stock),
                    isActive: draft.isActive,
                    category: draft.category
                }
            );
            setProducts((current) => current.map((product) => (product.id === id ? response.data : product)));
            setDrafts((current) => ({ ...current, [id]: toDraft(response.data) }));
            setMessage(response.message || "Product updated.");
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Product update failed.");
        } finally {
            setSavingId(null);
        }
    }

    async function uploadProductImage(id: number) {
        const file = imageFiles[id];
        if (!file) {
            setMessage("Choose an image file first.");
            return;
        }

        try {
            setUploadingImageId(id);
            setMessage("");

            const formData = new FormData();
            formData.append("image", file);

            const response = await api.put<{ success: boolean; message: string; data: AdminProduct }>(
                `/admin/products/${id}/image`,
                formData
            );

            setProducts((current) => current.map((product) => (product.id === id ? response.data : product)));
            setDrafts((current) => ({ ...current, [id]: toDraft(response.data) }));
            clearSelectedImage(id);
            setMessage(response.message || "Product image updated. The frontend sections now use the new image.");
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Product image upload failed.");
        } finally {
            setUploadingImageId(null);
        }
    }

    return (
        <PageShell
            title="Manage Products"
            description="Edit product details and replace perfume images used across the homepage, boutique, product page, and cart."
        >
            <AdminGuard>
                {message ? <p className="muted">{message}</p> : null}

                <section className="card category-controller">
                    <div>
                        <p className="eyebrow">Category Controller</p>
                        <h3>Shop preferences</h3>
                        <p className="muted">Create categories such as Men and Women, then assign each perfume so customers can filter the shop by preference.</p>
                    </div>
                    <div className="category-filter-row">
                        {categories.map((item) => <span className="category-chip" key={item}>{item}</span>)}
                    </div>
                    <div className="order-chat-form category-create-form">
                        <input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="Add category name" />
                        <button className="btn btn--small" type="button" onClick={addCategory}>Add Category</button>
                    </div>
                </section>

                <div className="grid admin-product-grid">
                    {products.map((product) => {
                        const draft = drafts[product.id];
                        const previewImage = imagePreviews[product.id] || product.imageUrl;
                        const hasSelectedImage = Boolean(imageFiles[product.id]);

                        return (
                            <article className="card admin-product-card" key={product.id}>
                                <div className="admin-product-card__heading">
                                    <div>
                                        <p className="eyebrow">Product #{product.id}</p>
                                        <h3>{product.name}</h3>
                                    </div>
                                    <span className={`status-badge ${product.isActive ? "status-approved" : "status-rejected"}`}>
                                        {product.isActive ? "Active" : "Hidden"}
                                    </span>
                                </div>

                                <div className="admin-product-image-control">
                                    <ProductVisual
                                        name={product.name}
                                        imageUrl={previewImage}
                                        className="product-visual--admin"
                                    />
                                    <div className="admin-product-image-control__panel">
                                        <p className="eyebrow">Product Image</p>
                                        <p className="muted">
                                            This image is reused from top to bottom on the frontend: hero,
                                            signature cards, featured collection, boutique, product detail, and cart.
                                        </p>
                                        <div className="form-group">
                                            <label htmlFor={`product-image-${product.id}`}>Choose replacement image</label>
                                            <input
                                                id={`product-image-${product.id}`}
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                onChange={(event) => {
                                                    chooseProductImage(product.id, event.target.files?.[0]);
                                                    event.currentTarget.value = "";
                                                }}
                                            />
                                        </div>
                                        <div className="button-row">
                                            <button
                                                className="btn"
                                                type="button"
                                                onClick={() => uploadProductImage(product.id)}
                                                disabled={!hasSelectedImage || uploadingImageId === product.id}
                                            >
                                                {uploadingImageId === product.id ? "Uploading..." : "Upload Image"}
                                            </button>
                                            {hasSelectedImage ? (
                                                <button
                                                    className="btn btn--ghost"
                                                    type="button"
                                                    onClick={() => clearSelectedImage(product.id)}
                                                    disabled={uploadingImageId === product.id}
                                                >
                                                    Cancel Image
                                                </button>
                                            ) : null}
                                        </div>
                                        {product.imageUrl ? <p className="muted admin-image-path">Current: {product.imageUrl}</p> : null}
                                    </div>
                                </div>

                                {draft ? (
                                    <div className="admin-edit-form">
                                        <div className="grid grid--2">
                                            <div className="form-group">
                                                <label htmlFor={`product-name-${product.id}`}>Name</label>
                                                <input
                                                    id={`product-name-${product.id}`}
                                                    value={draft.name}
                                                    onChange={(event) => updateDraft(product.id, "name", event.target.value)}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label htmlFor={`product-price-${product.id}`}>Price</label>
                                                <input
                                                    id={`product-price-${product.id}`}
                                                    type="number"
                                                    min="1"
                                                    step="0.01"
                                                    value={draft.price}
                                                    onChange={(event) => updateDraft(product.id, "price", event.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid--2">
                                            <div className="form-group">
                                                <label htmlFor={`product-stock-${product.id}`}>Stock</label>
                                                <input
                                                    id={`product-stock-${product.id}`}
                                                    type="number"
                                                    min="0"
                                                    step="1"
                                                    value={draft.stock}
                                                    onChange={(event) => updateDraft(product.id, "stock", event.target.value)}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label htmlFor={`product-active-${product.id}`}>Visibility</label>
                                                <select
                                                    id={`product-active-${product.id}`}
                                                    value={draft.isActive ? "true" : "false"}
                                                    onChange={(event) => updateDraft(product.id, "isActive", event.target.value === "true")}
                                                >
                                                    <option value="true">Show in shop</option>
                                                    <option value="false">Hide from shop</option>
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label htmlFor={`product-category-${product.id}`}>Category</label>
                                                <select
                                                    id={`product-category-${product.id}`}
                                                    value={draft.category}
                                                    onChange={(event) => updateDraft(product.id, "category", event.target.value)}
                                                >
                                                    {categories.map((item) => <option key={item} value={item}>{item}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid--2">
                                            <div className="form-group">
                                                <label htmlFor={`product-notes-${product.id}`}>Scent Notes</label>
                                                <input
                                                    id={`product-notes-${product.id}`}
                                                    value={draft.scentNotes}
                                                    onChange={(event) => updateDraft(product.id, "scentNotes", event.target.value)}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label htmlFor={`product-volume-${product.id}`}>ML / Capacity</label>
                                                <input
                                                    id={`product-volume-${product.id}`}
                                                    value={draft.volume}
                                                    onChange={(event) => updateDraft(product.id, "volume", event.target.value)}
                                                    placeholder="50 ml"
                                                />
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor={`product-description-${product.id}`}>Description</label>
                                            <textarea
                                                id={`product-description-${product.id}`}
                                                value={draft.description}
                                                onChange={(event) => updateDraft(product.id, "description", event.target.value)}
                                            />
                                        </div>

                                        <div className="button-row">
                                            <button
                                                className="btn"
                                                type="button"
                                                onClick={() => saveProduct(product.id)}
                                                disabled={savingId === product.id}
                                            >
                                                {savingId === product.id ? "Saving..." : "Save Product Details"}
                                            </button>
                                        </div>
                                    </div>
                                ) : null}
                            </article>
                        );
                    })}
                </div>
            </AdminGuard>
        </PageShell>
    );
}
