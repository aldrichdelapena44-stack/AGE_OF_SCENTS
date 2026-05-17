"use client";

import { useEffect, useMemo, useState } from "react";
import { mediaUrl } from "@/lib/api";

type ProductVisualProps = {
    name: string;
    imageUrl?: string;
    className?: string;
};

const productImageMap: Record<string, string> = {
    "/images/products/aurum-noir.svg": "/images/products/1.png",
    "/images/products/rose-velours.svg": "/images/products/2.png",
    "/images/products/citrus-atelier.svg": "/images/products/3.png",
    "/images/products/oud-imperial.svg": "/images/products/4.png",
    "/images/products/amber-silk.svg": "/images/products/5.png",
    "/images/products/pearl-musk.svg": "/images/products/6.png",
    "aurum-noir.svg": "/images/products/1.png",
    "rose-velours.svg": "/images/products/2.png",
    "citrus-atelier.svg": "/images/products/3.png",
    "oud-imperial.svg": "/images/products/4.png",
    "amber-silk.svg": "/images/products/5.png",
    "pearl-musk.svg": "/images/products/6.png",
};

function resolveProductImageUrl(imageUrl?: string) {
    const cleanImageUrl = (imageUrl || "").trim();
    if (!cleanImageUrl) return "";

    if (cleanImageUrl.startsWith("blob:")) return cleanImageUrl;
    if (cleanImageUrl.startsWith("http://") || cleanImageUrl.startsWith("https://")) {
        return cleanImageUrl;
    }

    if (cleanImageUrl.startsWith("/uploads/")) return mediaUrl(cleanImageUrl);

    if (productImageMap[cleanImageUrl]) return productImageMap[cleanImageUrl];

    const fileName = cleanImageUrl.split("/").pop() || "";
    if (productImageMap[fileName]) return productImageMap[fileName];

    // Allows admin/product data to use simple values like "4.png" or "valaya.png".
    if (/\.(png|jpe?g|webp|gif)$/i.test(cleanImageUrl) && !cleanImageUrl.startsWith("/")) {
        return `/images/products/${cleanImageUrl}`;
    }

    return cleanImageUrl.startsWith("/") ? cleanImageUrl : `/${cleanImageUrl}`;
}

export default function ProductVisual({
    name,
    imageUrl,
    className = ""
}: ProductVisualProps) {
    const [imageFailed, setImageFailed] = useState(false);
    const resolvedImageUrl = useMemo(() => resolveProductImageUrl(imageUrl), [imageUrl]);
    useEffect(() => {
        setImageFailed(false);
    }, [resolvedImageUrl]);

    const showImage = Boolean(resolvedImageUrl) && !imageFailed;

    return (
        <div className={`product-visual ${className}`.trim()} aria-label={name}>
            <div className="product-visual__halo" />
            {showImage ? (
                <img
                    src={resolvedImageUrl}
                    alt={name}
                    className="product-visual__image"
                    onError={() => setImageFailed(true)}
                />
            ) : (
                <div className="product-visual__bottle" aria-hidden="true">
                    <span className="product-visual__cap" />
                    <span className="product-visual__neck" />
                    <span className="product-visual__glass">
                        <span className="product-visual__shine" />
                        <span className="product-visual__label">{name.split(" ")[0]}</span>
                    </span>
                </div>
            )}
        </div>
    );
}
