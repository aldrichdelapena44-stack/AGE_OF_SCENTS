import { getAllUsers } from "./auth.service";
import { getAllOrders, countOrders } from "./order.service";
import { countProducts, getAdminProducts } from "./product.service";
import { countNewFeedback, getAllFeedback } from "./feedback.service";
import { countPendingVerifications, getAllVerifications, syncAllUserVerificationStatuses } from "./verification.service";
import { countPendingStories, getAdminStories } from "./story.service";
import { getStoreSettings } from "./store-settings.service";

export async function getAdminSummary() {
    await syncAllUserVerificationStatuses();
    const [users, products, orders, pendingVerifications, newFeedback, pendingStories] = await Promise.all([
        getAllUsers(),
        countProducts(),
        countOrders(),
        countPendingVerifications(),
        countNewFeedback(),
        countPendingStories()
    ]);

    return {
        users: users.length,
        products,
        orders,
        pendingVerifications,
        newFeedback,
        pendingStories
    };
}

export async function getAdminUsers() {
    await syncAllUserVerificationStatuses();
    return getAllUsers();
}

export async function getAdminOrders() {
    return getAllOrders();
}

export async function getAdminVerifications() {
    return getAllVerifications();
}

export async function getAdminProductList() {
    return getAdminProducts();
}

export async function getAdminFeedback() {
    return getAllFeedback();
}

export async function getAdminStoriesList() {
    return getAdminStories();
}

export async function getAdminStoreSettings() {
    return getStoreSettings();
}
