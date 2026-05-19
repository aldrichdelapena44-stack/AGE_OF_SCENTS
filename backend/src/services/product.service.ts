import { supabase } from "../config/supabase";

export type ProductCategory = "Men" | "Women" | "Unisex";

export type ProductRecord = {
    id: number;
    slug: string;
    name: string;
    description: string;
    scentNotes: string;
    volume: string;
    mood: string;
    price: number;
    stock: number;
    imageUrl: string;
    isActive: boolean;
    category: ProductCategory;
    updatedAt: string;
};

export type ProductUpdateInput = {
    name?: string;
    description?: string;
    scentNotes?: string;
    price?: number;
    stock?: number;
    imageUrl?: string;
    volume?: string;
    mood?: string;
    isActive?: boolean;
    category?: ProductCategory | string;
};

const now = new Date().toISOString();

function normalizeCategory(value?: string): ProductCategory {
    const clean = value?.trim().toLowerCase();

    if (clean === "men") return "Men";
    if (clean === "women") return "Women";
    if (clean === "unisex") return "Unisex";

    return "Unisex";
}

const defaultProducts: ProductRecord[] = [
    {
        id: 1,
        slug: "aurum-noir-parfum",
        name: "Aurum Noir Parfum",
        description: "A velvet evening fragrance built around black orchid, smoked vanilla, and warm amber.",
        scentNotes: "Black orchid, smoked vanilla, amber, cedarwood",
        volume: "50 ml",
        mood: "Evening signature",
        price: 3490,
        stock: 18,
        imageUrl: "/images/products/aurum-noir.svg",
        isActive: true,
        category: "Unisex",
        updatedAt: now
    },
    {
        id: 2,
        slug: "rose-velours-eau-de-parfum",
        name: "Rose Velours Eau de Parfum",
        description: "A luminous rose composition softened with lychee, iris, and white musk.",
        scentNotes: "Damask rose, lychee, iris, white musk",
        volume: "75 ml",
        mood: "Romantic floral",
        price: 2890,
        stock: 24,
        imageUrl: "/images/products/rose-velours.svg",
        isActive: true,
        category: "Women",
        updatedAt: now
    },
    {
        id: 3,
        slug: "citrus-atelier-eau-de-parfum",
        name: "Citrus Atelier Eau de Parfum",
        description: "Fresh bergamot and neroli wrapped in tea leaves, vetiver, and sunlit woods.",
        scentNotes: "Bergamot, neroli, green tea, vetiver",
        volume: "50 ml",
        mood: "Daylight elegance",
        price: 2490,
        stock: 30,
        imageUrl: "/images/products/citrus-atelier.svg",
        isActive: true,
        category: "Unisex",
        updatedAt: now
    },
    {
        id: 4,
        slug: "oud-imperial-extrait",
        name: "Oud Imperial Extrait",
        description: "A deep extrait with saffron, incense, oud wood, and polished leather warmth.",
        scentNotes: "Saffron, incense, oud, leather",
        volume: "30 ml",
        mood: "Opulent depth",
        price: 4990,
        stock: 12,
        imageUrl: "/images/products/oud-imperial.svg",
        isActive: true,
        category: "Men",
        updatedAt: now
    },
    {
        id: 5,
        slug: "pearl-musk-eau-de-parfum",
        name: "Pearl Musk Eau de Parfum",
        description: "A soft skin scent of pear blossom, clean musk, sandalwood, and creamy iris.",
        scentNotes: "Pear blossom, clean musk, iris, sandalwood",
        volume: "50 ml",
        mood: "Soft intimacy",
        price: 2690,
        stock: 21,
        imageUrl: "/images/products/pearl-musk.svg",
        isActive: true,
        category: "Women",
        updatedAt: now
    },
    {
        id: 6,
        slug: "amber-silk-parfum",
        name: "Amber Silk Parfum",
        description: "A smooth amber perfume with tonka bean, labdanum, cashmere wood, and golden resin.",
        scentNotes: "Tonka bean, labdanum, cashmere wood, resin",
        volume: "50 ml",
        mood: "Warm luxury",
        price: 3290,
        stock: 16,
        imageUrl: "/images/products/amber-silk.svg",
        isActive: true,
        category: "Unisex",
        updatedAt: now
    }
];

function safeMoney(value: unknown) {
    const amount = Number(value ?? 0);
    if (!Number.isFinite(amount) || amount < 0) return 0;
    return Math.round(amount * 100) / 100;
}

