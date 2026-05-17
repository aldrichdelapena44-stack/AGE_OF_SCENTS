import { getAllUsers } from "./auth.service";
import { getAllOrders, countOrders } from "./order.service";
import { countProducts, getAdminProducts } from "./product.service";
import { countNewFeedback, getAllFeedback } from "./feedback.service";
import { countPendingVerifications, getAllVerifications, syncAllUserVerificationStatuses } from "./verification.service";
import { countPendingStories, getAdminStories } from "./story.service";
import { getStoreSettings } from "./store-settings.service";

export function getAdminSummary() {
    syncAllUserVerificationStatuses();
    return {
        users: getAllUsers().length,
        products: countProducts(),
        orders: countOrders(),
        pendingVerifications: countPendingVerifications(),
        newFeedback: countNewFeedback(),
        pendingStories: countPendingStories()
    };
}

export function getAdminUsers() {
    syncAllUserVerificationStatuses();
    return getAllUsers();
}

export function getAdminOrders() {
    return getAllOrders();
}

export function getAdminVerifications() {
    return getAllVerifications();
}

export function getAdminProductList() {
    return getAdminProducts();
}

export function getAdminFeedback() {
    return getAllFeedback();
}

export function getAdminStoriesList() {
    return getAdminStories();
}

export function getAdminStoreSettings() {
    return getStoreSettings();
}
