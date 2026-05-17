import fs from "fs";
import path from "path";

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
    isActive?: boolean;
};

const now = new Date().toISOString();
const dataDir = path.join(process.cwd(), "data");
const productDataFile = path.join(dataDir, "products.json");

const defaultProducts: ProductRecord[] = [
    {
        id: 1,
        slug: "aurum-noir-parfum",
        name: "Aurum Noir Parfum",
        description:
            "A velvet evening fragrance built around black orchid, smoked vanilla, and warm amber.",
        scentNotes: "Black orchid, smoked vanilla, amber, cedarwood",
        volume: "50 ml",
        mood: "Evening signature",
        price: 3490,
        stock: 18,
        imageUrl: "/images/products/aurum-noir.svg",
        isActive: true,
        updatedAt: now
    },
    {
        id: 2,
        slug: "rose-velours-eau-de-parfum",
        name: "Rose Velours Eau de Parfum",
        description:
            "A luminous rose composition softened with lychee, iris, and white musk.",
        scentNotes: "Damask rose, lychee, iris, white musk",
        volume: "75 ml",
        mood: "Romantic floral",
        price: 2890,
        stock: 24,
        imageUrl: "/images/products/rose-velours.svg",
        isActive: true,
        updatedAt: now
    },
    {
        id: 3,
        slug: "citrus-atelier-eau-de-parfum",
        name: "Citrus Atelier Eau de Parfum",
        description:
            "Fresh bergamot and neroli wrapped in tea leaves, vetiver, and sunlit woods.",
        scentNotes: "Bergamot, neroli, green tea, vetiver",
        volume: "50 ml",
        mood: "Daylight elegance",
        price: 2490,
        stock: 30,
        imageUrl: "/images/products/citrus-atelier.svg",
        isActive: true,
        updatedAt: now
    },
    {
        id: 4,
        slug: "oud-imperial-extrait",
        name: "Oud Imperial Extrait",
        description:
            "A deep extrait with saffron, incense, oud wood, and polished leather warmth.",
        scentNotes: "Saffron, incense, oud, leather",
        volume: "30 ml",
        mood: "Opulent depth",
        price: 4990,
        stock: 12,
        imageUrl: "/images/products/oud-imperial.svg",
        isActive: true,
        updatedAt: now
    },
    {
        id: 5,
        slug: "pearl-musk-eau-de-parfum",
        name: "Pearl Musk Eau de Parfum",
        description:
            "A soft skin scent of pear blossom, clean musk, sandalwood, and creamy iris.",
        scentNotes: "Pear blossom, clean musk, iris, sandalwood",
        volume: "50 ml",
        mood: "Soft intimacy",
        price: 2690,
        stock: 21,
        imageUrl: "/images/products/pearl-musk.svg",
        isActive: true,
        updatedAt: now
    },
    {
        id: 6,
        slug: "amber-silk-parfum",
        name: "Amber Silk Parfum",
        description:
            "A smooth amber perfume with tonka bean, labdanum, cashmere wood, and golden resin.",
        scentNotes: "Tonka bean, labdanum, cashmere wood, resin",
        volume: "50 ml",
        mood: "Warm luxury",
        price: 3290,
        stock: 16,
        imageUrl: "/images/products/amber-silk.svg",
        isActive: true,
        updatedAt: now
    }
];

function ensureDataDir() {
    fs.mkdirSync(dataDir, { recursive: true });
}

function loadProducts() {
    try {
        if (!fs.existsSync(productDataFile)) return [...defaultProducts];
        const parsed = JSON.parse(fs.readFileSync(productDataFile, "utf8")) as ProductRecord[];
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...defaultProducts];
    } catch {
        return [...defaultProducts];
    }
}

function saveProducts() {
    ensureDataDir();
    fs.writeFileSync(productDataFile, JSON.stringify(products, null, 2));
}

function sanitizeText(value: string, fallback: string) {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
}

const products: ProductRecord[] = loadProducts();

export function getAllProducts() {
    return products.filter((product) => product.isActive);
}

export function getAdminProducts() {
    return [...products].sort((a, b) => a.id - b.id);
}

export function getProductBySlug(slug: string) {
    return products.find((product) => product.slug === slug && product.isActive) || null;
}

export function getProductById(id: number) {
    return products.find((product) => product.id === id) || null;
}

export function updateProduct(productId: number, input: ProductUpdateInput) {
    const product = getProductById(productId);
    if (!product) return null;

    if (typeof input.name === "string") product.name = sanitizeText(input.name, product.name);
    if (typeof input.description === "string") product.description = sanitizeText(input.description, product.description);
    if (typeof input.scentNotes === "string") product.scentNotes = sanitizeText(input.scentNotes, product.scentNotes);
    if (typeof input.imageUrl === "string") product.imageUrl = sanitizeText(input.imageUrl, product.imageUrl);
    if (typeof input.volume === "string") product.volume = sanitizeText(input.volume, product.volume);

    if (typeof input.price !== "undefined") {
        const price = Number(input.price);
        if (!Number.isFinite(price) || price <= 0) {
            throw new Error("Product price must be a positive number.");
        }
        product.price = Math.round(price * 100) / 100;
    }

    if (typeof input.stock !== "undefined") {
        const stock = Number(input.stock);
        if (!Number.isInteger(stock) || stock < 0) {
            throw new Error("Product stock must be a whole number of zero or greater.");
        }
        product.stock = stock;
    }

    if (typeof input.isActive === "boolean") product.isActive = input.isActive;

    product.updatedAt = new Date().toISOString();
    saveProducts();
    return product;
}

export function countProducts() {
    return products.length;
}

export function decreaseProductStock(productId: number, quantity: number) {
    const product = getProductById(productId);
    if (!product || !product.isActive) {
        throw new Error(`Product ${productId} was not found.`);
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error("Quantity must be a positive whole number.");
    }
    if (product.stock < quantity) {
        throw new Error(`${product.name} only has ${product.stock} item(s) left in stock.`);
    }
    product.stock -= quantity;
    product.updatedAt = new Date().toISOString();
    saveProducts();
    return product;
}