function toRow(product: ProductRecord) {
    return {
        id: product.id,
        slug: product.slug,
        name: product.name,
        description: product.description,
        scent_notes: product.scentNotes,
        volume: product.volume,
        mood: product.mood,
        price: product.price,
        stock: product.stock,
        image_url: product.imageUrl,
        is_active: product.isActive,
        category: product.category,
        updated_at: product.updatedAt
    };
}

function fromRow(row: any): ProductRecord {
    return {
        id: Number(row.id),
        slug: String(row.slug || ""),
        name: String(row.name || ""),
        description: String(row.description || ""),
        scentNotes: String(row.scent_notes || ""),
        volume: String(row.volume || ""),
        mood: String(row.mood || ""),
        price: safeMoney(row.price),
        stock: Number(row.stock || 0),
        imageUrl: String(row.image_url || ""),
        isActive: row.is_active !== false,
        category: normalizeCategory(row.category),
        updatedAt: String(row.updated_at || new Date().toISOString())
    };
}

async function ensureDefaultProducts() {
    const { count, error } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true });

    if (error) throw new Error(error.message);

    if ((count || 0) > 0) return;

    const { error: insertError } = await supabase
        .from("products")
        .upsert(defaultProducts.map(toRow), { onConflict: "id" });

    if (insertError) throw new Error(insertError.message);
}

async function selectProducts(includeHidden: boolean) {
    await ensureDefaultProducts();

    let query = supabase.from("products").select("*").order("id", { ascending: true });
    if (!includeHidden) query = query.eq("is_active", true);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return (data || []).map(fromRow);
}

export async function getAllProducts() {
    return selectProducts(false);
}

export async function getAdminProducts() {
    return selectProducts(true);
}

export async function getProductBySlug(slug: string) {
    await ensureDefaultProducts();
    const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? fromRow(data) : null;
}

export async function getProductById(id: number) {
    await ensureDefaultProducts();
    const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? fromRow(data) : null;
}

function sanitizeText(value: string, fallback: string) {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
}

export async function updateProduct(productId: number, input: ProductUpdateInput) {
    const current = await getProductById(productId);
    if (!current) return null;

    const next: ProductRecord = {
        ...current,
        name: typeof input.name === "string" ? sanitizeText(input.name, current.name) : current.name,
        description: typeof input.description === "string" ? sanitizeText(input.description, current.description) : current.description,
        scentNotes: typeof input.scentNotes === "string" ? sanitizeText(input.scentNotes, current.scentNotes) : current.scentNotes,
        imageUrl: typeof input.imageUrl === "string" ? sanitizeText(input.imageUrl, current.imageUrl) : current.imageUrl,
        volume: typeof input.volume === "string" ? sanitizeText(input.volume, current.volume) : current.volume,
        mood: typeof input.mood === "string" ? sanitizeText(input.mood, current.mood) : current.mood,
        category: typeof input.category === "string" ? normalizeCategory(input.category) : current.category,
        isActive: typeof input.isActive === "boolean" ? input.isActive : current.isActive,
        updatedAt: new Date().toISOString()
    };

    if (typeof input.price !== "undefined") {
        const price = Number(input.price);
        if (!Number.isFinite(price) || price <= 0) {
            throw new Error("Product price must be a positive number.");
        }
        next.price = Math.round(price * 100) / 100;
    }

    if (typeof input.stock !== "undefined") {
        const stock = Number(input.stock);
        if (!Number.isInteger(stock) || stock < 0) {
            throw new Error("Product stock must be a whole number of zero or greater.");
        }
        next.stock = stock;
    }

    const { data, error } = await supabase
        .from("products")
        .upsert(toRow(next), { onConflict: "id" })
        .select("*")
        .single();

    if (error) throw new Error(error.message);
    return fromRow(data);
}

export async function countProducts() {
    await ensureDefaultProducts();
    const { count, error } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true });

    if (error) throw new Error(error.message);
    return count || 0;
}

export async function decreaseProductStock(productId: number, quantity: number) {
    if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error("Quantity must be a positive whole number.");
    }

    const product = await getProductById(productId);
    if (!product || !product.isActive) {
        throw new Error(`Product ${productId} was not found.`);
    }

    if (product.stock < quantity) {
        throw new Error(`${product.name} only has ${product.stock} item(s) left in stock.`);
    }

    return updateProduct(productId, {
        stock: product.stock - quantity
    });
}
