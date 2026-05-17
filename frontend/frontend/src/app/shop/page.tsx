"use client";

import { useEffect, useMemo, useState } from "react";
import PageShell from "@/components/layout/PageShell";
import ProductCard, { type ProductCardData } from "@/components/shop/ProductCard";
import { api } from "@/lib/api";

type Product = ProductCardData & {
    isActive?: boolean;
    category?: string;
};

function normalizeCategory(value?: string) {
    const clean = (value || "").trim().toLowerCase();
    if (clean.includes("women")) return "Women";
    if (clean.includes("men")) return "Men";
    return "Unisex";
}

export default function ShopPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [message, setMessage] = useState("Loading perfume collection...");
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [category, setCategory] = useState("All");

    useEffect(() => {
        async function loadProducts() {
            try {
                const response = await api.get<{
                    success: boolean;
                    message: string;
                    data: Product[];
                }>("/products");

                setProducts(response.data || []);
                setMessage("");
            } catch (error) {
                setMessage(
                    error instanceof Error ? error.message : "Failed to load perfumes."
                );
            } finally {
                setLoading(false);
            }
        }

        loadProducts();
    }, []);

    const categories = useMemo(() => {
        const productCategories = products.map((product) => normalizeCategory(product.category || product.mood));
        return ["All", "Men", "Women", "Unisex", ...Array.from(new Set(productCategories)).filter((item) => !["Men", "Women", "Unisex"].includes(item))];
    }, [products]);

    const filteredProducts = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        return products.filter((product) => {
            const productCategory = normalizeCategory(product.category || product.mood);
            const matchesCategory = category === "All" || productCategory === category;
            const haystack = [product.name, product.description, product.scentNotes, product.volume, product.mood, product.category]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            return matchesCategory && (!query || haystack.includes(query));
        });
    }, [products, searchTerm, category]);

    return (
        <PageShell
            title="Perfumes Shop"
            description="Explore AGE OF SCENT perfumes."
        >
            <section className="card boutique-intro">
                <h2>Fragrances for presence, and memory</h2>
            </section>

            <section className="card shop-toolbar" aria-label="Product search and category filters">
                <div className="form-group search-field">
                    <label htmlFor="shop-search">Search perfume</label>
                    <input
                        id="shop-search"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Search by product, scent notes, volume..."
                    />
                </div>
                <div className="category-filter-row" aria-label="Choose category">
                    {categories.map((item) => (
                        <button
                            key={item}
                            className={`category-filter ${category === item ? "is-active" : ""}`}
                            type="button"
                            onClick={() => setCategory(item)}
                        >
                            {item}
                        </button>
                    ))}
                </div>
            </section>

            {loading ? <p className="muted">{message}</p> : null}
            {!loading && message ? <p className="muted">{message}</p> : null}

            <div className="product-grid">
                {filteredProducts.map((product, index) => (
                    <ProductCard key={product.id} product={{ ...product, category: normalizeCategory(product.category || product.mood) }} revealDelay={index * 90} />
                ))}
            </div>

            {!loading && filteredProducts.length === 0 ? (
                <div className="card empty-state">
                    <h3>No matching perfumes found.</h3>
                    <p className="muted">
                        Try a different search word or category preference.
                    </p>
                </div>
            ) : null}
        </PageShell>
    );
}
