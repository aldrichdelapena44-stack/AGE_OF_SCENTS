import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const perfumeProducts = [
    {
        name: "Aurum Noir Parfum",
        slug: "aurum-noir-parfum",
        description:
            "Black orchid, smoked vanilla, warm amber, and cedarwood in a velvet evening perfume.",
        price: "3490.00",
        stock: 18,
        imageUrl: "/images/products/aurum-noir.svg"
    },
    {
        name: "Rose Velours Eau de Parfum",
        slug: "rose-velours-eau-de-parfum",
        description: "Damask rose, lychee, iris, and white musk in a luminous floral perfume.",
        price: "2890.00",
        stock: 24,
        imageUrl: "/images/products/rose-velours.svg"
    },
    {
        name: "Citrus Atelier Eau de Parfum",
        slug: "citrus-atelier-eau-de-parfum",
        description: "Bergamot, neroli, green tea, and vetiver in a refined daylight perfume.",
        price: "2490.00",
        stock: 30,
        imageUrl: "/images/products/citrus-atelier.svg"
    }
];

async function main() {
    for (const product of perfumeProducts) {
        await prisma.product.upsert({
            where: { slug: product.slug },
            update: product,
            create: product
        });
    }
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (error) => {
        console.error(error);
        await prisma.$disconnect();
        process.exit(1);
    });
