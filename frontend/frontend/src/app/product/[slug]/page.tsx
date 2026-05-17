"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PageShell from "@/components/layout/PageShell";
import ProductVisual from "@/components/shop/ProductVisual";
import { api } from "@/lib/api";
import { addToCart } from "@/lib/cart";

type Product = {
    id: number;
    slug: string;
    name: string;
    description: string;
    price: number;
    stock: number;
    imageUrl?: string;
    scentNotes?: string;
    volume?: string;
    mood?: string;
};

export default function ProductDetailsPage() {
    const params = useParams<{ slug: string }>();
    const [product, setProduct] = useState<Product | null>(null);
    const [message, setMessage] = useState("Loading perfume details...");
    const [added, setAdded] = useState(false);

    useEffect(() => {
        async function loadProduct() {
            try {
                const response = await api.get<{
                    success: boolean;
                    message: string;
                    data: Product;
                }>(`/products/${params.slug}`);

                setProduct(response.data);
                setMessage("");
            } catch (error) {
                setMessage(
                    error instanceof Error ? error.message : "Failed to load perfume."
                );
            }
        }

        if (params.slug) {
            loadProduct();
        }
    }, [params.slug]);

    useEffect(() => {
        if (!added) return;
        const timeout = window.setTimeout(() => setAdded(false), 1400);
        return () => window.clearTimeout(timeout);
    }, [added]);

    function handleAddToCart() {
        if (!product) return;
        addToCart(product, 1);
        setAdded(true);
    }

    if (!product) {
        return (
            <PageShell title="Perfume" description="Product details">
                <div className="card">
                    <p className="muted">{message}</p>
                </div>
            </PageShell>
        );
    }

    return (
        <PageShell title={product.name} description="A closer look at this AGE OF SCENT fragrance.">
            <div className="product-details card">
                <div className="product-details__media">
                    <ProductVisual
                        name={product.name}
                        imageUrl={product.imageUrl}
                        className="product-visual--details"
                    />
                </div>

                <div className="product-details__content">
                    <p className="eyebrow">{product.mood || "Signature perfume"}</p>
                    <h2>{product.name}</h2>
                    <p className="muted large-copy">{product.description}</p>

                    <div className="detail-list">
                        <div>
                            <span>Notes</span>
                            <strong>{product.scentNotes || "Amber, florals, soft woods"}</strong>
                        </div>
                        <div>
                            <span>Volume</span>
                            <strong>{product.volume || "50 ml"}</strong>
                        </div>
                        <div>
                            <span>Availability</span>
                            <strong>{product.stock > 0 ? `${product.stock} in stock` : "Reserved"}</strong>
                        </div>
                    </div>

                    <p className="price product-details__price">PHP {Number(product.price).toFixed(2)}</p>

                    <div className="button-row">
                        <button className={`btn ${added ? "is-added" : ""}`} onClick={handleAddToCart}>
                            {added ? "Added to Cart" : "Add to Cart"}
                        </button>
                    </div>
                </div>
            </div>
        </PageShell>
    );
}
