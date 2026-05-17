export type CartItem = {
    id: number;
    slug: string;
    name: string;
    description: string;
    price: number;
    stock: number;
    imageUrl?: string;
    quantity: number;
};

const CART_KEY = "age_of_scent_cart";

export function getCart(): CartItem[] {
    if (typeof window === "undefined") return [];

    try {
        const raw = localStorage.getItem(CART_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function saveCart(items: CartItem[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("cart-updated"));
}

export function addToCart(
    item: Omit<CartItem, "quantity">,
    quantity = 1
) {
    const cart = getCart();
    const existing = cart.find((cartItem) => cartItem.id === item.id);

    if (existing) {
        existing.quantity += quantity;
    } else {
        cart.push({
            ...item,
            quantity
        });
    }

    saveCart(cart);
    return cart;
}

export function updateCartQuantity(id: number, quantity: number) {
    const cart = getCart()
        .map((item) => (item.id === id ? { ...item, quantity } : item))
        .filter((item) => item.quantity > 0);

    saveCart(cart);
    return cart;
}

export function removeFromCart(id: number) {
    const cart = getCart().filter((item) => item.id !== id);
    saveCart(cart);
    return cart;
}

export function clearCart() {
    saveCart([]);
}

export function getCartCount() {
    return getCart().reduce((total, item) => total + item.quantity, 0);
}

export function getCartTotal() {
    return getCart().reduce(
        (total, item) => total + item.price * item.quantity,
        0
    );
}