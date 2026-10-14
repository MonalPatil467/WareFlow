const API_BASE_URL = "http://localhost:8090";

const token = localStorage.getItem("wareflow_token");

let user = null;

try {
    user = JSON.parse(localStorage.getItem("wareflow_user") || "null");
} catch {
    user = null;
}

if (!token) {
    window.location.replace("index.html");
}

function getElement(id) {
    return document.getElementById(id);
}

function setText(id, value) {
    const element = getElement(id);

    if (element) {
        element.textContent = value ?? "";
    }
}

function getUserName() {
    return user?.name ||
        user?.fullName ||
        user?.firstName ||
        user?.username ||
        user?.email ||
        "User";
}

function getUserRole() {
    const role = user?.role || user?.roles?.[0] || "";

    return typeof role === "string" ? role : "";
}

function getInitials(name) {
    const words = String(name || "User")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (words.length === 0) {
        return "U";
    }

    if (words.length === 1) {
        return words[0].substring(0, 2).toUpperCase();
    }

    return (words[0][0] + words[words.length - 1][0])
        .toUpperCase();
}

function setupUser() {
    const name = getUserName();
    const role = getUserRole();
    const initials = getInitials(name);

    setText("sidebarUserName", name);
    setText("sidebarUserRole", role);
    setText("profileName", name);
    setText("profileRole", role);
    setText("userAvatar", initials);
    setText("profileAvatar", initials);
    setText("welcomeText", `Welcome back, ${name}`);
}

function setupRoleMenu() {
    const role = getUserRole().toUpperCase();

    document.querySelectorAll(".super-admin").forEach(element => {
        element.style.display =
            role === "SUPER_ADMIN" ? "" : "none";
    });

    if (role === "WORKER") {
        document.querySelectorAll(".payment-menu").forEach(element => {
            element.style.display = "none";
        });

        document.querySelectorAll(".orders-menu").forEach(element => {
            element.style.display = "none";
        });
    }

    if (role === "MANAGER" || role === "WORKER") {
        document.querySelectorAll(".payment-menu").forEach(element => {
            element.style.display = "none";
        });
    }
}

function logout() {
    localStorage.removeItem("wareflow_token");
    localStorage.removeItem("wareflow_user");
    localStorage.removeItem("wareflow_message");

    window.location.replace("index.html");
}

async function apiRequest(endpoint, options = {}) {
    const headers = {
        Accept: "application/json",
        ...options.headers,
        Authorization: `Bearer ${token}`
    };

    if (options.body && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
    });

    if (response.status === 401) {
        logout();
        throw new Error("Your session has expired. Please log in again.");
    }

    if (response.status === 403) {
        throw new Error("You do not have permission to access this resource.");
    }

    return response;
}

async function fetchList(endpoint) {
    const response = await apiRequest(endpoint);

    if (!response.ok) {
        throw new Error(`Request failed: ${endpoint} (${response.status})`);
    }

    const data = await response.json();

    if (Array.isArray(data)) {
        return data;
    }

    if (Array.isArray(data.content)) {
        return data.content;
    }

    if (Array.isArray(data.data)) {
        return data.data;
    }

    return [];
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function renderOrders(orders) {
    const container = getElement("recentOrders");

    if (!container) {
        return;
    }

    if (!orders.length) {
        container.innerHTML = `
            <tr>
                <td colspan="4" class="empty">No orders available</td>
            </tr>
        `;
        return;
    }

    container.innerHTML = orders.slice(0, 5).map(order => {
        const orderNumber = escapeHTML(order.orderNumber ?? order.id ?? "-");
        const status = escapeHTML(order.status ?? "-");
        const amount = Number(order.totalAmount ?? order.total ?? 0);
        const formattedAmount = Number.isFinite(amount)
            ? amount.toLocaleString("en-IN", {
                style: "currency",
                currency: "INR"
            })
            : "—";

        const createdAt = order.createdAt
            ? new Date(order.createdAt)
            : null;

        const formattedDate = createdAt &&
            !Number.isNaN(createdAt.getTime())
            ? createdAt.toLocaleDateString("en-IN")
            : "-";

        return `
            <tr>
                <td>${orderNumber}</td>
                <td>${status}</td>
                <td>${escapeHTML(formattedAmount)}</td>
                <td>${escapeHTML(formattedDate)}</td>
            </tr>
        `;
    }).join("");
}

async function updateCount(endpoint, elementId) {
    try {
        const items = await fetchList(endpoint);
        setText(elementId, items.length);
        return items;
    } catch (error) {
        console.error(`Unable to load ${endpoint}:`, error);
        return null;
    }
}

async function loadDashboardData() {
    const productsPromise = updateCount(
        "/api/products",
        "totalProducts"
    );

    const warehousesPromise = updateCount(
        "/api/warehouses",
        "totalWarehouses"
    );

    const ordersPromise = updateCount(
        "/api/orders",
        "totalOrders"
    );

    const [, , orders] = await Promise.all([
        productsPromise,
        warehousesPromise,
        ordersPromise
    ]);

    if (orders !== null) {
        renderOrders(orders);
    }
}

const logoutButton = getElement("logoutButton");
const menuButton = getElement("menuButton");
const sidebar = getElement("sidebar");

if (logoutButton) {
    logoutButton.addEventListener("click", logout);
}

if (menuButton && sidebar) {
    menuButton.addEventListener("click", () => {
        sidebar.classList.toggle("open");
    });
}

setupUser();
setupRoleMenu();

if (token) {
    loadDashboardData();
}