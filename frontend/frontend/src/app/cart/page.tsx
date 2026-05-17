"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageShell from "@/components/layout/PageShell";
import ProductVisual from "@/components/shop/ProductVisual";
import {
    getCart,
    removeFromCart,
    updateCartQuantity,
    type CartItem
} from "@/lib/cart";

export default function CartPage() {
    const [items, setItems] = useState<CartItem[]>([]);

    function syncCart() {
        setItems(getCart());
    }

    useEffect(() => {
        syncCart();
        window.addEventListener("cart-updated", syncCart);

        return () => {
            window.removeEventListener("cart-updated", syncCart);
        };
    }, []);

    const total = useMemo(
        () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
        [items]
    );

    return (
        <PageShell title="Cart" description="Review your selected perfume bottles before checkout.">
            {items.length === 0 ? (
                <div className="card empty-state">
                    <h3>Your fragrance tray is empty.</h3>
                    <p className="muted">Start with a signature perfume from the boutique.</p>
                    <div className="button-row">
                        <Link href="/shop" className="btn">
                            Go to Boutique
                        </Link>
                    </div>
                </div>
            ) : (
                <>
                    <div className="grid cart-list">
                        {items.map((item) => (
                            <div className="card cart-item" key={item.id}>
                                <ProductVisual
                                    name={item.name}
                                    imageUrl={item.imageUrl}
                                    className="product-visual--cart"
                                />

                                <div className="cart-item__content">
                                    <h3>{item.name}</h3>
                                    <p className="muted">{item.description}</p>
                                    <p className="price">PHP {item.price.toFixed(2)}</p>
                                </div>

                                <div className="cart-actions">
                                    <label>
                                        Quantity
                                        <input
                                            type="number"
                                            min={1}
                                            value={item.quantity}
                                            onChange={(event) =>
                                                updateCartQuantity(item.id, Number(event.target.value))
                                            }
                                        />
                                    </label>
                                    <button
                                        className="btn btn--ghost"
                                        type="button"
                                        onClick={() => removeFromCart(item.id)}
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="card cart-total-card">
                        <div>
                            <p className="eyebrow">Order Total</p>
                            <p className="price">PHP {total.toFixed(2)}</p>
                        </div>

                        <div className="button-row">
                            <Link href="/checkout" className="btn">
                                Proceed to Checkout
                            </Link>
                            <Link href="/shop" className="btn btn--ghost">
                                Continue Shopping
                            </Link>
                        </div>
                    </div>
                </>
            )}
        </PageShell>
    );
}
