"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { addToCart } from "@/lib/cart";
import ProductVisual from "@/components/shop/ProductVisual";

export type ProductCardData = {
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
    category?: string;
};

type ProductCardProps = {
    product: ProductCardData;
    revealDelay?: number;
};

export default function ProductCard({ product, revealDelay = 0 }: ProductCardProps) {
    const [added, setAdded] = useState(false);

    useEffect(() => {
        if (!added) return;

        const timeout = window.setTimeout(() => setAdded(false), 1400);
        return () => window.clearTimeout(timeout);
    }, [added]);

    function handleAddToCart() {
        addToCart(product, 1);
        setAdded(true);
    }

    return (
        <article
            className="product-card reveal"
            style={{ "--reveal-delay": `${revealDelay}ms` } as CSSProperties}
        >
            <Link href={`/product/${product.slug}`} className="product-card__media">
                <ProductVisual name={product.name} imageUrl={product.imageUrl} />
            </Link>

            <div className="product-card__body">
                <div className="product-card__meta-row">
                    <span>{product.volume || "50 ml"}</span>
                    <span>{product.stock > 0 ? "In stock" : "Reserved"}</span>
                </div>
                {product.category ? <p className="category-chip">{product.category}</p> : null}

                <h3>{product.name}</h3>
                <p className="muted product-card__description">{product.description}</p>

                <p className="scent-notes">
                    {product.scentNotes || "Bergamot, rose, amber, and soft woods"}
                </p>

                <div className="product-card__footer">
                    <p className="price">PHP {Number(product.price).toFixed(2)}</p>
                    <button
                        className={`btn btn--small product-card__cart ${added ? "is-added" : ""}`}
                        type="button"
                        onClick={handleAddToCart}
                    >
                        {added ? "Added" : "Add to Cart"}
                    </button>
                </div>
            </div>
        </article>
    );
}
